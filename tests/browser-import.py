#!/usr/bin/env python3
"""Real Chromium file:// Worker/IndexedDB regression; Python standard library only.

python tests/browser-import.py
python tests/browser-import.py --large
python tests/browser-import.py --xml /path/world-legends.xml --expected-events 3981000 --skip-cancel
No HTTP application server, Node, Selenium package, or file-access browser flags.
ChromeDriver's local WebDriver port only controls the test browser.
"""
import argparse
import json
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument('--xml', action='append', type=Path, help='Existing main/plus XML; repeat for paired exports')
parser.add_argument('--expected-events', type=int, help='Expected raw XML event count, excluding derived battle fought events')
parser.add_argument('--large', action='store_true', help='Generate a 158 MB, 160,000-event fixture')
parser.add_argument('--skip-cancel', action='store_true', help='Skip the extra import canceled after 60%%')
parser.add_argument('--profile', type=Path, help='Keep this Chromium profile for inspection')
parser.add_argument('--browser', default=shutil.which('chromium') or shutil.which('google-chrome'))
parser.add_argument('--driver', default=shutil.which('chromedriver'))
parser.add_argument('--timeout', type=int, default=1800)
args = parser.parse_args()
if not args.browser or not args.driver:
    parser.error('Chromium/Chrome and a compatible chromedriver must be installed')


def fixture(path, count, padding):
    with path.open('w', encoding='utf-8') as out:
        out.write('<df_world><name>Import Regression</name><historical_figures><historical_figure><id>1</id><name>Urist</name><race>DWARF</race></historical_figure><historical_figure><id>2</id><name>Domas</name><race>DWARF</race></historical_figure></historical_figures><sites><site><id>1</id><name>Boatmurdered</name><type>fortress</type></site></sites><historical_events>')
        detail = 'a' * padding
        for begin in range(0, count, 1000):
            out.write(''.join('<historical_event><id>' + str(i) + '</id><year>' + str(i % 1000) + '</year><seconds72>0</seconds72><type>hf died</type><hfid>1</hfid><slayer_hf>2</slayer_hf><site_id>1</site_id><details>' + detail + '</details></historical_event>' for i in range(begin, min(begin + 1000, count))))
        out.write('</historical_events></df_world>')


def memory_tree(pid):
    """Linux aggregate RSS; shared pages can be counted more than once."""
    rows = {}
    for status in Path('/proc').glob('[0-9]*/status'):
        try:
            rows[int(status.parent.name)] = {line.split(':', 1)[0]: line.split(':', 1)[1].strip() for line in status.read_text().splitlines() if ':' in line}
        except (OSError, ValueError):
            pass
    found = {pid}
    while True:
        new = {p for p, row in rows.items() if int(row.get('PPid', '0')) in found} - found
        if not new:
            break
        found |= new
    total = {'rss': sum(int(rows[p].get('VmRSS', '0 kB').split()[0]) * 1024 for p in found if p in rows), 'pss': 0, 'privateDirty': 0}
    for process_id in found:
        try:
            memory = {line.split(':', 1)[0]: int(line.split(':', 1)[1].strip().split()[0]) * 1024 for line in (Path('/proc') / str(process_id) / 'smaps_rollup').read_text().splitlines() if ':' in line and line.split(':', 1)[1].strip().split()[0].isdigit()}
            total['pss'] += memory.get('Pss', 0)
            total['privateDirty'] += memory.get('Private_Dirty', 0)
        except (OSError, ValueError):
            pass
    return total


