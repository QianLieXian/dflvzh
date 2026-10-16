#!/usr/bin/env python3
"""Check main + Legends Plus geography through native Chromium and file://.

Uses Python stdlib, Chromium and ChromeDriver, a disposable browser profile, and
small read-only XML fixtures. No server or Node runtime is required. By default
the upstream Xah_Atho test exports in /tmp/dfcs-reference-upstream are used;
--main and --plus can select another matching pair of small fixtures.
"""
import argparse
import json
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DATA = Path('/tmp/dfcs-reference-upstream/LegendsViewer.Backend.Tests/TestData')
GROUPS = [('landmasses', 'landmasses', '/landmass'),
          ('rivers', 'rivers', '/river'),
          ('mountainpeaks', 'mountain_peaks', '/mountainpeak')]
ELEMENT = 'element-6066-11e4-a52e-4f735466cecf'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--main', type=Path, default=DATA / 'Xah_Atho-00005-01-01-legends.xml')
parser.add_argument('--plus', type=Path, default=DATA / 'Xah_Atho-00005-01-01-legends_plus.xml')
parser.add_argument('--report', type=Path, help='Optionally save the full JSON report.')
args = parser.parse_args()
args.main, args.plus = args.main.resolve(), args.plus.resolve()
for path in [args.main, args.plus]:
    if not path.is_file():
        parser.error(f'Fixture not found: {path}. Pass --main and --plus.')
for program in ['chromium', 'chromedriver']:
    if not shutil.which(program):
        parser.error(f'{program} must be on PATH.')


def source_oracle(path):
    """Decode the declared CP437/UTF-8 encoding independently of the app."""
    data = path.read_bytes()
    declared = re.search(br'encoding=[\"\']([^\"\']+)', data[:160])
    encoding = declared.group(1).decode('ascii') if declared else 'utf-8'
    root = ET.fromstring(re.sub(r'^<\?xml[^>]*\?>', '', data.decode(encoding)))
    values = {}
    for _, group, _ in GROUPS:
        section = root.find(group)
        records = [{child.tag: child.text or '' for child in row}
                   for row in section] if section is not None else []
        values[group] = {'present': section is not None, 'records': records,
                         'count': len(records)}
    return {'path': str(path), 'encoding': encoding, 'groups': values}


def merged_records(oracles, group):
    # These source geography records have scalar fields. Missing River IDs are
    # assigned in original record order, as upstream River.cs does.
    result, keys = [], {}
    for oracle in oracles:
        for record in oracle['groups'][group]['records']:
            key = ('id', record['id']) if 'id' in record else ('name', record.get('name'))
            if key in keys:
                result[keys[key]].update(record)
            else:
                keys[key] = len(result)
                result.append(dict(record))
    return [dict(record, id=int(record.get('id', index)), _source_keys=list(record))
            for index, record in enumerate(result)]


def points(record):
    raw = record.get('coords') or record.get('path') or '|'.join(
        record.get(key, '') for key in ['coord_1', 'coord_2'])
    result = []
    for part in raw.split('|'):
        if part:
            x, y = map(int, part.split(',')[:2])
            result.append({'x': x, 'y': y})
    if record.get('end_pos'):
        x, y = map(int, record['end_pos'].split(',')[:2])
        end = {'x': x, 'y': y}
        if end not in result:
            result.append(end)
    return result


def source_type(kind, record):
    if kind == 'landmasses':
        name = record.get('name', '').lower()
        return next((title for title in ['Continent', 'Island', 'Land']
                     if title.lower() in name), 'Unknown')
    if kind == 'rivers':
        return 'River'
    return 'Volcano' if 'is_volcano' in record else 'Mountain Peak'


oracles = [source_oracle(args.main), source_oracle(args.plus)]
checks, reports = [], []


def check(condition, label, actual=None):
    checks.append(label)
    if not condition:
        raise AssertionError({'label': label, 'actual': actual})


