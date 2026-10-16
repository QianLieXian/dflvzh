#!/usr/bin/env python3
"""Check raw creature identifiers in native file:// list/detail rendering.

Python stdlib and Chromium/ChromeDriver only; uses a temporary small world.
"""
import argparse
import base64
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request


parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--screenshots',type=Path);args=parser.parse_args()

SCRIPT = r"""
const done=arguments[arguments.length-1];(async()=>{
 const checks=[],failures=[];function assert(value,label,actual){checks.push(label);if(!value)failures.push({label,actual});}
 async function wait(read){for(let attempt=0;attempt<400;attempt++){const value=read();if(value)return value;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error('UI wait timed out');}
 await wait(()=>window.LegendsApp&&window.DFTranslate);await DFTranslate.ready;
 const world={id:'creature-raw-ui',name:'World',year:100,figures:[{id:1,name:'Urist',race:'BIRD_ROC',caste:'FEMALE',birth_year:1,death_year:-1,journey_pet:['BIRD_ROC','COLOSSUS_BRONZE']},{id:2,name:'Domas',race:'COLOSSUS_BRONZE',caste:'MALE',birth_year:1,death_year:-1},{id:3,name:'Kogan',race:'JURASSIC_AFROVENATOR',caste:'FEMALE',birth_year:1,death_year:-1},{id:4,name:'Nil',race:'CENOZOIC_ENTELODON',caste:'MALE',birth_year:1,death_year:-1}],sites:[],entities:[],artifacts:[],events:[],eras:[],regions:[],collections:[],extra:{}};
 const anonymousCases=[['JURASSIC_AFROVENATOR','强颈猎龙'],['jurassic_afrovenator','强颈猎龙'],['CENOZOIC_ENTELODON','完齿兽'],['cenozoic entelodon','完齿兽'],['BIRD_ROC','大鹏鸟'],['COLOSSUS_BRONZE','青铜巨像'],['MOD_JURASSIC_AFROVENATOR','MOD_JURASSIC_AFROVENATOR']];
 // Parse actual historical_event fields: the anonymous slayer has no HF object
 // whose translated name could hide a missing creature RAW alias.
 for(const [index,[race]]of anonymousCases.entries())world.events.push(await LegendsData.parseRecord('<historical_event><id>'+String(101+index)+'</id><year>100</year><seconds72>'+index*1200+'</seconds72><type>hf died</type><hfid>1</hfid><slayer_hf>-1</slayer_hf><slayer_race>'+race+'</slayer_race><cause>struck</cause></historical_event>','historical_events'));
 const eventEnums=JSON.stringify(world.events.map(row=>({id:row.id,race:row.slayer_race,slayer:row.slayer_hf})));
 await LegendsApp.setWorld(world,{navigate:true});location.hash='#/hf';await wait(()=>LegendsApp.state.route==='figures'&&document.querySelectorAll('[data-table="list"] tbody tr').length===4);
 const rows=Array.from(document.querySelectorAll('[data-table="list"] tbody tr'),row=>row.cells[2].textContent.trim());
 assert(JSON.stringify(rows)===JSON.stringify(['大鹏鸟','青铜巨像','强颈猎龙','完齿兽']),'actual Figures table uses reviewed DFCN raw creature aliases',rows);
 const headers=Array.from(document.querySelectorAll('[data-table="list"] th'),node=>node.textContent.trim());
 assert(headers.some(label=>label.startsWith('类型'))&&headers.some(label=>label.startsWith('种姓')),'source Type/Caste column layout remains unchanged',headers);
 const source=JSON.stringify(world.figures.map(row=>({id:row.id,race:row.race,caste:row.caste})));
 for(const [id,label]of [[1,'大鹏鸟'],[2,'青铜巨像'],[3,'强颈猎龙'],[4,'完齿兽']]){
  LegendsApp.openRecord('figures',id);await wait(()=>LegendsApp.state.recordId===id&&LegendsApp.state.detailModel?.record?.id===id&&!document.querySelector('.loading'));
  const title=document.querySelector('.page-title p')?.textContent.trim();assert(title===label,'actual figure detail heading shares creature translation entry '+id,title);
  if(id===1)assert(document.querySelector('#main').textContent.includes('大鹏鸟')&&document.querySelector('#main').textContent.includes('青铜巨像'),'detail journey pets use same raw creature aliases');
 }
 for(const record of world.figures){
  const rules=[{propertyName:'Race',operator:'Equals',value:record.race.toLowerCase().replaceAll('_',' ')}],before=JSON.stringify(rules);
  assert(LegendsFilters.matches(record,'figures',rules,{world}),'shared filter compares original species token '+record.id);
  assert(before===JSON.stringify(rules),'filter rules retain original values '+record.id);
 }
 assert(source===JSON.stringify(world.figures.map(row=>({id:row.id,race:row.race,caste:row.caste}))),'list/detail/filter display never rewrites original XML enums');
 LegendsApp.openRecord('figures',1);await wait(()=>LegendsApp.state.recordId===1&&LegendsApp.state.detailModel?.record?.id===1&&!document.querySelector('[data-detail-loading]')&&document.querySelectorAll('[data-table="object-events"] tbody tr').length===anonymousCases.length);
 const eventRows=[...document.querySelectorAll('[data-table="object-events"] tbody tr')].map(row=>row.cells[row.cells.length-1].textContent.trim());
 for(const [index,[raw,label]]of anonymousCases.entries()){
  assert(eventRows[index].includes(label),'actual HF died event DOM localizes anonymous slayer_race '+raw,eventRows[index]);
  if(raw!==label)assert(!eventRows[index].includes(raw)&&!eventRows[index].includes(raw.replaceAll('_',' ')),'known anonymous slayer does not leak untranslated RAW token '+raw,eventRows[index]);
 }
 assert(eventRows.at(-1).includes('MOD_JURASSIC_AFROVENATOR')&&!eventRows.at(-1).includes('强颈猎龙'),'unknown mod anonymous slayer remains the exact original value',eventRows.at(-1));
 assert(eventEnums===JSON.stringify(world.events.map(row=>({id:row.id,race:row.slayer_race,slayer:row.slayer_hf}))),'actual event rendering preserves original XML slayer IDs and race enums');
 document.querySelector('[data-table="object-events"]').scrollIntoView({block:'start'});window.scrollBy(0,-72);

 return {ok:!failures.length,checks:checks.length,labels:checks,failures,listSpecies:rows,eventRows};
})().then(done,error=>done({ok:false,error:error.message,stack:error.stack}));
"""

