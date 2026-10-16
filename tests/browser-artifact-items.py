#!/usr/bin/env python3
"""Regress real unnamed artifact item captions in native Chromium file://.

Python stdlib + Chromium/ChromeDriver only. The first ten artifact fields were
read from the user's export at byte offsets 1,362,753..1,364,188; the embedded
copy keeps this test independent of that large export and its installation.
All browser databases and the CP437 XML fixture live in a disposable directory.
"""
import argparse
import base64
import html
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
ITEMS = ['crossbow', 'battle axe', 'earring', 'bracelet', 'ring', 'ring',
         'amulet', 'bracelet', 'amulet', 'amulet']
ACTUAL = [{'id': str(index), 'item': {'name_string': '\x11primordial wood ' + item + '\x10'},
           'holder_hfid': str(36 + index)} for index, item in enumerate(ITEMS)]
# Filled from independently audited DFCN material/item entries, rather than
# invoking the function under test to obtain expected item labels.
EXPECTED = ['◄原初木十字弩►', '◄原初木战斧►', '◄原初木耳环►',
            '◄原初木手镯►', '◄原初木戒指►', '◄原初木戒指►',
            '◄原初木护身符►', '◄原初木手镯►', '◄原初木护身符►',
            '◄原初木护身符►']
EXTRA = [
    {'id': '10', 'name': 'The Bronze Book',
     'item': {'name_string': '\x11primordial wood crossbow\x10'}, 'holder_hfid': '36'},
    {'id': '11', 'translated_name': 'The Silver Spear',
     'item': {'name_string': '\x11primordial wood crossbow\x10'}, 'holder_hfid': '36'},
    {'id': '12', 'item': {'name_string': 'modium crossbow'}, 'holder_hfid': '36'},
    {'id': '13', 'item': {'name_string': 'primordial wood modded wand'}, 'holder_hfid': '36'},
]
BOOKS = [
    {'id': '3057', 'item': {'name_string': '«chicken parchment scroll»',
                          'writing_written_content_id': '15725'}, 'site_id': '747'},
    {'id': '5078', 'item': {'name_string': '«tetrahedrite-bound codex»',
                          'page_number': '3', 'page_written_content_id': '24887'}, 'site_id': '650'},
]
BOOK_EXPECTED = ['«鸡皮纸卷轴»', '«黝铜矿书壳装订抄本»']
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--audit', type=Path, help='Optionally compare the embedded fields with a saved read-only source audit JSON.')
parser.add_argument('--report', type=Path)
parser.add_argument('--screenshots', type=Path)
args = parser.parse_args()
if args.audit:
    audited = [row['fields'] for row in json.loads(args.audit.read_text())['artifacts']]
    if audited != ACTUAL:
        parser.error('Embedded artifact fields differ from the independently read source audit.')
for program in ['chromium', 'chromedriver']:
    if not shutil.which(program):
        parser.error(program + ' must be on PATH.')


def element(tag, value):
    if isinstance(value, dict):
        text = ''.join(element(key, child) for key, child in value.items())
    else:
        text = html.escape(str(value), quote=False)
    return '<' + tag + '>' + text + '</' + tag + '>'


artifacts = ACTUAL + EXTRA + BOOKS
figures = [{'id': str(index), 'name': 'Urist ' + str(index), 'race': 'DWARF',
            'caste': 'MALE', 'birth_year': '1', 'death_year': '-1'} for index in range(36, 46)]
events = [{'id': str(100 + index), 'year': '100', 'seconds72': str(index * 1200),
           'type': 'artifact created', 'artifact_id': record['id'],
           'hfid': record.get('holder_hfid', '36'), 'site_id': '1'} for index, record in enumerate(artifacts)]
xml = '<?xml version="1.0" encoding="CP437"?><df_world><name>Artifact Item Regression</name><year>100</year>'
xml += '<historical_figures>' + ''.join(element('historical_figure', row) for row in figures) + '</historical_figures>'
xml += '<sites>' + ''.join(element('site', {'id': str(site), 'name': 'The Silver Town ' + str(site),
    'type': 'town', 'coords': '1,1'}) for site in [1, 650, 747]) + '</sites>'
xml += '<artifacts>' + ''.join(element('artifact', row) for row in artifacts) + '</artifacts>'
xml += '<historical_events>' + ''.join(element('historical_event', row) for row in events) + '</historical_events>'
xml += '<written_contents>' + ''.join(element('written_content', {'id': str(work), 'title': 'The Bronze Book ' + str(work),
    'type': 'essay', 'author': '36'}) for work in [15725, 24887]) + '</written_contents></df_world>'

