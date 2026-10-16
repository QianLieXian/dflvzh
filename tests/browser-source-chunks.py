#!/usr/bin/env python3
"""Native file:// persistence, range and atomicity checks for 8 MiB sources.

Uses an actual generated XML File whose figure record crosses an 8 MiB boundary,
an image selected in slot zero, Python stdlib, and a fresh ChromeDriver profile.
No server, Node, existing profile, or original world export is used.
"""
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
ELEMENT='element-6066-11e4-a52e-4f735466cecf'
CHUNK=8*1024*1024
PREFIX='<df_world><name>The Golden World</name><year>200</year><historical_figures>'
RECORD='<historical_figure><id>1</id><name>Urist Copperhammer</name><race>DWARF</race><birth_year>1</birth_year><death_year>-1</death_year><source_marker>山河_跨越原文件分块_READ_EXACT_BYTES</source_marker></historical_figure>'
SUFFIX='</historical_figures></df_world>'

PREPARE=r'''
const files=Array.from(document.querySelector('#files').files),assert=(condition,message)=>{if(!condition)throw new Error(message)};
assert(files[0].name==='map.png'&&files[1].name==='same-legends.xml','Native file selection order must retain image in slot zero');
const session=await LegendsFastStore.createImport({id:'source-chunks-index',files});
const meta=await LegendsFileIndexer.indexFiles(files,{onBlock:session.writeBlock,onMetadata:session.metadata});
const world=await session.finish(meta);await LegendsFastStore.analytics(world);
world.disk.sourceId='source-chunks-original';world.disk.sourceDbName='legends-source-chunks-original';
await LegendsFastStore.persistSourceFiles(world,files);await LegendsLocalStore.saveWorld(world);
// Preserve the legacy File representation in a separate namespace. It must
// remain readable without requiring an upgrade, file reselection or reindex.
const db=await LegendsFastStore.database(world.disk.sourceDbName);
await new Promise((resolve,reject)=>{const tx=db.transaction('sources','readwrite');tx.objectStore('sources').put({importId:'source-chunks-legacy',fileNo:1,file:files[1]});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
const concurrentFile=new File(Array.from({length:6},(_,index)=>new Uint8Array(8388608).fill(index+1)),'concurrent.bin',{lastModified:123456});
await LegendsFastStore.persistSourceFiles({...world,disk:{...world.disk,sourceId:'source-chunks-concurrent'}},[concurrentFile]);
const legacyOmitted={...world,id:'source-chunks-legacy-omitted',disk:{...world.disk,id:'legacy-omitted-index',sourceId:'legacy-omitted-original'}};
delete legacyOmitted.disk.dbName;delete legacyOmitted.disk.sourceDbName;
const legacyDB=await LegendsFastStore.database('legends-file-index');
await new Promise((resolve,reject)=>{const tx=legacyDB.transaction('sources','readwrite');for(const [fileNo,file]of files.entries())tx.objectStore('sources').put({importId:legacyOmitted.disk.sourceId,fileNo,file});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
await LegendsLocalStore.saveWorld(legacyOmitted);
return {id:world.id,indexId:world.disk.id,sourceId:world.disk.sourceId,sourceDb:world.disk.sourceDbName,bytes:files[1].size,counts:world.disk.counts};
'''

