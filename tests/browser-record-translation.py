#!/usr/bin/env python3
"""Localize previously cached English record cards in ordinary file:// Chromium.

python tests/browser-record-translation.py
python tests/browser-record-translation.py --screenshots /tmp/legends-record-tabs
Only a small in-page saved-cache fixture is used. No XML, indexer, backend,
application server, Node, file-access browser flag or existing profile is used.
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
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--screenshots', type=Path, help='Save each of the six corrected record tabs as a PNG')
args = parser.parse_args()

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

with tempfile.TemporaryDirectory(prefix='legends-record-translation-') as temporary:
    browser, driver = shutil.which('chromium') or shutil.which('google-chrome'), shutil.which('chromedriver')
    if not browser or not driver:
        raise SystemExit('Chromium/Chrome and a compatible chromedriver must be installed')
    log = open(Path(temporary) / 'driver.log', 'w')
    process = subprocess.Popen([driver, '--port=' + str(port)], stdout=log, stderr=subprocess.STDOUT)
    session = None
    try:
        for _ in range(100):
            try:
                request('GET', '/status')
                break
            except OSError:
                time.sleep(.05)
        session = request('POST', '/session', {'capabilities': {'alwaysMatch': {
            'browserName': 'chrome', 'goog:chromeOptions': {'binary': browser, 'args': [
                '--headless', '--no-sandbox', '--disable-gpu', '--window-size=1512,1100', '--user-data-dir=' + str(Path(temporary) / 'profile')]},
            'goog:loggingPrefs': {'browser': 'ALL'}}}})['sessionId']
        def command(path, data=None, method='POST'):
            return request(method, '/session/' + session + path, data)
        command('/timeouts', {'script': 120000, 'pageLoad': 60000})
        command('/url', {'url': Path(__file__).with_suffix('.html').resolve().as_uri()})
        result = command('/execute/async', {'script': 'const done=arguments[arguments.length-1];runRecordTranslationRegression({keepMounted:arguments[0]}).then(done,error=>done({ok:false,error:error.message,stack:error.stack}));', 'args': [bool(args.screenshots)]})
        if result.get('ok') and args.screenshots:
            directory = args.screenshots.resolve()
            directory.mkdir(parents=True, exist_ok=True)
            tabs = command('/execute/sync', {'script': 'return [...document.querySelectorAll("[data-record-tab]")].map(button=>button.dataset.recordTab)', 'args': []})
            assert len(tabs) == 6, tabs
            result['screenshots'] = []
            for tab in tabs:
                element = command('/element', {'using': 'css selector', 'value': '[data-record-tab="' + tab + '"]'})['element-6066-11e4-a52e-4f735466cecf']
                command('/element/' + element + '/click', {})
                command('/execute/async', {'script': 'const done=arguments[arguments.length-1];document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{scrollTo(0,0);done(true)})));', 'args': []})
                # Standard WebDriver screenshots capture the viewport. Resize
                # it to the rendered fixture so the final card is not cropped.
                height = command('/execute/sync', {'script': 'return Math.ceil(document.querySelector("#records").getBoundingClientRect().bottom+scrollY+16+outerHeight-innerHeight)', 'args': []})
                command('/window/rect', {'width': 1512, 'height': height})
                command('/execute/async', {'script': 'const done=arguments[arguments.length-1];requestAnimationFrame(()=>requestAnimationFrame(()=>done(true)));', 'args': []})
                path = directory / (tab + '.png')
                path.write_bytes(base64.b64decode(command('/screenshot', method='GET')))
                result['screenshots'].append(str(path))
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