SCRIPT = r"""
const done=arguments[arguments.length-1];(async()=>{
 const [stage,originals,itemExpected,bookExpected]=arguments,checks=[],reports=[];
 function assert(value,label,actual){checks.push(label);if(!value)throw new Error(JSON.stringify({label,actual}));}
 async function wait(read){for(let i=0;i<600;i++){const value=read();if(value)return value;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error(JSON.stringify({label:'UI wait timed out',stage,hash:location.hash,query:LegendsApp.state.query,rows:[...document.querySelectorAll('[data-table=list] tbody tr')].map(row=>row.textContent),main:document.querySelector('#main')?.textContent}));}
 await wait(()=>window.LegendsApp&&window.LegendsItemTranslate);await DFTranslate.ready;
 const world=LegendsApp.state.world;
 const named=originals.slice(10,12).map(row=>DFTranslate.name(row.name||row.translated_name,{kind:'artifact',rawName:row.name||row.translated_name}));
 const expected=Object.fromEntries(originals.map((row,index)=>[Number(row.id),[...itemExpected,...named,originals[12].item.name_string,originals[13].item.name_string,...bookExpected][index]]));
 function sameFields(record,source){const raw=record.raw||record;return Object.entries(source).every(([key,value])=>key==='item'?Object.entries(value).every(([field,text])=>String(raw.item?.[field])===String(text)):String(raw[key])===String(value));}
 async function list(kind,route){location.hash=route;await wait(()=>LegendsApp.state.route===kind&&LegendsApp.state.recordId===null&&!!document.querySelector('[data-table=list] tbody')&&!document.querySelector('#main [aria-busy=true]'));const select=document.querySelector('[data-page-size=list]');select.value='100';select.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>!document.querySelector('#main [aria-busy=true]'));}
 function listRows(){return [...document.querySelectorAll('[data-table=list] tbody tr')].filter(row=>row.cells.length>1).map(row=>({id:Number(row.cells[0].textContent.replaceAll(',','')),name:row.cells[1].querySelector('a')?.textContent.trim(),text:row.textContent}));}
 const listStarted=performance.now();location.hash='#/artifact';
 await wait(()=>LegendsApp.state.route==='artifacts'&&LegendsApp.state.recordId===null&&!!document.querySelector('[data-table=list] tbody')&&!document.querySelector('#main [aria-busy=true]'));
 const firstList={milliseconds:performance.now()-listStarted,visibleRows:listRows().length};
 await list('artifacts','#/artifact');
 const rows=listRows();assert(JSON.stringify(rows.map(row=>row.id))===JSON.stringify(originals.map(row=>Number(row.id))),stage+' artifact DOM retains every exact source ID',rows);
 for(const row of rows)assert(row.name===expected[row.id],stage+' artifact list uses the correct caption/name path '+row.id,row);
 assert(named.every((value,index)=>value!==itemExpected[0]),stage+' actual proper names remain distinct from item descriptions',named);
 // Simulate the stale in-memory name cache used before item captions acquired
 // their own translator. The same normalized record.name is present in saved
 // worlds from the previous version.
 let staleKeys=0;
 for(const row of LegendsApp.state.indexes.artifacts.values())if(Number(row.id)<10){LegendsApp.state.names.set('artifacts:'+row.id+':'+row.name+'::','旧姓名缓存错误');staleKeys++;}
 assert(staleKeys===10,stage+' stale legacy name-cache paths are actually exercised',staleKeys);
 for(const original of originals){const id=Number(original.id);
  LegendsApp.openRecord('artifacts',id);await wait(()=>LegendsApp.state.detailModel?.kind==='artifacts'&&Number(LegendsApp.state.detailModel.record.id)===id&&!document.querySelector('[data-detail-loading]'));
  const model=LegendsApp.state.detailModel,heading=document.querySelector('#main h2')?.textContent.trim(),body=document.querySelector('#main').textContent;
  assert(heading===expected[id],stage+' artifact detail shares the item/name path '+id,{heading,expected:expected[id]});
  assert(sameFields(model.record,original),stage+' artifact detail preserves original XML fields and control markers '+id,model.record);
  const locationKind=original.holder_hfid?'figures':'sites',locationId=original.holder_hfid||original.site_id;
  assert(document.querySelector('[data-object-kind='+locationKind+'][data-object-id="'+locationId+'"] a'),stage+' original holder or site link remains reachable '+id);
  if(id<10)assert(!(model.record.raw||model.record).name,stage+' unnamed artifact still has no invented raw proper name '+id,model.record.raw);
  if(id===10||id===11)assert(body.includes(itemExpected[0]),stage+' named artifact retains separately translated original item caption '+id,body);
  reports.push({id,heading,item:model.record.item?.name_string,raw:model.record.raw});
 }
 LegendsApp.openRecord('sites',1);await wait(()=>LegendsApp.state.detailModel?.kind==='sites'&&Number(LegendsApp.state.detailModel.record.id)===1&&!document.querySelector('[data-detail-loading]')&&!!document.querySelector('[data-table=object-events] tbody'));
 const eventPage=document.querySelector('[data-page-size=object-events]');eventPage.value='100';eventPage.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>!document.querySelector('#main [aria-busy=true]')&&document.querySelectorAll('[data-table=object-events] tbody tr').length===originals.length);
 const links=[...document.querySelectorAll('[data-table=object-events] [data-object-kind=artifacts]')].map(node=>({id:Number(node.dataset.objectId),text:node.querySelector('a')?.textContent.trim(),href:node.querySelector('a')?.getAttribute('href')}));
 assert(links.length===originals.length,stage+' real artifact-created event DOM retains every typed artifact link',links);
 for(const link of links)assert(link.text===expected[link.id]&&link.href==='#/artifact/'+link.id,stage+' typed event artifact link reuses item/name display '+link.id,link);
 // Compare actual list search results. English searches use original source
 // text; Chinese searches use only the display label, without rewriting raw.
 for(const [query,ids]of [['primordial wood earring',[2]],[itemExpected[2],[2]],['The Bronze Book',[10]],['modium crossbow',[12]]]){
  await list('artifacts','#/artifact');const input=document.querySelector('#collection-query'),host=document.querySelector('[data-table=list]');let updated=false;const observer=new MutationObserver(()=>{updated=true;});observer.observe(host,{childList:true});input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}));
  await wait(()=>updated&&LegendsApp.state.query===query&&!document.querySelector('#main [aria-busy=true]'));observer.disconnect();
  const found=listRows();assert(JSON.stringify(found.map(row=>row.id))===JSON.stringify(ids),stage+' actual English/Chinese search '+query,found);
 }
 for(const original of originals){const record=world.disk?await LegendsLocalStore.getRecord(world,'artifacts',Number(original.id)):world.artifacts.find(row=>Number(row.id)===Number(original.id));assert(sameFields(record,original),stage+' list/detail/search leaves raw artifact intact '+original.id,record);}
 return {checks:checks.length,labels:checks,details:reports,list:rows,eventLinks:links,namedExpected:named,firstList};
})().then(done,error=>done({error:error.message,stack:error.stack}));
"""

