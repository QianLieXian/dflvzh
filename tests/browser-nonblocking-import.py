#!/usr/bin/env python3
"""Exercise first file:// UI import while background source persistence stalls/fails.

Uses native file selection and Blob Workers, Python stdlib + ChromeDriver only.
requestAnimationFrame callbacks are suppressed until background saving starts.
The generated ~160 MB file contains 2,000 records with padding; this is a fault
regression, not a representative throughput benchmark. No original XML is read.
"""
import json, shutil, socket, subprocess, tempfile, time, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ELEMENT='element-6066-11e4-a52e-4f735466cecf'

def fixture(path):
    with path.open('w') as out:
        out.write('<df_world><name>Background Import Test</name><historical_figures><historical_figure><id>1</id><name>Urist Copperhammer</name><race>DWARF</race><birth_year>1</birth_year><death_year>-1</death_year></historical_figure></historical_figures><sites><site><id>1</id><name>The Gold Mountain</name><type>fortress</type></site></sites><historical_events>')
        padding='x'*80000
        for i in range(2000):
            out.write(f'<historical_event><id>{i}</id><year>10</year><type>hf travel</type><group_hfid>1</group_hfid><site_id>1</site_id><details>FIRST_SOURCE_{i}_{padding}</details></historical_event>')
        out.write('</historical_events></df_world>')