with tempfile.TemporaryDirectory(prefix='legends-browser-import-') as work:
    work = Path(work)
    files = [p.resolve() for p in args.xml or []]
    expected = args.expected_events
    if not files:
        count, padding = (160000, 800) if args.large else (1200, 24)
        generated = work / 'regression-legends.xml'
        fixture(generated, count, padding)
        files = [generated]
        expected = count
    for path in files:
        if not path.is_file():
            parser.error('Missing XML: ' + str(path))
    total_bytes = sum(path.stat().st_size for path in files)
    profile = args.profile.resolve() if args.profile else work / 'profile'
    profile.mkdir(parents=True, exist_ok=True)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = 'http://127.0.0.1:' + str(port)
    log = (work / 'chromedriver.log').open('w')
    process = subprocess.Popen([args.driver, '--port=' + str(port)], stdout=log, stderr=subprocess.STDOUT)
    session_id = None

    def request(method, path, data=None):
        encoded = None if data is None else json.dumps(data).encode()
        req = urllib.request.Request(base + path, data=encoded, method=method, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                value = json.load(response).get('value')
        except urllib.error.HTTPError as error:
            raise RuntimeError(error.read().decode()) from error
        if isinstance(value, dict) and value.get('error'):
            raise RuntimeError(value)
        return value

    def command(method, path, data=None):
        return request(method, '/session/' + session_id + path, data)

    def js(source, *values):
        return command('POST', '/execute/sync', {'script': source, 'args': list(values)})

    def async_js(source, *values):
        return command('POST', '/execute/async', {'script': source, 'args': list(values)})

    def wait_for(source, timeout=30):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            value = js(source)
            if value:
                return value
            time.sleep(.1)
        raise AssertionError('Browser wait timed out: ' + source)

    try:
        for _ in range(100):
            try:
                request('GET', '/status')
                break
            except (urllib.error.URLError, ConnectionError):
                time.sleep(.05)
        session_id = request('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'chrome', 'goog:chromeOptions': {'binary': args.browser, 'args': ['--headless', '--no-sandbox', '--disable-gpu', '--enable-precise-memory-info', '--user-data-dir=' + str(profile)]}, 'goog:loggingPrefs': {'browser': 'ALL'}}}})['sessionId']
        command('POST', '/timeouts', {'script': 90000, 'pageLoad': 30000})
        harness = work / 'import.html'
        harness.write_text('<!doctype html><meta charset="utf-8"><input type="file" multiple id="files">' + ''.join('<script src="' + (ROOT / 'js' / name).as_uri() + '"></script>' for name in ['data.js','local-store.js','file-indexer.js','fast-store.js','records.js','import-client.js']), encoding='utf-8')
        command('POST', '/url', {'url': harness.as_uri()})
        element = command('POST', '/element', {'using': 'css selector', 'value': '#files'})['element-6066-11e4-a52e-4f735466cecf']
        command('POST', '/element/' + element + '/value', {'text': '\n'.join(str(p) for p in files)})
        if not args.skip_cancel:
            js("""window.__cancel={state:'running'};const stats=__cancel,controller=new AbortController(),original=Worker.prototype.postMessage;let importId='',cancelAt=0;Worker.prototype.postMessage=function(message,...args){if(message.type==='prepare')importId=message.id;return original.call(this,message,...args)};LegendsData.parseFiles(document.querySelector('#files').files,p=>{if(!cancelAt&&p.percent>=60){cancelAt=performance.now();controller.abort();}},{storage:'disk',signal:controller.signal}).then(()=>{stats.state='error';stats.error='Unexpected success'},async error=>{Worker.prototype.postMessage=original;stats.name=error.name;stats.cancelMs=performance.now()-cancelAt;stats.rejectStatus=LegendsImport.getStatus();while(LegendsImport.getStatus().pendingCleanups)await new Promise(resolve=>setTimeout(resolve,20));const fast=stats.rejectStatus.format==='file-index',db=fast?await LegendsFastStore.database():await LegendsLocalStore.database();stats.database=db.name;stats.remainingStores=fast?['sources','blocks','derived']:['records','payloads'];stats.remaining=await Promise.all(stats.remainingStores.map(name=>new Promise((resolve,reject)=>{const r=db.transaction(name).objectStore(name).count(name==='derived'?importId:IDBKeyRange.bound([importId],[importId,[]]));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})));stats.cleanupMs=performance.now()-cancelAt;stats.status=LegendsImport.getStatus();stats.state='done'})""")
            cancel = wait_for("return __cancel.state==='running'?null:__cancel", args.timeout)
            print('CANCEL_AFTER_60_PERCENT', json.dumps(cancel, ensure_ascii=False), flush=True)
            assert cancel['name'] == 'AbortError' and all(count == 0 for count in cancel['remaining']) and cancel['rejectStatus']['activeWorkers'] == 0 and cancel['cancelMs'] < 1000

        js("""window.__test={state:'running',start:performance.now(),beats:0,maxGap:0,heapPeak:performance.memory?.usedJSHeapSize||0,progress:{},crossed27:false};const stats=__test;let last=performance.now();const timer=setInterval(()=>{const now=performance.now();stats.maxGap=Math.max(stats.maxGap,now-last);last=now;stats.beats++;stats.heapPeak=Math.max(stats.heapPeak,performance.memory?.usedJSHeapSize||0)},4);LegendsData.parseFiles(document.querySelector('#files').files,p=>{stats.progress=p;if(p.percent>=27)stats.crossed27=true;},{storage:arguments[0]?'disk':undefined}).then(async world=>{stats.importMs=performance.now()-stats.start;window.__world=world;const count=world.disk.counts.events||0,page=await LegendsLocalStore.query(world,'events',{page:Math.max(1,Math.ceil(count/10)),pageSize:10});stats.page={total:page.total,ids:page.rows.map(e=>e.id),last:page.rows.at(-1)?.id};stats.world={id:world.id,diskId:world.disk.id,name:world.name,counts:world.disk.counts,rawEventCount:world.disk.rawEventCount??world.disk.counts.events,syntheticEventCount:world.disk.aggregates?.virtualEvents?.count||0,memory:{events:world.events.length,figures:world.figures.length,collections:world.collections.length}};await LegendsLocalStore.saveWorld(world);stats.elapsed=performance.now()-stats.start;stats.status=LegendsImport.getStatus();stats.state='done';clearInterval(timer)},error=>{stats.state='error';stats.error=error.stack;clearInterval(timer)})""", total_bytes <= 128 * 1024 * 1024)
        baseline_memory = peak_memory = memory_tree(process.pid)
        started = last_report = time.monotonic()
        while True:
            result = js('return __test')
            memory = memory_tree(process.pid)
            peak_memory = {key: max(peak_memory[key], memory[key]) for key in peak_memory}
            if time.monotonic() - last_report >= 30:
                print('PROGRESS', json.dumps({'elapsed': time.monotonic() - started, 'percent': result.get('progress', {}).get('percent'), 'bytesRead': result.get('progress', {}).get('bytesRead'), 'records': result.get('progress', {}).get('records'), 'memoryPeak': peak_memory}, ensure_ascii=False), flush=True)
                last_report = time.monotonic()
            if result['state'] != 'running':
                break
            if time.monotonic() - started > args.timeout:
                raise AssertionError('Import timeout')
            time.sleep(1)
        result.update({'sourceBytes': total_bytes, 'memoryBaseline': baseline_memory, 'memoryPeak': peak_memory})
        print('WORKER_DISK', json.dumps(result, ensure_ascii=False), flush=True)
        assert result['state'] == 'done', result
        assert expected is None or result['world']['rawEventCount'] == expected
        assert result['world']['memory'] == {'events': 0, 'figures': 0, 'collections': 0}
        assert result['page']['total'] == result['world']['counts']['events']
        assert result['status']['mode'] == 'worker' and result['status']['storage'] == 'disk' and result['status']['activeWorkers'] == 0
        world_id, event_count, last_id = result['world']['id'], result['world']['counts']['events'], result['page']['last']
        command('POST', '/refresh', {})
        reload = async_js("""const done=arguments[arguments.length-1],id=arguments[0];(async()=>{const world=await LegendsLocalStore.getWorld(id),count=world.disk.counts.events,page=await LegendsLocalStore.query(world,'events',{page:Math.max(1,Math.ceil(count/10)),pageSize:10});localStorage.setItem('atlas.lastWorld',id);done({id:world.id,count,last:page.rows.at(-1)?.id,events:world.events.length})})().catch(e=>done({error:e.stack}))""", world_id)
        print('DATABASE_RELOAD', json.dumps(reload, ensure_ascii=False), flush=True)
        assert reload == {'id': world_id, 'count': event_count, 'last': last_id, 'events': 0}
        command('POST', '/url', {'url': (ROOT / 'index.html').as_uri() + '#/world'})
        wait_for("return window.LegendsApp?.state.world?.disk&&document.querySelectorAll('[data-table=events] tbody tr').length>0", 60)
        js("document.querySelector('[data-page-table=events][aria-label=末页]').click()")
        wait_for("return !document.querySelector('[data-table=events]')?.hasAttribute('aria-busy')&&LegendsApp.state.tables.get('events')?.page===Math.ceil(LegendsApp.state.world.disk.counts.events/10)", 60)
        ui = js("return{id:LegendsApp.state.world.id,count:LegendsApp.state.world.disk.counts.events,last:LegendsApp.state.diskPages?.get('events')?.rows?.at(-1)?.id,rows:document.querySelectorAll('[data-table=events] tbody tr').length}")
        print('MAIN_APP_LAST_PAGE', json.dumps(ui, ensure_ascii=False), flush=True)
        assert ui['id'] == world_id and ui['count'] == event_count and ui['last'] == last_id
        command('POST', '/refresh', {})
        wait_for("return window.LegendsApp?.state.world?.disk&&document.querySelectorAll('[data-table=events] tbody tr').length>0", 60)
        assert js('return LegendsApp.state.world.id') == world_id
        js("location.hash='/hf'")
        wait_for("return LegendsApp.state.route==='figures'&&LegendsApp.state.recordId===null&&!document.querySelector('[data-table=list]')?.hasAttribute('aria-busy')&&document.querySelectorAll('[data-table=list] tbody a').length>0",60)
        figure_list=js("return {count:LegendsApp.state.world.disk.counts.figures,rows:document.querySelectorAll('[data-table=list] tbody tr').length,firstId:LegendsApp.state.diskPages.get('figures').rows[0].id,error:document.querySelector('[role=alert]:not([hidden])')?.textContent}")
        assert not figure_list.get('error') and figure_list['rows']>0,figure_list
        print('RESTORED_FIGURE_LIST',json.dumps(figure_list,ensure_ascii=False),flush=True)
        figure_id=96 if figure_list['count']>96 else figure_list['firstId']
        js("location.hash='/hf/'+arguments[0]",figure_id)
        wait_for("return !!LegendsApp.state.detailModel&&!document.querySelector('.loading')",120)
        figure_detail=js("return {id:LegendsApp.state.detailModel.record.id,title:document.querySelector('.page-title h2')?.textContent,error:document.querySelector('[role=alert]:not([hidden])')?.textContent}")
        assert figure_detail['id']==figure_id and figure_detail['title'] and not figure_detail.get('error'),figure_detail
        print('RESTORED_FIGURE_DETAIL',json.dumps(figure_detail,ensure_ascii=False),flush=True)
        logs = command('POST', '/log', {'type': 'browser'})
        print('BROWSER_LOG', json.dumps(logs, ensure_ascii=False), flush=True)
        assert not [entry for entry in logs if entry['level'] == 'SEVERE']
        print('PASS', flush=True)
    finally:
        if session_id:
            try:
                request('DELETE', '/session/' + session_id)
            except Exception:
                pass
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
        log.close()
