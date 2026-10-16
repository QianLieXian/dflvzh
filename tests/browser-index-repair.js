(function(global){
 'use strict';const checks=[];function assert(value,label,actual){if(!value)throw new Error(label+': '+JSON.stringify(actual));checks.push(label);}
 const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
 async function run(){
  const figures=Array.from({length:7000},(_,id)=>'<historical_figure><id>'+id+'</id><name>Figure '+id+' '+('Name '+id+' ').repeat(100)+'</name><race>dwarf</race><birth_year>1</birth_year><death_year>-1</death_year></historical_figure>').join(''),xml='<df_world><name>Repair</name><historical_figures>'+figures+'</historical_figures></df_world>',image=new File(['image'],'map.png'),file=new File([xml],'repair-legends.xml'),files=[image,file];
  const session=await LegendsFastStore.createImport({files}),metadata=await LegendsFileIndexer.indexFiles(files,{onBlock:session.writeBlock,onMetadata:session.metadata}),world=await session.finish(metadata),db=await LegendsFastStore.database(),originalManifest=JSON.stringify(world.disk.manifest),counts=JSON.stringify(world.disk.counts),id=world.disk.id;
  const raw=await new Promise((resolve,reject)=>{const request=db.transaction('blocks').objectStore('blocks').get([id,'figures',0]);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  assert(raw['$legends.storage.v1']===1&&raw.chunks.every(chunk=>chunk instanceof Blob&&chunk.size<=256*1024),'new large index blocks are explicit bounded Blob chunks',raw);
  const expected=await LegendsStorageValues.unpack(raw);assert(expected.headers.length===2048&&expected.headers[0].fileNo===1,'packed block retains exact membership and original image-first source slot');
  const tx=db.transaction('blocks','readwrite'),saved=done(tx);tx.objectStore('blocks').delete([id,'figures',0]);await saved;
  let sourceBytes=0,sourceReads=0;const slice=File.prototype.slice;File.prototype.slice=function(start,end,...args){if(this===file){sourceReads++;sourceBytes+=Math.max(0,Math.min(this.size,end??this.size)-start);}return slice.call(this,start,end,...args);};
  let repaired;try{repaired=await LegendsFastStore.getHeaders(world,'figures',100);}finally{File.prototype.slice=slice;}
  assert(repaired.length===1&&repaired[0].id===100&&repaired[0].fileNo===1,'missing index block automatically replays the exact original batch');
  assert(sourceReads>0&&sourceBytes<file.size,'repair stops after the target block without scanning the remaining XML',{sourceBytes,size:file.size,sourceReads});
  const restored=await LegendsStorageValues.read(db,'blocks',[id,'figures',0]);assert(JSON.stringify(restored)===JSON.stringify(expected),'repair preserves every header, primary flag, source offset and order');
  assert(world.disk.id===id&&JSON.stringify(world.disk.counts)===counts&&JSON.stringify(world.disk.manifest)===originalManifest,'repair does not replace import, counts or manifest');
  const record=await LegendsFastStore.getRecord(world,'figures',100);assert(record.name.startsWith('Figure 100 ')&&record.race==='dwarf','repaired headers still read the correct original full record');
  // Pre-change manifests lack order fields, but replaying original global
  // batch boundaries still recovers exactly; min/max are validation only.
  for(const item of world.disk.manifest.figures){delete item.firstOrder;delete item.lastOrder;}
  const legacy=await LegendsFastStore.repairBlock(world,'figures',1);assert(legacy.headers.length===2048&&legacy.headers[0].id===2048&&legacy.headers.at(-1).id===4095,'legacy manifest repair reproduces original global block boundaries');
  const controller=new AbortController();controller.abort();let aborted;try{await LegendsFastStore.repairBlock(world,'figures',2,{signal:controller.signal});}catch(error){aborted=error;}
  assert(aborted?.name==='AbortError','index repair honors cancellation before source work');
  const mismatch=structuredClone(world);mismatch.disk.manifest.figures[0].maxId++;let mismatchError;try{await LegendsFastStore.repairBlock(mismatch,'figures',0);}catch(error){mismatchError=error;}
  assert(mismatchError?.name==='IndexBlockError'&&mismatchError.group==='figures'&&mismatchError.blockNo===0,'mismatched original membership produces contextual IndexBlockError');
  assert(JSON.stringify(await LegendsStorageValues.read(db,'blocks',[id,'figures',0]))===JSON.stringify(expected),'failed verification never replaces the existing index block');
  await LegendsFastStore.abortImport(id);
  return {ok:true,checks:checks.length,labels:checks,sourceBytes,sourceSize:file.size};
 }
 global.runIndexRepairRegression=run;
})(window);
