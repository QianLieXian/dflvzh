#!/usr/bin/env python3
"""Native file:// persistence and fault regression for large IndexedDB values.

Uses Python stdlib + ChromeDriver, a fresh temporary profile, and the actual
storage codec. No application server, Node, user profile, or large XML is used.
"""
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parents[1]

PREPARE=r'''
let checks=0;const assert=(value,message)=>{if(!value)throw new Error(message);checks++};
window.__checks=()=>checks;
window.__db=await new Promise((resolve,reject)=>{const r=indexedDB.open('legends-storage-codec-regression',1);r.onupgradeneeded=()=>{for(const [name,keyPath]of [['worlds','id'],['blocks',['importId','group','blockNo']],['derived','importId']])r.result.createObjectStore(name,{keyPath});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const codec=LegendsStorageValues,small={id:'small',name:'山河',value:7};assert(await codec.pack(small)===small,'Small values retain their ordinary representation');assert(await codec.unpack(small)===small,'Old unpacked values remain compatible');
const sourceFile=new File(['source XML'],'world-legends.xml'),withFile={id:'source',file:sourceFile,text:'长'.repeat(50000)};
assert(await codec.pack(withFile)===withFile,'File handles are never JSON serialized');
const shared=new ArrayBuffer(720000),ints=new Uint32Array(shared,64,160000);for(let i=0;i<ints.length;i++)ints[i]=(i*2654435761)>>>0;
const floatBuffer=new ArrayBuffer(560000),floats=new Float64Array(floatBuffer);for(let i=0;i<floats.length;i++)floats[i]=Math.sin(i)*Math.PI;
const value={id:'large',importId:'same-import',group:'figures',blockNo:0,text:'山河🗺与译名\u0000'.repeat(65000),ints,floats,shared,view:new DataView(shared,64,32),empty:new Uint8Array(0),undefinedField:undefined,special:[NaN,Infinity,-Infinity,-0,undefined],big:12345678901234567890n,date:new Date('2026-10-16T00:00:00.000Z'),invalidDate:new Date(NaN),regexp:/译名/giu,map:new Map([['translation','矮人'],[3,new Uint16Array([1,65535])]]),set:new Set(['山峦',7]),reserved:{'$legends.value.v1':['fake','unchanged'],normal:'原样'}};
value.regexp.lastIndex=2;
const types=['Int8Array','Uint8Array','Uint8ClampedArray','Int16Array','Uint16Array','Int32Array','Uint32Array','Float32Array','Float64Array','BigInt64Array','BigUint64Array'];
value.allTypes=types.filter(name=>typeof globalThis[name]==='function').map(name=>{const result=new globalThis[name](4);for(let i=0;i<4;i++)result[i]=name.startsWith('Big')?BigInt(i+1):i+1;return result});
const packed=await codec.pack(value);assert(packed!==value,'Large values use explicit storage payloads');assert(packed.id===value.id&&packed.importId===value.importId&&packed.group===value.group&&packed.blockNo===0,'All scalar keyPath fields survive packing, including zero');
assert(packed.chunks.length>3&&packed.chunks.every(chunk=>chunk instanceof Blob&&chunk.size<=262144),'Every explicit Blob payload is bounded to 256 KiB');
assert(JSON.stringify(packed).length<4096,'The IDB root descriptor stays small');assert(await codec.pack(packed)===packed,'Packing is idempotent');
window.verify=restored=>{
 assert(restored.id===value.id&&restored.text===value.text,'Multibyte text across Blob boundaries survives');
 assert(restored.ints instanceof Uint32Array&&restored.ints.length===ints.length&&restored.ints.byteOffset===64,'Uint32Array type, length and offset survive');
 assert(restored.ints.buffer===restored.shared&&restored.view.buffer===restored.shared,'Shared backing buffers survive');
 assert(restored.view instanceof DataView&&restored.view.byteLength===32&&restored.view.byteOffset===64,'DataView survives');
 assert(restored.ints.every((entry,index)=>entry===ints[index]),'All unsigned integer values survive');
 assert(restored.floats instanceof Float64Array&&restored.floats.every((entry,index)=>Object.is(entry,floats[index])),'All Float64 values survive');
 assert(restored.empty instanceof Uint8Array&&restored.empty.length===0,'Zero length buffers survive');
 assert(Object.hasOwn(restored,'undefinedField')&&restored.undefinedField===undefined&&restored.special[4]===undefined,'Undefined object and array values survive');
 assert(Number.isNaN(restored.special[0])&&restored.special[1]===Infinity&&restored.special[2]===-Infinity&&Object.is(restored.special[3],-0),'Nonfinite numbers and negative zero survive');
 assert(restored.big===value.big,'BigInt survives');assert(restored.date instanceof Date&&restored.date.toISOString()===value.date.toISOString()&&Number.isNaN(restored.invalidDate.getTime()),'Dates survive');
 assert(restored.regexp instanceof RegExp&&restored.regexp.source===value.regexp.source&&restored.regexp.flags===value.regexp.flags&&restored.regexp.lastIndex===2,'RegExp survives');
 assert(restored.map instanceof Map&&restored.map.get(3)instanceof Uint16Array&&restored.map.get(3)[1]===65535&&restored.set instanceof Set&&restored.set.has('山峦'),'Map and Set survive');
 assert(restored.reserved['$legends.value.v1'][0]==='fake'&&restored.reserved.normal==='原样','Reserved keys in data are escaped');
 assert(restored.allTypes.every((array,index)=>array.constructor.name===value.allTypes[index].constructor.name&&array.every((entry,i)=>entry===value.allTypes[index][i])),'All supported typed array classes survive');
 return true;
};
verify(await codec.unpack(packed));
const narrow=new Uint8Array(new ArrayBuffer(800000),400000,4),narrowPacked=await codec.pack({id:'narrow',narrow});assert(narrowPacked.chunks?.length>1,'A tiny view of a large backing buffer cannot bypass packing');
const put=(store,entry)=>new Promise((resolve,reject)=>{const tx=__db.transaction(store,'readwrite');tx.objectStore(store).put(entry);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
await put('worlds',packed);await put('worlds',small);await put('blocks',packed);await put('derived',packed);
for(const [store,key]of [['worlds','large'],['blocks',['same-import','figures',0]],['derived','same-import']])verify(await codec.read(__db,store,key));
assert((await codec.read(__db,'worlds','small')).name==='山河','Legacy small entries read normally');
assert(await codec.read(__db,'worlds','missing')===undefined,'Missing keys stay missing');
const aggregate={id:'large-aggregate',counts:new Float64Array(6500000)};aggregate.counts[0]=Math.PI;aggregate.counts[6499999]=42.5;
const aggregatePacked=await codec.pack(aggregate),aggregateDescriptorBytes=JSON.stringify(aggregatePacked).length;
assert(aggregatePacked.chunks.length>=199&&aggregateDescriptorBytes<4096,'A 52 MB aggregate keeps a descriptor well below the 64 KiB implicit wrapping threshold');
await put('worlds',aggregatePacked);const aggregateRestored=await codec.read(__db,'worlds','large-aggregate');
assert(aggregateRestored.counts instanceof Float64Array&&aggregateRestored.counts.length===6500000&&aggregateRestored.counts[0]===Math.PI&&aggregateRestored.counts[6499999]===42.5,'A native 52 MB aggregate round trip preserves binary data');
// Each simulated IndexedDB operation runs its callbacks asynchronously and
// counts new transactions. Concurrent requests have independent failure state.
const counts=new Map(),transactions=[],failures=new Map([['one',1],['two',2],['always',99],['lost',99]]);
const fake={name:'fault-db',transaction(store,mode){transactions.push({store,mode});const tx={objectStore(){return {get(key){const request={};queueMicrotask(()=>{const count=(counts.get(key)||0)+1;counts.set(key,count);if(count<=(failures.get(key)||0)){request.error=new DOMException(key==='lost'?'Data lost due to missing file. Affected record should be considered irrecoverable':'Failed to read large IndexedDB value',key==='lost'?'NotReadableError':'UnknownError');request.onerror?.();}else{request.result={id:key};request.onsuccess?.();}});return request}}},abort(){tx.onabort?.()}};return tx;}};
const concurrent=await Promise.all(['one','two','clean'].map(key=>codec.read(fake,'blocks',key)));
assert(concurrent.map(row=>row.id).join(',')==='one,two,clean','Concurrent retries preserve each request result');
assert(counts.get('one')===2&&counts.get('two')===3&&counts.get('clean')===1&&transactions.length===6,'Every retry uses its own fresh transaction');
let error;try{await codec.read(fake,'blocks','always',{retries:100});}catch(reason){error=reason;}
assert(counts.get('always')===3&&error?.storageStore==='blocks'&&error.storageDb==='fault-db'&&error.storageKey==='always'&&error.cause?.name==='UnknownError'&&error.message.includes('记录索引'),'Transient failure is bounded and exposes contextual cause');
try{await codec.read(fake,'derived','lost');}catch(reason){error=reason;}
assert(counts.get('lost')===1&&error?.name==='NotReadableError'&&error.storageStore==='derived','Permanent missing data is never retried or deleted');
const controller=new AbortController();controller.abort();try{await codec.read(fake,'blocks','abort',{signal:controller.signal});}catch(reason){error=reason;}
assert(error?.name==='AbortError'&&!counts.has('abort'),'Abort prevents a read transaction');
const mid=new AbortController(),midRead=codec.read(fake,'blocks','always',{signal:mid.signal});setTimeout(()=>mid.abort(),1);try{await midRead;}catch(reason){error=reason;}
assert(error?.name==='AbortError','Abort interrupts a retry delay');
// Blob workers receive the exact same self-contained runtime as import workers.
const workerResult=await new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob([codec.workerSource,';self.onmessage=async()=>{try{const original={id:"worker",data:new Float32Array(90000),text:"山河".repeat(30000)};original.data[80000]=3.5;const packed=await LegendsStorageValues.pack(original),value=await LegendsStorageValues.unpack(packed);postMessage({id:packed.id,chunks:packed.chunks.length,value:value.data[80000],type:value.data.constructor.name,text:value.text.length});}catch(error){postMessage({error:String(error)})}};'],{type:'text/javascript'})),worker=new Worker(url);worker.onmessage=event=>{worker.terminate();URL.revokeObjectURL(url);resolve(event.data)};worker.onerror=event=>{worker.terminate();URL.revokeObjectURL(url);reject(new Error(event.message))};worker.postMessage(true)});
assert(workerResult.id==='worker'&&workerResult.chunks>1&&workerResult.value===3.5&&workerResult.type==='Float32Array'&&workerResult.text===60000,'Worker runtime packs and restores independently');
return {checks,payloadBytes:packed.chunks.reduce((total,part)=>total+part.size,0),chunks:packed.chunks.length,descriptorBytes:JSON.stringify(packed).length,largeAggregate:{bytes:aggregate.counts.byteLength,chunks:aggregatePacked.chunks.length,descriptorBytes:aggregateDescriptorBytes},worker:workerResult};
'''

