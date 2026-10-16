#!/usr/bin/env python3
"""Recover and persist a saved world's source without rebuilding its index.

Uses a tiny XML, native Chromium file selection, and a fresh temporary profile.
The simulated error is the browser's actual failed-large-value error, injected
only for old sources.file rows after reload. A held background repair, a failed
manifest commit, and a refresh after removing the local fixture are exercised.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import zlib

ROOT = Path(__file__).resolve().parents[1]
ELEMENT = 'element-6066-11e4-a52e-4f735466cecf'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--screenshots', type=Path)
args = parser.parse_args()
XML = '''<?xml version="1.0" encoding="UTF-8"?><df_world>
<name>The Golden World</name><year>200</year><width>4</width><height>4</height>
<historical_figures><historical_figure><id>1</id><name>Urist Copperhammer</name><race>DWARF</race><birth_year>1</birth_year><death_year>-1</death_year><hf_skill><skill>MINING</skill><total_ip>18000</total_ip></hf_skill><source_marker>READ_FROM_REBOUND_ORIGINAL</source_marker></historical_figure><historical_figure><id>2</id><name>Domas Silverspear</name><race>DWARF</race><birth_year>5</birth_year><death_year>-1</death_year></historical_figure></historical_figures>
<sites><site><id>1</id><name>The Golden Mountain</name><type>fortress</type><coords>1,1</coords><civ_id>1</civ_id><cur_owner_id>1</cur_owner_id></site></sites>
<entities><entity><id>1</id><name>The Copper Spears</name><type>civilization</type><race>DWARF</race></entity></entities>
<historical_events><historical_event><id>0</id><year>100</year><type>hf travel</type><group_hfid>1</group_hfid><site_id>1</site_id><details>ORIGINAL_SOURCE_UNCHANGED</details></historical_event></historical_events>
</df_world>'''

SNAPSHOT = r'''
const world=LegendsApp.state.world,disk=world.disk;
const read=async(name,store)=>{const db=await LegendsFastStore.database(name);return new Promise((resolve,reject)=>{const request=db.transaction(store).objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})};
const sourceName=disk.sourceDbName||disk.dbName,sources=await read(sourceName,'sources');
const describe=async row=>{const result={};for(const[key,value]of Object.entries(row))result[key]=value instanceof Blob?{name:value.name??null,size:value.size,type:value.type,lastModified:value.lastModified??null,text:await value.text()}:value;return result};
return {id:world.id,disk:JSON.stringify(disk),sources:await Promise.all(sources.map(describe)),blocks:JSON.stringify(await read(disk.dbName,'blocks')),derived:JSON.stringify(await read(disk.dbName,'derived'))};
'''

FAULT_AND_GUARDS = r'''
window.__recoveryTest={sourceReads:0,sourceFailures:0,manifestReads:0,partReads:0,activeSourceReads:0,maxConcurrentSourceReads:0,registrations:[],repairs:[],sourceWrites:[],injectedFailures:0,forbidden:[]};
const nativeGet=IDBObjectStore.prototype.get;
IDBObjectStore.prototype.get=function(...values){
 const request=nativeGet.apply(this,values);
 if(this.name==='sources'){
  __recoveryTest.sourceReads++;
  __recoveryTest.activeSourceReads++;
  __recoveryTest.maxConcurrentSourceReads=Math.max(__recoveryTest.maxConcurrentSourceReads,__recoveryTest.activeSourceReads);
  request.addEventListener('success',event=>{
   const row=request.result;__recoveryTest.activeSourceReads--;
   if(row?.format==='source-chunks-v1')__recoveryTest.manifestReads++;
   if(row?.blob instanceof Blob)__recoveryTest.partReads++;
   if(!(row?.file instanceof Blob))return;
   event.stopImmediatePropagation();__recoveryTest.sourceFailures++;
   Object.defineProperty(request,'error',{value:new DOMException('Failed to read large IndexedDB value','UnknownError')});
   Object.defineProperty(request,'result',{value:undefined});
   request.dispatchEvent(new Event('error',{cancelable:true}));
  });
 }
 return request;
};
const blocked=label=>function(){__recoveryTest.forbidden.push(label);throw new Error('Unexpected '+label+' while recovering an existing source')};
for(const [name,keys]of [['LegendsData',['parseFiles','parseFilesStream']],['LegendsFileIndexer',['indexFiles']],['LegendsFastStore',['createImport','persistSourceFiles','refreshFacts']],['LegendsLocalStore',['createImport','abortImport']]]){
 let installed;Object.defineProperty(window,name,{configurable:true,get(){return installed},set(value){
  const copy={...value};for(const key of keys)if(typeof value?.[key]==='function')copy[key]=blocked(name+'.'+key);
  if(value.workerSource)Object.defineProperty(copy,'workerSource',{value:value.workerSource});
  if(name==='LegendsFastStore'&&value.registerSourceFiles){const register=value.registerSourceFiles;copy.registerSourceFiles=(world,files,...rest)=>{__recoveryTest.registrations.push({id:world.disk?.id,sourceId:world.disk?.sourceId,dbName:world.disk?.dbName,sourceDbName:world.disk?.sourceDbName,files:Array.from(files||[]).map(file=>file?.name)});return register(world,files,...rest)}}
  if(name==='LegendsFastStore'&&value.persistReboundSources){const persist=value.persistReboundSources;copy.persistReboundSources=async(...values)=>{
   const attempt={state:'held'};__recoveryTest.repairs.push(attempt);
   await new Promise(resolve=>window.__releaseSourceRepair=resolve);attempt.state='writing';
   try{const result=await persist(...values);attempt.state='complete';return result}catch(error){attempt.state='failed';attempt.error=error.message;throw error}
  }}
  installed=copy;
 }});
}
window.Worker=class{constructor(){__recoveryTest.forbidden.push('Worker');throw new Error('Unexpected Worker during source recovery')}};
for(const key of ['put','add','delete','clear']){const native=IDBObjectStore.prototype[key];IDBObjectStore.prototype[key]=function(...values){
 if(['blocks','derived'].includes(this.name)){__recoveryTest.forbidden.push(this.name+'.'+key);throw new Error('Unexpected index/statistics mutation during source recovery')}
 if(this.name==='sources'){
  const row=values[0];__recoveryTest.sourceWrites.push({method:key,db:this.transaction.db.name,importId:row?.importId,fileNo:row?.fileNo,format:row?.format,bytes:row?.blob?.size});
  if(row?.file instanceof Blob){__recoveryTest.forbidden.push('legacy source File '+key);throw new Error('Source repair must use bounded chunks')}
  if(window.__failSourceManifest&&row?.format==='source-chunks-v1'){window.__failSourceManifest=false;__recoveryTest.injectedFailures++;throw new DOMException('模拟后台原文件缓存写入失败','QuotaExceededError')}
 }
 return native.apply(this,values)
}}
'''

with tempfile.TemporaryDirectory(prefix='legends-source-recovery-') as temporary:
    temporary=Path(temporary)
    original=temporary/'same-legends.xml'
    original.write_text(XML,encoding='utf-8')
    # Keep the XML at fileNo=1, as in a native multi-file selection with a map
    # first. Rebinding only the XML must preserve that sparse numbered slot.
    image=temporary/'world-map.png'
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
    image.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',4,4,8,6,0,0,0))+chunk(b'IDAT',zlib.compress((b'\x00'+bytes((20,80,180,255))*4)*4))+chunk(b'IEND',b''))
    wrong_name=temporary/'another-legends.xml'
    wrong_name.write_text(XML,encoding='utf-8')
    wrong_size=temporary/'wrong-size'/'same-legends.xml'
    wrong_size.parent.mkdir()
    wrong_size.write_text(XML+'\n',encoding='utf-8')
    original_hash=hashlib.sha256(original.read_bytes()).hexdigest()
    with socket.socket() as listener:
        listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
    endpoint=f'http://127.0.0.1:{port}'
    log=(temporary/'driver.log').open('w')
    driver=subprocess.Popen([shutil.which('chromedriver'),f'--port={port}'],stdout=log,stderr=subprocess.STDOUT)
    session=None
    checks=0

    def check(condition,detail):
        global checks
        if not condition:raise AssertionError(detail)
        checks+=1

    def request(method,path,data=None):
        req=urllib.request.Request(endpoint+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'},method=method)
        try:
            with urllib.request.urlopen(req,timeout=90) as response:value=json.load(response)['value']
        except urllib.error.HTTPError as error:raise RuntimeError(error.read().decode()) from error
        if isinstance(value,dict) and value.get('error') and 'stacktrace' in value:raise RuntimeError(value)
        return value

    def command(path,data=None,method='POST'):return request(method,'/session/'+session+path,data)
    def js(script,*values):return command('/execute/sync',{'script':script,'args':list(values)})
    def async_js(script,*values):
        result=command('/execute/async',{'script':'const done=arguments[arguments.length-1];(async()=>{'+script+'})().then(done,error=>done({error:String(error),stack:error.stack}));','args':list(values)})
        if isinstance(result,dict) and result.get('error'):raise AssertionError(result)
        return result

    def wait(script,timeout=60):
        deadline=time.monotonic()+timeout
        while time.monotonic()<deadline:
            value=js(script)
            if value:return value
            time.sleep(.05)
        raise AssertionError({'timeout':script,'state':js('return{route:location.hash,world:LegendsApp?.state.world?.id,importing:LegendsApp?.state.importing,error:document.querySelector("#import-error")?.textContent,main:document.querySelector("#main")?.textContent,test:window.__recoveryTest}')})

    def element(selector):return command('/element',{'using':'css selector','value':selector})[ELEMENT]
    def choose(*paths,show=False):
        if show:js('LegendsApp.showImport()')
        file_input=element('#file-input')
        command('/element/'+file_input+'/clear',{})
        command('/element/'+file_input+'/value',{'text':'\n'.join(str(path) for path in paths)})
        command('/element/'+element('#start-import')+'/click',{})
        wait('return !LegendsApp.state.importing')

    def screenshot(label):
        if args.screenshots:
            args.screenshots.mkdir(parents=True,exist_ok=True)
            (args.screenshots/(label+'.png')).write_bytes(base64.b64decode(command('/screenshot',method='GET')))

    try:
        for _ in range(100):
            try:request('GET','/status');break
            except OSError:time.sleep(.05)
        session=request('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'binary':shutil.which('chromium'),'args':['--headless','--no-sandbox','--disable-gpu','--window-size=1512,1100','--user-data-dir='+str(temporary/'profile')]},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId']
        command('/timeouts',{'script':90000,'pageLoad':30000})
        command('/url',{'url':(ROOT/'index.html').as_uri()})
        wait('return !!window.LegendsApp&&!!window.DFTranslate?.event&&!document.querySelector("#main .loading")')
        js('window.__nativeData=LegendsData;window.LegendsData={...LegendsData,parseFiles:(files,progress,options)=>__nativeData.parseFiles(files,progress,{...options,storage:"disk"})};')
        choose(image,original,show=True)
        wait('return !!LegendsApp.state.world?.disk?.sourcesPersisted&&!LegendsApp.state.pendingSaves?.size&&!document.querySelector("#import-dialog").open')
        # Facts upgrades may retain the original source namespace while giving
        # index blocks a new importId. Cover that real shape with a tiny Blob.
        async_js(r'''const world=LegendsApp.state.world,disk=world.disk,file=LegendsApp.state.files.find(file=>/\.xml$/i.test(file.name));if(!file)throw new Error('Missing native fixture File');const sourceDbName='legends-recovery-source-only',sourceId=disk.id+'-original',sourceDB=await LegendsFastStore.database(sourceDbName);await new Promise((resolve,reject)=>{const tx=sourceDB.transaction('sources','readwrite');tx.objectStore('sources').put({importId:sourceId,fileNo:1,file});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});disk.sourceId=sourceId;disk.sourceDbName=sourceDbName;await LegendsLocalStore.saveWorld(world);return true;''')
        # Related lookups are optional independent derived caches. Prepare them
        # under the final index/source namespace before freezing the index and
        # statistics snapshot, so recovery itself must never rebuild either.
        warmed=async_js('const world=LegendsApp.state.world,result=await LegendsLocalStore.related(world,"figures",1,{detail:true,page:1,pageSize:10,sortKey:"date"});return{events:result.eventCount,collections:result.collectionCount};')
        check(warmed=={'events':1,'collections':0},warmed)
        baseline=async_js(SNAPSHOT)
        baseline_disk=json.loads(baseline['disk'])
        check(baseline_disk['sourceId']!=baseline_disk['id'] and baseline_disk['sourceDbName']!=baseline_disk['dbName'],baseline_disk)
        check(baseline['sources'][0]['file']['text']==XML,baseline['sources'])
        check(baseline['sources'][0]['fileNo']==1,baseline['sources'])
        check(any(row.get('importId')==baseline_disk['id']+':relations-v1'for row in json.loads(baseline['derived'])),'Persist optional related lookup before installing strict mutation guards')
        js('window.LegendsData=__nativeData;location.hash="/hf"')
        wait('return LegendsApp.state.route==="figures"&&!!document.querySelector(".data-table tbody a[href]")&&!document.querySelector("[aria-busy=true]")')
        command('/goog/cdp/execute',{'cmd':'Page.addScriptToEvaluateOnNewDocument','params':{'source':FAULT_AND_GUARDS}})
        command('/refresh',{})
        wait('return !!window.__recoveryTest&&LegendsApp.state.route==="figures"&&LegendsApp.state.recordId===null&&document.querySelector(".data-table tbody")?.rows.length===2&&!document.querySelector("[aria-busy=true]")')
        headers_only=js('return {test:__recoveryTest,modal:document.querySelector("#import-dialog").open}')
        check(headers_only['test']['sourceReads']==0 and not headers_only['modal'],'Header-only figures list must not read XML or offer source recovery: '+str(headers_only))
        command('/element/'+element('.data-table tbody a[href="#/hf/1"]')+'/click',{})
        wait('return !!window.__recoveryTest?.sourceFailures&&!!window.LegendsApp?.state.world&&!LegendsApp.state.importing&&document.querySelector("#import-dialog").open&&!document.querySelector("#file-input").disabled')
        failure=js('return{route:location.hash,text:document.querySelector("#import-dialog").textContent,error:document.querySelector("#main").textContent,test:__recoveryTest}')
        check(failure['route']=='#/hf/1' and original.name in failure['text'],failure)
        check('Failed to read large IndexedDB value' not in failure['text']+failure['error'],failure)
        check(failure['test']['maxConcurrentSourceReads']==1,'Concurrent records must share one source-file database read: '+str(failure['test']))
        check(async_js(SNAPSHOT)==baseline,'Source-read failure must preserve saved source, index blocks and analytics')
        screenshot('source-read-recovery')
        for candidate in [wrong_name,wrong_size]:
            choose(candidate)
            rejected=js('return{open:document.querySelector("#import-dialog").open,error:document.querySelector("#import-error").textContent,visible:!document.querySelector("#import-error").hidden,route:location.hash,test:__recoveryTest}')
            check(rejected['open'] and rejected['visible'] and rejected['error'] and rejected['route']=='#/hf/1',rejected)
            check(async_js(SNAPSHOT)==baseline,'Rejected file must preserve saved world and index')
            check(not rejected['test']['forbidden'] and not rejected['test']['registrations'],rejected)
        started=time.monotonic()
        choose(original)
        recovered=wait('return !document.querySelector("#import-dialog").open&&LegendsApp.state.route==="figures"&&LegendsApp.state.detailModel?.record.id===1&&!document.querySelector("[data-detail-loading]")?{route:location.hash,world:LegendsApp.state.world.id,heading:document.querySelector("#main h2")?.textContent,text:document.querySelector("#main").textContent,cards:[...document.querySelectorAll("#main .section-card h3")].map(el=>el.textContent),test:__recoveryTest}:null')
        check(recovered['route']=='#/hf/1' and recovered['world']==baseline['id'] and recovered['heading'] and '技能'in recovered['cards'],recovered)
        check(recovered['test']['sourceFailures']>=1 and not recovered['test']['forbidden'],recovered)
        if recovered['test']['registrations']:
            registration=recovered['test']['registrations'][-1]
            check(registration['sourceId']==baseline_disk['sourceId'] and registration['sourceDbName']==baseline_disk['sourceDbName'] and len(registration['files'])>1 and registration['files'][1]==original.name,registration)
        held=wait('return __recoveryTest.repairs.length&&__recoveryTest.repairs[0].state==="held"&&LegendsApp.state.sourceRepairs?.size?{attempt:__recoveryTest.repairs[0],pending:LegendsApp.state.sourceRepairs.size,modal:document.querySelector("#import-dialog").open}:null')
        check(not held['modal'] and held['pending']==1,held)
        resumed_seconds=time.monotonic()-started
        check(async_js(SNAPSHOT)==baseline,'Immediate file rebind must resume browsing before background repair writes anything')
        screenshot('detail-after-source-recovery')
        detail=wait('return LegendsApp.state.detailModel?.record?.id===1&&!document.querySelector(".loading")?{record:LegendsApp.state.detailModel.record,text:document.querySelector("#main").textContent}:null')
        check(detail['record'].get('source_marker')=='READ_FROM_REBOUND_ORIGINAL',detail)
        check('MINING' not in detail['text'] and '矿工' in detail['text'],detail['text'])
        check(async_js('const record=await LegendsLocalStore.getRecord(LegendsApp.state.world,"events",0);return record.details;')=='ORIGINAL_SOURCE_UNCHANGED','Read original XML event through preserved file offsets')
        # Failure after chunk writes, before publication, must keep the legacy
        # source descriptor and current selected File available for browsing.
        js('window.__failSourceManifest=true;__releaseSourceRepair();')
        failed_repair=wait('return __recoveryTest.repairs[0].state==="failed"&&!LegendsApp.state.sourceRepairs?.size?{test:__recoveryTest,toast:document.querySelector("#toast").textContent,modal:document.querySelector("#import-dialog").open}:null')
        check(failed_repair['test']['injectedFailures']==1 and not failed_repair['modal'] and not failed_repair['test']['forbidden'],failed_repair)
        check('失败' in failed_repair['toast'],failed_repair)
        check(async_js(SNAPSHOT)==baseline,'Failed background publication must preserve the prior source manifest, index and statistics')
        check(async_js('const record=await LegendsLocalStore.getRecord(LegendsApp.state.world,"figures",1);return record.source_marker;')=='READ_FROM_REBOUND_ORIGINAL','Background failure must retain the current selected File for browsing')
        screenshot('source-repair-failed-current-page-usable')
        # The deliberately failed repair leaves the old broken database row.
        # A new selection retries the background repair, using the same index.
        js('location.hash="/hf"')
        wait('return LegendsApp.state.route==="figures"&&LegendsApp.state.recordId===null&&document.querySelector(".data-table tbody")?.rows.length===2&&!document.querySelector("[aria-busy=true]")')
        command('/refresh',{})
        wait('return !!window.__recoveryTest&&LegendsApp.state.route==="figures"&&LegendsApp.state.recordId===null&&document.querySelector(".data-table tbody")?.rows.length===2&&!document.querySelector("[aria-busy=true]")')
        headers_only=js('return {test:__recoveryTest,modal:document.querySelector("#import-dialog").open}')
        check(headers_only['test']['sourceReads']==0 and not headers_only['modal'],'Header-only figures list must not read XML or offer source recovery: '+str(headers_only))
        command('/element/'+element('.data-table tbody a[href="#/hf/1"]')+'/click',{})
        wait('return !!window.__recoveryTest?.sourceFailures&&!!window.LegendsApp?.state.world&&!LegendsApp.state.importing&&document.querySelector("#import-dialog").open&&!document.querySelector("#file-input").disabled')
        choose(original)
        wait('return LegendsApp.state.route==="figures"&&LegendsApp.state.detailModel?.record.id===1&&!document.querySelector("[data-detail-loading]")&&!document.querySelector("#import-dialog").open&&__recoveryTest.repairs[0]?.state==="held"')
        check(async_js(SNAPSHOT)==baseline,'Retry must still use the same saved world before background writes')
        js('__releaseSourceRepair();')
        persisted_state=wait('return __recoveryTest.repairs[0].state==="complete"&&!LegendsApp.state.sourceRepairs?.size?{test:__recoveryTest,toast:document.querySelector("#toast").textContent}:null')
        check(not persisted_state['test']['forbidden'],persisted_state)
        check('原文件缓存已修复' in persisted_state['toast'],persisted_state)
        persisted=async_js(SNAPSHOT)
        check({key:value for key,value in persisted.items() if key!='sources'}=={key:value for key,value in baseline.items() if key!='sources'},'Background persistence must preserve existing index, counts, statistics, and source namespace')
        manifests=[row for row in persisted['sources'] if row.get('format')=='source-chunks-v1']
        parts=[row for row in persisted['sources'] if isinstance(row.get('fileNo'),list)]
        check(len(manifests)==1 and manifests[0]['fileNo']==1 and manifests[0]['name']==original.name and manifests[0]['size']==len(XML.encode()),manifests)
        check(len(parts)==manifests[0]['chunkCount'] and parts and all(row['fileNo'][0]==1 and row['blob']['size']<=8*1024*1024 for row in parts),parts)
        check(all('file' not in row for row in persisted['sources']),persisted['sources'])
        check(all(write['db']==baseline_disk['sourceDbName'] and (write.get('importId') is None or write['importId']==baseline_disk['sourceId']) for write in persisted_state['test']['sourceWrites']),persisted_state['test']['sourceWrites'])
        check(hashlib.sha256(original.read_bytes()).hexdigest()==original_hash,'Original file on disk must remain unchanged before removing the fixture path')
        removed_original=original.with_name('removed-original-selection-path.xml')
        original.rename(removed_original)
        check(not original.exists() and hashlib.sha256(removed_original.read_bytes()).hexdigest()==original_hash,'Remove only the temporary original fixture path before the final refresh')
        command('/refresh',{})
        refreshed=wait('return !!window.LegendsApp?.state.world&&!LegendsApp.state.importing&&LegendsApp.state.route==="figures"&&LegendsApp.state.detailModel?.record.id===1&&!document.querySelector("[data-detail-loading]")?{modal:document.querySelector("#import-dialog").open,input:document.querySelector("#file-input").value,test:__recoveryTest}:null')
        check(not refreshed['modal'] and not refreshed['input'] and refreshed['test']['sourceFailures']==0,refreshed)
        check(refreshed['test']['manifestReads']>=1 and refreshed['test']['partReads']>=1 and not refreshed['test']['sourceWrites'] and not refreshed['test']['repairs'],refreshed)
        check(async_js(SNAPSHOT)==persisted,'Refresh must reuse committed source chunks and unchanged index/statistics')
        source_file=async_js('const file=await LegendsFastStore.readSourceFile(LegendsApp.state.world,1),bytes=await file.slice(0,file.size).arrayBuffer();return{name:file.name,size:file.size,text:new TextDecoder().decode(bytes)};')
        check(source_file=={'name':'same-legends.xml','size':len(XML.encode()),'text':XML},source_file)
        reloaded_detail=wait('return LegendsApp.state.detailModel?.record?.id===1&&!document.querySelector(".loading")?{marker:LegendsApp.state.detailModel.record.source_marker,text:document.querySelector("#main").textContent}:null')
        check(reloaded_detail['marker']=='READ_FROM_REBOUND_ORIGINAL' and '矿工' in reloaded_detail['text'],reloaded_detail)
        check(async_js('const record=await LegendsLocalStore.getRecord(LegendsApp.state.world,"events",0);return record.details;')=='ORIGINAL_SOURCE_UNCHANGED','Read cached source after refresh with original local path removed')
        screenshot('detail-from-persisted-source-after-refresh')
        logs=command('/log',{'type':'browser'})
        severe=[entry for entry in logs if entry.get('level')=='SEVERE']
        check(not severe,severe)
        print(json.dumps({'ok':True,'checks':checks,'resumeBeforeBackgroundSeconds':round(resumed_seconds,3),'initialFailure':failure,'recovered':recovered,'failedRepair':failed_repair,'persisted':persisted_state,'refreshed':refreshed,'originalFixtureRemoved':not original.exists(),'browserErrors':severe},ensure_ascii=False,indent=2))
    finally:
        if session:
            try:command('',method='DELETE')
            except Exception:pass
        driver.terminate();driver.wait(timeout=10);log.close()