with socket.socket() as listener:
    listener.bind(('127.0.0.1', 0))
    port = listener.getsockname()[1]
base = 'http://127.0.0.1:' + str(port)

def request(method, path, data=None):
    payload = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(base + path, data=payload, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as response:
        value = json.load(response).get('value')
    if isinstance(value, dict) and value.get('error') and 'stacktrace' in value:
        raise RuntimeError(value)
    return value

with tempfile.TemporaryDirectory(prefix='legends-creature-raw-') as temporary:
    log = open(Path(temporary) / 'driver.log', 'w')
    process = subprocess.Popen([shutil.which('chromedriver'), '--port=' + str(port)], stdout=log, stderr=subprocess.STDOUT)
    session = None
    try:
        for _ in range(100):
            try:
                request('GET', '/status')
                break
            except Exception:
                time.sleep(.05)
        session = request('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'chrome', 'goog:chromeOptions': {'binary': shutil.which('chromium'), 'args': ['--headless', '--no-sandbox', '--disable-gpu', '--window-size=1512,1200', '--user-data-dir=' + str(Path(temporary) / 'profile')]}, 'goog:loggingPrefs': {'browser': 'ALL'}}}})['sessionId']
        def command(path, data=None):
            return request('POST', '/session/' + session + path, data)
        command('/timeouts', {'script': 120000, 'pageLoad': 60000})
        command('/url', {'url': (Path(__file__).resolve().parents[1] / 'index.html').as_uri()})
        result = command('/execute/async', {'script': SCRIPT, 'args': []})
        if args.screenshots:
            args.screenshots.mkdir(parents=True,exist_ok=True)
            shot=request('GET','/session/'+session+'/screenshot')
            (args.screenshots/'events-anonymous-slayers.png').write_bytes(base64.b64decode(shot))
        logs = command('/log', {'type': 'browser'})
        result['browserErrors'] = [entry for entry in logs if entry.get('level') == 'SEVERE']
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if not result.get('ok') or result['browserErrors']:
            raise SystemExit(1)
    finally:
        if session:
            try:
                request('DELETE', '/session/' + session)
            except Exception:
                pass
        process.terminate()
        process.wait(timeout=10)
        log.close()
