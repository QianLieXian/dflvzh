#!/usr/bin/env python3
"""Verify the main file:// app saves an upgraded world and reuses it on reload.

python tests/browser-upgrade.py
Uses a tiny native File input, temporary Chromium profile, Python stdlib and
ChromeDriver. No application server, Node, large XML, or file-access flags.
"""
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ELEMENT = 'element-6066-11e4-a52e-4f735466cecf'
EXPECTED_VERSION = 5
FIXTURE = '''<df_world><name>Saved Upgrade Regression</name>
<historical_figures>
<historical_figure><id>1</id><name>Urist Copperhammer</name><race>DWARF</race><birth_year>1</birth_year><death_year>-1</death_year></historical_figure>
<historical_figure><id>2</id><name>Domas Ironshield</name><race>DWARF</race><birth_year>2</birth_year><death_year>-1</death_year></historical_figure>
</historical_figures><sites><site><id>1</id><name>The Copper Mountain</name><type>fortress</type></site></sites>
<historical_events><historical_event><id>7</id><year>10</year><type>poetic form created</type><hist_figure_id>1</hist_figure_id><reason>glorify hf</reason><reason_id>2</reason_id><details>ORIGINAL_UPGRADE_SOURCE</details></historical_event></historical_events>
</df_world>'''

# Installed before each main app document runs, so even a very short upgrade is
# observable. Analytics sends `import` only when it creates replacement indexes.
OBSERVER = '''window.__upgrade={workers:0,imports:[],factsProgress:0};
const NativeWorker=window.Worker;
window.Worker=class extends NativeWorker {
  constructor(...args) {
    super(...args); __upgrade.workers++;
    this.addEventListener('message',({data})=>{
      if(data.type==='import')__upgrade.imports.push(data.id);
      if(data.type==='progress'&&data.value?.phase==='facts')__upgrade.factsProgress++;
    });
  }
};'''

