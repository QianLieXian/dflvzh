/* Native File + IndexedDB + Blob Worker checks: no server or build tool. */
(function(global){
const checks=[];function assert(condition,label,actual){if(!condition)throw new Error(label+': '+JSON.stringify(actual));checks.push(label);}
const node=(tag,fields)=>'<'+tag+'>'+Object.entries(fields).map(([key,value])=>[].concat(value).map(item=>typeof item==='object'?node(key,item):'<'+key+'>'+String(item).replaceAll('&','&amp;').replaceAll('<','&lt;')+'</'+key+'>').join('')).join('')+'</'+tag+'>';
const section=(name,tag,records)=>'<'+name+'>'+records.map(row=>node(tag,row)).join('')+'</'+name+'>';
function fixture(){return '<?xml version="1.0"?><df_world><name>Facts</name><year>200</year>'+[
section('historical_figures','historical_figure',[
{id:1,name:'King',race:'dwarf',birth_year:-10,death_year:-1,used_identity_id:[2,3],adventurer:''},
{id:2,name:'Dead Defender',race:'goblin',birth_year:0,death_year:30},
{id:3,name:'Scholar',race:'elf',birth_year:0,death_year:-1,ent_pop_id:7},
{id:4,name:'Traveller',race:'human',birth_year:10,death_year:-1},
{id:5,name:'Duel Victim',race:'troll',birth_year:0,death_year:-1}
]),
section('entities','entity',[{id:0,name:'Civilization',type:'civilization',race:'dwarf',entity_position:{id:0,name:'king'}},{id:1,name:'Syndicate',type:'religion',race:'goblin',entity_link:{type:'PARENT',target:0}}]),
'<sites><site><id>0</id><name>City</name><type>town</type><coords>1,1</coords><structures>'+node('structure',{id:0,name:'Tower',type:'tower',inhabitant:1})+'</structures></site></sites>',
section('regions','region',[{id:0,name:'Forest',type:'forest',evilness:'good',coords:'1,1|2,1|2,2'}]),
section('underground_regions','underground_region',[{id:0,type:'cavern',depth:1,coords:'1,1|2,1'}]),
section('artifacts','artifact',[{id:0,name:'Book',item:{item_type:'book',writing_written_content_id:0,page_number:50}}]),
section('written_contents','written_content',[{id:0,title:'Treatise',author:3,form:'essay',page_start:0,page_end:49},{id:1,title:'Commentary',reference:{type:'WRITTEN_CONTENT',id:0}}]),
section('identities','identity',[{id:2,histfig_id:1},{id:3,histfig_id:1}]),
section('rivers','river',[{id:0,name:'River',path:'1,1|2,1',end_pos:'2,2'}]),
section('mountain_peaks','mountain_peak',[{id:0,name:'Peak',height:100,is_volcano:'',coords:'2,2'}]),
section('historical_events','historical_event',[
{id:0,type:'created site',year:0,site_id:0,civ_id:0,site_civ_id:1},
{id:1,type:'add hf entity link',year:1,hfid:1,civ_id:0,position_id:0,position:'king',link_type:'position'},
{id:2,type:'hf died',year:30,seconds72:300,hfid:2,slayer_hfid:1},
{id:3,type:'knowledge discovered',year:20,seconds72:200,hfid:3},
{id:4,type:'hf travel',year:20,seconds72:100,group_hfid:4},
{id:5,type:'artifact created',year:20,artifact_id:0,creator_hfid:3},
{id:6,type:'artifact stored',year:21,artifact_id:0,site_id:0},
{id:7,type:'written content composed',year:19,wc_id:0,hfid:3},
{id:8,type:'item stolen',year:25,histfig:1,item:0},
{id:9,type:'remove hf entity link',year:50,hfid:1,civ_id:0,position_id:0,link_type:'position'},
{id:10,type:'site taken over',year:45,site_id:0,site_civ_id:1,new_site_civ_id:1,attacker_civ_id:0,defender_civ_id:0},
{id:11,type:'field battle',year:30,attacker_civ_id:0,defender_civ_id:1,site_id:0},
{id:12,type:'failed intrigue corruption',year:25,corruptor_hfid:1},
{id:13,type:'hf died',year:31,hfid:5,slayer_hfid:1}
]),
section('historical_event_collections','historical_event_collection',[
{id:0,type:'war',start_year:30,end_year:45,aggressor_ent_id:0,defender_ent_id:1,eventcol:[1,4]},
{id:1,type:'battle',start_year:30,end_year:30,site_id:0,war_eventcol:0,event:[2,11],attacking_hfid:1,defending_hfid:2,attacking_squad_race:'dwarf',attacking_squad_number:20,attacking_squad_deaths:5,defending_squad_race:'goblin',defending_squad_number:10,defending_squad_deaths:3},
{id:2,type:'duel',start_year:31,end_year:31,event:13},
{id:3,type:'beast attack',start_year:31,end_year:31,event:13},
{id:4,type:'site conquered',start_year:45,end_year:45,site_id:0,attacking_enid:0,defending_enid:1,war_eventcol:0,event:10},
{id:5,type:'theft',start_year:25,end_year:25,attacking_enid:1,event:8}
])].join('')+'</df_world>';}
async function importIndexed(files){const session=await LegendsFastStore.createImport({files}),meta=await LegendsFileIndexer.indexFiles(files,{onBlock:session.writeBlock,onMetadata:session.metadata});return session.finish(meta);}
async function copiedWorksRegression(){
 const works=[
  {id:0,title:'Often Stored',author:7},
  {id:1,title:'Often Copied',author:7},
  {id:2,title:'Second Work',author:7},
  {id:3,title:'First Commentary',reference:[{type:'WRITTEN_CONTENT',id:1},{type:'WRITTEN_CONTENT',id:1},{type:'WRITTEN_CONTENT',id:3},{type:'ARTIFACT',id:0},{type:'WRITTEN_CONTENT',id:8}]},
  {id:4,title:'Second Commentary',reference:[{type:'WRITTEN_CONTENT',id:1},{type:'written_content',id:2},{type:'WRITTEN_CONTENT',id:-1},{type:'WRITTEN_CONTENT',id:999},{type:'WRITTEN_CONTENT',id:''},{type:'UNKNOWN',id:0}]},
  {id:5,title:'One Copy'},
  {id:8,title:'Only Cited'}
 ],artifacts=[{id:0,name:'History Book',writing:0},{id:10,name:'Anthology',item:{page_written_content_id:[1,1,2]}},{id:11,name:'Scroll',item:{writing_written_content_id:1}},{id:12,name:'Third Book',writing:5},{id:99,name:'Sword'}],events=[
  ...Array.from({length:20},(_,id)=>({id,type:id%2?'artifact possessed':'artifact stored',artifact_id:0,site_id:0})),
  {id:20,type:'artifact created',artifact_id:10},
  {id:21,type:'artifact copied',artifact_id:10},
  {id:22,type:'artifact copied',artifact_id:10,wc_id:1},
  {id:23,type:'artifact copied',artifact_id:11},
  {id:24,type:'artifact copied',artifact_id:12},
  {id:25,type:'artifact copied',artifact_id:99},
  {id:26,type:'artifact copied',artifact_id:999},
  {id:27,type:'written content composed',wc_id:0}
 ].map(event=>({...event,year:10})),xml='<df_world><name>Copies and Citations</name><year>20</year>'+section('historical_figures','historical_figure',[{id:7,name:'Author',birth_year:0,death_year:-1}])+section('artifacts','artifact',artifacts)+section('written_contents','written_content',works)+section('historical_events','historical_event',events)+'</df_world>',plus='<df_world><name>Copies and Citations</name>'+section('historical_events','historical_event',[{id:22,type:'artifact copied',artifact_id:10,dest_site_id:0}])+'</df_world>',disk=await importIndexed([new File([xml],'copies-legends.xml'),new File([plus],'copies-legends_plus.xml')]),memory=await LegendsData.parseXML(xml),expected='[[1,5],[2,3],[5,1],[8,1]]';
 const ranking=world=>LegendsRecords.calculate(world).categories.flatMap(category=>category.cards).find(card=>card.id==='most_copied_works').entries;
 const pairs=rows=>JSON.stringify(rows.map(row=>[row.id,row.value]));
 assert(pairs(ranking(memory))===expected,'direct ranking counts copies and incoming citations rather than event history',ranking(memory));
 for(const [mode,world]of[['disk',disk],['memory',memory]]){
  const a=await LegendsFastStore.analytics(world),rows=ranking(world);
  assert(pairs(rows)===expected,mode+' copy ranking deduplicates anthology contents, citations and paired event IDs',rows);
  assert(rows[0].display==='5 次复制与引用'&&rows[0].detail==='复制：3 次；被其他作品引用：2 次',mode+' copy/citation total and breakdown are explicit',rows[0]);
  assert(a.copiedWorksVersion===1&&!rows.some(row=>[0,3,4].includes(row.id)),mode+' storage, composition, outgoing and self references do not inflate popularity');
 }
 const a=disk.disk.aggregates,oldId=disk.disk.id,manifest=JSON.stringify(disk.disk.manifest),counts=JSON.stringify(a.counts),otherCards=()=>JSON.stringify(Object.fromEntries(Object.entries(a.records.entries).filter(([key])=>key!=='most_copied_works'))),unchangedCards=otherCards();
 delete a.copiedWorksVersion;a.records.entries.most_copied_works=[{kind:'writtencontents',id:0,value:99,display:'99 个记录事件',record:{id:0,name:'Often Stored'}}];
 let sourceReads=0;const slice=File.prototype.slice;File.prototype.slice=function(){sourceReads++;throw new Error('copy ranking migration must not read original XML');};
 try{
  let phases=[];await LegendsFastStore.analytics(disk,{progress:value=>phases.push(value.phase),onImportId:()=>{throw new Error('copy migration must not replace indexes');}});
  assert(pairs(ranking(disk))===expected&&phases.includes('copied-works'),'old event-count cache migrates from existing headers');
  assert(sourceReads===0&&disk.disk.id===oldId&&JSON.stringify(disk.disk.manifest)===manifest&&JSON.stringify(a.counts)===counts&&otherCards()===unchangedCards,'copy migration preserves source files, index ID, blocks, event counts and other rankings');
  const db=await LegendsFastStore.database(),saved=await LegendsStorageValues.read(db,'derived',oldId);
  assert(saved.version===5&&saved.aggregates.copiedWorksVersion===1&&pairs(saved.aggregates.records.entries.most_copied_works)===expected,'corrected copy ranking is persisted without a global analytics upgrade');
  const restored=structuredClone(disk);delete restored.disk.aggregates;phases=[];await LegendsFastStore.analytics(restored,{progress:value=>phases.push(value.phase)});
  assert(pairs(ranking(restored))===expected&&!phases.length&&sourceReads===0,'restored corrected cache skips migration and XML reads');
 }finally{File.prototype.slice=slice;await LegendsFastStore.abortImport(oldId);}
 const empty=await LegendsData.parseXML('<df_world><artifacts>'+node('artifact',artifacts[0])+'</artifacts>'+section('written_contents','written_content',[works[0]])+section('historical_events','historical_event',events.slice(0,20))+'</df_world>');
 assert(ranking(empty).length===0,'history-only works do not produce a copied-work record');
}
async function civilizationRaceRegression(){
 const entities=Array.from({length:8},(_,id)=>({id,name:'Civ '+id,type:id===6?'guild':'civilization',race:id===1?'elf':'unknown'})),figures=[
  {id:0,race:'DEMON_1',entity_position_link:{entity_id:0,start_year:1}},
  {id:1,race:'dwarf',entity_position_link:{entity_id:0,start_year:2}},
  {id:2,race:'human',entity_position_link:{entity_id:0,start_year:3}},
  {id:3,race:'elf',entity_former_position_link:{entity_id:2,start_year:1,end_year:10}},
  {id:4,race:'human',entity_link:{entity_id:3,link_type:'member'}},
  {id:5,race:'demon venom',entity_position_link:{entity_id:4,start_year:1}},
  {id:6,race:'goblin',entity_link:[{entity_id:3,link_type:'member'},{entity_id:5,link_type:'position'}]},
  {id:7,race:'elf',entity_position_link:{entity_id:6,start_year:1}},
  {id:8,race:'human',entity_position_link:{entity_id:7,start_year:1}},
  {id:9,race:'goblin',entity_position_link:{entity_id:1,start_year:1}}
 ].map(row=>({...row,name:'Figure '+row.id,birth_year:0,death_year:-1}));
 const xml='<df_world><name>Position Races</name><year>50</year>'+section('historical_figures','historical_figure',figures)+section('entities','entity',entities)+section('entity_populations','entity_population',[{id:0,civ_id:7,race:'DWARF:12'}])+'</df_world>',file=new File([xml],'position-races-legends.xml'),disk=await importIndexed([file]),memory=await LegendsData.parseXML(xml);
 for(const [mode,world]of[['disk',disk],['memory',memory]]){
  const a=await LegendsFastStore.analytics(world),facts=a.entityFacts;
  assert(a.version===5&&a.civilizationRacesVersion===1,mode+' race repair is separate from analytics/facts version');
  assert(facts[0].race==='dwarf',mode+' first non-demon current office holder supplies missing civ race',facts[0]);
  assert(facts[1].race==='elf'&&facts[7].race==='DWARF',mode+' explicit and population race take precedence over position',facts);
  assert(facts[2].race==='unknown'&&facts[3].race==='unknown'&&facts[4].race==='unknown'&&facts[6].race==='unknown',mode+' former office, membership, demons, and non-civs do not infer races',facts);
  assert(facts[5].race==='goblin',mode+' generic Position after first membership is retained without changing ordinary entity_link',facts[5]);
 }
 let compact;await LegendsFastStore.scanHeaders(disk,'figures',header=>{if(header.id===6)compact=header;});
 assert(compact.entity_link.length===1&&compact.entity_link[0].link_type==='member'&&compact.civRacePositionIds.join(',')==='5','new index preserves compact generic links plus explicit race evidence',compact);
 await LegendsFastStore.abortImport(disk.disk.id);
 // Replay a saved facts3/analytics5 index from before this fix. Only headers
 // existed then; no generic-position hint and no original source File needed.
 const session=await LegendsFastStore.createImport({files:[file]}),meta=await LegendsFileIndexer.indexFiles([file],{onMetadata:session.metadata,onBlock:rows=>session.writeBlock(rows.map(header=>{const old={...header};delete old.civRacePositionIds;return old;}))}),old=await session.finish(meta),a=await LegendsFastStore.analytics(old),oldId=old.disk.id;
 delete a.civilizationRacesVersion;for(const id of [0,5]){a.entityFacts[id].race='unknown';old.entities.find(row=>row.id===id).race='unknown';}
 const counts=JSON.stringify(a.counts),cards=JSON.stringify(a.records),positions=JSON.stringify(a.positionsByFigure),beforeVersion=old.disk.factsVersion,phases=[],slice=File.prototype.slice;
 let sourceReads=0;File.prototype.slice=function(){sourceReads++;throw new Error('race migration must not read original XML');};
 let repaired;try{repaired=await LegendsFastStore.analytics(old,{progress:progress=>phases.push(progress.phase),onImportId:()=>{throw new Error('race migration must not replace import');}});}finally{File.prototype.slice=slice;}
 assert(repaired===a&&repaired.entityFacts[0].race==='dwarf'&&old.entities.find(row=>row.id===0).race==='dwarf','saved v5 race repair uses retained native position headers');
 assert(repaired.entityFacts[5].race==='unknown','old truncated generic second Position stays unknown rather than guessing');
 assert(sourceReads===0&&old.disk.id===oldId&&old.disk.factsVersion===beforeVersion&&!phases.includes('facts'),'race repair performs no XML read, facts reindex or import replacement',{sourceReads,phases});
 assert(JSON.stringify(a.counts)===counts&&JSON.stringify(a.records)===cards&&JSON.stringify(a.positionsByFigure)===positions,'race repair preserves all counts, cached rankings and position records');
 const db=await LegendsFastStore.database(),saved=await LegendsStorageValues.read(db,'derived',oldId);
 assert(saved.version===5&&saved.aggregates.civilizationRacesVersion===1&&saved.aggregates.entityFacts[0].race==='dwarf','race repair persists under the original derived-cache ID/version');
 let repeated=false;await LegendsFastStore.analytics(old,{progress:()=>{repeated=true;}});assert(!repeated,'reopening an already repaired world skips the HF pass');
 await LegendsFastStore.abortImport(oldId);
}
async function mainCivilizationRegression(){
const entities=[
{id:0,type:'civilization',race:'reptile'},
{id:1,name:'Named Civilization',type:'civilization',race:'elf'},
{id:2,name:'Named Population Civ',type:'guild',race:'goblin'},
{id:3,type:'guild',race:'dwarf'},
{id:4,type:'guild',race:'human'},
{id:5,type:'civilization',race:'elf'},
{id:6,type:'nomadic group'},
{id:7,name:'Known Race Thieves',type:'guild',race:'elf'},
{id:8,name:'Named Inferred Civilization'},
{id:9,name:'   ',type:'civilization',race:'dwarf'},
{id:10},
{id:11,type:'guild'},
{id:12,type:'guild'},
{id:13,type:'guild'}
],populations=[{id:0,civ_id:0,race:'REPTILE:100'},{id:1,civ_id:2,race:'DWARF:50'},{id:2,civ_id:3,race:'RODENT:80'}],events=[
{id:0,type:'procession',civ_id:4},
{id:1,type:'created site',civ_id:8},
{id:2,type:'reclaim site',civ_id:10},
{id:3,type:'ceremony',civ_id:11},
{id:4,type:'performance',civ_id:12},
{id:5,type:'competition',civ_id:13}
].map(event=>({...event,year:10})),collections=[{id:0,type:'occasion',civ_id:5},{id:1,type:'theft',attacking_enid:6},{id:2,type:'theft',attacking_enid:7}],text='<df_world><name>Main Civ Rules</name>'+section('entities','entity',entities)+section('entity_populations','entity_population',populations)+section('historical_events','historical_event',events)+section('historical_event_collections','historical_event_collection',collections)+'</df_world>',file=new File([text],'civ-rules-legends.xml'),disk=await importIndexed([file]),memory=await LegendsData.parseXML(text);
for(const [mode,world]of[['disk',disk],['memory',memory]]){
 const a=await LegendsFastStore.analytics(world),ids=[...a.civilizations].sort((a,b)=>a-b);
 assert(ids.join(',')==='1,2,4,5,6,8,11,12,13',mode+' main civ list respects names and source forced occasions/theft',ids);
 assert(a.entityFacts[0].IsCiv===false&&a.entityFacts[3].IsCiv===false&&a.entityFacts[9].IsCiv===false&&a.entityFacts[10].IsCiv===false,mode+' unnamed ordinary candidates stay non-main despite generated display names',a.entityFacts);
 assert(a.entityFacts[0].type==='civilization'&&a.entityFacts[0].race==='REPTILE'&&a.entityFacts[3].type==='civilization'&&a.entityFacts[3].race==='RODENT',mode+' wild population joins retain EntityType and race without IsCiv');
 assert(a.entityFacts[2].race==='DWARF'&&a.entityFacts[2].IsCiv&&a.entityFacts[6].race==='kobold'&&a.entityFacts[6].IsCiv,mode+' population race and unknown theft race follow source resolutions');
 assert(a.entityFacts[7].IsCiv===false&&!a.entityFacts[7].type&&LegendsFastStore.metrics(world,'entities',{id:0}).IsCiv===false,mode+' known-race theft does not force main civ and metrics expose explicit false');
}
// A facts3 world only needs new aggregate calculations for analytics4 -> 5.
const oldId=disk.disk.id;disk.disk.aggregates.version=4;const db=await LegendsFastStore.database();await new Promise((resolve,reject)=>{const tx=db.transaction('derived','readwrite');tx.objectStore('derived').put({importId:oldId,version:4,aggregates:disk.disk.aggregates});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});let facts=false,imports=0;const upgraded=await LegendsFastStore.analytics(disk,{progress:value=>{if(value.phase==='facts')facts=true;},onImportId:()=>imports++});
assert(upgraded.version===5&&disk.disk.factsVersion===3&&disk.disk.id===oldId&&!facts&&imports===0,'analytics5 upgrades current facts3 without reindexing source XML');
await LegendsFastStore.abortImport(disk.disk.id);
}
async function conditionalReferencesRegression(){
const events=[
{id:0,type:'dance form created',hist_figure_id:1,reason:'glorify hf',reason_id:2,circumstance:'pray to hf',circumstance_id:3},
{id:1,type:'musical form created',hist_figure_id:1,circumstance:'pray to hf',circumstance_id:3},
{id:2,type:'poetic form created',hist_figure_id:1,reason:'historical event collection',reason_id:2,circumstance:'dream about hf',circumstance_id:3},
{id:3,type:'written content composed',hist_figure_id:1,reason:'glorify hf',reason_id:2,circumstance:'dream about hf',circumstance_id:3},
{id:4,type:'written content composed',hist_figure_id:1,circumstance:'pray to hf',circumstance_id:3},
{id:5,type:'written content composed',hist_figure_id:1,reason:'glorify hf',reason_id:999,circumstance:'pray to hf',circumstance_id:3},
{id:6,type:'written content composed',hist_figure_id:1,reason:'glorify hf',reason_id:2,circumstance:'pray to hf',circumstance_id:2},
{id:7,type:'artifact possessed',hist_figure_id:1,reason:'artifact is heirloom of family hfid',reason_id:2,circumstance:'hf is dead',circumstance_id:3},
{id:8,type:'artifact possessed',hist_figure_id:1,reason:'artifact is symbol of entity position',reason_id:0,circumstance:'hf is dead',circumstance_id:2},
{id:9,type:'artifact created',creator_hfid:1,sanctify_hf:2,circumstance:{type:'defeated',defeated:3}},
{id:10,type:'artifact created',creator_hfid:1,anon_4:2,reason:'glorify hf',reason_id:3},
{id:11,type:'hfs formed intrigue relationship',corruptor_hfid:1,target_hfid:2,relevant_entity_id:0,method:'religious sympathy',relevant_id_for_method:3},
{id:12,type:'failed intrigue corruption',corruptor_hfid:1,target_hfid:2,relevant_entity_id:0,method:'revenge on grudge',relevant_id_for_method:3},
{id:13,type:'item stolen',histfig:1,circumstance:'defeated hf',circumstance_id:3}
].map(event=>({...event,year:10}));
const figures=[1,2,3].map(id=>({id,name:'Figure '+id,birth_year:0,death_year:-1})),entities=[{id:0,name:'Entity Zero'}],text='<df_world><name>Conditional Facts</name>'+section('historical_figures','historical_figure',figures)+section('entities','entity',entities)+section('historical_events','historical_event',events)+'</df_world>',file=new File([text],'conditions-legends.xml'),world=await importIndexed([file]),a=await LegendsFastStore.analytics(world),headers=new Map();
await LegendsFastStore.scanHeaders(world,'events',header=>headers.set(header.id,header));
const has=(event,kind,id)=>headers.get(event).refs.some(ref=>ref.kind===kind&&Number(ref.id)===id);
assert(has(0,'figures',2)&&has(0,'figures',3)&&has(1,'figures',3),'forms add glorified/prayed figures including no glorification');
assert(!has(2,'figures',2)&&!has(2,'figures',3),'form dream/non-glorify references remain display only');
assert(has(3,'figures',2)&&has(3,'figures',3)&&!has(4,'figures',3)&&!has(5,'figures',3),'written circumstance matches upstream glorified-figure existence condition');
assert(headers.get(6).refs.filter(ref=>ref.kind==='figures'&&ref.id===2).length===1,'same glorified/circumstance figure counted once');
assert(has(7,'figures',2)&&has(7,'figures',3)&&has(8,'entities',0)&&has(8,'figures',2),'artifact possession family/entity/dead-holder source links');
assert(has(9,'figures',2)&&has(9,'figures',3)&&has(10,'figures',2)&&!has(10,'figures',3),'artifact sanctify alias and nested defeated source links');
assert(has(11,'entities',0)&&!has(12,'entities',0)&&!has(11,'figures',3)&&!has(12,'figures',3),'intrigue source entity link excludes Print-only method IDs');
assert(!has(13,'figures',3),'item stolen circumstance is not an AddEvent link');
const related=await LegendsFastStore.related(world,'figures',3,{pageSize:100});assert(related.events.map(event=>event.id).join(',')==='0,1,3,7,9'&&LegendsFastStore.metrics(world,'figures',{id:3}).eventCount===5,'source conditional related rows and eventCount agree',related.events.map(event=>event.id));
const memory=await LegendsData.parseXML(text),ma=await LegendsFastStore.analytics(memory);assert(LegendsFastStore.metrics(memory,'figures',memory.figures.find(figure=>figure.id===3)).eventCount===5&&LegendsFastStore.metrics(memory,'entities',{id:0}).eventCount===2,'memory/disk exact conditional event metrics agree');
assert(!LegendsFastStore.relationshipReferences(events[11],memory).some(ref=>ref.kind==='figures'&&ref.id===3)&&LegendsFastStore.relationshipReferences(events[11],memory).some(ref=>ref.kind==='entities'&&ref.id===0),'public relationship references exclude display-only method targets');
await LegendsFastStore.abortImport(world.disk.id);
// Simulate a saved facts2 world with those fields absent from existing headers.
const session=await LegendsFastStore.createImport({files:[file],persistSources:true}),meta=await LegendsFileIndexer.indexFiles([file],{onMetadata:session.metadata,onBlock:headers=>session.writeBlock(headers.map(header=>{const old={...header,factsVersion:2,refs:header.refs.filter(ref=>!ref.sourceCondition)};for(const key of ['reason','reason_id','circumstance','circumstance_id','method','relevant_id_for_method','relevant_entity_id','sanctify_hf','anon_4'])delete old[key];return old;}))});meta.factsVersion=2;
const saved=await session.finish(meta),oldId=saved.disk.id;await LegendsLocalStore.saveWorld(saved);let upgrades=0;await LegendsFastStore.analytics(saved,{progress:progress=>{if(progress.phase==='facts')upgrades++;}});
assert(saved.disk.id!==oldId&&saved.disk.factsVersion===3&&saved.disk.sourceId===oldId&&saved.disk.sourcesPersisted,'facts2 upgrades once while reusing original File namespace',saved.disk);
assert(LegendsFastStore.metrics(saved,'figures',{id:3}).eventCount===5&&upgrades>0,'upgraded saved world gains exact conditional metrics');
await LegendsLocalStore.saveWorld(saved);const db=await LegendsLocalStore.database(),restored=await LegendsLocalStore.getWorld(saved.id);let reread=false;await LegendsFastStore.analytics(restored,{progress:progress=>{if(progress.phase==='facts')reread=true;}});const original=await LegendsFastStore.getRecord(restored,'events',9);
assert(!reread&&restored.disk.id===saved.disk.id&&original.circumstance.defeated==='3','saved upgrade reopens without another XML scan and preserves source File',original);
await LegendsLocalStore.deleteWorld(saved.id);
}

async function run(){
// A legacy tab may keep v1 open. Preparation must not touch that database.
const blocker=await new Promise((resolve,reject)=>{const request=indexedDB.open('legends-file-index',1);request.onupgradeneeded=()=>{request.result.createObjectStore('sources',{keyPath:['importId','fileNo']});request.result.createObjectStore('blocks',{keyPath:['importId','group','blockNo']});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const preparedAt=performance.now(),prepared=await LegendsFastStore.createImport({id:'blocked-preparation',files:[new File(['<df_world/>'],'blocked.xml')]});assert(performance.now()-preparedAt<100,'preparation never awaits IndexedDB or large File persistence');
const fresh=await LegendsFastStore.database();assert(fresh.name==='legends-file-index-v3','legacy tab cannot block isolated current index database',fresh.name);
const legacyXml='<df_world><historical_events><historical_event><id>7</id><type>hf travel</type><year>2</year><group_hfid>1</group_hfid></historical_event></historical_events></df_world>',offset=legacyXml.indexOf('<historical_event>'),length=legacyXml.indexOf('</historical_event>')+19-offset;
await new Promise((resolve,reject)=>{const tx=blocker.transaction(['sources','blocks'],'readwrite');tx.objectStore('sources').put({importId:'legacy-read',fileNo:0,file:new File([legacyXml],'legacy.xml')});tx.objectStore('blocks').put({importId:'legacy-read',group:'events',blockNo:0,headers:[{id:7,fileNo:0,offset,length,primary:true,section:'historical_events'}]});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
const legacy={disk:{format:'file-index',id:'legacy-read',fileInfo:[{encoding:'utf-8'}],manifest:{events:[{blockNo:0,minId:7,maxId:7,count:1}]}},events:[]};const legacyRecord=await LegendsFastStore.getRecord(legacy,'events',7);assert(legacyRecord?.id===7&&legacyRecord.type==='hf travel','legacy v1 source/block reads need no database upgrade',legacyRecord);
await LegendsFastStore.abortImport('legacy-read',{dbName:'legends-file-index'});blocker.close();await LegendsFastStore.abortImport(prepared.id);

const world=await importIndexed([new File([fixture()],'facts-legends.xml')]);world.year=200;const oldId=world.disk.id;
const sources=await new Promise((resolve,reject)=>{LegendsFastStore.database().then(db=>{const request=db.transaction('sources').objectStore('sources').getAll();request.onsuccess=()=>resolve(request.result.filter(row=>row.importId===oldId));request.onerror=()=>reject(request.error);},reject);});assert(sources.length===0,'indexing does not copy original File before first world');
await LegendsFastStore.persistSourceFiles(world,[new File([fixture()],'facts-legends.xml')]);assert(world.disk.sourcesPersisted===true,'explicit background source persistence completes');
let beats=0;const timer=setInterval(()=>beats++,1);const a=await LegendsFastStore.analytics(world);clearInterval(timer);
assert(a.version===5&&a.currentYear===200,'world current year preserved',a.currentYear);
assert(world.disk.id===oldId,'current facts require no XML reindex');
assert(a.populationMembers[7]===1,'population members use exact HF ent_pop_id');
assert(world.disk.rawEventCount===14&&world.disk.counts.events===16&&a.virtualEvents.count===2,'source BattleFought appended without changing raw count',{raw:world.disk.rawEventCount,total:world.disk.counts.events});
const virtual=await LegendsFastStore.getRecord(world,'events',14);assert(virtual.synthetic&&virtual.hfid===1&&virtual.battle_id===1&&virtual.as_attacker===true,'source virtual event ID and flags',virtual);
assert(LegendsFastStore.relationshipReferences(virtual,world).length===1&&LegendsFastStore.relationshipReferences(virtual,world)[0].kind==='figures','source virtual event belongs only to its historical figure');
const lastPage=await LegendsFastStore.query(world,'events',{page:2,pageSize:10});assert(lastPage.total===16&&lastPage.rows.at(-1).id===15,'virtual events appear on last paginated page',lastPage);
const reverse=await LegendsFastStore.query(world,'events',{pageSize:3,descending:true});assert(reverse.rows.map(row=>row.id).join(',')==='15,14,13','virtual/raw descending boundary',reverse.rows);

const cards=LegendsRecords.calculate(world).categories.flatMap(category=>category.cards);
assert(cards.length===21&&cards.every(card=>card.entries.length),'all 21 original rankings populated',cards.map(card=>[card.id,card.entries.length]));
const first=key=>cards.find(card=>card.id===key).entries[0];
for(const [key,value]of Object.entries({top_slayers:2,bloodiest_battles:9,fiercest_duelists:1,devastating_rampages:1,longest_reigns:49,shortest_reigns:49,contested_sites:2,largest_empires:2,greatest_scholars:1,prolific_authors:1,masters_of_disguise:2,oldest_living:210,most_travelled:1,largest_regions:3,largest_underground_regions:2,bloodiest_regions:1,longest_rivers:3,highest_peaks:100}))assert(first(key).value===value,'source ranking '+key,first(key));
assert(a.siteOwnership[0].owner===1&&a.siteOwnership[0].civ===0&&a.siteOwnership[0].history.length===2,'ownership history and parent civilization',a.siteOwnership[0]);
assert(a.figureDeaths[5]===31,'death event overrides unfinished figure death');
const structure=await LegendsFastStore.getRecord(world,'structures',0);assert(structure.local_id===0&&structure.site_id===0&&structure.name==='Tower','nested structure global lookup',structure);
const battle=await LegendsFastStore.getRecord(world,'battles',1);assert(battle.DeathCount===9&&battle.AttackerCount===21&&battle.DefenderCount===11,'battle squads + notable casualties',battle);
assert(battle.squadDeaths.dwarf===5&&battle.squadDeaths.goblin===3,'bounded squad race totals',battle.squadDeaths);
const war=await LegendsFastStore.getRecord(world,'wars',0);assert(war.DeathCount===9&&war.BattleCount===1&&war.SitesLostCount===1,'war aggregate child metrics',war);
const date=await LegendsFastStore.query(world,'events',{sortKey:'date',pageSize:100});assert(date.rows.findIndex(row=>row.id===4)<date.rows.findIndex(row=>row.id===3),'date sorting respects seconds72',date.rows.map(row=>row.id));
const byCount=await LegendsFastStore.query(world,'figures',{sortKey:'eventCount',descending:true});assert(byCount.rows[0].id===1,'derived count sorting',byCount.rows.map(row=>[row.id,row.eventCount]));
const filtered=await LegendsFastStore.query(world,'figures',{rules:[{propertyName:'IsAlive',operator:'Equals',value:'true'},{propertyName:'Age',operator:'GreaterThan',value:'205'}]});assert(filtered.total===1&&filtered.rows[0].id===1,'derived alive/age filters exact',filtered);
const related=await LegendsFastStore.related(world,'sites',0,{detail:true});assert(related.collectionIds.length>=2&&related.detail.collections.length===related.collectionIds.length&&related.detail.events.length>0,'complete related facts and collections',related);
assert(beats>0,'analytics worker keeps main event loop responsive',beats);
const memory=await LegendsData.parseXML(fixture());memory.year=200;const ma=await LegendsFastStore.analytics(memory);assert(!memory.disk&&memory.events.length===16&&ma.records.entries.oldest_living[0].value===210,'memory analytics uses same calculation without disk tag',ma.records.entries.oldest_living);
for(const card of cards){const expected=card.entries[0]?.value,actual=ma.records.entries[card.id]?.[0]?.value;assert(actual===expected,'memory/disk ranking parity '+card.id,{expected,actual});}
const clampFile=new File(['<df_world><historical_event_collections><historical_event_collection><id>0</id><type>battle</type><attacking_squad_race>dwarf</attacking_squad_race><attacking_squad_race>dwarf</attacking_squad_race><attacking_squad_number>-1</attacking_squad_number><attacking_squad_number>101</attacking_squad_number><attacking_squad_deaths>-1</attacking_squad_deaths><attacking_squad_deaths>101</attacking_squad_deaths></historical_event_collection></historical_event_collections></df_world>'],'clamp-legends.xml');let clamp;await LegendsFileIndexer.indexFiles([clampFile],{onBlock:rows=>{clamp=rows[0];}});assert(clamp.attacking_squad_number_sum===200&&clamp.attacking_squad_deaths_sum===200&&clamp.squad_races.dwarf.attacking_deaths===200,'source each-squad clamp -1/101 to100',clamp);

await LegendsFastStore.abortImport(world.disk.id);
const files=[...document.querySelector('#files').files];if(files.length){const paired=await importIndexed(files),stats=await LegendsFastStore.analytics(paired);const structures=await LegendsFastStore.query(paired,'structures');assert(structures.total===2,'paired structures merge by site/local',structures);assert(stats.records.entries.top_slayers?.length>0,'upstream paired real rankings',stats.records.entries.top_slayers);await LegendsFastStore.abortImport(paired.disk.id);}
await conditionalReferencesRegression();
await mainCivilizationRegression();
await civilizationRaceRegression();
await copiedWorksRegression();
return {ok:true,checks:checks.length,labels:checks,rankings:cards.map(card=>({id:card.id,first:card.entries[0]?.value})),beats};
}
global.runAnalyticsRegression=run;global.analyticsFixture=fixture;
})(window);
