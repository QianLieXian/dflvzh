#!/usr/bin/env python3
"""Native file:// prose performance and exact-output parity, without Node or a server."""
import json,shutil,socket,subprocess,tempfile,time,urllib.error,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
# Complete generated descriptions, including accents and musical notation, from
# the actual large-world regression. Compare the same grammar with its literal
# memo disabled; all recursion limits, candidates and DFCN name calls are equal.
rows=json.loads(r'''[{"kind": "dance_forms", "id": "0", "description": "The Wondrous Amethyst is a group celebration dance originating in The Cooperative Cloister.  The form guides dancers during improvised performances.  The dance is accompanied by The Flowery Couple.  The dancers perform in a single line turning counterclockwise, moving to the music's lisig rhythm.  The dance is vigorous.  "}, {"kind": "musical_forms", "id": "0", "description": "The Aquamarine Sheens is a form of music used for entertainment originating in The Cooperative Cloister.  The form guides musicians during improvised performances.  The music is played on a ashzos and a åmât.  The musical voices bring melody and counterpoint.  The entire performance is to be very loud.  The melody has short phrases, while the counterpoint has long phrases throughout the form.  Never more than an interval sounds at once.  It is performed in the uvel rhythm.  [B]The ashzos always does the counterpoint melody and should feel agitated.  [B]The åmât always does the main melody and should perform with skill.  The voice stays in the crisp low register.  [B]The Aquamarine Sheens has a simple structure: three lengthy unrelated passages.  [B]Each of the simple passages is extremely fast.  Each passage is performed using the emär scale.  [B]Scales are conceived of as two chords built using a division of the perfect fourth interval into eleven notes.  The tonic note is fixed only at the time of performance.  [B]As always, the emär hexatonic scale is thought of as two disjoint chords drawn from the fundamental division of the perfect fourth.  These chords are named bidok and ustos.  [B]The bidok tetrachord is the 1st, the 4th, the 5th and the 11th degrees of the fundamental perfect fourth division.  [B]The ustos trichord is the 1st, the 9th and the 11th degrees of the fundamental perfect fourth division.  [B]The uvel rhythm is a single line with sixteen beats divided into eight bars in a 2-2-2-2-2-2-2-2 pattern.  The beats are named dolush (spoken do) and agêk (ag).  The beat is stressed as follows:[B]| x x | x - | x - | x - | - x | - x | x - | x x | [B]where x is a beat, - is silent and | indicates a bar.  "}, {"kind": "poetic_forms", "id": "0", "description": "The Euphoria of Reasoning is a poetic form intended to amuse the audience, originating in The Cooperative Cloister.  The rules of the form are applied by poets to produce individual poems which can be recited.  The poem is a single couplet.  Use of assonance is characteristic of the form.  A form of parallelism is common throughout the poem, in that certain lines use the same placement of allusions.  Each line has ten syllables.  The second line of the couplet presents a different view of the subject of the first line.  The first line concerns the past.  The second line concerns the future.  "}]''')
rows += [
 {'kind':'literal','id':'translated','description':'This is a book.'},
 {'kind':'literal','id':'multiline','description':'This is a book.\nThis is a book.\n'},
 {'kind':'literal','id':'html','description':'<img src=x onerror=alert(1)> & musical [B]| x - |'},
]
draft=(ROOT/'js/translation-ui.js').read_text()
needle='if(cachedTerms.has(source))return cachedTerms.get(source);'
assert needle in draft,'The benchmark must compare a cache hit against the same unmodified matching algorithm.'
original=draft.replace(needle,'')
with tempfile.TemporaryDirectory(prefix='legends-description-benchmark-')as temp:
 temp=Path(temp); html=temp/'index.html';html.write_text('<!doctype html><meta charset="utf-8">'+''.join(f'<script src="{(ROOT/f).as_uri()}"></script>'for f in ['js/translation-data.js','js/translation-phonetics.js','js/translate.js','js/translation-ui-data.js']))
 with socket.socket()as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
 endpoint=f'http://127.0.0.1:{port}';driverlog=(temp/'driver.log').open('w');driver=subprocess.Popen([shutil.which('chromedriver'),f'--port={port}'],stdout=driverlog,stderr=subprocess.STDOUT);session=None
 def req(method,path,data=None):
  request=urllib.request.Request(endpoint+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'},method=method)
  with urllib.request.urlopen(request,timeout=180)as response:value=json.load(response)['value']
  if isinstance(value,dict)and value.get('error')and 'stacktrace'in value:raise RuntimeError(value)
  return value
 def cmd(path,data=None,method='POST'):return req(method,'/session/'+session+path,data)
 def js(script,*args):return cmd('/execute/sync',{'script':script,'args':list(args)})
 def cdp(name,params={}):return cmd('/goog/cdp/execute',{'cmd':name,'params':params})
 try:
  for _ in range(100):
   try:req('GET','/status');break
   except OSError:time.sleep(.05)
  session=req('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'binary':shutil.which('chromium'),'args':['--headless','--no-sandbox','--disable-gpu','--user-data-dir='+str(temp/'profile')]},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId'];cmd('/timeouts',{'script':180000,'pageLoad':30000});cmd('/url',{'url':html.as_uri()})
  js('window.__base=DFTranslate;window.__terms={};window.__setBase=key=>{__terms[key]={calls:0,ms:0,unique:new Set()};window.DFTranslate={...__base,term(...args){const start=performance.now(),result=__base.term(...args);const count=__terms[key];count.calls++;count.ms+=performance.now()-start;count.unique.add(args[0]);return result}}};__setBase("old");(0,eval)(arguments[0]);window.__old=DFTranslate;__setBase("new");(0,eval)(arguments[1]);window.__new=DFTranslate;',original,draft)
  selected=rows
  result=[]
  for row in selected:
   report=js('const row=arguments[0],start=performance.now(),text=__old.description(row.description);return{kind:row.kind,id:row.id,input:row.description,output:text,oldMs:performance.now()-start};',row);result.append(report)
  for report in result:
   fresh=js('const start=performance.now(),text=__new.description(arguments[0]);return{output:text,ms:performance.now()-start};',report['input']);report['newMs']=fresh['ms'];report['equal']=fresh['output']==report['output'];report['newOutput']=fresh['output']
  terms=js('return Object.fromEntries(Object.entries(__terms).map(([key,value])=>[key,{...value,unique:value.unique.size}]))')
  check=lambda condition,detail:None if condition else (_ for _ in ()).throw(AssertionError(detail))
  checks=0
  for row in result:
   check(row['equal'],row);checks+=1
  check(result[3]['output']=='这是书。',result[3]);checks+=1
  check(result[4]['output']=='这是书。\n这是书。\n',result[4]);checks+=1
  check(result[5]['output']==rows[5]['description'],result[5]);checks+=1
  check(js('return __old.name===__base.name&&__new.name===__base.name'),'UI memo must retain original DFCN name function');checks+=1
  check(terms['new']['calls']==terms['new']['unique'],terms);checks+=1
  check(terms['old']['calls']>terms['new']['calls']*5,terms);checks+=1
  uncached=sum(row['oldMs']for row in result[:3]);cached=sum(row['newMs']for row in result[:3])
  check(cached<uncached/3,{'cachedMs':cached,'uncachedMs':uncached});checks+=1
  errors=[row for row in cmd('/log',{'type':'browser'})if row.get('level')=='SEVERE'];check(not errors,errors);checks+=1
  print(json.dumps({'ok':True,'checks':checks,'results':[{key:value for key,value in row.items()if key not in ['input','output','newOutput']}for row in result],'terms':terms,'browserErrors':errors},ensure_ascii=False,indent=2))
 finally:
  if session:
   try:cmd('',method='DELETE')
   except Exception:pass
  driver.terminate();driver.wait(timeout=10);driverlog.close()