with tempfile.TemporaryDirectory(prefix='legends-saved-upgrade-') as temporary:
    temporary = Path(temporary)
    source = temporary / 'upgrade-legends.xml'
    source.write_text(FIXTURE, encoding='utf-8')
    harness = temporary / 'seed.html'
    harness.write_text('<!doctype html><meta charset="utf-8"><input type="file" id="files">' + ''.join(
        '<script src="' + (ROOT / 'js' / name).as_uri() + '"></script>'
        for name in ['data.js', 'local-store.js', 'file-indexer.js', 'fast-store.js']), encoding='utf-8')
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    base = 'http://127.0.0.1:' + str(port)
    browser, driver = shutil.which('chromium') or shutil.which('google-chrome'), shutil.which('chromedriver')
    if not browser or not driver:
        raise SystemExit('Chromium/Chrome and a compatible chromedriver must be installed')
    log = (temporary / 'driver.log').open('w')
    process = subprocess.Popen([driver, '--port=' + str(port)], stdout=log, stderr=subprocess.STDOUT)
    session = None

    def request(method, path, data=None):
        req = urllib.request.Request(base + path, data=None if data is None else json.dumps(data).encode(),
                                     headers={'Content-Type': 'application/json'}, method=method)
        with urllib.request.urlopen(req, timeout=120) as response:
            value = json.load(response).get('value')
        if isinstance(value, dict) and value.get('error') and 'stacktrace' in value:
            raise RuntimeError(value)
        return value

    def command(path, data=None):
        return request('POST', '/session/' + session + path, data)

    def js(script, *args):
        return command('/execute/sync', {'script': script, 'args': list(args)})

    def async_js(script, *args):
        value = command('/execute/async', {'script': 'const done=arguments[arguments.length-1];'
            '(async()=>{' + script + '})().then(done,error=>done({error:error.stack||String(error)}));',
            'args': list(args)})
        assert not isinstance(value, dict) or not value.get('error'), value
        return value

    def wait(script, timeout=60):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            value = js(script)
            if value:
                return value
            time.sleep(.1)
        raise AssertionError({'timeout': script, 'observed': js('return window.__upgrade'),
                              'main': js('return document.querySelector("#main")?.textContent.slice(0,500)')})

    def snapshot(world_id, original_id):
        return async_js('''
const id=arguments[0],oldId=arguments[1];
const value=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const saved=await LegendsLocalStore.getWorld(id);
const db=await LegendsFastStore.database(saved.disk.dbName),tx=db.transaction(['sources','blocks','derived']);
const requests=[value(tx.objectStore('sources').getAll()),value(tx.objectStore('blocks').count(IDBKeyRange.bound([oldId],[oldId,[]]))),value(tx.objectStore('derived').get(saved.disk.id))];
const [sources,oldBlocks,storedDerived]=await Promise.all(requests),derived=await LegendsStorageValues.unpack(storedDerived),raw=await LegendsFastStore.getRecord(saved,'events',7);
return {worldId:saved.id,diskId:saved.disk.id,facts:saved.disk.factsVersion,version:saved.disk.aggregates?.version,sourceId:saved.disk.sourceId,sourceDbName:saved.disk.sourceDbName,sourcesPersisted:saved.disk.sourcesPersisted,sources:sources.filter(item=>Number.isInteger(item.fileNo)).map(item=>({id:item.importId,fileNo:item.fileNo,size:item.file?.size??item.size})),oldBlocks,derivedVersion:derived?.version,eventId:raw?.id,sourceMarker:raw?.details,relatedCount:LegendsFastStore.metrics(saved,'figures',{id:2}).eventCount,observer:__upgrade};
''', world_id, original_id)

    try:
        for _ in range(100):
            try:
                request('GET', '/status')
                break
            except OSError:
                time.sleep(.05)
        session = request('POST', '/session', {'capabilities': {'alwaysMatch': {
            'browserName': 'chrome', 'goog:chromeOptions': {'binary': browser, 'args': [
                '--headless', '--no-sandbox', '--disable-gpu', '--window-size=1512,1100',
                '--user-data-dir=' + str(temporary / 'profile')]},
            'goog:loggingPrefs': {'browser': 'ALL'}}}})['sessionId']
        command('/timeouts', {'script': 120000, 'pageLoad': 30000})
        command('/url', {'url': harness.as_uri()})
        element = command('/element', {'using': 'css selector', 'value': '#files'})[ELEMENT]
        command('/element/' + element + '/value', {'text': str(source)})
        seeded = async_js('''
const file=document.querySelector('#files').files[0],session=await LegendsFastStore.createImport({files:[file],persistSources:true});
const metadata=await LegendsFileIndexer.indexFiles([file],{onMetadata:session.metadata,onBlock:headers=>session.writeBlock(headers.map(header=>{
  const old={...header,factsVersion:2,refs:header.refs.filter(ref=>!ref.sourceCondition)};
  for(const key of ['reason','reason_id','circumstance','circumstance_id','method','relevant_id_for_method','relevant_entity_id','sanctify_hf','anon_4'])delete old[key];
  return old;
}))});metadata.factsVersion=2;
const world=await session.finish(metadata);world.factsVersion=2;world.disk.aggregates={version:3};
await LegendsLocalStore.saveWorld(world);
// Explicitly invalidate derived data so restoring truly exercises the old facts.
const db=await LegendsFastStore.database();await new Promise((resolve,reject)=>{const tx=db.transaction('derived','readwrite');tx.objectStore('derived').delete(world.disk.id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
localStorage.setItem('atlas.lastWorld',world.id);
return {worldId:world.id,diskId:world.disk.id,dbName:world.disk.dbName,facts:world.disk.factsVersion,version:world.disk.aggregates.version};
''')
        assert seeded['facts'] == 2 and seeded['version'] == 3, seeded
        print('SEEDED_OLD_WORLD', json.dumps(seeded), flush=True)
        command('/goog/cdp/execute', {'cmd': 'Page.addScriptToEvaluateOnNewDocument', 'params': {'source': OBSERVER}})
        command('/url', {'url': (ROOT / 'index.html').as_uri() + '#/world'})
        wait("return LegendsApp?.state.world?.disk?.factsVersion===3&&LegendsApp.state.world.disk.aggregates?.version===" + str(EXPECTED_VERSION) + "&&!LegendsApp.state.pendingSaves?.size&&document.querySelectorAll('[data-table=events] tbody tr').length>0")
        upgraded = snapshot(seeded['worldId'], seeded['diskId'])
        assert upgraded['diskId'] != seeded['diskId'], upgraded
        assert upgraded['facts'] == 3 and upgraded['version'] == upgraded['derivedVersion'] == EXPECTED_VERSION, upgraded
        assert upgraded['sourceId'] == seeded['diskId'] and upgraded['sourceDbName'] == seeded['dbName'] and upgraded['sourcesPersisted'], upgraded
        assert upgraded['sources'] == [{'id': seeded['diskId'], 'fileNo': 0, 'size': source.stat().st_size}], upgraded
        assert upgraded['oldBlocks'] == 0, upgraded
        assert upgraded['eventId'] == 7 and upgraded['sourceMarker'] == 'ORIGINAL_UPGRADE_SOURCE' and upgraded['relatedCount'] == 1, upgraded
        assert upgraded['observer']['workers'] == 1 and upgraded['observer']['imports'] == [upgraded['diskId']] and upgraded['observer']['factsProgress'] > 0, upgraded
        print('MAIN_APP_SAVED_UPGRADE', json.dumps(upgraded), flush=True)
        command('/refresh', {})
        wait("return LegendsApp?.state.world?.disk?.factsVersion===3&&!LegendsApp.state.pendingSaves?.size&&document.querySelectorAll('[data-table=events] tbody tr').length>0")
        reloaded = snapshot(seeded['worldId'], seeded['diskId'])
        assert reloaded['diskId'] == upgraded['diskId'] and reloaded['facts'] == 3 and reloaded['version'] == EXPECTED_VERSION, reloaded
        assert reloaded['sources'] == upgraded['sources'] and reloaded['eventId'] == 7 and reloaded['relatedCount'] == 1, reloaded
        assert reloaded['observer'] == {'workers': 0, 'imports': [], 'factsProgress': 0}, reloaded
        print('RELOAD_REUSES_UPGRADE', json.dumps(reloaded), flush=True)
        logs = command('/log', {'type': 'browser'})
        assert not [entry for entry in logs if entry['level'] == 'SEVERE'], logs
        print('BROWSER_LOG', json.dumps(logs), flush=True)
        print('PASS', flush=True)
    finally:
        if session:
            try:
                request('DELETE', '/session/' + session)
            except Exception:
                pass
        process.terminate()
        process.wait(timeout=10)
        log.close()
