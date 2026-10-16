#!/usr/bin/env python3
"""Attach and replace map images through the real file:// import dialog.

Python standard library and native Chromium / ChromeDriver only. A tiny generated
XML is imported with the existing file-index transport, then PNG and BMP files
are selected through the actual file input. No application server, Node, original
world export, existing browser profile, or file-access browser flag is used.
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
parser.add_argument('--screenshots', type=Path, help='Save the imported PNG and replacement BMP map views')
args = parser.parse_args()

XML = '''<?xml version="1.0" encoding="UTF-8"?><df_world>
<name>The Golden World</name><year>200</year><width>4</width><height>4</height>
<historical_figures><historical_figure><id>1</id><name>Urist Copperhammer</name><race>DWARF</race><birth_year>1</birth_year><death_year>-1</death_year></historical_figure></historical_figures>
<sites><site><id>1</id><name>The Golden Mountain</name><type>fortress</type><coords>1,1</coords><civ_id>1</civ_id><cur_owner_id>1</cur_owner_id></site></sites>
<entities><entity><id>1</id><name>The Copper Spears</name><type>civilization</type><race>DWARF</race></entity></entities>
<regions><region><id>1</id><name>The Silver Forest</name><type>Forest</type><coords>0,0|1,0</coords></region></regions>
<historical_events><historical_event><id>0</id><year>100</year><type>hf travel</type><group_hfid>1</group_hfid><site_id>1</site_id><details>ORIGINAL_SOURCE_UNCHANGED</details></historical_event></historical_events>
</df_world>'''


def png(width, height):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    pixels = b''.join(b'\x00' + bytes((20, 80, 180, 255)) * width for _ in range(height))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b'')


def bmp(width, height):
    row = bytes((40, 150, 220)) * width
    row += b'\x00' * ((-len(row)) % 4)
    pixels = row * height
    return b'BM' + struct.pack('<IHHI', 54 + len(pixels), 0, 0, 54) + struct.pack('<IiiHHIIiiII', 40, width, height, 1, 24, 0, len(pixels), 2835, 2835, 0, 0) + pixels


SNAPSHOT = r'''
const world=LegendsApp.state.world,db=await LegendsFastStore.database(world.disk.dbName),sourceDB=await LegendsFastStore.database(world.disk.sourceDbName||world.disk.dbName);
const read=(store,database=db)=>new Promise((resolve,reject)=>{const request=database.transaction(store).objectStore(store).getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
const sources=await read('sources',sourceDB),blocks=await read('blocks'),derived=await read('derived');
return {id:world.id,disk:JSON.stringify(world.disk),
  sources:await Promise.all(sources.filter(row=>typeof row.fileNo==='number').map(async row=>{const file=await LegendsFastStore.readSourceFile(world,row.fileNo);return {importId:row.importId,fileNo:row.fileNo,name:file.name,size:file.size,type:file.type,lastModified:file.lastModified,text:await file.text()}})),
  sourceRows:await Promise.all(sources.map(async row=>{if(!row.blob)return row;const digest=await crypto.subtle.digest('SHA-256',await row.blob.arrayBuffer());return {...row,blob:{size:row.blob.size,type:row.blob.type,sha256:Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}}})),
  blocks:JSON.stringify(blocks),derived:JSON.stringify(derived)};
'''

GUARDS = r'''
window.__attach={forbidden:[],invalidations:0};window.__originalWorld=LegendsApp.state.world;
window.__originalDisk=__originalWorld.disk;window.__originalIndexes=LegendsApp.state.indexes;
const blocked=label=>function(){__attach.forbidden.push(label);throw new Error('Unexpected '+label+' during image-only import')};
function guard(name,keys){const source=window[name],copy={...source};for(const key of keys)if(typeof source?.[key]==='function')copy[key]=blocked(name+'.'+key);if(source.workerSource)Object.defineProperty(copy,'workerSource',{value:source.workerSource});window[name]=copy;}
guard('LegendsData',['parseFiles','parseFilesStream','parseXML','parseRecord']);
guard('LegendsFileIndexer',['indexFiles']);
guard('LegendsFastStore',['createImport','persistSourceFiles','registerSourceFiles','refreshFacts','analytics']);
guard('LegendsLocalStore',['createImport','abortImport']);
const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...values){__attach.forbidden.push('Worker');super(...values)}};
const nativeInvalidate=LegendsMap.invalidate;window.LegendsMap={...LegendsMap,invalidate(world){__attach.invalidations++;return nativeInvalidate(world)}};
for(const method of ['put','add','delete','clear']){const native=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(...values){if(this.transaction.db.name===__originalDisk.dbName&&['sources','blocks','derived'].includes(this.name)){__attach.forbidden.push('IndexedDB '+this.name+'.'+method);throw new Error('Unexpected source/index mutation')}return native.apply(this,values)}}
return true;
'''


with tempfile.TemporaryDirectory(prefix='legends-map-image-') as temporary:
    temporary = Path(temporary)
    source = temporary / 'test-legends.xml'
    source.write_text(XML, encoding='utf-8')
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    first_image, second_image, invalid_image = (temporary / name for name in ['world-map.png', 'world-map.bmp', 'invalid-map.png'])
    first_image.write_bytes(png(64, 64))
    second_image.write_bytes(bmp(48, 32))
    invalid_image.write_bytes(b'This is not a valid image.')
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    endpoint = f'http://127.0.0.1:{port}'
    browser = shutil.which('chromium') or shutil.which('google-chrome')
    chromedriver = shutil.which('chromedriver')
    if not browser or not chromedriver:
        raise SystemExit('Chromium and a compatible chromedriver must be installed')
    log = (temporary / 'driver.log').open('w')
    driver = subprocess.Popen([chromedriver, f'--port={port}'], stdout=log, stderr=subprocess.STDOUT)
    session = None
    checks = 0

    def check(condition, detail):
        global checks
        if not condition:
            raise AssertionError(detail)
        checks += 1

    def request(method, path, data=None):
        req = urllib.request.Request(endpoint + path, data=None if data is None else json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method=method)
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
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
        result = command('/execute/async', {'script': 'const done=arguments[arguments.length-1];(async()=>{' + script + '})().then(done,error=>done({error:String(error),stack:error.stack}));', 'args': list(values)})
        if isinstance(result, dict) and result.get('error'):
            raise AssertionError(result)
        return result

    def wait(script, timeout=60):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            result = js(script)
            if result:
                return result
            time.sleep(.05)
        raise AssertionError({'timeout': script, 'state': js('return {importing:LegendsApp?.state.importing,error:document.querySelector("#import-error")?.textContent,progress:document.querySelector("#progress-text")?.textContent,attach:window.__attach}')})

    def element(selector):
        return command('/element', {'using': 'css selector', 'value': selector})[ELEMENT]

    def select_files(*paths):
        js('LegendsApp.showImport()')
        file_input = element('#file-input')
        command('/element/' + file_input + '/clear', {})
        command('/element/' + file_input + '/value', {'text': '\n'.join(str(path) for path in paths)})
        command('/element/' + element('#start-import') + '/click', {})
        wait('return !LegendsApp.state.importing')

    def wait_saved():
        wait('return !LegendsApp.state.pendingSaves?.size')

    def displayed_image(filename, width, height, expected_pixel):
        visible = wait('const world=LegendsApp.state.world;const image=[...document.querySelectorAll("#main .leaflet-image-layer")].find(image=>image.src===world.mapImage);return image?.complete&&image.naturalWidth>0&&image.getBoundingClientRect().width>0?{source:image.src,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,bounds:{width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height},mapFileName:world.mapFileName,mapWidth:world.mapImageWidth,mapHeight:world.mapImageHeight,route:LegendsApp.state.route,modal:document.querySelector("#import-dialog").open}:null;')
        check(visible['mapFileName'] == filename and visible['route'] == 'map' and not visible['modal'], visible)
        check((visible['naturalWidth'], visible['naturalHeight'], visible['mapWidth'], visible['mapHeight']) == (width, height, width, height), visible)
        pixel = js('const image=[...document.querySelectorAll("#main .leaflet-image-layer")].find(image=>image.src===LegendsApp.state.world.mapImage),canvas=document.createElement("canvas");canvas.width=canvas.height=1;const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]')
        check(pixel == expected_pixel, {'image': filename, 'pixel': pixel})
        if args.screenshots:
            args.screenshots.mkdir(parents=True, exist_ok=True)
            (args.screenshots / (filename + '.png')).write_bytes(base64.b64decode(command('/screenshot', method='GET')))
        visible.pop('source')
        return visible

    try:
        for _ in range(100):
            try:
                request('GET', '/status')
                break
            except OSError:
                time.sleep(.05)
        session = request('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'chrome', 'goog:chromeOptions': {'binary': browser, 'args': ['--headless', '--no-sandbox', '--disable-gpu', '--window-size=1512,1100', '--user-data-dir=' + str(temporary / 'profile')]}, 'goog:loggingPrefs': {'browser': 'ALL'}}}})['sessionId']
        command('/timeouts', {'script': 90000, 'pageLoad': 30000})
        command('/url', {'url': (ROOT / 'index.html').as_uri()})
        wait('return !!window.LegendsApp&&!!window.DFTranslate?.event&&!document.querySelector("#main .loading")')
        check(js('return LegendsApp.state.world===null'), 'Use a fresh profile without a world')
        select_files(first_image)
        no_world_error = js('return {error:document.querySelector("#import-error").textContent,visible:!document.querySelector("#import-error").hidden,world:LegendsApp.state.world}')
        check(no_world_error['visible'] and '请先载入' in no_world_error['error'] and no_world_error['world'] is None, no_world_error)
        command('/element/' + element('#close-import') + '/click', {})
        # Exercise the large-world storage path with a tiny fixture. The browser
        # still receives the original File from native file selection.
        js('window.__nativeData=LegendsData;window.LegendsData={...LegendsData,parseFiles:(files,progress,options)=>__nativeData.parseFiles(files,progress,{...options,storage:"disk"})};')
        select_files(source)
        wait('return !!LegendsApp.state.world?.disk&&LegendsApp.state.world.disk.sourcesPersisted&&!document.querySelector("#import-dialog").open')
        wait_saved()
        js('window.LegendsData=__nativeData;location.hash="/map";')
        wait('return LegendsApp.state.route==="map"&&!!document.querySelector(".lm-map .leaflet-image-layer")')
        baseline = async_js(SNAPSHOT)
        check(len(baseline['sources']) == 1 and baseline['sources'][0]['text'] == XML, baseline['sources'])
        check(json.loads(baseline['disk'])['format'] == 'file-index', baseline['disk'])
        initial_generated = js('return !!LegendsApp.state.world.generatedMapImage')
        check(initial_generated, 'Fixture must have a cached generated map before image attachment')
        check(js(GUARDS), 'Install import guards')
        select_files(first_image)
        first = displayed_image(first_image.name, 64, 64, [20, 80, 180, 255])
        wait_saved()
        check(async_js(SNAPSHOT) == baseline, 'PNG attachment must preserve the original sources, file index, statistics and disk metadata')
        identity = js('return {world:LegendsApp.state.world===__originalWorld,disk:LegendsApp.state.world.disk===__originalDisk,indexes:LegendsApp.state.indexes===__originalIndexes,generated:!!LegendsApp.state.world.generatedMapImage,files:LegendsApp.state.world.sourceFiles,guard:__attach}')
        check(identity['world'] and identity['disk'] and identity['indexes'] and not identity['generated'], identity)
        check(identity['guard']['forbidden'] == [] and identity['guard']['invalidations'] == 1, identity)
        check(source.name in identity['files'] and first_image.name in identity['files'], identity)
        original_image = js('return LegendsApp.state.world.mapImage')
        original_files = js('return LegendsApp.state.world.sourceFiles')
        select_files(invalid_image)
        invalid = js('return {error:document.querySelector("#import-error").textContent,visible:!document.querySelector("#import-error").hidden,image:LegendsApp.state.world.mapImage,files:LegendsApp.state.world.sourceFiles,mapFileName:LegendsApp.state.world.mapFileName,guard:__attach}')
        check(invalid['visible'] and '无法解码' in invalid['error'], invalid['error'])
        check(invalid['image'] == original_image and invalid['files'] == original_files and invalid['mapFileName'] == first_image.name, 'Invalid image must not replace successful map metadata')
        check(invalid['guard']['invalidations'] == 1 and not invalid['guard']['forbidden'], invalid['guard'])
        command('/element/' + element('#close-import') + '/click', {})
        select_files(first_image, second_image)
        multiple = js('return {error:document.querySelector("#import-error").textContent,visible:!document.querySelector("#import-error").hidden,image:LegendsApp.state.world.mapImage}')
        check(multiple['visible'] and '一次只能' in multiple['error'] and multiple['image'] == original_image, multiple['error'])
        command('/element/' + element('#close-import') + '/click', {})
        select_files(second_image)
        second = displayed_image(second_image.name, 48, 32, [220, 150, 40, 255])
        wait_saved()
        check(async_js(SNAPSHOT) == baseline, 'BMP replacement must preserve original sources, file index and statistics')
        guard = js('return __attach')
        check(guard['forbidden'] == [] and guard['invalidations'] == 2, guard)
        replacement_image = js('return LegendsApp.state.world.mapImage')
        command('/refresh', {})
        wait('return !!window.LegendsApp?.state.world?.disk&&LegendsApp.state.route==="map"&&!LegendsApp.state.importing')
        reloaded = displayed_image(second_image.name, 48, 32, [220, 150, 40, 255])
        check(js('return LegendsApp.state.world.mapImage') == replacement_image, 'Replacement BMP must survive a normal file:// refresh')
        check(async_js(SNAPSHOT) == baseline, 'Reload must reuse the original index and statistics')
        raw = async_js('const record=await LegendsLocalStore.getRecord(LegendsApp.state.world,"events",0);return {id:record.id,details:record.details};')
        check(raw == {'id': 0, 'details': 'ORIGINAL_SOURCE_UNCHANGED'}, raw)
        check(hashlib.sha256(source.read_bytes()).hexdigest() == source_hash, 'Original XML on disk must be unchanged')
        logs = command('/log', {'type': 'browser'})
        severe = [entry for entry in logs if entry.get('level') == 'SEVERE']
        check(not severe, severe)
        print(json.dumps({'ok': True, 'checks': checks, 'sourceBytes': source.stat().st_size, 'originalSourceSHA256': source_hash, 'png': first, 'bmp': second, 'reloaded': reloaded, 'guard': guard, 'invalidImage': invalid['error'], 'noWorld': no_world_error['error'], 'multipleImages': multiple['error'], 'browserErrors': severe}, ensure_ascii=False, indent=2))
    finally:
        if session:
            try:
                command('', method='DELETE')
            except Exception:
                pass
        driver.terminate()
        driver.wait(timeout=10)
        log.close()
