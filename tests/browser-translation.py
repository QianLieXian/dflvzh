#!/usr/bin/env python3
"""Native file:// translation/filter regression; Python stdlib + Chromium/ChromeDriver.
Optional --samples JSON accepts a local list of actual event records and references.
No XML is modified, no application web server or Node is used.
"""
import argparse,json,time,shutil,socket,subprocess,tempfile,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument("--samples",type=Path);args=parser.parse_args()
with tempfile.TemporaryDirectory(prefix='dfcs-translation-') as tmp:
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 proc=subprocess.Popen([shutil.which('chromedriver'),'--port='+str(port)],stdout=open(tmp+'/driver.log','w'),stderr=subprocess.STDOUT)
 base='http://127.0.0.1:'+str(port)
 def req(method,path,data=None):
  with urllib.request.urlopen(urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'},method=method),timeout=180) as r:
   d=json.load(r)['value']
  if isinstance(d,dict) and 'error' in d:raise RuntimeError(d)
  return d
 try:
  for i in range(100):
   try:req('GET','/status');break
   except OSError:time.sleep(.05)
  sid=req('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'binary':shutil.which('chromium'),'args':['--headless','--no-sandbox','--disable-gpu','--user-data-dir='+tmp+'/profile']},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId'];prefix='/session/'+sid
  req('POST',prefix+'/timeouts',{'script':150000});req('POST',prefix+'/url',{'url':(ROOT/'tests/translation-regression.html').as_uri()})
  result=req('POST',prefix+'/execute/async',{'script':'const done=arguments[0]; Promise.resolve(window.translationTests).then(done,e=>done({error:String(e),stack:e.stack}));','args':[]})
  print(json.dumps(result,ensure_ascii=False));
  if not isinstance(result,dict):
   print(json.dumps(req('POST',prefix+'/log',{'type':'browser'}),ensure_ascii=False));raise AssertionError('Translation test page did not initialize')
  assert not result.get('error') and not result.get('failed'),result
  if args.samples:
   content=args.samples.read_text()
   try:payload=json.loads(content)
   except json.JSONDecodeError:payload=json.loads(content.splitlines()[0])
   samples=payload['samples'] if isinstance(payload,dict) else payload
   script=r'''const samples=arguments[0],done=arguments[1];(async()=>{await DFTranslate.ready;const started=performance.now(),results=[];for(const sample of samples){const map=new Map((sample.refs||[]).map(r=>[r.kind+':'+r.id,r.record])),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),name=(r,kind)=>DFTranslate.name(r?.translated_name||r?.name||r?.title||'',{kind:({figures:'figure',entities:'entity',sites:'site',artifacts:'artifact',regions:'region'})[kind]||kind,race:r?.race,type:r?.type,rawName:r?.name,givenName:kind==='figures'?r?.name?.split(' ')[0]:undefined}),context={record:(kind,id)=>map.get(kind+':'+id),name,link:(kind,id,label)=>'<span class="object-link" data-object-kind="'+kind+'" data-object-id="'+id+'"><i class="mdi mdi-account"></i><a href="#/'+kind+'/'+id+'">'+esc(label||name(map.get(kind+':'+id)||{name:DFTranslate.term(kind)+' #'+id},kind))+'</a></span>'},out=DFTranslate.eventInfo(sample.record||sample,context);results.push({id:sample.id,type:sample.type,translated:out.translated,complete:out.complete,html:out.html});}return {total:results.length,translated:results.filter(r=>r.translated).length,elapsed:performance.now()-started,results};})().then(done,error=>done({error:String(error),stack:error.stack}));'''
   real=req('POST',prefix+'/execute/async',{'script':script,'args':[samples]});print(json.dumps(real,ensure_ascii=False));assert not real.get('error') and real['translated']==real['total'],real
  logs=req('POST',prefix+'/log',{'type':'browser'});print(json.dumps({'console':logs},ensure_ascii=False));assert not [entry for entry in logs if entry['level']=='SEVERE'],logs
  req('DELETE',prefix)
 finally:proc.terminate();proc.wait()