VERIFY=r'''
let checks=0;const assert=(condition,message)=>{if(!condition)throw new Error(message);checks++};
const files=Array.from(document.querySelector('#files').files),codec=LegendsStorageValues,storeDB=await LegendsLocalStore.database();
const worlds=await new Promise((resolve,reject)=>{const r=storeDB.transaction('worlds').objectStore('worlds').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const world=await codec.unpack(worlds.find(row=>row.id==='the-golden-world')),disk=world.disk,sourceDB=await LegendsFastStore.database(disk.sourceDbName),indexDB=await LegendsFastStore.database(disk.dbName);
const readAll=(db,store)=>new Promise((resolve,reject)=>{const request=db.transaction(store).objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
const readSource=key=>new Promise((resolve,reject)=>{const request=sourceDB.transaction('sources').objectStore('sources').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
async function sourceSnapshot(){const rows=await readAll(sourceDB,'sources');return JSON.stringify(await Promise.all(rows.map(async row=>{if(!row.blob)return row;const digest=await crypto.subtle.digest('SHA-256',await row.blob.arrayBuffer());return {...row,blob:{size:row.blob.size,type:row.blob.type,sha256:Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}}})));}
const metadataBefore=JSON.stringify(disk),indexBefore=JSON.stringify({blocks:await readAll(indexDB,'blocks'),derived:await readAll(indexDB,'derived')});
assert(disk.id!==disk.sourceId&&disk.dbName!==disk.sourceDbName,'Source and index namespaces remain distinct');
const manifest=await readSource([disk.sourceId,1]),imageManifest=await readSource([disk.sourceId,0]),plusManifest=await readSource([disk.sourceId,2]);
assert(manifest.format==='source-chunks-v1'&&!manifest.file&&manifest.chunkSize===8388608&&manifest.chunkCount===2,'The original XML is stored as an 8 MiB chunk manifest');
assert(manifest.name===files[1].name&&manifest.size===files[1].size&&manifest.type===files[1].type&&manifest.lastModified===files[1].lastModified,'File metadata survives native reload');
assert(imageManifest.format==='source-chunks-v1'&&imageManifest.name==='map.png','The image retains source slot zero');
assert(plusManifest.format==='source-chunks-v1'&&plusManifest.name==='same-legends_plus.xml','Supplementary XML retains its own original numbered slot');
const originalRows=(await readAll(sourceDB,'sources')).filter(row=>row.importId===disk.sourceId),parts=originalRows.filter(row=>Array.isArray(row.fileNo)&&row.fileNo[0]===1);
assert(parts.length===2&&parts.every(row=>row.blob instanceof Blob&&row.blob.size<=8388608)&&parts[0].blob.size===8388608,'Physical source payloads are bounded native Blobs');
assert((await readAll(indexDB,'sources')).length===0,'Original chunks are not written into the separate index namespace');
const writes=[];for(const method of ['put','add','delete','clear']){const native=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(...args){if(['blocks','derived'].includes(this.name)){writes.push(this.name+'.'+method);throw new Error('Unexpected index/statistics write during source persistence')}return native.apply(this,args)}}
const source=await LegendsFastStore.readSourceFile(world,1);
assert(source.name===files[1].name&&source.size===files[1].size&&source.lastModified===files[1].lastModified&&typeof source.slice==='function','Reload returns a File-like range reader with original metadata');
const ranges=[[0,1024],[8388500,8388800],[8388600,8388640],[-150],[-200,-25],[25,25],[source.size-20,source.size+500],[source.size+200,source.size+400],[300,200]];
for(const range of ranges){const expected=new Uint8Array(await files[1].slice(...range).arrayBuffer()),actual=new Uint8Array(await source.slice(...range).arrayBuffer());assert(actual.length===expected.length&&actual.every((value,index)=>value===expected[index]),'Lazy slice matches native Blob.slice for '+JSON.stringify(range));}
assert((await source.slice(8388500,8388800).text())===(await files[1].slice(8388500,8388800).text()),'Cross-chunk text decoding matches native bytes');
const header=(await LegendsFastStore.getHeaders(world,'figures',1))[0];
assert(header.fileNo===1&&header.offset<8388608&&header.offset+header.length>8388608,'The native fixture record actually crosses the stored source chunk boundary');
const recordReadSizes=[],recordArrayBuffer=Blob.prototype.arrayBuffer;let record;
Blob.prototype.arrayBuffer=function(){recordReadSizes.push(this.size);return recordArrayBuffer.call(this);};
try{record=await LegendsFastStore.getRecord(world,'figures',1);}finally{Blob.prototype.arrayBuffer=recordArrayBuffer;}
assert(recordReadSizes.length===2&&recordReadSizes[0]===8388608-header.offset&&recordReadSizes[1]===header.offset+header.length-8388608&&recordReadSizes.reduce((sum,n)=>sum+n,0)===header.length,'Cross-boundary record reads only its exact two byte fragments, without reading entire source chunks');
assert(record.source_marker==='山河_跨越原文件分块_READ_EXACT_BYTES'&&record.name==='Urist Copperhammer','Full record parsing reads exact bytes across the 8 MiB boundary');
const reindexed=[];const meta=await LegendsFileIndexer.indexFiles([{name:'map.png',size:0,type:'image/png'},source],{onBlock:rows=>reindexed.push(...rows)});
assert(meta.counts.figures===1&&reindexed.length===1&&reindexed[0].fileNo===1&&reindexed[0].offset===header.offset&&reindexed[0].length===header.length,'The unchanged indexer accepts lazy File-like slices and preserves original offsets');
const legacy={...world,disk:{...disk,sourceId:'source-chunks-legacy'}};
assert((await LegendsFastStore.readSourceFile(legacy,1))instanceof File,'Legacy source.file values remain native File handles');
assert((await LegendsFastStore.getRecord(legacy,'figures',1)).source_marker===record.source_marker,'Legacy File-backed records remain readable after reload');
const concurrentWorld={...world,disk:{...disk,sourceId:'source-chunks-concurrent'}},concurrentSource=await LegendsFastStore.readSourceFile(concurrentWorld,0),nativeArrayBuffer=Blob.prototype.arrayBuffer;
let activeReads=0,maxActiveReads=0,binaryReads=0,binaryBytes=0,maxReadSize=0,concurrentBytes;
Blob.prototype.arrayBuffer=async function(){activeReads++;binaryReads++;binaryBytes+=this.size;maxReadSize=Math.max(maxReadSize,this.size);maxActiveReads=Math.max(maxActiveReads,activeReads);try{await new Promise(resolve=>setTimeout(resolve,10));return await nativeArrayBuffer.call(this);}finally{activeReads--;}};
try{concurrentBytes=await Promise.all(Array.from({length:6},(_,index)=>concurrentSource.slice(index*8388608,index*8388608+1).arrayBuffer().then(buffer=>new Uint8Array(buffer)[0])));}finally{Blob.prototype.arrayBuffer=nativeArrayBuffer;}
assert(concurrentBytes.every((value,index)=>value===index+1),'Concurrent lazy range reads preserve each chunk without cross-contamination');
assert(binaryReads===6&&maxActiveReads===4,'Distinct source chunk reads are limited to four concurrent Blob reads');
assert(binaryBytes===6&&maxReadSize===1,'Six one-byte ranges from distinct 8 MiB source chunks decode exactly six bytes, without chunk-sized read amplification');
const repeatedReadSizes=[];let repeatedRanges;Blob.prototype.arrayBuffer=function(){repeatedReadSizes.push(this.size);return nativeArrayBuffer.call(this);};
try{repeatedRanges=await Promise.all([[10,41],[64,109]].map(range=>concurrentSource.slice(...range).arrayBuffer().then(buffer=>new Uint8Array(buffer))));}finally{Blob.prototype.arrayBuffer=nativeArrayBuffer;}
assert(repeatedRanges[0].length===31&&repeatedRanges[1].length===45&&repeatedRanges.every(bytes=>bytes.every(value=>value===1))&&repeatedReadSizes.length===2&&repeatedReadSizes.reduce((sum,n)=>sum+n,0)===76,'Repeated small ranges from the same cached chunk decode only the 76 requested bytes');
const baseline=await sourceSnapshot(),originalPut=IDBObjectStore.prototype.put,controller=new AbortController();let staged=0,cancelError,cancelCommitted=0;
IDBObjectStore.prototype.put=function(value,...rest){const request=originalPut.call(this,value,...rest);if(this.name==='sources'&&value.importId===disk.sourceId&&Array.isArray(value.fileNo))staged++;return request;};
try{await LegendsFastStore.persistReboundSources(world,files.filter(file=>file.name.endsWith('.xml')),{signal:controller.signal,progress(value){if(value.bytesWritten>=8388608&&!cancelCommitted){cancelCommitted++;controller.abort();}}});}catch(error){cancelError=error;}finally{IDBObjectStore.prototype.put=originalPut;}
assert(cancelError?.name==='AbortError'&&staged>=1,'Cancellation happens after a real staged chunk transaction commits: '+JSON.stringify({staged,cancelCommitted,aborted:controller.signal.aborted,error:cancelError?.name,message:cancelError?.message}));
assert(await sourceSnapshot()===baseline,'Cancellation cleans only staged chunks and preserves the previously published manifests and data');
let attempted=0,injectedError;
IDBObjectStore.prototype.put=function(value,...rest){if(this.name==='sources'&&value.importId===disk.sourceId&&Array.isArray(value.fileNo)){attempted++;if(attempted===2)throw new DOMException('Injected source chunk failure','QuotaExceededError');}return originalPut.call(this,value,...rest);};
try{await LegendsFastStore.persistReboundSources(world,files.filter(file=>file.name.endsWith('.xml')));}catch(error){injectedError=error;}finally{IDBObjectStore.prototype.put=originalPut;}
assert(injectedError?.name==='QuotaExceededError'&&attempted===2,'A write failure is injected after an earlier chunk has committed');
assert(await sourceSnapshot()===baseline,'Failure removes incomplete chunks without publishing or replacing any old source manifest');
assert((await LegendsFastStore.getRecord(world,'figures',1)).source_marker===record.source_marker,'The existing source remains readable after failed persistence');
const progress=[],publicationTransactions=new Set(),publishedSlots=[];
IDBObjectStore.prototype.put=function(value,...rest){if(this.name==='sources'&&value.importId===disk.sourceId&&value.format==='source-chunks-v1'){publicationTransactions.add(this.transaction);publishedSlots.push(value.fileNo);}return originalPut.call(this,value,...rest);};
try{await LegendsFastStore.persistReboundSources(world,files.filter(file=>file.name.endsWith('.xml')),{progress:value=>progress.push(value)});}finally{IDBObjectStore.prototype.put=originalPut;}
const replacement=await readSource([disk.sourceId,1]),replacementRows=(await readAll(sourceDB,'sources')).filter(row=>row.importId===disk.sourceId);
assert(replacement.token!==manifest.token&&replacement.format==='source-chunks-v1','Successful persistence atomically publishes a new complete source generation');
assert(publicationTransactions.size===1&&publishedSlots.join(',')==='1,2'&&(await readSource([disk.sourceId,2])).token!==plusManifest.token,'All selected XML manifests are published together in one atomic transaction');
assert(JSON.stringify(await readSource([disk.sourceId,0]))===JSON.stringify(imageManifest),'XML-only recovery preserves the image at its original slot');
assert(replacementRows.filter(row=>Array.isArray(row.fileNo)&&row.fileNo[0]===1).length===2,'A successful replacement removes the prior generation of XML chunks');
assert(!replacementRows.some(row=>Array.isArray(row.fileNo)&&row.fileNo[1]===manifest.token),'Old chunks are cleaned only after the replacement is published');
assert(JSON.stringify(disk)===metadataBefore,'Source-only persistence leaves index identity, facts, counts and analytics unchanged');
assert(!writes.length&&JSON.stringify({blocks:await readAll(indexDB,'blocks'),derived:await readAll(indexDB,'derived')})===indexBefore,'Source range reads and repairs never rewrite index blocks or statistics');
const legacyOmitted=await LegendsLocalStore.getWorld('source-chunks-legacy-omitted');
assert(!Object.hasOwn(legacyOmitted.disk,'dbName')&&!Object.hasOwn(legacyOmitted.disk,'sourceDbName'),'Compatibility fixture really omits both database-name fields');
assert((await LegendsFastStore.readSourceFile(legacyOmitted,1))instanceof File,'Missing database-name fields resolve the original legacy source');
const legacyRebound=await LegendsFastStore.rebindSourceFiles(legacyOmitted,files.filter(file=>file.name.endsWith('.xml')));
assert(legacyRebound.fileNos.join(',')==='1,2','Legacy rebinding retains the original XML slots');
await LegendsFastStore.persistReboundSources(legacyOmitted,files.filter(file=>file.name.endsWith('.xml')));
assert(legacyOmitted.disk.sourceDbName==='legends-file-index'&&!Object.hasOwn(legacyOmitted.disk,'dbName')&&legacyOmitted.disk.sourceId==='legacy-omitted-original','Object-world persistence uses the legacy default while retaining the existing source and index identity');
const legacyDB=await LegendsFastStore.database('legends-file-index'),legacyRows=(await readAll(legacyDB,'sources')).filter(row=>row.importId===legacyOmitted.disk.sourceId);
assert(legacyRows.filter(row=>typeof row.fileNo==='number'&&row.fileNo>0).every(row=>row.format==='source-chunks-v1')&&legacyRows.filter(row=>Array.isArray(row.fileNo)).length===3,'Repair publishes main and supplementary chunks in the original legacy database');
assert(!(await readAll(indexDB,'sources')).some(row=>row.importId===legacyOmitted.disk.sourceId),'Legacy repair never creates a second source namespace in the current database');
await LegendsLocalStore.saveWorld(legacyOmitted);
assert(!writes.length,'Legacy repair and metadata saving leave index blocks and statistics untouched');
return {checks,sourceBytes:manifest.size,chunkSize:manifest.chunkSize,chunkCount:manifest.chunkCount,firstFigure:{offset:header.offset,length:header.length,fileNo:header.fileNo},rangeCases:ranges.length,recordReadSizes,concurrentReads:{binaryReads,binaryBytes,maxReadSize,maxActiveReads,repeatedReadSizes},stagedBeforeCancel:staged,writesBeforeFailure:attempted,indexWrites:writes,progressEvents:progress.length};
'''