RELOAD=r'''
const codec=LegendsStorageValues,db=await new Promise((resolve,reject)=>{const request=indexedDB.open('legends-storage-codec-regression',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
const value=await codec.read(db,'worlds','large');
let checks=0;const assert=(value,message)=>{if(!value)throw new Error(message);checks++};
assert(value.ints instanceof Uint32Array&&value.ints[159999]===((159999*2654435761)>>>0),'Native IndexedDB preserves typed array bytes across page reload');
assert(value.shared===value.ints.buffer&&value.view.buffer===value.shared,'Native persistence preserves shared buffers');
assert(value.text==='山河🗺与译名\u0000'.repeat(65000),'Native persistence preserves multibyte strings across chunks');
assert(value.blockNo===0&&value.importId==='same-import'&&value.id==='large','KeyPath identity survives native persistence');
assert(value.big===12345678901234567890n&&value.map instanceof Map&&Object.hasOwn(value,'undefinedField'),'Native persistence preserves additional JavaScript types');
const raw=await new Promise((resolve,reject)=>{const r=db.transaction('worlds').objectStore('worlds').get('large');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
assert(raw.chunks.every(value=>value instanceof Blob&&value.size<=262144)&&!raw.ints&&!raw.text,'Only the compact descriptor and bounded Blob handles enter IndexedDB');
const aggregate=await codec.read(db,'worlds','large-aggregate');assert(aggregate.counts instanceof Float64Array&&aggregate.counts.length===6500000&&aggregate.counts[0]===Math.PI&&aggregate.counts[6499999]===42.5,'The 52 MB native aggregate survives refresh');
db.close();return {checks};
'''