with tempfile.TemporaryDirectory(prefix='legends-nonblocking-') as tmp:
    tmp=Path(tmp);original=tmp/'first-legends.xml';fixture(original)
    replacement=tmp/'second-legends.xml';replacement.write_text('<df_world><name>Other World</name><historical_events><historical_event><id>1999</id><year>99</year><type>hf died</type><details>SECOND_SOURCE</details></historical_event></historical_events></df_world>')
    for mode in ['pending','reject']:
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        base='http://127.0.0.1:'+str(port)
        driver=subprocess.Popen([shutil.which('chromedriver'),'--port='+str(port)],stdout=(tmp/(mode+'-driver.log')).open('w'),stderr=subprocess.STDOUT);session=None
        def request(method,path,data=None):
            req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'},method=method)
            with urllib.request.urlopen(req,timeout=180) as response:value=json.load(response)['value']
            if isinstance(value,dict) and value.get('error'):raise RuntimeError(value)
            return value
        def cmd(path,data=None,method='POST'):return request(method,'/session/'+session+path,data)
        def js(script,*args):return cmd('/execute/sync',{'script':script,'args':list(args)})
        def async_js(script,*args):return cmd('/execute/async',{'script':'const done=arguments[arguments.length-1];(async()=>{'+script+'})().then(done,error=>done({error:String(error),stack:error.stack}));','args':list(args)})
        def wait(script,timeout=90):
            deadline=time.monotonic()+timeout
            while time.monotonic()<deadline:
                value=js(script)
                if value:return value
                time.sleep(.1)
            raise AssertionError({'timeout':script,'state':js('return {progress:document.querySelector("#progress-text")?.textContent,error:document.querySelector("#import-error")?.textContent,status:window.LegendsImport?.getStatus(),fault:window.__fault}')})
        def element(selector):return cmd('/element',{'using':'css selector','value':selector})[ELEMENT]
        try:
            for _ in range(100):
                try:request('GET','/status');break
                except OSError:time.sleep(.05)
            session=request('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'binary':shutil.which('chromium'),'args':['--headless','--no-sandbox','--disable-gpu','--window-size=1512,1100','--user-data-dir='+str(tmp/(mode+'-profile'))]},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId']
            cmd('/timeouts',{'script':180000,'pageLoad':30000});cmd('/url',{'url':(ROOT/'index.html').as_uri()})
            wait('return !!window.LegendsApp&&!!window.DFTranslate?.event&&!document.querySelector("#main .loading")')
            assert js('return LegendsApp.state.world===null'), 'Must be the first import in a new profile'
            # An old app tab keeps its legacy v1 database connection indefinitely.
            # The new index namespace must finish without touching/upgrading it.
            legacy=async_js("""window.__legacy=await new Promise((resolve,reject)=>{const r=indexedDB.open('legends-file-index',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});window.__legacyChanged=false;__legacy.onversionchange=()=>__legacyChanged=true;return __legacy.version;""")
            assert legacy==1
            js(r"""window.__fault={mode:arguments[0],started:performance.now(),calls:[],progress:[],beats:0,maxGap:0};const f=__fault;window.__originalRAF=window.requestAnimationFrame;window.requestAnimationFrame=()=>{f.blockedRAFCalls=(f.blockedRAFCalls||0)+1;return 0;};const native=LegendsFastStore,patched={...native,persistSourceFiles(world,files){f.calls.push({at:performance.now(),world:world.id,files:Array.from(files,file=>({name:file.name,size:file.size}))});return f.mode==='pending'?new Promise(()=>{}):Promise.reject(new Error('Injected source save failure'));}};Object.defineProperty(patched,'workerSource',{value:native.workerSource});window.LegendsFastStore=Object.freeze(patched);const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);this.addEventListener('message',event=>{if(event.data?.type==='progress')f.progress.push({at:performance.now(),...event.data.progress});});}};let last=performance.now();window.__beat=setInterval(()=>{const now=performance.now();f.maxGap=Math.max(f.maxGap,now-last);last=now;f.beats++;},16);LegendsApp.showImport();""",mode)
            file_input=element('#file-input');cmd('/element/'+file_input+'/value',{'text':str(original)})
            cmd('/element/'+element('#start-import')+'/click',{})
            wait('return __fault.progress.some(p=>p.phase==="fileIndex"&&p.records>0)')
            wait('return !!LegendsApp.state.world?.disk&&!LegendsApp.state.importing&&!document.querySelector("#import-dialog").open&&__fault.calls.length===1')
            visible=js("""const s=LegendsApp.state,w=s.world;return {id:w.id,counts:w.disk.counts,format:w.disk.format,dbName:w.disk.dbName,sourcesPersisted:w.disk.sourcesPersisted,importing:s.importing,startEnabled:!document.querySelector('#start-import').disabled,fileEnabled:!document.querySelector('#file-input').disabled,modalOpen:document.querySelector('#import-dialog').open,pending:s.pendingSaves?.has(w.id)||false,rows:document.querySelectorAll('[data-table=events] tbody tr').length,toast:document.querySelector('#toast').textContent,firstIndex:__fault.progress.find(p=>p.phase==='fileIndex'&&p.records>0),persist:__fault.calls[0],legacyChanged:__legacyChanged,rafStubbed:window.requestAnimationFrame!==__originalRAF,status:LegendsImport.getStatus()};""")
            assert visible['counts']['events']==2000 and visible['format']=='file-index',visible
            assert visible['dbName']!='legends-file-index' and not visible['legacyChanged'],visible
            assert not visible['importing'] and visible['startEnabled'] and visible['fileEnabled'] and not visible['modalOpen'] and visible['rows']>0,visible
            assert visible['firstIndex']['at']<visible['persist']['at'],visible
            assert visible['status']['mode']=='worker' and visible['status']['activeWorkers']==0,visible
            assert visible['rafStubbed'] and not visible.get('sourcesPersisted'),visible
            if mode=='pending':assert visible['pending'],visible
            else:assert 'Injected source save failure' in wait("return document.querySelector('#toast').textContent.includes('Injected source save failure')&&document.querySelector('#toast').textContent"),visible
            js('window.requestAnimationFrame=__originalRAF')
            # Selecting another file after import must not change the pending
            # save's captured File array or the current world's raw source.
            js('LegendsApp.showImport()');cmd('/element/'+file_input+'/clear',{});cmd('/element/'+file_input+'/value',{'text':str(replacement)})
            assert js('return LegendsApp.state.files.map(f=>f.name)')==['second-legends.xml']
            cmd('/element/'+element('#close-import')+'/click',{})
            raw=async_js("""const world=LegendsApp.state.world,record=await LegendsLocalStore.getRecord(world,'events',1999);return {id:record?.id,details:record?.details?.slice(0,32),selected:LegendsApp.state.files.map(f=>f.name),captured:__fault.calls[0].files.map(f=>f.name)};""")
            assert not raw.get('error') and raw['id']==1999 and raw['details'].startswith('FIRST_SOURCE_1999_'),raw
            assert raw['captured']==['first-legends.xml'],raw
            js("document.querySelector('[data-page-table=events][aria-label=末页]').click()")
            wait("return LegendsApp.state.diskPages?.get('events')?.rows?.at(-1)?.id===1999&&!document.querySelector('[data-table=events]')?.hasAttribute('aria-busy')")
            ui_last=js("return {last:LegendsApp.state.diskPages.get('events').rows.at(-1).id,details:LegendsApp.state.diskPages.get('events').rows.at(-1).details.slice(0,32),text:document.querySelector('[data-table=events] tbody').textContent.slice(-200)}")
            assert ui_last['details'].startswith('FIRST_SOURCE_1999_'),ui_last
            js("location.hash='/figures/1'");wait("return LegendsApp.state.detailModel?.record?.id===1&&!document.querySelector('#main .loading')")
            detail=js("return {id:LegendsApp.state.detailModel.record.id,original:LegendsApp.state.detailModel.record.raw?.name,title:document.querySelector('.page-title')?.textContent,importing:LegendsApp.state.importing,startEnabled:!document.querySelector('#start-import').disabled}")
            assert detail['original']=='Urist Copperhammer' and not detail['importing'] and detail['startEnabled'],detail
            summary=js('clearInterval(__beat);__legacy.close();return {beats:__fault.beats,maxGap:__fault.maxGap,progressCount:__fault.progress.length,elapsed:performance.now()-__fault.started,pending:LegendsApp.state.pendingSaves?.size||0}')
            logs=cmd('/log',{'type':'browser'});assert not [entry for entry in logs if entry['level']=='SEVERE'],logs
            print(json.dumps({'mode':mode,'sourceBytes':original.stat().st_size,'visible':visible,'rawAfterSelection':raw,'uiLast':ui_last,'figureDetail':detail,'summary':summary,'console':logs},ensure_ascii=False),flush=True)
        finally:
            if session:
                try:cmd('',method='DELETE')
                except Exception:pass
            driver.terminate();driver.wait(timeout=10)
print('PASS',flush=True)
