#!/usr/bin/env python3
"""Run analytical regression in ordinary file:// Chromium (Python stdlib only).

Optional: --xml legends.xml --xml legends_plus.xml includes upstream pair checks.
The source files are read only; a temporary browser profile holds test indexes.
"""
import argparse
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--xml', action='append', type=Path, default=[])
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

with tempfile.TemporaryDirectory(prefix='legends-analytics-') as temporary:
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
        session = request('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'chrome', 'goog:chromeOptions': {'binary': shutil.which('chromium'), 'args': ['--headless', '--no-sandbox', '--disable-gpu', '--user-data-dir=' + str(Path(temporary) / 'profile')]}, 'goog:loggingPrefs': {'browser': 'ALL'}}}})['sessionId']
        def command(path, data=None):
            return request('POST', '/session/' + session + path, data)
        command('/timeouts', {'script': 120000, 'pageLoad': 60000})
        command('/url', {'url': Path(__file__).with_suffix('.html').resolve().as_uri()})
        if args.xml:
            element = command('/element', {'using': 'css selector', 'value': '#files'})['element-6066-11e4-a52e-4f735466cecf']
            command('/element/' + element + '/value', {'text': '\n'.join(str(path.resolve()) for path in args.xml)})
        result = command('/execute/async', {'script': 'const done=arguments[arguments.length-1];runAnalyticsRegression().then(done,error=>done({ok:false,error:error.message,stack:error.stack}));', 'args': []})
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