with tempfile.TemporaryDirectory(prefix='legends-geography-') as temporary:
    temporary = Path(temporary)
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    endpoint = f'http://127.0.0.1:{port}'
    log = (temporary / 'driver.log').open('w')
    driver = subprocess.Popen([shutil.which('chromedriver'), f'--port={port}'],
                              stdout=log, stderr=subprocess.STDOUT)
    session = None

    def request(method, path, data=None):
        payload = None if data is None else json.dumps(data).encode()
        req = urllib.request.Request(endpoint + path, data=payload, method=method,
                                     headers={'Content-Type': 'application/json'})
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
        value = command('/execute/async', {'script':
            'const done=arguments[arguments.length-1];(async()=>{' + script +
            '})().then(done,error=>done({error:String(error),stack:error.stack}));',
            'args': list(values)})
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
        raise AssertionError({'wait': script, 'state': js(
            'return {hash:location.hash,route:LegendsApp?.state.route,'
            'main:document.querySelector("#main")?.textContent};')})

    def select_files(paths):
        # WebDriver clear rejects a file input inside a closed dialog. Clearing
        # value is permitted by the browser; native send_keys supplies real Files.
        js('document.querySelector("#file-input").value="";'
           'document.querySelector("#file-input").disabled=false;')
        element = command('/element', {'using': 'css selector', 'value': '#file-input'})[ELEMENT]
        command('/element/' + element + '/value', {'text': '\n'.join(map(str, paths))})

    def inspect_group(kind, group, route, expected, disk):
        js('location.hash=arguments[0]', route)
        ready = ('return LegendsApp.state.route===' + json.dumps(kind) +
                 '&&!document.querySelector("#main [aria-busy=true]")'
                 '&&!!document.querySelector("[data-table=list] tbody")')
        wait(ready)
        js('const select=document.querySelector("[data-page-size=list]");'
           'select.value="100";select.dispatchEvent(new Event("change",{bubbles:true}));')
        wait(ready)
        shown, table_pages = [], []
        while True:
            table = js('return {rows:[...document.querySelectorAll("[data-table=list] tbody tr")].map(row=>[...row.cells].map(cell=>cell.textContent.trim())),pagination:document.querySelector("[data-table=list] .pagination").textContent,next:!document.querySelector("[data-page-table=list][aria-label=下一页]").disabled};')
            table_pages.append(table)
            shown.extend(int(row[0]) for row in table['rows'] if len(row) > 1)
            if not table['next']:
                break
            js('document.querySelector("[data-page-table=list][aria-label=下一页]").click()')
            wait(ready)
        ids = [row['id'] for row in expected]
        check(sorted(shown) == sorted(ids), kind + ' DOM list shows every exact source ID', shown)
        check(re.search(r'/\s*' + f'{len(expected):,}' + r'\s*$', table['pagination']) is not None,
              kind + ' DOM pagination uses the complete source count', table['pagination'])
        if disk:
            query = async_js('const world=LegendsApp.state.world,kind=arguments[0],ids=[];let total;for(let page=1;;page++){const q=await LegendsLocalStore.query(world,kind,{page,pageSize:100,headersOnly:true});total=q.total;ids.push(...q.rows.map(row=>row.id));if(ids.length>=total)break;}return {total,ids};', kind)
            check(query['total'] == len(expected) and sorted(query['ids']) == sorted(ids),
                  kind + ' file index retains all source IDs and the exact count', query)
        value = {'ids': shown, 'pages': table_pages}
        if not expected:
            return value
        type_labels = js('return arguments[0].map(value=>DFTranslate.term(value))',
                         [source_type(kind, row) for row in expected])
        expected_types = dict(zip(ids, type_labels))
        check(all(row[2] == expected_types[int(row[0])]
                  for page in table_pages for row in page['rows']),
              kind + ' DOM Type column follows the original source inference', table_pages)
        original = expected[0]
        js('LegendsApp.openRecord(arguments[0],arguments[1])', kind, original['id'])
        wait('return LegendsApp.state.detailModel?.kind===' + json.dumps(kind) +
             '&&LegendsApp.state.detailModel.record.id===' + str(original['id']) +
             '&&!document.querySelector("[data-detail-loading]")')
        detail = js('const model=LegendsApp.state.detailModel;return {heading:document.querySelector("#main h2").textContent,record:model.record,location:!!model.location,points:LegendsMap.objectCoordinates(LegendsApp.state.world,model.kind,model.record),locationCard:[...document.querySelectorAll("#main .section-card")].some(card=>card.querySelector("h3")?.textContent==="位置")};')
        check(bool(detail['heading']), kind + ' representative detail renders its heading', detail)
        check(detail['record'].get('type') == source_type(kind, original),
              kind + ' detail uses the same source Type as its list', detail['record'])
        raw = detail['record'].get('raw', detail['record'])
        # Normalized numeric fields may become numbers; original text remains
        # unchanged in raw for disk records and in the full in-memory record.
        preserved = all(str(raw.get(key)) == str(original[key])
                        for key in original['_source_keys'])
        check(preserved, kind + ' representative detail preserves original XML fields', raw)
        check(detail['points'] == points(original),
              kind + ' detail map preserves source coordinates and endpoint order', detail['points'])
        check(detail['location'] and detail['locationCard'],
              kind + ' original Location card is mounted', detail)
        value['detail'] = detail
        return value

    try:
        for _ in range(100):
            try:
                request('GET', '/status')
                break
            except OSError:
                time.sleep(.05)
        session = request('POST', '/session', {'capabilities': {'alwaysMatch': {
            'browserName': 'chrome', 'goog:chromeOptions': {
                'binary': shutil.which('chromium'), 'args': ['--headless', '--no-sandbox',
                '--disable-gpu', '--window-size=1512,1200', '--user-data-dir=' + str(temporary / 'profile')]},
            'goog:loggingPrefs': {'browser': 'ALL'}}}})['sessionId']
        command('/timeouts', {'script': 150000, 'pageLoad': 30000})
        command('/url', {'url': (ROOT / 'index.html').as_uri()})
        wait('return !!window.LegendsApp')
        inference = js('const cases=[["landmasses",{name:"The isLand CONTINENT Land"},"Continent"],["landmasses",{name:"Island of Land"},"Island"],["landmasses",{name:"BorderLAND"},"Land"],["landmasses",{name:"Unexplored"},"Unknown"],["rivers",{name:"Water",type:"original XML type"},"River"],["mountain_peaks",{name:"Peak",is_volcano:false},"Volcano"],["mountainpeaks",{name:"Peak",is_volcano:""},"Volcano"],["mountainpeaks",{name:"Peak",is_volcano:0},"Volcano"],["mountain_peaks",{name:"Peak"},"Mountain Peak"],["landmasses",{name:"已译名",raw:{name:"Original Continent",type:"source type"}},"Continent"]];return cases.map(([kind,record,expected])=>{const before=JSON.stringify(record.raw||record);LegendsData.normalizeGeography(record,kind);const type=record.type;LegendsData.normalizeGeography(record,kind);return {kind,expected,type,repeat:record.type,rawUnchanged:JSON.stringify(record.raw)===before};});')
        check(all(row['type'] == row['expected'] == row['repeat'] for row in inference),
              'source geography inference keeps original priority, substring and flag-presence rules', inference)
        check(all(row['rawUnchanged'] for row in inference),
              'type inference and repeated normalization preserve original XML names and fields', inference)
        world_id = None
        for mode, paths, sources in [('main-only', [args.main], oracles[:1]),
                                     ('memory-pair', [args.plus, args.main], oracles),
                                     ('disk-pair', [args.plus, args.main], oracles)]:
            select_files(paths)
            disk = mode == 'disk-pair'
            imported = async_js('const files=[...document.querySelector("#file-input").files],world=await LegendsData.parseFiles(files,null,{storage:arguments[0]});if(world.disk){await LegendsFastStore.persistSourceFiles(world,files);await LegendsLocalStore.saveWorld(world);}await LegendsApp.setWorld(world,{navigate:true});return {id:world.id,counts:Object.fromEntries(["landmasses","rivers","mountainpeaks"].map(kind=>[kind,world[kind].length])),disk:world.disk?{format:world.disk.format,counts:world.disk.counts}:null};', 'disk' if disk else 'memory')
            expected = {kind: merged_records(sources, group) for kind, group, _ in GROUPS}
            counts = {kind: len(rows) for kind, rows in expected.items()}
            check(imported['counts'] == counts, mode + ' follows source group presence and counts', imported)
            if disk:
                world_id = imported['id']
            report = {'mode': mode, 'import': imported, 'groups': {}}
            for kind, group, route in GROUPS:
                report['groups'][kind] = inspect_group(kind, group, route, expected[kind], disk)
            reports.append(report)
        command('/refresh', {})
        wait('return !!window.LegendsApp')
        async_js('const world=await LegendsLocalStore.getWorld(arguments[0]);if(!world)throw new Error("Saved world missing");await LegendsApp.setWorld(world,{navigate:true});return true;', world_id)
        reload_report = {}
        for kind, group, route in GROUPS:
            reload_report[kind] = inspect_group(kind, group, route, merged_records(oracles, group), True)
        errors = [row for row in command('/log', {'type': 'browser'}) if row.get('level') == 'SEVERE']
        check(not errors, 'native browser reports no errors', errors)
        result = {'ok': True, 'checks': len(checks), 'labels': checks,
                  'sourceOracle': oracles, 'typeInference': inference,
                  'reports': reports, 'reload': reload_report,
                  'browserErrors': errors}
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print(json.dumps({'ok': True, 'checks': len(checks),
            'sourcePresence': {source['path']: {group: {'present': value['present'], 'count': value['count']}
                for group, value in source['groups'].items()} for source in oracles},
            'modes': {report['mode']: report['import']['counts'] for report in reports},
            'reload': {kind: {'ids': value['ids'], 'points': value.get('detail', {}).get('points')}
                for kind, value in reload_report.items()}, 'browserErrors': errors},
            ensure_ascii=False, indent=2))
    finally:
        if session:
            try:
                command('', method='DELETE')
            except Exception:
                pass
        driver.terminate()
        driver.wait(timeout=10)
        log.close()