with tempfile.TemporaryDirectory(prefix='legends-artifact-items-') as temporary:
    temporary = Path(temporary)
    fixture = temporary / 'artifact_items-00100-01-01-legends.xml'
    fixture.write_bytes(xml.encode('cp437'))
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    endpoint = f'http://127.0.0.1:{port}'
    log = (temporary / 'driver.log').open('w')
    driver = subprocess.Popen([shutil.which('chromedriver'), f'--port={port}'], stdout=log, stderr=subprocess.STDOUT)
    session = None

    def request(method, path, data=None):
        req = urllib.request.Request(endpoint + path, data=None if data is None else json.dumps(data).encode(), method=method, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=180) as response:
                value = json.load(response)['value']
        except urllib.error.HTTPError as error:
            raise RuntimeError(error.read().decode()) from error
        if isinstance(value, dict) and value.get('error') and 'stacktrace' in value:
            raise RuntimeError(value)
        return value

    def command(path, data=None, method='POST'):
        return request(method, '/session/' + session + path, data)

    def js(script, *values):
        return command('/execute/sync', {'script': script, 'args': list(values)})

    def async_js(script, *values):
        value = command('/execute/async', {'script': 'const done=arguments[arguments.length-1];(async()=>{' + script + '})().then(done,error=>done({error:String(error),stack:error.stack}));', 'args': list(values)})
        if isinstance(value, dict) and value.get('error'):
            raise AssertionError(value)
        return value

    def wait(script):
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            value = js(script)
            if value:
                return value
            time.sleep(.025)
        raise AssertionError({'wait': script, 'body': js('return document.body.textContent')})

    def inspect(label):
        value = command('/execute/async', {'script': SCRIPT, 'args': [label, artifacts, EXPECTED, BOOK_EXPECTED]})
        if value.get('error'):
            raise AssertionError(value)
        return value

    try:
        for _ in range(100):
            try:
                request('GET', '/status')
                break
            except OSError:
                time.sleep(.05)
        session = request('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'chrome', 'goog:chromeOptions': {'binary': shutil.which('chromium'), 'args': ['--headless', '--no-sandbox', '--disable-gpu', '--window-size=1512,1200', '--user-data-dir=' + str(temporary / 'profile')]}, 'goog:loggingPrefs': {'browser': 'ALL'}}}})['sessionId']
        command('/timeouts', {'script': 150000, 'pageLoad': 30000})
        command('/url', {'url': (ROOT / 'index.html').as_uri()})
        wait('return !!window.LegendsApp&&!!window.LegendsItemTranslate')
        reports = []
        for storage in ['memory', 'disk']:
            js('document.querySelector("#file-input").value="";document.querySelector("#file-input").disabled=false;')
            file_input = command('/element', {'using': 'css selector', 'value': '#file-input'})['element-6066-11e4-a52e-4f735466cecf']
            command('/element/' + file_input + '/value', {'text': str(fixture)})
            world_id = async_js('const files=[...document.querySelector("#file-input").files],world=await LegendsData.parseFiles(files,null,{storage:arguments[0]});if(world.disk)await LegendsFastStore.persistSourceFiles(world,files);await LegendsApp.setWorld(world,{navigate:true});await LegendsLocalStore.saveWorld(world);return world.id;', storage)
            reports.append({'stage': storage + '-import', **inspect(storage + '-import')})
            command('/refresh', {})
            wait('return !!window.LegendsApp&&!!window.LegendsItemTranslate')
            async_js('const world=await LegendsLocalStore.getWorld(arguments[0]);await LegendsApp.setWorld(world,{navigate:true});return true;', world_id)
            reports.append({'stage': storage + '-legacy-refresh', **inspect(storage + '-legacy-refresh')})
        benchmark = async_js('const frame=document.createElement("iframe");frame.hidden=true;document.body.appendChild(frame);frame.contentWindow.DFCN_ITEMS=window.DFCN_ITEMS;const script=frame.contentDocument.createElement("script");script.src=new URL("js/item-translate.js",location.href).href;await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;frame.contentDocument.head.appendChild(script);});const api=frame.contentWindow.LegendsItemTranslate,sources=arguments[0],started=performance.now(),cold=sources.map(source=>api.translate(source)),middle=performance.now(),hot=sources.map(source=>api.translate(source)),ended=performance.now();frame.remove();return {coldMilliseconds:middle-started,hotMilliseconds:ended-middle,count:sources.length,cold,hot,instance:"fresh independent iframe; shared immutable vocabulary, fresh parser/index/cache"};', [record['item']['name_string'] for record in ACTUAL])
        if benchmark['cold'] != EXPECTED or benchmark['hot'] != EXPECTED:
            raise AssertionError({'label': 'fresh cold/hot direct item calls match the independent DFCN oracle', 'actual': benchmark})
        errors = [row for row in command('/log', {'type': 'browser'}) if row.get('level') == 'SEVERE']
        if errors:
            raise AssertionError(errors)
        if args.screenshots:
            args.screenshots.mkdir(parents=True, exist_ok=True)
            js('location.hash="#/artifact"')
            wait('return LegendsApp.state.route==="artifacts"&&LegendsApp.state.recordId===null&&!!document.querySelector("[data-table=list] tbody")&&!document.querySelector("[aria-busy=true]")')
            js('const input=document.querySelector("#collection-query");input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));const select=document.querySelector("[data-page-size=list]");select.value="100";select.dispatchEvent(new Event("change",{bubbles:true}));')
            wait('return LegendsApp.state.query===""&&document.querySelectorAll("[data-table=list] tbody tr").length===16&&!document.querySelector("[aria-busy=true]")')
            (args.screenshots / 'artifact-item-list.png').write_bytes(base64.b64decode(command('/screenshot', method='GET')))
        result = {'ok': True, 'checks': sum(report['checks'] for report in reports) + 2,
                  'sourceFields': ACTUAL, 'bookFields': BOOKS, 'expectedItems': EXPECTED, 'expectedBooks': BOOK_EXPECTED,
                  'reports': reports, 'directTranslationBenchmark': benchmark, 'browserErrors': errors}
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print(json.dumps({'ok': True, 'checks': result['checks'],
            'stages': [{'stage': report['stage'], 'checks': report['checks'], 'firstList': report['firstList'], 'list': report['list']}
                       for report in reports], 'directTranslationBenchmark': benchmark,
            'browserErrors': errors}, ensure_ascii=False, indent=2))
    finally:
        if session:
            try:
                command('', method='DELETE')
            except Exception:
                pass
        driver.terminate()
        driver.wait(timeout=10)
        log.close()
