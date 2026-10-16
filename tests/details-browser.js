/* Source facts and cancellation checks for type-specific detail models. */
(function(global){
'use strict';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const checks=[];const assert=(condition,label,actual)=>{if(!condition)throw new Error(label+': '+JSON.stringify(actual));checks.push(label);};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const term=value=>({queen:'女王',king:'国王',general:'将军',monarch:'君主',mountains:'山岳',metals:'金属',position:'职位'}[value]||String(value??''));
global.DFTranslate={name:value=>value,description:value=>value};
function fixture(){
 const figures=[{id:8,name:'Named Noble',caste:'FEMALE',birth_year:0,death_year:100,hf_link:[{hfid:9,link_type:'deity',link_strength:80}],vague_relationship:[{hfid:10,war_buddy:''},{hfid:11,atheletic_rival:''}],entity_position_link:[{entity_id:5,position_profile_id:4,start_year:1,end_year:10}]},{id:9,name:'Mountain Deity',sphere:['mountains','metals']},{id:10,name:'Named War Buddy'},{id:11,name:'Named Athletic Rival'},{id:12,name:'Named Curse Parent'}];
 const site={id:7,name:'Named Site',site_properties:{site_property:[{id:0,type:'house',structure_id:3,owner_hfid:8}]}};
 const entities=[{id:5,name:'Named Civilization',entity_position:[{id:0,name:'monarch',name_male:'king',name_female:'queen'},{id:1,name:'general'}],entity_position_assignment:[{id:4,position_id:0,histfig:8}]},{id:6,name:'Named Defenders'}];
 const structure={id:42,local_id:3,site_id:7,name:'Named Tower',type:'tower'};
 const event={id:21,type:'hf does interaction',year:40,doer_hfid:12,target_hfid:8,interaction:'WEREBEAST_TEST',interaction_action:'[IS_HIST_STRING_2:bit, passing on the fox monster curse]'};
 const world={year:200,figures,sites:[site],entities,artifacts:[],events:[event],collections:[],regions:[],extra:{structures:[structure]},aggregates:{structureLookup:{'7:3':42},positionsByFigure:{8:[{entityId:5,positionId:0,title:'monarch',start:20,end:50},{entityId:5,positionId:1,title:'general',start:50,end:null}]}}};
 return{world,site,structure,event};
}
function contextFor(world,options={}){
 const source=new Map(),indexes={};for(const [kind,records]of Object.entries({...world,...world.extra}))if(Array.isArray(records)){indexes[kind]=new Map(records.map(record=>[Number(record.id),record]));for(const record of records)source.set(kind+':'+record.id,record);}
 const reads=[];
 const context={escape,term,name:record=>record.name||record.title||'#'+record.id,indexes,references:record=>record.refs||[],getRecord:async(kind,id)=>{reads.push(kind+':'+id);return source.get(kind+':'+id)||null;},getNameRecord:async(kind,id)=>source.get(kind+':'+id)||null,cacheRecords:()=>{if(options.evict)for(const index of Object.values(indexes))index.clear();},eventText:event=>escape(event.type),link:(kind,id,label)=>'<span data-object-kind="'+escape(kind)+'" data-object-id="'+id+'"><a href="#/'+kind+'/'+id+'">'+escape(label||indexes[kind]?.get(Number(id))?.name||'#'+id)+'</a></span>',relatedResult:{detail:{events:options.events||[],collections:[]},eventIds:[],collectionIds:[]}};
 return{context,reads,source};
}
const allItems=model=>[...model.before,...model.after].flatMap(card=>card.items||[]);
const text=value=>{const template=document.createElement('template');template.innerHTML=value;return template.content.textContent;};
async function run(){
 const landmass={id:0,name:'The First Continent',coord_1:'1,2',coord_2:'15,20'};
 assert(JSON.stringify(LegendsDetails.coordinates(landmass))==='[[1,2],[15,20]]','DFHack landmass bounds retain both source coordinates without inventing interior tiles',LegendsDetails.coordinates(landmass));
 let{world,structure,event}=fixture();let{context,reads}=contextFor(world,{events:[{id:21,type:'hf does interaction',doer_hfid:12,target_hfid:8}],evict:true});
 const hf=await LegendsDetails.load(world,'figures',world.figures[0],context),cards=[...hf.before,...hf.after],positions=cards.find(card=>card.title==='贵族职位');
 assert(positions?.items.length===2,'derived historical positions take priority over incomplete raw links',positions);
 assert(text(positions.items[0].title).includes('前任女王')&&positions.items[0].subtitle==='从 20 年 至 50 年','position caste title and former reign match HfPosition',positions.items[0]);
 assert(text(positions.items[1].title).includes('前任将军')&&positions.items[1].subtitle==='从 50 年 至 100 年','ongoing position ends at known figure death',positions.items[1]);
 assert(text(cards.find(card=>card.title==='人物概览').items[0].title).includes('前任将军'),'latest noble position appears in original misc profile',cards[0]);
 const vague=cards.find(card=>card.title==='模糊关系');assert(vague.items[0].title==='战友'&&vague.items[1].title==='竞技对手','XML relationship flags and misspelled athletic enum mapped',vague);
 assert(vague.items[0].subtitle.includes('Named War Buddy')&&!vague.items[0].subtitle.includes('#10'),'local loaded names survive global cache eviction',vague.items[0]);
 const deities=cards.find(card=>card.title==='崇拜的神祇');assert(deities.items[0].subtitle==='山岳、金属'&&deities.items[0].append===80,'deity subtitles retain source spheres and strength',deities.items[0]);
 const curse=allItems(hf).find(item=>typeof item==='object'&&item.title.includes('诅咒传承来源'));assert(curse?.subtitle.includes('Named Curse Parent')&&reads.filter(key=>key==='events:21').length===1,'curse parent reads only relevant original interaction slice',curse);
 ({world,structure}=fixture());({context}=contextFor(world));const sm=await LegendsDetails.load(world,'structures',structure,context),owner=allItems(sm).find(item=>item.title==='所有者／领导者');assert(owner?.subtitle.includes('Named Noble'),'structure owner resolved from site property local structure ID',owner);
 ({world}=fixture());({context}=contextFor(world));const am=await LegendsDetails.load(world,'artifacts',{id:2,name:'Named Artifact',site_id:7,structure_local_id:3,structure_id:-1},context),stored=allItems(am).find(item=>item.title==='存放建筑');assert(stored?.subtitle.includes('Named Tower')&&stored.subtitle.includes('/structures/42'),'artifact site/local structure resolves global ID',stored);
 ({world}=fixture());({context}=contextFor(world));const battle=await LegendsDetails.load(world,'battles',{id:3,type:'battle',attacking_enid:5,defending_enid:6,outcome:'defender won',attackerDeathCount:2,defenderDeathCount:3},context);assert(allItems(battle).some(item=>item.title==='防守方（胜利）')&&!allItems(battle).some(item=>item.title==='进攻方（胜利）'),'only victorious source battle side marked',allItems(battle));
 const war=await LegendsDetails.load(world,'wars',{id:4,type:'war',aggressor_ent_id:5,defender_ent_id:6,outcome:'attacker won'},context);assert(!allItems(war).some(item=>item.title.includes('胜利')),'war misc card does not invent a victorious side');
 const noCurse=fixture();({context}=contextFor(noCurse.world,{events:[{id:21,type:'hf does interaction',target_hfid:8,doer_hfid:12,interaction:''}]}));const plain=await LegendsDetails.load(noCurse.world,'figures',noCurse.world.figures[0],context);assert(!allItems(plain).some(item=>item.title?.includes('诅咒传承来源')),'empty interaction does not invent source curse parent');
 // Simulate a page cancellation while the shared geography task is pending.
 let scans=0;global.LegendsFastStore={scanHeaders:async(world,kind,visit,{signal}={})=>{scans++;await wait(15);if(signal?.aborted)throw new DOMException('cancelled','AbortError');visit({id:1,name:'Real Region',coords:'1,1'});},headerSummary:record=>record};
 const geo={disk:{format:'file-index',counts:{regions:1}},regions:[],sites:[],entities:[],extra:{}},oldController=new AbortController(),newController=new AbortController(),first=LegendsDetails.prepareGeography(geo,{signal:oldController.signal,indexes:{}}).catch(error=>error),newIndexes={};
 await wait(1);const second=LegendsDetails.prepareGeography(geo,{signal:newController.signal,indexes:newIndexes});oldController.abort();const oldError=await first;await second;
 assert(oldError.name==='AbortError'&&geo.regions.length===1&&newIndexes.regions.get(1)?.name==='Real Region','cancelled old geography task cannot poison next live page',{old:oldError.name,scans,regions:geo.regions});
 const fullEntity={id:7,name:'Full Government',entity_link:[{type:'PARENT',target:1},{type:'PARENT',target:2}],source_marker:'COMPLETE_SOURCE'},preserved={entities:new Map([[7,fullEntity]])};
 const completeGeo={disk:{format:'file-index',counts:{}},regions:[],sites:[],entities:[{id:7,name:'Full Government'}],extra:{entity_populations:[{id:1,race:'DWARF:10'}]}};
 await LegendsDetails.prepareGeography(completeGeo,{indexes:preserved});const originalMap=preserved.entities;await LegendsDetails.prepareGeography(completeGeo,{indexes:preserved});
 assert(preserved.entities===originalMap&&preserved.entities.get(7)===fullEntity&&preserved.entity_populations.get(1)?.race==='DWARF:10','geography reuse preserves complete cached entity metadata and populations',preserved.entities.get(7));
 // Figure property lookups share compact inverse maps across detail pages.
 const cached=fixture();cached.world.artifacts=[{id:2,name:'Named Heirloom',holder_hfid:8}];cached.world.disk={format:'file-index',id:'cached-detail-facts',counts:{}};
 const dedicated={...cached.structure,worship_hfid:8},factScans={};cached.world.extra.structures=[dedicated];
 global.LegendsFastStore={scanHeaders:async(world,kind,visit,{signal}={})=>{factScans[kind]=(factScans[kind]||0)+1;for(const row of kind==='artifacts'?world.artifacts:kind==='structures'?world.extra.structures:[]){if(signal?.aborted)throw new DOMException('cancelled','AbortError');visit(row);}},headerSummary:record=>record};
 let cachedContext=contextFor(cached.world).context;cachedContext.relatedResult.detail.collections=[{id:999,type:'war'}];
 const unnecessary=[];const getCachedName=cachedContext.getNameRecord;cachedContext.getNameRecord=async(kind,id)=>{unnecessary.push(kind+':'+id);return getCachedName(kind,id);};
 const firstCached=await LegendsDetails.load(cached.world,'figures',cached.world.figures[0],cachedContext);
 const secondCached=await LegendsDetails.load(cached.world,'figures',cached.world.figures[2],contextFor(cached.world).context);
 assert(factScans.artifacts===1&&factScans.structures===1,'figure artifact and dedication headers scan once per index',factScans);
 assert(allItems(firstCached).some(item=>typeof item==='string'&&item.includes('Named Heirloom'))&&allItems(firstCached).some(item=>typeof item==='string'&&item.includes('Named Tower')),'inverse maps preserve held artifacts and dedicated buildings',allItems(firstCached));
 assert(!allItems(secondCached).some(item=>typeof item==='string'&&(item.includes('Named Heirloom')||item.includes('Named Tower'))),'inverse maps return only current figure relationships',allItems(secondCached));
 assert(!unnecessary.includes('wars:999')&&!unnecessary.includes('collections:999'),'unshown related chronicles do not request names',unnecessary);
 global.LegendsFastStore.prepareSourceRoles=async()=>({beastActors:{401:8,402:10}});
 const beastContext=contextFor(cached.world).context;beastContext.relatedResult.detail.collections=[{id:401,type:'beast attack'},{id:402,type:'beast attack'},{id:403,type:'beast attack'}];
 const beastModel=await LegendsDetails.load(cached.world,'figures',cached.world.figures[0],beastContext),beastCard=beastModel.after.find(card=>card.title==='巨兽袭击');
 assert(beastCard?.items.length===1&&beastCard.items[0].includes('/rampages/401'),'figure beast attack card follows the inferred beast actor, not other participants',beastCard);
 const retry=fixture();retry.world.disk={format:'file-index',id:'cancelled-detail-facts',counts:{}};retry.world.artifacts=[{id:2,name:'Named Heirloom',holder_hfid:8}];
 let factAttempts=0;global.LegendsFastStore={scanHeaders:async(world,kind,visit,{signal}={})=>{if(kind!=='artifacts')return;factAttempts++;await wait(15);if(signal?.aborted)throw new DOMException('cancelled','AbortError');for(const row of world.artifacts)visit(row);},headerSummary:record=>record};
 const oldFacts=new AbortController(),newFacts=new AbortController(),oldContext=contextFor(retry.world).context,nextContext=contextFor(retry.world).context;oldContext.signal=oldFacts.signal;nextContext.signal=newFacts.signal;
 const abandoned=LegendsDetails.load(retry.world,'figures',retry.world.figures[0],oldContext).catch(error=>error);await wait(2);
 const current=LegendsDetails.load(retry.world,'figures',retry.world.figures[0],nextContext);oldFacts.abort();const abandonedError=await abandoned,completed=await current;
 assert(abandonedError.name==='AbortError'&&factAttempts===2,'cancelled property lookup is rebuilt for the live figure',{error:abandonedError.name,factAttempts});
 assert(allItems(completed).some(item=>typeof item==='string'&&item.includes('Named Heirloom')),'live figure retains complete property links after cancellation',allItems(completed));

 // Original HF journey pets combine raw entries with targeted taming events.
 const petFixture=fixture(),petWorld=petFixture.world;petWorld.figures[0].journey_pet=['DOG'];petWorld.regions=[{id:1,name:'Named Forest',type:'Forest',force_id:9,coords:'1,1'}];petWorld.undergroundregions=[{id:2,name:'Named Cavern',coords:'1,1'}];
 petWorld.events=[{id:31,type:'hf new pet',group_hfid:8,pets:'DOG',site_id:7},{id:32,type:'hf new pet',group_hfid:8,pets:'DOG',subregion_id:1},{id:33,type:'hf new pet',group_hfid:8,pets:'CAT',feature_layer_id:2}];
 const petState=contextFor(petWorld,{events:petWorld.events.map(({id,type,group_hfid})=>({id,type,group_hfid}))}),petModel=await LegendsDetails.load(petWorld,'figures',petWorld.figures[0],petState.context),petCard=petModel.before.find(card=>card.title==='旅途宠物');
 assert(petCard?.items.length===2&&petCard.items[0].title==='DOG'&&petCard.items[1].title==='CAT','raw pets and repeated taming events combine without truncation or duplicate species',petCard);
 assert(petCard.items[0].subtitle.includes('Named Forest')&&!petCard.items[0].subtitle.includes('Named Site')&&petCard.items[1].subtitle.includes('Named Cavern'),'pet entries retain latest original site/region/underground taming location',petCard);
 assert(petState.reads.filter(value=>value.startsWith('events:')).join(',')==='events:31,events:32,events:33','pet facts read only their relevant source slices when compact headers lack pets',petState.reads);
 // Top 100 is the source limit, accompanied by the exact remaining count.
 const deityFixture=fixture(),deityWorld=deityFixture.world;deityWorld.figures[1].deity='';deityWorld.entities[0].type='civilization';deityWorld.entities.push({id:15,name:'Named Religion',type:'religion',worship_id:9});deityWorld.regions=[{id:1,name:'Named Holy Region',force_id:9}];
 deityWorld.figures.push(...Array.from({length:103},(_,at)=>({id:1000+at,name:'Worshipper '+at,caste:'MALE',death_year:-1,hf_link:[{hfid:9,link_type:'deity',link_strength:200-at}]})));delete deityWorld.figures[0].hf_link;
 deityWorld.aggregates.positionsByFigure[1000]=[{entityId:5,positionId:0,title:'monarch',start:20,end:null}];
 const deityModel=await LegendsDetails.load(deityWorld,'figures',deityWorld.figures[1],contextFor(deityWorld).context),worshipCard=deityModel.before.find(card=>card.title==='崇拜此人物的人物'),deityProfile=deityModel.before.find(card=>card.title==='人物概览'),worshipEntities=deityModel.before.find(card=>card.title==='崇拜此人物的派系');
 assert(worshipCard?.items.length===101&&worshipCard.items[100].subtitle.includes('3 位'),'source Top100 keeps 100 strongest links and reports all remaining worshippers',worshipCard?.items.length);
 assert(worshipCard.items[0].append===200&&worshipCard.items[99].append===101,'source worship strength ordering retained at exact boundary',[worshipCard.items[0],worshipCard.items[99]]);
 assert(worshipCard.items[0].subtitle==='国王 · Named Civilization','worshipper latest noble assignment uses original caste and faction subtitle',worshipCard.items[0]);
 assert(deityProfile.items.some(item=>item.title==='受崇拜人数'&&item.subtitle==='103 位历史人物')&&deityProfile.items.some(item=>item.title==='相关区域'&&item.subtitle.includes('Named Holy Region')),'HF original profile includes full worshipper count and force-related regions',deityProfile);
 assert(worshipEntities?.items[0].subtitle==='religion'&&worshipEntities.items[0].title.includes('Named Religion'),'worshipping faction retains its original type subtitle',worshipEntities);
 // All figure/artifact inverse maps share one scan per immutable source group.
 const indexed=fixture(),indexedWorld=indexed.world;indexedWorld.disk={format:'file-index',id:'all-detail-inverses',counts:{}};
 indexedWorld.figures.push(...Array.from({length:885},(_,at)=>({id:3000+at,name:'All Related Figure '+at,entity_position_link:[{entity_id:5}],refs:[{kind:'sites',id:7},{kind:'sites',id:7}]})),{id:5000,name:'Other Figure',entity_former_position_link:[{entity_id:6}],refs:[{kind:'sites',id:17}]});indexedWorld.sites.push({id:17,name:'Other Site'});
 indexedWorld.artifacts=[{id:60,name:'Written Artifact A',writing:70,holder_hfid:8},{id:61,name:'Written Artifact B',written_content_ids:[70,70]},{id:62,name:'Written Artifact C',item:{page_written_content_id:[70,71]}},{id:63,name:'Written Artifact D',writing:71}];indexedWorld.writtencontents=[{id:70,name:'Named First Work'},{id:71,name:'Named Second Work'}];
 const inverseScans={};global.LegendsFastStore={scanHeaders:async(world,kind,visit,{signal}={})=>{inverseScans[kind]=(inverseScans[kind]||0)+1;for(const row of world[kind]||world.extra?.[kind]||[]){if(signal?.aborted)throw new DOMException('cancelled','AbortError');visit(row);}},headerSummary:record=>record};
 const entityModel=await LegendsDetails.load(indexedWorld,'entities',indexedWorld.entities[0],contextFor(indexedWorld).context),siteModel=await LegendsDetails.load(indexedWorld,'sites',indexedWorld.sites[0],contextFor(indexedWorld).context),entityOther=await LegendsDetails.load(indexedWorld,'entities',indexedWorld.entities[1],contextFor(indexedWorld).context),siteOther=await LegendsDetails.load(indexedWorld,'sites',indexedWorld.sites[1],contextFor(indexedWorld).context);
 assert(entityModel.leaderIds.size===886&&entityModel.leaderIds.has(3884)&&!entityModel.leaderIds.has(5000),'entity leader inverse retains every one of 885 matching extra figures and all original assignments',[entityModel.leaderIds.size,[...entityModel.leaderIds].at(-1)]);
 const inhabitants=siteModel.after.find(card=>card.title==='相关人物');assert(inhabitants?.items.length===885&&inhabitants.items.at(-1).includes('All Related Figure 884'),'site relationship inverse retains all 885 links once per source figure',inhabitants?.items.length);
 assert(entityOther.leaderIds.size===1&&entityOther.leaderIds.has(5000)&&siteOther.after.find(card=>card.title==='相关人物')?.items.length===1,'shared inverse maps isolate adjacent entity and site IDs',entityOther.leaderIds.size);
 assert(inverseScans.figures===1,'entity and site views reuse the same complete figure inverse scan',inverseScans);
 const workA=await LegendsDetails.load(indexedWorld,'writtencontents',indexedWorld.writtencontents[0],contextFor(indexedWorld).context),workB=await LegendsDetails.load(indexedWorld,'writtencontents',indexedWorld.writtencontents[1],contextFor(indexedWorld).context);
 const artifactA=allItems(workA).find(item=>item.title==='神器'),artifactB=allItems(workB).find(item=>item.title==='神器');assert((artifactA.subtitle.match(/data-object-kind/g)||[]).length===3&&(artifactB.subtitle.match(/data-object-kind/g)||[]).length===2,'written work inverse preserves scalar, repeated and nested artifact associations',[artifactA,artifactB]);
 assert(inverseScans.artifacts===1,'switching written works reuses a complete artifact inverse scan',inverseScans);
 indexedWorld.disk.id+='-upgraded';indexedWorld.figures.push({id:6000,name:'New Index Figure',entity_position_link:[{entity_id:6}]});const upgradedEntity=await LegendsDetails.load(indexedWorld,'entities',indexedWorld.entities[1],contextFor(indexedWorld).context);assert(inverseScans.figures===2&&upgradedEntity.leaderIds.has(6000)&&upgradedEntity.leaderIds.has(5000),'index replacement invalidates the shared inverse map without losing existing relationships',inverseScans);
 // Cancellation cannot cache a partial source-group map for another view.
 const cancelled=fixture(),cancelledWorld=cancelled.world;cancelledWorld.disk={format:'file-index',id:'cancelled-inverse-group',counts:{}};cancelledWorld.figures[0].refs=[{kind:'sites',id:7}];let inverseAttempts=0;
 global.LegendsFastStore={scanHeaders:async(world,kind,visit,{signal}={})=>{if(kind!=='figures')return;inverseAttempts++;visit(world.figures[0]);await wait(15);if(signal?.aborted)throw new DOMException('cancelled','AbortError');for(const row of world.figures.slice(1))visit(row);},headerSummary:record=>record};
 const oldInverse=new AbortController(),newInverse=new AbortController(),oldEntityContext=contextFor(cancelledWorld).context,newSiteContext=contextFor(cancelledWorld).context;oldEntityContext.signal=oldInverse.signal;newSiteContext.signal=newInverse.signal;
 const oldEntity=LegendsDetails.load(cancelledWorld,'entities',cancelledWorld.entities[0],oldEntityContext).catch(error=>error);await wait(1);const liveSite=LegendsDetails.load(cancelledWorld,'sites',cancelledWorld.sites[0],newSiteContext);oldInverse.abort();const oldInverseError=await oldEntity,liveSiteModel=await liveSite;
 assert(oldInverseError.name==='AbortError'&&inverseAttempts===2&&liveSiteModel.after.find(card=>card.title==='相关人物')?.items.length===1,'cancelled entity inverse is rebuilt completely for the next live site view',{old:oldInverseError.name,inverseAttempts});
 // Original geography summaries and bridge placement, including rectangle-only
 // riverside sites and master routes without their own crossing coordinates.
 const geoWorld={year:200,figures:[],entities:[],artifacts:[],collections:[],events:[],regions:[{id:1,name:'Surface Region',coords:'2,2|3,2'}],sites:[{id:7,name:'Rectangle Site',coords:'0,0',rectangle:'1,1:4,4'},{id:8,name:'Point Site',coords:'2,2'}],undergroundregions:[{id:2,name:'Cavern Region',coords:'2,2',depth:1,type:'cavern'}],rivers:[{id:3,name:'Named River',path:'2,2',end_pos:'3,2'}],constructions:[{id:4,name:'Master Road',type:'road',coords:'8,8'},{id:5,name:'Bridge Section',type:'bridge',coords:'2,2',master_construction_id:4},{id:6,name:'Tunnel Route',type:'tunnel',coords:'9,9'},{id:9,name:'Tunnel Bridge',type:'bridge',coords:'2,2',master_construction_id:6}],extra:{}};
 const riverModel=await LegendsDetails.load(geoWorld,'rivers',geoWorld.rivers[0],contextFor(geoWorld).context),riverItems=allItems(riverModel),riverside=riverModel.before.find(card=>card.title==='沿河地点'),riverRoads=riverModel.before.find(card=>card.title==='道路与桥梁');
 assert(riverside?.items.length===2&&riverside.items.some(item=>item.includes('Rectangle Site')),'river links include sites whose rectangle intersects the river outside the origin point',riverside);
 assert(riverRoads?.items.length===4&&riverRoads.items.some(item=>item.includes('Master Road'))&&riverRoads.items.some(item=>item.includes('Tunnel Route')),'river crossings include child structures and their original master routes',riverRoads);
 assert(riverItems.some(item=>item.title==='河流长度'&&item.subtitle==='2 格')&&riverItems.some(item=>item.title==='流经的区域'&&item.subtitle==='1')&&riverItems.some(item=>item.title==='沿河地点'&&item.subtitle==='2')&&riverItems.some(item=>item.title==='道路与桥梁'&&item.subtitle==='4'),'river original length and three relation summary counts are complete',riverItems);
 const breach={id:44,type:'entity breach feature layer',feature_layer_id:2},underContext=contextFor(geoWorld,{events:[breach]}).context,underModel=await LegendsDetails.load(geoWorld,'undergroundregions',geoWorld.undergroundregions[0],underContext);
 assert(['突破与发现','上方地表区域','相关地点'].every(title=>allItems(underModel).some(item=>item.title===title&&item.subtitle==='1')),'underground original summary counts match full discovery/region/site cards',allItems(underModel));
 const roadBridge=await LegendsDetails.load(geoWorld,'constructions',geoWorld.constructions[1],contextFor(geoWorld).context),tunnelBridge=await LegendsDetails.load(geoWorld,'constructions',geoWorld.constructions[3],contextFor(geoWorld).context);
 assert(roadBridge.before.length===1&&allItems(roadBridge).some(item=>item.title==='地表区域'&&item.subtitle.includes('Surface Region'))&&!allItems(roadBridge).some(item=>item.title==='地下区域'),'road bridge shows direct surface links only in original summary without extra region cards',roadBridge.before);
 assert(tunnelBridge.before.length===1&&allItems(tunnelBridge).some(item=>item.title==='地下区域'&&item.subtitle.includes('Cavern Region'))&&!allItems(tunnelBridge).some(item=>item.title==='地表区域'),'tunnel bridge inherits master route type and shows only direct underground links',tunnelBridge.before);
 const roadModel=await LegendsDetails.load(geoWorld,'constructions',geoWorld.constructions[0],contextFor(geoWorld).context);
 assert(allItems(roadModel).some(item=>item.title==='分段'&&item.subtitle==='1')&&allItems(roadModel).some(item=>item.title==='跨越的河流'&&item.subtitle==='1'),'master construction summary retains all subsection and inherited river counts',allItems(roadModel));

 // Old persisted indexes omit rectangle. Read only missing site source slices,
 // in stable numeric order and at most four at once, then publish atomically.
 const diskRiverWorld={...geoWorld,disk:{format:'file-index',id:'legacy-river-sites',counts:{}},sites:Array.from({length:9},(_,at)=>({id:100+at,name:'Disk Site '+at,coords:'0,0',...(at===5?{rectangle:'20,20:21,21'}:{})})).reverse()},fullRiverSites=new Map(diskRiverWorld.sites.map(record=>[record.id,{...record,rectangle:record.id===100?'1,1:3,3':'20,20:21,21'}]));
 let siteReads=[],activeSiteReads=0,maxSiteReads=0;
 const riverContext=(world,signal,{holdId}={})=>{const base=contextFor(world).context,read=base.getRecord;base.signal=signal;base.getRecord=async(kind,id)=>{if(kind!=='sites')return read(kind,id);siteReads.push(Number(id));activeSiteReads++;maxSiteReads=Math.max(maxSiteReads,activeSiteReads);try{await wait(3);if(Number(id)===holdId)await new Promise((resolve,reject)=>{if(signal.aborted)return reject(new DOMException('cancelled','AbortError'));signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});if(signal?.aborted)throw new DOMException('cancelled','AbortError');return fullRiverSites.get(Number(id));}finally{activeSiteReads--;}};return base;};
 const firstDiskRiver=await LegendsDetails.load(diskRiverWorld,'rivers',diskRiverWorld.rivers[0],riverContext(diskRiverWorld)),firstDiskSites=firstDiskRiver.before.find(card=>card.title==='沿河地点');
 assert(firstDiskSites?.items.length===1&&firstDiskSites.items[0].includes('Disk Site 0'),'old disk river resolves a rectangle-only site from its actual source record',firstDiskSites);
 assert(siteReads.join(',')==='100,101,102,103,104,106,107,108'&&maxSiteReads===4,'legacy rectangle source reads stay in site order with four concurrent slices and skip known fields',{siteReads,maxSiteReads});
 const firstDiskReadCount=siteReads.length;await LegendsDetails.load(diskRiverWorld,'rivers',{...diskRiverWorld.rivers[0],id:30},riverContext(diskRiverWorld));
 assert(siteReads.length===firstDiskReadCount&&!Object.hasOwn(diskRiverWorld.sites.find(site=>site.id===100),'rectangle'),'next river reuses completed private site cache without mutating source summaries',siteReads);
 const cancelledRiverWorld={...diskRiverWorld,disk:{...diskRiverWorld.disk,id:'cancelled-river-sites'}},oldRiverSignal=new AbortController(),newRiverSignal=new AbortController();siteReads=[];
 const oldRiver=LegendsDetails.load(cancelledRiverWorld,'rivers',cancelledRiverWorld.rivers[0],riverContext(cancelledRiverWorld,oldRiverSignal.signal,{holdId:104})).catch(error=>error);
 for(let at=0;at<100&&!siteReads.includes(104);at++)await wait(1);
 const partialSiteReads=siteReads.slice(),newRiver=LegendsDetails.load(cancelledRiverWorld,'rivers',cancelledRiverWorld.rivers[0],riverContext(cancelledRiverWorld,newRiverSignal.signal));oldRiverSignal.abort();const oldRiverError=await oldRiver,completedRiver=await newRiver;
 assert(oldRiverError.name==='AbortError'&&partialSiteReads.length>=5,'cancel an incomplete rectangle cache after earlier site slices completed',{error:oldRiverError.name,partialSiteReads});
 assert(siteReads.slice(partialSiteReads.length).join(',')==='100,101,102,103,104,106,107,108'&&completedRiver.before.find(card=>card.title==='沿河地点')?.items[0].includes('Disk Site 0'),'live river rebuilds every missing site after cancellation instead of accepting a partial cached map',siteReads);
 const completeReadCount=siteReads.length;await LegendsDetails.load(cancelledRiverWorld,'rivers',cancelledRiverWorld.rivers[0],riverContext(cancelledRiverWorld));assert(siteReads.length===completeReadCount,'retried rectangle cache is reusable after complete publication',siteReads);
 return{ok:true,checks:checks.length,labels:checks};
}
global.runDetailsRegression=run;
})(window);