with tempfile.TemporaryDirectory(prefix='legends-storage-values-') as temporary:
    temporary=Path(temporary)
    page=temporary/'codec.html';page.write_text('<!doctype html><meta charset="utf-8"><script src="'+(ROOT/'js/storage-values.js').as_uri()+'"></script>')
    with socket.socket() as listener:listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
    endpoint=f'http://127.0.0.1:{port}'
    log=(temporary/'driver.log').open('w')
    process=subprocess.Popen([shutil.which('chromedriver'),f'--port={port}'],stdout=log,stderr=subprocess.STDOUT);session=None
    def request(method,path,data=None):
        req=urllib.request.Request(endpoint+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'},method=method)
        try:
            with urllib.request.urlopen(req,timeout=90)as response:value=json.load(response)['value']
        except urllib.error.HTTPError as error:raise RuntimeError(error.read().decode())from error
        if isinstance(value,dict)and value.get('error')and 'stacktrace'in value:raise RuntimeError(value)
        return value
    def command(path,data=None,method='POST'):return request(method,'/session/'+session+path,data)
    def run(script):
        result=command('/execute/async',{'script':'const done=arguments[arguments.length-1];(async()=>{'+script+'})().then(done,error=>done({error:String(error),stack:error.stack}));','args':[]})
        assert not result.get('error'),result
        return result
    try:
        for _ in range(100):
            try:request('GET','/status');break
            except OSError:time.sleep(.05)
        session=request('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'binary':shutil.which('chromium'),'args':['--headless','--no-sandbox','--disable-gpu','--user-data-dir='+str(temporary/'profile')]},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId']
        command('/timeouts',{'script':90000,'pageLoad':30000});command('/url',{'url':page.as_uri()})
        prepared=run(PREPARE);command('/refresh',{});reloaded=run(RELOAD)
        errors=[entry for entry in command('/log',{'type':'browser'})if entry.get('level')=='SEVERE']
        assert not errors,errors
        print(json.dumps({'ok':True,'checks':prepared['checks']+reloaded['checks'],'prepared':prepared,'reloaded':reloaded,'browserErrors':errors},ensure_ascii=False,indent=2))
    finally:
        if session:
            try:command('',method='DELETE')
            except Exception:pass
        process.terminate();process.wait(timeout=10);log.close()