VERIFY_LEGACY_RELOAD=r'''
let checks=0;const assert=(condition,message)=>{if(!condition)throw new Error(message);checks++};
const world=await LegendsLocalStore.getWorld('source-chunks-legacy-omitted'),source=await LegendsFastStore.readSourceFile(world,1),plus=await LegendsFastStore.readSourceFile(world,2);
assert(world.disk.sourceDbName==='legends-file-index'&&!Object.hasOwn(world.disk,'dbName')&&world.disk.sourceId==='legacy-omitted-original','Legacy source namespace survives a full native page reload');
assert((await source.slice(8388528,8388755).text()).includes('山河_跨越原文件分块_READ_EXACT_BYTES'),'Legacy repaired source remains readable across the chunk boundary after reload');
assert((await plus.text()).includes('SUPPLEMENTARY_SOURCE'),'Legacy repaired supplementary XML remains readable after reload');
const current=await LegendsFastStore.database(),rows=await new Promise((resolve,reject)=>{const request=current.transaction('sources').objectStore('sources').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
assert(!rows.some(row=>row.importId==='legacy-omitted-original'),'Reload did not create any current-database source namespace');
return {checks,sourceDbName:world.disk.sourceDbName,sourceId:world.disk.sourceId};
'''

with tempfile.TemporaryDirectory(prefix='legends-source-chunks-')as temporary:
    temporary=Path(temporary);xml=temporary/'same-legends.xml';image=temporary/'map.png';plus=temporary/'same-legends_plus.xml'
    padding=CHUNK-80-len(PREFIX.encode())-7
    xml.write_text(PREFIX+'<!--'+'x'*padding+'-->'+RECORD+SUFFIX,encoding='utf-8');image.write_bytes(b'map slot zero')
    plus.write_text('<df_world><name>The Golden World</name><historical_figures><historical_figure><id>2</id><name>Domas Silverspear</name><race>DWARF</race><source_marker>SUPPLEMENTARY_SOURCE</source_marker></historical_figure></historical_figures></df_world>',encoding='utf-8')
    harness=temporary/'source-chunks.html';harness.write_text('<!doctype html><meta charset="utf-8"><input type="file" multiple id="files">'+''.join('<script src="'+(ROOT/'js'/name).as_uri()+'"></script>'for name in ['data.js','storage-values.js','local-store.js','file-indexer.js','fast-store.js']))
    with socket.socket()as listener:listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
    endpoint=f'http://127.0.0.1:{port}';log=(temporary/'driver.log').open('w');session=None
    driver=subprocess.Popen([shutil.which('chromedriver'),f'--port={port}'],stdout=log,stderr=subprocess.STDOUT)
    def request(method,path,data=None):
        req=urllib.request.Request(endpoint+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'},method=method)
        try:
            with urllib.request.urlopen(req,timeout=120)as response:value=json.load(response)['value']
        except urllib.error.HTTPError as error:raise RuntimeError(error.read().decode())from error
        if isinstance(value,dict)and value.get('error')and 'stacktrace'in value:raise RuntimeError(value)
        return value
    def command(path,data=None,method='POST'):return request(method,'/session/'+session+path,data)
    def run(script):
        result=command('/execute/async',{'script':'const done=arguments[arguments.length-1];(async()=>{'+script+'})().then(done,error=>done({error:String(error),stack:error.stack}));','args':[]})
        assert not result.get('error'),result
        return result
    def choose():
        element=command('/element',{'using':'css selector','value':'#files'})[ELEMENT]
        command('/element/'+element+'/value',{'text':str(image)+'\n'+str(xml)+'\n'+str(plus)})
    try:
        for _ in range(100):
            try:request('GET','/status');break
            except OSError:time.sleep(.05)
        session=request('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'binary':shutil.which('chromium'),'args':['--headless','--no-sandbox','--disable-gpu','--user-data-dir='+str(temporary/'profile')]},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId']
        command('/timeouts',{'script':120000,'pageLoad':30000});command('/url',{'url':harness.as_uri()});choose();prepared=run(PREPARE)
        # A saved Blob must own its bytes after the originally selected disk
        # paths disappear. Only this test's generated temporary XML is moved.
        moved_xml=temporary/'original-main-backup';moved_plus=temporary/'original-plus-backup';xml.rename(moved_xml);plus.rename(moved_plus)
        try:
            command('/refresh',{})
            independent=run('const world=await LegendsLocalStore.getWorld('+json.dumps(prepared['id'])+');const record=await LegendsFastStore.getRecord(world,"figures",1);return {ok:record.source_marker==="山河_跨越原文件分块_READ_EXACT_BYTES"};')
            assert independent.get('ok'),'Saved source chunks must remain readable without original file paths'
        finally:
            moved_xml.rename(xml);moved_plus.rename(plus)
        command('/refresh',{});choose();result=run(VERIFY);result['checks']+=1
        command('/refresh',{});legacy=run(VERIFY_LEGACY_RELOAD);result['checks']+=legacy['checks'];result['legacyReload']=legacy
        errors=[entry for entry in command('/log',{'type':'browser'})if entry.get('level')=='SEVERE'];assert not errors,errors
        print(json.dumps({'ok':True,'prepared':prepared,**result,'browserErrors':errors},ensure_ascii=False,indent=2))
    finally:
        if session:
            try:command('',method='DELETE')
            except Exception:pass
        driver.terminate();driver.wait(timeout=10);log.close()
