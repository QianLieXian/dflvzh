#!/usr/bin/env python3
"""Native File-backed detail preview, cancellation and family range regression.

Uses a tiny generated XML, ordinary file:// index.html and a fresh Chromium
profile. Deliberately held related/family/navigation work verifies that the
source heading and profile paint first and obsolete routes stop cleanly.
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

def figure(number,name,links='',extra=''):
    return f'<historical_figure><id>{number}</id><name>{name}</name><race>DWARF</race><caste>MALE</caste><birth_year>1</birth_year><death_year>-1</death_year>{links}{extra}</historical_figure>'

def relation(number,kind):
    return f'<hf_link><hfid>{number}</hfid><link_type>{kind}</link_type><link_strength>100</link_strength></hf_link>'

XML='<df_world><name>The Golden World</name><year>200</year><historical_figures>'+figure(1,'Urist Copperhammer',relation(10,'mother')+relation(11,'father')+''.join(relation(number,'child')for number in range(20,28)),'<goal>rule the world</goal><sphere>metals</sphere><hf_skill><skill>MINING</skill><total_ip>18000</total_ip></hf_skill>')+figure(2,'Domas Silverspear')+figure(3,'Other Parent',relation(4,'mother')+relation(5,'father'))+figure(4,'Unused Ancestor')+figure(5,'Unused Ancestor')+figure(10,'Nil Silverbow',relation(12,'mother'))+figure(11,'Kogan Copperaxe')+figure(12,'Zasit Copperhammer',relation(13,'father'))+figure(13,'Mixed Ancestor',relation(14,'father'))+figure(14,'Mixed Ancestor',relation(15,'mother'))+figure(15,'Terminal Ancestor',relation(16,'mother'))+figure(16,'Undrawn Ancestor')+''.join(figure(number,'Child Copperhammer',relation(1,'father')+relation(3,'mother'))for number in range(20,28))+''.join(figure(number,'Boundary Copperhammer')for number in [4095,4096,8193])+'</historical_figures><historical_events><historical_event><id>0</id><type>hf travel</type><year>100</year><group_hfid>1</group_hfid></historical_event></historical_events></df_world>'

INSTALL=r'''
window.__detailProbe={phase:'relatedHold',reads:[],prefetch:[],activeFamily:0,maxFamily:0,figureScans:0,holds:{}};
const p=__detailProbe,local=LegendsLocalStore,fast=LegendsFastStore;
function aborted(){return new DOMException('cancelled','AbortError')}
function delay(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted){reject(aborted());return;}let timer;const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(aborted())};timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve()},ms);signal?.addEventListener('abort',abort,{once:true});})}
function hold(label,signal,finish){return new Promise((resolve,reject)=>{const entry={signal,aborted:false,release:()=>{signal?.removeEventListener('abort',abort);Promise.resolve().then(finish).then(resolve,reject)}};const abort=()=>{entry.aborted=true;signal?.removeEventListener('abort',abort);reject(aborted())};signal?.addEventListener('abort',abort,{once:true});p.holds[label]=entry;if(signal?.aborted)abort();});}
window.LegendsLocalStore={...local,
  async getRecord(world,kind,id,options={}){
    p.reads.push({phase:p.phase,kind,id:Number(id),hasSignal:!!options.signal});
    if(p.phase==='familyHold'&&kind==='figures'&&Number(id)===10)return hold('family',options.signal,()=>local.getRecord(world,kind,id,options));
    if(p.phase==='complete'&&kind==='figures'&&Number(id)>=10){p.activeFamily++;p.maxFamily=Math.max(p.maxFamily,p.activeFamily);try{await delay(15,options.signal);return await local.getRecord(world,kind,id,options)}finally{p.activeFamily--;}}
    return local.getRecord(world,kind,id,options);
  },
  related(world,kind,id,options={}){
    if(p.phase==='relatedHold'&&kind==='figures'&&Number(id)===1)return hold('related',options.signal,()=>local.related(world,kind,id,options));
    return local.related(world,kind,id,options);
  },
  prefetchRefs(world,rows,options={}){p.prefetch.push({phase:p.phase,hasSignal:!!options.signal,namesOnly:options.namesOnly===true});return local.prefetchRefs(world,rows,options)}
};
window.LegendsFastStore={...fast,scanHeaders(world,kind,visit,options={}){
 if(kind==='figures')p.figureScans++;
 if(p.phase==='neighborsHold'&&kind==='figures'&&!p.holds.neighbors)return hold('neighbors',options.signal,()=>fast.scanHeaders(world,kind,visit,options));
 return fast.scanHeaders(world,kind,visit,options);
}};
return true;
'''

with tempfile.TemporaryDirectory(prefix='legends-detail-loading-')as temporary:
    temporary=Path(temporary);original=temporary/'same-legends.xml';original.write_text(XML,encoding='utf-8')
    with socket.socket()as listener:listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
    endpoint=f'http://127.0.0.1:{port}';log=(temporary/'driver.log').open('w');session=None;checks=0
    driver=subprocess.Popen([shutil.which('chromedriver'),f'--port={port}'],stdout=log,stderr=subprocess.STDOUT)
    def check(condition,message):
        global checks
        assert condition,message
        checks+=1
    def request(method,path,data=None):
        req=urllib.request.Request(endpoint+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'},method=method)
        try:
            with urllib.request.urlopen(req,timeout=90)as response:value=json.load(response)['value']
        except urllib.error.HTTPError as error:raise RuntimeError(error.read().decode())from error
        if isinstance(value,dict)and value.get('error')and 'stacktrace'in value:raise RuntimeError(value)
        return value
    def command(path,data=None,method='POST'):return request(method,'/session/'+session+path,data)
    def js(script,*values):return command('/execute/sync',{'script':script,'args':list(values)})
    def wait(script):
        deadline=time.monotonic()+30
        while time.monotonic()<deadline:
            result=js(script)
            if result:return result
            time.sleep(.025)
        raise AssertionError({'timeout':script,'state':js('return {route:location.hash,text:document.querySelector("#main").textContent,model:LegendsApp.state.detailModel?.record.id,probe:{phase:__detailProbe?.phase,reads:__detailProbe?.reads,prefetch:__detailProbe?.prefetch,holds:Object.keys(__detailProbe?.holds||{})}}')})
    def complete(number):return wait('return LegendsApp.state.detailModel?.record.id==='+str(number)+'&&!document.querySelector("#main .loading")&&!!document.querySelector("#main .page-title h2")')
    try:
        for _ in range(100):
            try:request('GET','/status');break
            except OSError:time.sleep(.05)
        session=request('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'binary':shutil.which('chromium'),'args':['--headless','--no-sandbox','--disable-gpu','--window-size=1512,1100','--user-data-dir='+str(temporary/'profile')]},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId']
        command('/timeouts',{'script':90000,'pageLoad':30000});command('/url',{'url':(ROOT/'index.html').as_uri()})
        wait('return !!window.LegendsApp&&!document.querySelector("#main .loading")')
        js('window.__nativeData=LegendsData;window.LegendsData={...LegendsData,parseFiles:(files,progress,options)=>__nativeData.parseFiles(files,progress,{...options,storage:"disk"})};LegendsApp.showImport();')
        element=command('/element',{'using':'css selector','value':'#file-input'})[ELEMENT];command('/element/'+element+'/value',{'text':str(original)})
        js('document.querySelector("#start-import").click()')
        wait('return !!LegendsApp.state.world?.disk?.sourcesPersisted&&!LegendsApp.state.pendingSaves?.size&&!LegendsApp.state.importing')
        check(js(INSTALL),'Install native detail spies')
        js('LegendsApp.openRecord("figures",1)')
        wait('return !!__detailProbe.holds.related')
        preview=js('return {heading:document.querySelector("#main .page-title h2")?.textContent,profile:[...document.querySelectorAll(".section-heading h3")].some(el=>el.textContent==="人物概览"),text:document.querySelector("#main").textContent,loading:!!document.querySelector("[data-detail-loading]"),model:LegendsApp.state.detailModel}')
        check(preview['heading']and preview['profile']and preview['loading']and preview['model']is None,preview)
        check('199'in preview['text']and'出生'in preview['text']and'金属'in preview['text'],preview)
        js('LegendsApp.openRecord("figures",2)');complete(2)
        check(js('return __detailProbe.holds.related.aborted&&__detailProbe.holds.related.signal.aborted'),'Route change aborts held related work')
        js('__detailProbe.holds.related.release()');time.sleep(.05)
        check(js('return LegendsApp.state.detailModel.record.id===2&&!document.querySelector("#main [role=alert]")'),'Late old results cannot replace a newer figure page')
        js('__detailProbe.phase="complete";__detailProbe.reads=[];__detailProbe.prefetch=[];LegendsApp.openRecord("figures",1)');complete(1)
        family=js('return {loaded:LegendsApp.state.familyWorld.figures.map(row=>row.id).sort((a,b)=>a-b),displayed:LegendsApp.state.graphs.find(graph=>graph.cy)?.cy.nodes().map(node=>Number(node.id())).sort((a,b)=>a-b),reads:__detailProbe.reads,max:__detailProbe.maxFamily,prefetch:__detailProbe.prefetch,skills:document.querySelector("#main").textContent.includes("技能")}')
        expected=[1,10,11,12,13,14,15,*range(20,28)]
        check(family['loaded']==expected and family['displayed']==expected,family)
        check(not any(row['kind']=='figures'and row['id']in[3,4,5,16]for row in family['reads']),'Child ancestry that is never drawn must not be fetched in full: '+str(family))
        check(family['max']==4 and all(row['hasSignal']for row in family['reads']),family)
        check(family['prefetch']and all(row['hasSignal']and row['namesOnly']for row in family['prefetch']),family)
        check(family['skills'],'The remaining original cards appear when detail work finishes')
        js('__detailProbe.phase="idle";LegendsApp.openRecord("figures",2)');complete(2)
        js('__detailProbe.phase="familyHold";LegendsApp.openRecord("figures",1)');wait('return !!__detailProbe.holds.family')
        js('LegendsApp.openRecord("figures",2)');complete(2)
        check(js('return __detailProbe.holds.family.aborted&&__detailProbe.holds.family.signal.aborted'),'Family reads inherit the page cancellation signal')
        js('__detailProbe.holds.family.release()');time.sleep(.05)
        check(js('return LegendsApp.state.detailModel.record.id===2&&!document.querySelector("#main [role=alert]")'),'Cancelled family work cannot poison the next page')
        js('__detailProbe.phase="bitset";__detailProbe.figureScans=0;LegendsApp.state.neighborIds.clear();LegendsApp.openRecord("figures",8193)');complete(8193)
        last_nav=wait('const prev=document.querySelector(".object-actions [aria-label=上一项]"),next=document.querySelector(".object-actions [aria-label=下一项]");return prev?.getAttribute("href")&&next?.getAttribute("href")?{previous:prev.getAttribute("href"),next:next.getAttribute("href")}:null')
        check(last_nav=={'previous':'#/hf/4096','next':'#/hf/1'},last_nav)
        js('LegendsApp.openRecord("figures",4096)');complete(4096)
        middle_nav=js('return {previous:document.querySelector(".object-actions [aria-label=上一项]").getAttribute("href"),next:document.querySelector(".object-actions [aria-label=下一项]").getAttribute("href")}')
        check(middle_nav=={'previous':'#/hf/4095','next':'#/hf/8193'},middle_nav)
        js('LegendsApp.openRecord("figures",1)');complete(1)
        first_nav=js('return {previous:document.querySelector(".object-actions [aria-label=上一项]").getAttribute("href"),next:document.querySelector(".object-actions [aria-label=下一项]").getAttribute("href")}')
        check(first_nav=={'previous':'#/hf/8193','next':'#/hf/2'},first_nav)
        bitset=js('return {scans:__detailProbe.figureScans,ids:LegendsApp.state.neighborIds.get("figures")}')
        check(bitset['scans']==0 and bitset['ids']==[1,2,3,4,5,10,11,12,13,14,15,16,*range(20,28),4095,4096,8193],bitset)
        js('__detailProbe.phase="idle";LegendsApp.openRecord("figures",2)');complete(2)
        js('window.__figureBits=LegendsApp.state.world.disk.aggregates.figureExistence;delete LegendsApp.state.world.disk.aggregates.figureExistence;__detailProbe.phase="neighborsHold";LegendsApp.state.neighborIds.clear();LegendsApp.openRecord("figures",1)');wait('return !!__detailProbe.holds.neighbors');complete(1)
        check(js('return !__detailProbe.holds.neighbors.aborted&&!!document.querySelector("#main .page-title h2")'),'Unfinished neighbor navigation does not block the full detail page')
        js('__detailProbe.holds.neighbors.release()')
        nav=wait('const prev=document.querySelector(".object-actions [aria-label=上一项]"),next=document.querySelector(".object-actions [aria-label=下一项]");return prev?.getAttribute("href")&&next?.getAttribute("href")?{previous:prev.getAttribute("href"),next:next.getAttribute("href")}:null')
        check(nav=={'previous':'#/hf/8193','next':'#/hf/2'},nav)
        js('LegendsApp.state.world.disk.aggregates.figureExistence=__figureBits')
        errors=[entry for entry in command('/log',{'type':'browser'})if entry.get('level')=='SEVERE'];check(not errors,errors)
        print(json.dumps({'ok':True,'checks':checks,'sourceBytes':original.stat().st_size,'firstPaint':preview,'family':family,'navigation':nav,'bitset':bitset,'browserErrors':errors},ensure_ascii=False,indent=2))
    finally:
        if session:
            try:command('',method='DELETE')
            except Exception:pass
        driver.terminate();driver.wait(timeout=10);log.close()
