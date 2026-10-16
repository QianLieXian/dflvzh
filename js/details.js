/* Type-specific cards from upstream src/views/*.vue. All data is derived locally.
 * Large worlds use the compact file index; no page-sized sample is used as a total. */
(function(global){
  'use strict';
  const list=v=>v===undefined||v===null||v===''?[]:Array.isArray(v)||ArrayBuffer.isView(v)?Array.from(v):[v];
  const num=v=>v===undefined||v===null||v===''||typeof v==='object'?null:Number.isFinite(Number(v))?Number(v):null;
  const fold=v=>String(v??'').replace(/_/g,' ').trim().toLowerCase();
  const unique=values=>[...new Set(values)];
  const check=signal=>{if(signal?.aborted)throw new DOMException('载入已取消','AbortError');};
  const extras={undergroundregions:'underground_regions',mountainpeaks:'mountain_peaks',writtencontents:'written_contents',danceforms:'dance_forms',musicalforms:'musical_forms',poeticforms:'poetic_forms',constructions:'world_constructions'};
  const collectionKinds=()=>Object.fromEntries(Object.entries(global.LegendsUI.categories).flatMap(([kind,def])=>(def.collectionTypes||[]).map(type=>[type,kind])));
  function coordinates(record){
    const value=record?.coords??record?.path??[record?.coord_1,record?.coord_2].filter(value=>value!==undefined&&value!==null&&value!=='').join('|');
    const result=String(value||'').split('|').filter(Boolean).map(point=>point.split(',').slice(0,2).map(Number)).filter(pair=>pair.length===2&&pair.every(Number.isFinite));
    if(record?.end_pos){const point=String(record.end_pos).split(',').slice(0,2).map(Number);if(point.length===2&&point.every(Number.isFinite))result.push(point);}
    return result;
  }
  const keys=record=>new Set(coordinates(record).map(p=>p.join(',')));
  const intersects=(record,set)=>coordinates(record).some(point=>set.has(point.join(',')));
  function riverMeetsSite(site,set){
    if(intersects(site,set))return true;
    const raw=site.rectangle??site.raw?.rectangle??site.rect,parts=typeof raw==='string'?raw.split(/[:,]/).map(Number):null;
    if(!parts||parts.length!==4||!parts.every(Number.isFinite))return false;
    const [left,top,right,bottom]=parts;if(right<=left||bottom<=top)return false;
    for(const point of set){const [x,y]=point.split(',').map(Number);if(x>=left&&x<=right&&y>=top&&y<=bottom)return true;}return false;
  }
  const rows=(world,kind)=>world[kind]||world.extra?.[extras[kind]||kind]||[];
  const geographyTasks=new WeakMap(),geographyIndexes=new WeakMap();
  const riverSiteTasks=new WeakMap();
  function waitForTask(task,signal){
    check(signal);if(!signal)return task;
    return new Promise((resolve,reject)=>{const abort=()=>{cleanup();reject(new DOMException('载入已取消','AbortError'));},cleanup=()=>signal.removeEventListener('abort',abort);signal.addEventListener('abort',abort,{once:true});task.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});});
  }
  async function prepareGeography(world,context={}){
    if(world.disk?.format!=='file-index')return;
    const kinds=['regions','undergroundregions','landmasses','rivers','mountainpeaks','constructions','sites','entities','entity_populations'];
    while(true){
      check(context.signal);let entry=geographyTasks.get(world);
      if(!entry||!entry.complete&&entry.signal?.aborted){
        entry={signal:context.signal,complete:false};
        entry.promise=(async()=>{
          for(const kind of kinds){
            check(entry.signal);const group=extras[kind]||kind,total=Number(world.disk.counts[group]||0);if(rows(world,kind).length>=total)continue;
            const records=[];await global.LegendsFastStore.scanHeaders(world,kind,header=>{records.push(global.LegendsFastStore.headerSummary(header,kind,world));},{signal:entry.signal});
            check(entry.signal);world[kind]=records;if(!['regions','sites','entities'].includes(kind))(world.extra||(world.extra={}))[group]=records;
          }
          entry.complete=true;
        })();geographyTasks.set(world,entry);
      }
      try{
        await waitForTask(entry.promise,context.signal);check(context.signal);
        if(context.indexes){
          let indexed=geographyIndexes.get(context.indexes);if(!indexed||indexed.world!==world){indexed={world,rows:new Map()};geographyIndexes.set(context.indexes,indexed);}
          for(const kind of kinds){const records=rows(world,kind);if(indexed.rows.get(kind)===records)continue;const index=context.indexes[kind]||(context.indexes[kind]=new Map());for(const record of records)if(!index.has(Number(record.id)))index.set(Number(record.id),record);indexed.rows.set(kind,records);}
        }
        return;
      }
      catch(error){if(geographyTasks.get(world)===entry&&(entry.signal?.aborted||error.name!=='AbortError'))geographyTasks.delete(world);if(error.name==='AbortError'&&!context.signal?.aborted&&entry.signal?.aborted)continue;throw error;}
    }
  }
  async function riverSites(world,context){
    const source=rows(world,'sites');if(world.disk?.format!=='file-index')return source;
    const build=async signal=>{
      const records=new Map(source.map(record=>[Number(record.id),record])),missing=source.filter(record=>!Object.hasOwn(record,'rectangle')&&!Object.hasOwn(record.raw||{},'rectangle')).sort((a,b)=>Number(a.id)-Number(b.id));let next=0;
      await Promise.all(Array.from({length:Math.min(4,missing.length)},async()=>{while(next<missing.length){check(signal);const record=missing[next++],full=await context.getRecord('sites',record.id,{signal});check(signal);if(full)records.set(Number(record.id),full);}}));
      check(signal);return source.map(record=>records.get(Number(record.id)));
    };
    while(true){
      check(context.signal);let entry=riverSiteTasks.get(world);
      if(!entry||entry.indexId!==world.disk.id||entry.source!==source||!entry.complete&&entry.signal?.aborted){entry={indexId:world.disk.id,source,signal:context.signal,complete:false};entry.promise=build(entry.signal).then(records=>{entry.complete=true;return records;});riverSiteTasks.set(world,entry);}
      try{return await waitForTask(entry.promise,context.signal);}
      catch(error){if(riverSiteTasks.get(world)===entry&&(entry.signal?.aborted||error.name!=='AbortError'))riverSiteTasks.delete(world);if(error.name==='AbortError'&&!context.signal?.aborted&&entry.signal?.aborted)continue;throw error;}
    }
  }
  // VagueRelationship.cs accepts flag element names, including DF's typo.
  const vagueTypes={war_buddy:'战友',athlete_buddy:'运动伙伴',childhood_friend:'儿时好友',persecution_grudge:'迫害宿怨',supernatural_grudge:'超自然宿怨',religious_persecution_grudge:'宗教迫害宿怨',artistic_buddy:'艺术伙伴',jealous_obsession:'嫉妒性迷恋',grudge:'宿怨',jealous_relationship_grudge:'感情嫉妒宿怨',scholar_buddy:'学术伙伴',business_rival:'商业对手',atheletic_rival:'竞技对手',athletic_rival:'竞技对手',lover:'情人',former_lover:'前情人',lieutenant:'副手'};
  function vagueType(record,term){let title;for(const key of Object.keys(record))if(Object.hasOwn(vagueTypes,key))title=vagueTypes[key];return title||term(record.type||record.relationship||'unknown');}
  function siteProperties(site){
    const result=[];const visit=(value,depth)=>{if(!value||typeof value!=='object'||depth>5)return;if(!Array.isArray(value)&&Object.hasOwn(value,'structure_id'))result.push(value);else for(const child of Object.values(value))if(child&&typeof child==='object')visit(child,depth+1);};
    visit(site?.site_properties??site?.raw?.site_properties,0);return result;
  }
  function refs(record,context){return (record.refs||context.references(record)).map(value=>({...value,kind:extras[value.kind]||value.kind}));}
  async function scan(world,kind,visit,context){
    check(context.signal);
    if(world.disk?.format==='file-index')return global.LegendsFastStore.scanHeaders(world,kind,visit,{signal:context.signal});
    let tick=performance.now();
    for(const record of rows(world,kind)){check(context.signal);if(await visit(record)===false)break;if(performance.now()-tick>12){await new Promise(resolve=>setTimeout(resolve,0));tick=performance.now();}}
  }
  // Cache inverse links from compact headers. Reopening another figure must
  // not reread every artifact, structure, and worshipper in the world.
  const figureFactsTasks=new WeakMap();
  async function figureFacts(world,group,context){
    const sourceGroup=['entity_leaders','site_figures'].includes(group)?'figures':group==='written_artifacts'?'artifacts':group;
    const build=async signal=>{
      const result=new Map(),add=(kind,id,value)=>{id=num(id);if(id===null||id<0)return;let facts=result.get(kind);if(!facts)result.set(kind,facts=new Map());let values=facts.get(id);if(!values)facts.set(id,values=[]);values.push(value);};
      let yielded=performance.now();
      await scan(world,sourceGroup,header=>{
        if(sourceGroup==='artifacts'){
          const holders=new Set(),holder=num(header.holder_hfid);if(holder!==null)holders.add(holder);
          for(const value of header.refs||context.references(header))if(value.kind==='figures'&&value.key==='holder_hfid')holders.add(Number(value.id));
          for(const id of holders)add('artifacts',id,Number(header.id));
          const contents=new Set([num(header.writing),...list(header.written_content_ids).map(num),...list(header.item?.page_written_content_id??header.item?.writing_written_content_id).map(num)].filter(value=>value!==null&&value>=0));for(const content of contents)add('written_artifacts',content,Number(header.id));
        }else if(sourceGroup==='structures')add('structures',header.worship_hfid??header.deity,Number(header.id));
        else {
          const deities=new Map();for(const value of list(header.deity_links))if(!deities.has(Number(value.id)))deities.set(Number(value.id),{compact:value});
          for(const value of list(header.hf_link))if(fold(value.link_type)==='deity'){
            const id=Number(value.hfid??value.target),entry=deities.get(id)||{};if(!entry.worship)entry.worship=value;deities.set(id,entry);
          }
          for(const [id,value]of deities)add('figures',id,{id:header.id,strength:Number(value.compact?.strength??value.worship?.link_strength)||0});
          const entities=new Set([...list(header.entity_position_link),...list(header.entity_former_position_link)].map(value=>num(value.entity_id??value.entity??value.target)).filter(value=>value!==null&&value>=0));for(const entity of entities)add('entity_leaders',entity,Number(header.id));
          const sites=new Set();for(const value of header.refs||context.references(header))if(value.kind==='sites')sites.add(Number(value.id));for(const site of sites)add('site_figures',site,Number(header.id));
        }
        if(performance.now()-yielded>12)return new Promise(resolve=>setTimeout(resolve,0)).then(()=>{check(signal);yielded=performance.now();});
      },{...context,signal});
      check(signal);return result;
    };
    if(world.disk?.format!=='file-index')return (await build(context.signal)).get(group)||new Map();
    let groups=figureFactsTasks.get(world);if(!groups)figureFactsTasks.set(world,groups=new Map());
    while(true){
      check(context.signal);let entry=groups.get(sourceGroup);
      if(!entry||entry.indexId!==world.disk.id||!entry.complete&&entry.signal?.aborted){
        entry={signal:context.signal,indexId:world.disk.id,complete:false};entry.promise=build(entry.signal).then(value=>{entry.complete=true;return value;});groups.set(sourceGroup,entry);
      }
      try{return (await waitForTask(entry.promise,context.signal)).get(group)||new Map();}
      catch(error){if(groups.get(sourceGroup)===entry&&(entry.signal?.aborted||error.name!=='AbortError'))groups.delete(sourceGroup);if(error.name==='AbortError'&&!context.signal?.aborted&&entry.signal?.aborted)continue;throw error;}
    }
  }
  async function load(world,kind,record,context){
    await prepareGeography(world,context);
    const {escape:e,term,link,name}=context;
    const model={before:[],after:[],charts:[],collections:[],events:[],records:{},family:kind==='figures',kind,record};
    const request=new Map(),preparedRecords=new Map(),deityRows=[],worshipperRows=[];
    const readFull=async(target,targetId)=>{targetId=num(targetId);if(targetId===null||targetId<0)return null;const key=target+':'+targetId;if(preparedRecords.has(key))return preparedRecords.get(key);check(context.signal);const full=await context.getRecord(target,targetId);check(context.signal);if(full)preparedRecords.set(key,full);return full;};
    const requestRef=(target,id)=>{id=num(id);if(id!==null&&id>=0)request.set(target+':'+id,{kind:target,id});};
    const ref=(target,id)=>{requestRef(target,id);const collection=global.LegendsUI.categories[target]?.collectionTypes&&model.collections.find(value=>Number(value.id)===Number(id));return collection&&global.DFTranslate.collection?global.DFTranslate.collection(collection,{name,pointOfView:{kind,id:record.id},record:(target,id)=>context.indexes[target]?.get(Number(id)),link:(target,id,label)=>{requestRef(target,id);return link(target,id,label);}}):link(target,id);};
    const item=(title,subtitle,append)=>({title,subtitle,append});
    const info=[];
    const add=(title,value)=>{if(value!==undefined&&value!==null&&value!==''&&value!=='-')info.push(item(e(title),String(value)));};
    const card=(where,title,subtitle,icon,items,other={})=>{if(items.length)model[where].push({title,subtitle,icon,items,...other});};
    const plain=items=>{if(items.length)model.before.push({items,summary:true});};
    const linkItems=(target,records)=>records.map(value=>{const id=typeof value==='object'?value.id:value;return ref(target,id);});
    const typed=(type)=>model.collections.filter(value=>fold(value.type)===type);
    const appendCollection=(where,title,subtitle,icon,type)=>card(where,title,subtitle,icon,typed(type).map(value=>ref(collectionKinds()[fold(value.type)]||'collections',value.id)));
    const id=Number(record.id),definition=global.LegendsUI.categories[kind],isCollection=kind==='collections'||Boolean(definition?.collectionTypes);
    const needsEvents=['figures','sites','entities','regions','undergroundregions','artifacts','structures','writtencontents','constructions'].includes(kind)||isCollection;
    if(needsEvents){
      const ready=context.relatedResult?.detail;
      const eventIds=context.relatedResult?.eventIds?new Set(context.relatedResult.eventIds.map(Number)):null;
      const collectionIds=context.relatedResult?.collectionIds?new Set(context.relatedResult.collectionIds.map(Number)):null;
      const group=extras[kind]||kind;
      const matchedEvents=new Set();
      const directIds=new Set(list(record.event||record.event_id).map(Number));
      const childIds=new Set(list(record.eventcol||record.collection).map(Number));
      if(isCollection&&!eventIds&&world.disk?.format==='file-index'){
        const pending=[...childIds],seen=new Set();
        while(pending.length){const child=pending.pop();if(seen.has(child))continue;seen.add(child);for(const header of await global.LegendsFastStore.getHeaders(world,'collections',child)){for(const value of list(header.events))directIds.add(Number(value));for(const value of list(header.children))pending.push(Number(value));}}
      }
      if(ready?.events)model.events=ready.events;
      else await scan(world,'events',header=>{
        const matches=eventIds?eventIds.has(Number(header.id)):isCollection?directIds.has(Number(header.id)):refs(header,context).some(value=>value.kind===group&&Number(value.id)===id);
        if(!matches)return;
        matchedEvents.add(Number(header.id));
        // The specialized cards need facts, not the full nested event payload.
        const type=fold(header.type);
        if(/^(hf died|hf abducted|hf new pet|entity breach feature layer|add hf entity link|remove hf entity link|created site|site taken over|created structure|artifact created|artifact stored|artifact copied|written content composed|hf does interaction|attacked site|field battle)$/.test(type))model.events.push(header);
      },context);
      if(ready?.collections)model.collections=ready.collections;
      else await scan(world,'collections',header=>{
        let matches=collectionIds?collectionIds.has(Number(header.id)):isCollection?childIds.has(Number(header.id)):refs(header,context).some(value=>value.kind===group&&Number(value.id)===id);
        if(!matches&&!collectionIds&&!isCollection)for(const eventId of list(header.events??header.event))if(matchedEvents.has(Number(eventId))){matches=true;break;}
        if(matches){const value=world.disk?.format==='file-index'?global.LegendsFastStore.headerSummary(header,'collections',world):header;model.collections.push(value);requestRef(collectionKinds()[fold(header.type)]||'collections',header.id);}
      },context);
    }
    const valueFor=(event,fields,target)=>{
      for(const field of fields){const value=num(event[field]);if(value!==null&&value>=0)return value;}
      const match=refs(event,context).find(value=>value.kind===target&&(fields.includes(value.key)||list(value.keys).some(key=>fields.includes(key))));return match?Number(match.id):null;
    };
    const notable=kind==='battles'?new Set([...list(record.attacking_hfid),...list(record.defending_hfid)].map(Number)):null;
    const deaths=model.events.filter(event=>fold(event.type)==='hf died'&&(!notable||notable.has(valueFor(event,['hfid','hf_id','histfig_id','victim_hf','victim_hfid'],'figures'))));
    const victim=event=>valueFor(event,['hfid','hf_id','histfig_id','victim_hf','victim_hfid'],'figures');
    const slayer=event=>valueFor(event,['slayer_hf','slayer_hfid'],'figures');
    for(const event of deaths)requestRef('figures',victim(event));
    const deathItems=()=>deaths.map(event=>victim(event)).filter(value=>value!==null).map(value=>ref('figures',value));
    const byCoord=keys(record),regions=rows(world,'regions'),sites=rows(world,'sites'),rivers=rows(world,'rivers'),peaks=rows(world,'mountainpeaks'),constructions=rows(world,'constructions'),underground=rows(world,'undergroundregions');
    const regionId=num(record.region_id??record.subregion_id)??regions.find(region=>intersects(record,keys(region)))?.id;
    const aggregates=world.disk?.aggregates||world.aggregates;
    const currentOwner=aggregates?.siteOwnership?.[id]?.owner??record.cur_owner_id;
    const realm=id=>{const entity=context.indexes.entities?.get(Number(id));if(!entity)return null;if(fold(entity.type)==='civilization')return Number(id);const parent=list(entity.entity_link).find(value=>fold(value.type)==='parent');return parent?num(parent.target):null;};
    if(kind==='figures'){
      const historicalPositions=aggregates?.positionsByFigure?.[id],rawPositions=historicalPositions!==undefined?list(historicalPositions):[...list(record.entity_position_link),...list(record.entity_former_position_link)];
      const positionItems=[];
      for(const position of rawPositions){
        const entityId=num(position.entityId??position.entity_id??position.entity??position.target);if(entityId===null||entityId<0)continue;
        const entity=await readFull('entities',entityId),definitions=list(entity?.entity_position),assignment=list(entity?.entity_position_assignment).find(value=>Number(value.id)===Number(position.assignment_id??position.position_profile_id));
        const positionId=num(position.positionId??position.position_id??assignment?.position_id),title=String(position.title??position.position??'');
        const definition=definitions.find(value=>title&&fold(value.name)===fold(title))||(!title?definitions.find(value=>positionId!==null&&Number(value.id)===positionId):undefined);
        const caste=fold(record.caste),displayTitle=caste==='female'&&definition?.name_female?definition.name_female:caste==='male'&&definition?.name_male?definition.name_male:definition?.name||title;
        const start=num(position.start??position.start_year),rawEnd=num(position.end??position.end_year),end=rawEnd!==null&&rawEnd>=0?rawEnd:null,dead=num(record.death_year),former=end!==null||dead!==null&&dead>=0;
        const reign='从 '+(start!==null&&start!==-1?e(start)+' 年':'远古')+' 至 '+(end!==null?e(end)+' 年':dead!==null&&dead>=0?e(dead)+' 年':'今日');
        positionItems.push(item((former?'前任':'')+e(term(displayTitle||'position','profession'))+' · '+ref('entities',entityId),reign));
      }
      if(record.goal)add('目标',e(term(record.goal)));
      if(positionItems.length)info.push(positionItems[positionItems.length-1]);
      const born=num(record.birth_year),died=num(record.death_year),year=Number(world.year||world.end_year||0);
      if(born!==null&&born!==-1)add('年龄',e((died!==null&&died>=0?died:year)-born)+(died!==null&&died>=0?' ✝':''));
      if(born!==null&&born!==-1)add('出生',e(born)+' 年');
      if(died!==null&&died>=0)add('死亡',e(died)+' 年'+(deaths.find(event=>victim(event)===id)?' · '+e(term(deaths.find(event=>victim(event)===id).cause||'unknown')):''));
      let curseParent=num(record.lineage_curse_parent_id??record.lineage_curse_parent??record.curse_parent_hfid),curse=record.interaction||'';
      const interactions=model.events.filter(event=>fold(event.type)==='hf does interaction').sort((a,b)=>Number(a.id)-Number(b.id));
      for(const header of interactions){const event=header.interaction!==undefined?header:await readFull('events',header.id);if(!event||valueFor(event,['target_hfid','target'],'figures')!==id||!String(event.interaction||'').trim())continue;const parent=valueFor(event,['doer_hfid','doer'],'figures');if(parent===null)continue;curseParent=parent;const action=String(event.interaction_action||'').replace(/\[IS_HIST_STRING_[12]:|\]/g,'');if(action.includes('bit, passing on the '))curse=action.replace('bit, passing on the ','');else if(action.includes('cursed to assume the form of a '))curse=action.replace('cursed to assume the form of a ','').replace('-like','').replace(' every full moon',' curse');}
      if(curseParent!==null&&curseParent>=0)add(curse?'诅咒传承来源（'+String(global.DFTranslate.description?.(curse)||term(curse))+'）':'诅咒传承来源',ref('figures',curseParent));
      if(record.sphere)add('领域',e(global.DFTranslate?.sphere?.(record.sphere)||list(record.sphere).map(value=>term(value,'sphere')).join('、')));
      const relatedRegions=regions.filter(region=>Number(region.force_id)===id);if(relatedRegions.length)add('相关区域',linkItems('regions',relatedRegions).join('、'));
      const worshippers=Object.hasOwn(record,'deity')||Object.hasOwn(record,'force')?((await figureFacts(world,'figures',context)).get(id)||[]).filter(value=>Number(value.id)!==id):null;
      if(worshippers)add('受崇拜人数',e(worshippers.length)+' 位历史人物');
      card('before','人物概览','重要细节与个人特征的摘要','mdi-account-details-outline',info);
      const skills=list(record.hf_skill).sort((a,b)=>Number(b.total_ip||0)-Number(a.total_ip||0)).map(skill=>global.DFTranslate.skill?.(skill.skill,skill.total_ip)||{token:skill.skill,name:term(skill.skill,'skill'),points:skill.total_ip,rank:'',category:'msc',subrank:'none'});
      if(skills.length)model.before.push({title:'技能',subtitle:'专长与能力',icon:'mdi-account-star-outline',skills,items:[]});
      const hfLinks=list(record.hf_link||record.hfhf_link),entityLinks=[...list(record.entity_link),...list(record.entity_position_link),...list(record.entity_former_position_link)],siteLinks=list(record.site_link);
      const close=hfLinks.filter(value=>fold(value.link_type||value.type)!=='deity').map(value=>item(e(term(value.link_type||value.type)),ref('figures',value.hfid??value.hf_id??value.target)));
      const deity=hfLinks.filter(value=>fold(value.link_type||value.type)==='deity').sort((a,b)=>Number(b.link_strength||0)-Number(a.link_strength||0)).map(value=>{const deityId=value.hfid??value.hf_id??value.target,row=item(ref('figures',deityId),'',value.link_strength);deityRows.push({row,id:Number(deityId)});return row;});
      card('before','相关派系与团体','与此人物有关的组织和团体','mdi-account-group',entityLinks.map(value=>item(e(term(value.link_type||value.type||'position')),ref('entities',value.entity_id??value.entity??value.target),value.link_strength)));
      card('before','相关地点','与此人物有关的地点','mdi-home-switch-outline',siteLinks.map(value=>item(e(term(value.link_type||value.type)),ref('sites',value.site_id??value.site??value.target))));
      card('before','亲密关系','历史人物的私人联系与家族关系','mdi-heart-outline',close);
      card('before','模糊关系','人物生涯中记载不详的人际联系','mdi-account-question-outline',list(record.vague_relationship).map(value=>item(e(vagueType(value,term)),ref('figures',value.hfid??value.hf_id))));
      card('before','崇拜的神祇','此人物所信仰的神圣存在','mdi-hand-heart-outline',deity);
      const pets=list(record.journey_pet).map(value=>item(e(term(typeof value==='object'?value.race||value.type:value,'creature')),''));
      for(const header of model.events.filter(event=>fold(event.type)==='hf new pet').sort((a,b)=>Number(a.id)-Number(b.id))){
        const event=header.pets!==undefined?header:await readFull('events',header.id);if(!event||valueFor(event,['group_hfid','group'],'figures')!==id)continue;
        for(const pet of list(event.pets)){const title=e(term(pet,'creature'));if(!title)continue;const location=[['sites',['site_id','site']],['regions',['subregion_id']],['undergroundregions',['feature_layer_id']]].map(([target,fields])=>({target,id:valueFor(event,fields,target)})).find(value=>value.id!==null),previous=pets.find(value=>value.title===title),subtitle=location?'驯服于 '+ref(location.target,location.id):'';if(previous&&location)previous.subtitle=subtitle;else pets.push(item(title,subtitle));}
      }
      card('before','旅途宠物','陪伴此人物旅行的动物','mdi-paw',pets);
      if(positionItems.length>1)card('before','贵族职位','掌管领地与人民的统治阶层','mdi-seal',positionItems);
      if(worshippers){
        worshippers.sort((a,b)=>b.strength-a.strength);const confirmed=worshippers.slice(0,100).map(value=>{const row=item(ref('figures',value.id),'',value.strength);worshipperRows.push({row,id:Number(value.id)});return row;});
        if(worshippers.length>100)confirmed.push(item('','……另有 '+e(worshippers.length-100)+' 位'));
        card('before','崇拜此人物的人物','敬奉此神祇、生物或自然力量的人物','mdi-meditation',confirmed);
        card('before','崇拜此人物的派系','敬奉此神祇的团体与组织','mdi-crowd',rows(world,'entities').filter(entity=>list(entity.worship_id??entity.worship_hfid??entity.worshipped_hfid).some(value=>Number(value)===id)).map(entity=>item(ref('entities',entity.id),e(term(entity.type,'entityType')))));
      }
      card('after','著名击杀','此人物的重要击杀记录','mdi-skull-crossbones-outline',deaths.filter(event=>slayer(event)===id).map(event=>item(ref('figures',victim(event)),e(term(event.cause||'unknown')))));
      const held=new Set(list(record.holds_artifact).map(Number));
      for(const artifact of (await figureFacts(world,'artifacts',context)).get(id)||[])held.add(artifact);
      card('after','神器','当前持有的神器','mdi-diamond',linkItems('artifacts',[...held]));
      const dedicated=(await figureFacts(world,'structures',context)).get(id)||[];
      card('after','献予此人物的建筑','以此人物为奉祀对象的建筑','mdi-home-silo',linkItems('structures',dedicated));
      card('after','被掳人物','此人物掳走的受害者','mdi-chess-bishop',model.events.filter(event=>fold(event.type)==='hf abducted'&&valueFor(event,['snatcher_hfid','snatcher','abductor_hfid'],'figures')===id).map(event=>ref('figures',valueFor(event,['target_hfid','hfid'],'figures'))));
      appendCollection('after','战役','此人物参与的战役','mdi-chess-bishop','battle');
      const sourceRoles=world.disk?.format==='file-index'&&global.LegendsFastStore?.prepareSourceRoles?await global.LegendsFastStore.prepareSourceRoles(world,{signal:context.signal}):null;
      const beastAttacks=typed('beast attack').filter(value=>!sourceRoles||Number(sourceRoles.beastActors[value.id])===id);
      card('after','巨兽袭击','此人物的巨兽袭击记录','mdi-chess-knight',beastAttacks.map(value=>ref('rampages',value.id)));
    }else if(kind==='entities'){
      appendCollection('before','战争','塑造这个派系历史的战争','mdi-sword-cross','war');
      const positions=list(record.entity_position),assignments=list(record.entity_position_assignment);
      card('before','贵族职位','掌管领地与人民的统治阶层','mdi-seal',assignments.filter(value=>num(value.histfig??value.histfig_id)!==null&&Number(value.histfig??value.histfig_id)>=0).map(value=>{const position=positions.find(pos=>Number(pos.id)===Number(value.position_id));return item(ref('figures',value.histfig??value.histfig_id),e(term(position?.name||position?.name_male||position?.name_female||'','profession')));}));
      card('before','相关派系与团体','与该派系有关的组织和团体','mdi-account-group',list(record.entity_link).map(value=>item(ref('entities',value.target??value.entity_id),e(term(value.type)))));
      const owned=sites.filter(site=>Number(site.cur_owner_id)===id||realm(site.cur_owner_id)===id||Number(aggregates?.siteOwnership?.[site.id]?.civ)===id);
      card('before','当前地点','该派系当前拥有的地点','mdi-home-outline',linkItems('sites',owned));
      const lost=sites.filter(site=>!owned.includes(site)&&list(aggregates?.siteOwnership?.[site.id]?.history).some(period=>Number(period.owner)===id||realm(period.owner)===id));
      card('before','失去的地点','曾经由这个派系控制的聚落和据点','mdi-home-off-outline',linkItems('sites',lost));
      card('before','崇拜的神祇','此派系敬奉的神圣存在','mdi-weather-sunset',linkItems('figures',list(record.worship_id??record.worship_hfid??record.worshipped_hfid)));
      card('after','相关地点','与该派系有关的地点','mdi-home-switch-outline',list(record.site_link).map(value=>item(ref('sites',value.target??value.site_id),e(term(value.type)))));
      const leaders=new Set(assignments.map(value=>num(value.histfig??value.histfig_id)).filter(value=>value!==null&&value>=0));
      for(const hfid of (await figureFacts(world,'entity_leaders',context)).get(id)||[])leaders.add(hfid);
      for(const event of model.events)if(/^(add|remove) hf entity link$/.test(fold(event.type))&&num(event.position_id)!==null){const hfid=valueFor(event,['hfid','histfig_id'],'figures');if(hfid!==null)leaders.add(hfid);}
      for(const hfid of leaders)requestRef('figures',hfid);
      model.leaderIds=leaders;
    }else if(kind==='sites'){
      if(regionId!==null&&regionId!==undefined)add('区域',ref('regions',regionId));
      if(num(currentOwner)!==null&&Number(currentOwner)>=0)add('当前所有者',ref('entities',currentOwner));
      if(typed('battle').length)add('战役',e(typed('battle').length));
      if(typed('beast attack').length)add('巨兽袭击',e(typed('beast attack').length));
      if(deaths.length)add('著名死亡',e(deaths.length));
      plain(info);
      const structures=[];await scan(world,'structures',header=>{if(Number(header.site_id)===id)structures.push(header.id);},context);
      card('after','建筑','此地点的重要建筑','mdi-home-silo',linkItems('structures',structures));
      const inhabitants=(await figureFacts(world,'site_figures',context)).get(id)||[];
      card('after','相关人物','与此地点有关的著名历史人物','mdi-account-star',linkItems('figures',inhabitants));
      card('after','著名死亡','在这里逝世的重要人物','mdi-grave-stone',deathItems());
      for(const [title,subtitle,icon,type] of [['战役','在此发生的战役','mdi-chess-bishop','battle'],['征服','对此地点的征服','mdi-chess-pawn','site conquered'],['劫掠','对此地点的劫掠','mdi-lightning-bolt','raid'],['决斗','在此发生的决斗','mdi-sword-cross','duel'],['迫害','在此发生的迫害','mdi-map-marker-alert','persecution'],['暴动','在此发生的叛乱与起义','mdi-map-marker-alert','insurrection'],['绑架','在此发生的绑架','mdi-map-marker-alert','abduction'],['巨兽袭击','此地点遭受的巨兽袭击','mdi-chess-knight','beast attack']])appendCollection('after',title,subtitle,icon,type);
    }else if(kind==='regions'){
      if(byCoord.size)add('区域面积',e(byCoord.size)+' 格');
      if(record.evilness)add('阵营',e(term(record.evilness)));
      if(num(record.force_id)!==null&&Number(record.force_id)>=0)add('崇拜的自然力量',ref('figures',record.force_id));
      const relatedSites=sites.filter(site=>Number(site.region_id??site.subregion_id)===id||intersects(site,byCoord));
      if(relatedSites.length)add('地点',e(relatedSites.length));if(constructions.filter(value=>intersects(value,byCoord)).length)add('道路与桥梁',e(constructions.filter(value=>intersects(value,byCoord)).length));if(typed('battle').length)add('战役',e(typed('battle').length));plain(info);
      card('after','相关地点','位于此区域的聚落、堡垒和其他地点','mdi-home-switch-outline',linkItems('sites',relatedSites));
      card('after','河流','流经此区域的河流','mdi-waves',linkItems('rivers',rivers.filter(river=>intersects(river,byCoord))));
      card('after','山峰与火山','此区域的山峰和火山','mdi-summit',linkItems('mountainpeaks',peaks.filter(peak=>intersects(peak,byCoord))));
      card('after','道路与桥梁','在此区域建造的道路、桥梁和其他设施','mdi-road-variant',linkItems('constructions',constructions.filter(value=>intersects(value,byCoord))));
      appendCollection('after','战役与冲突','此区域经历的战役与围攻','mdi-sword-cross','battle');
      card('after','著名死亡','在此区域逝世的历史人物','mdi-skull-crossbones-outline',deathItems());
    }else if(kind==='undergroundregions'){
      const breaches=model.events.filter(event=>fold(event.type)==='entity breach feature layer'),surface=regions.filter(region=>intersects(region,byCoord)),relatedSites=sites.filter(site=>intersects(site,byCoord));
      add('地层类型',e(term(record.type,'terrain'))+(num(record.depth)!==null?' · '+e(record.depth):''));if(byCoord.size)add('地下区域面积',e(byCoord.size)+' 格');if(breaches.length)add('突破与发现',e(breaches.length));if(surface.length)add('上方地表区域',e(surface.length));if(relatedSites.length)add('相关地点',e(relatedSites.length));plain(info);
      card('after','突破与发现','文明或堡垒首次进入此地层的事件','mdi-pickaxe',breaches.map(event=>context.eventText(event)));
      card('after','上方地表区域','位于此地下区域正上方的地表区域','mdi-map-legend',linkItems('regions',surface));
      card('after','相关地点','与此地下区域交汇的堡垒、洞穴和其他地点','mdi-home-switch-outline',linkItems('sites',relatedSites));
      appendCollection('after','战役','发生于此地下区域及附近的战役','mdi-sword-cross','battle');
    }else if(kind==='rivers'){
      const crossed=regions.filter(region=>intersects(region,byCoord)),along=(byCoord.size?await riverSites(world,context):sites).filter(site=>riverMeetsSite(site,byCoord)),constructionById=new Map(constructions.map(value=>[Number(value.id),value])),crossings=new Map();
      for(const construction of constructions)if(intersects(construction,byCoord)){crossings.set(Number(construction.id),construction);const masterId=num(construction.master_construction_id??aggregates?.constructionFacts?.[construction.id]?.master_construction_id),master=constructionById.get(masterId);if(master)crossings.set(Number(master.id),master);}
      add('河流长度',e(coordinates(record).length)+' 格');if(crossed.length)add('流经的区域',e(crossed.length));if(along.length)add('沿河地点',e(along.length));if(crossings.size)add('道路与桥梁',e(crossings.size));plain(info);
      card('after','流经的区域','此河流穿越的区域','mdi-map-legend',linkItems('regions',crossed));
      card('after','沿河地点','位于河边的聚落与堡垒','mdi-home-switch-outline',linkItems('sites',along));
      card('after','道路与桥梁','横跨或沿着这条河流建造的设施','mdi-road-variant',linkItems('constructions',[...crossings.values()]));
    }else if(kind==='mountainpeaks'){
      const volcano=Object.hasOwn(record,'is_volcano')&&record.is_volcano!==false;
      add('山峰类型',e(volcano?'火山':'山峰'));
      if(num(record.height)!==null)add('海拔',e(Number(record.height)*3)+' 米（'+e(Math.round(Number(record.height)*3*3.28084))+' 英尺） · '+e(record.height)+' DF 单位');
      const ranked=peaks.slice().sort((a,b)=>Number(b.height)-Number(a.height)||Number(a.id)-Number(b.id));
      if(ranked.length)add('世界高度排名','#'+e(ranked.findIndex(peak=>Number(peak.id)===id)+1)+' / '+e(ranked.length));
      const region=regions.find(value=>Number(value.id)===Number(regionId)),regional=region?ranked.filter(peak=>intersects(peak,keys(region))):[];
      if(regional.length>1)add('区域高度排名','#'+e(regional.findIndex(peak=>Number(peak.id)===id)+1)+' / '+e(regional.length));
      if(regionId!==null&&regionId!==undefined)add('区域',ref('regions',regionId));plain(info);
    }else if(kind==='constructions'){
      const facts=aggregates?.constructionFacts?.[id]||{},masterId=num(record.master_construction_id??facts.master_construction_id),master=constructions.find(value=>Number(value.id)===masterId),type=fold(record.type),masterType=fold(master?.type),bridge=type==='bridge',sections=constructions.filter(value=>Number(value.master_construction_id??aggregates?.constructionFacts?.[value.id]?.master_construction_id)===id);
      let surface=regions.filter(region=>intersects(region,byCoord)),under=underground.filter(region=>intersects(region,byCoord));const effective=['','unknown','bridge'].includes(type)&&masterType&&masterType!=='unknown'?masterType:type;
      if(effective==='road')under=[];else if(effective==='tunnel')surface=[];else if(effective==='bridge'){if(surface.length)under=[];else surface=[];}
      const crossed=rivers.filter(river=>intersects(river,byCoord)||sections.some(section=>intersects(section,keys(river))));
      add('设施类型',e(term(record.type)));if(!bridge&&byCoord.size)add('长度／距离',e(byCoord.size)+' 格');
      for(const [field,title,target] of [['site_id1','连接地点（起点）','sites'],['site_id2','连接地点（终点）','sites'],['master_construction_id','主路线','constructions']]){const value=record[field]??facts[field];if(num(value)!==null&&Number(value)>=0)add(title,ref(target,value));}
      if(surface.length)add('地表区域',bridge?linkItems('regions',surface).join('、'):e(surface.length));if(under.length)add('地下区域',bridge?linkItems('undergroundregions',under).join('、'):e(under.length));if(crossed.length)add('跨越的河流',bridge?linkItems('rivers',crossed).join('、'):e(crossed.length));if(sections.length)add('分段',e(sections.length));plain(info);
      if(!bridge){card('before','地表区域','此路线穿越的地表区域','mdi-map-legend',linkItems('regions',surface));card('before','地下区域','此路线穿越的洞穴和地下地层','mdi-tunnel',linkItems('undergroundregions',under));card('before','跨越的河流','此设施跨越或下方流经的河流','mdi-waves',linkItems('rivers',crossed));}
      card('before','分段','属于此路线的各个设施分段','mdi-road-variant',linkItems('constructions',sections));
    }else if(kind==='structures'){
      let owner=num(record.owner_hfid),localId=num(record.local_id),siteId=num(record.site_id);
      if(localId===null&&siteId!==null){const compound=Object.keys(aggregates?.structureLookup||{}).find(key=>Number(aggregates.structureLookup[key])===id&&key.startsWith(siteId+':'));if(compound)localId=Number(compound.split(':')[1]);}
      if((owner===null||owner<0)&&siteId!==null&&localId!==null){const site=await readFull('sites',siteId);for(const property of siteProperties(site))if(Number(property.structure_id)===localId&&num(property.owner_hfid)!==null&&Number(property.owner_hfid)>=0)owner=Number(property.owner_hfid);}
      if(owner!==null&&owner>=0)add('所有者／领导者',ref('figures',owner));
      for(const [title,field,target] of [['地点','site_id','sites'],['组织','entity_id','entities'],['崇拜的神祇','worship_hfid','figures'],['宗教','religion','entities']])if(num(record[field])!==null&&Number(record[field])>=0)add(title,ref(target,record[field]));
      add('类型',e(term(record.subtype||record.type)));if(record.name2)add('别名',e(global.DFTranslate.name(record.name2,{kind:'structure'})));if(num(record.deity)!==null&&Number(record.deity)>=0&&!record.worship_hfid)add('崇拜的神祇',ref('figures',record.deity));if(list(record.inhabitant).length)add('居民',e(list(record.inhabitant).length));if(list(record.copied_artifact_id).length)add('抄本',e(list(record.copied_artifact_id).length));plain(info);
      card('after','居民','居住或停留在此建筑中的人物','mdi-account-group',linkItems('figures',list(record.inhabitant)));
      card('after','抄本','此建筑保存的著作及抄本','mdi-book-multiple-outline',linkItems('artifacts',list(record.copied_artifact_id)));
    }else if(kind==='artifacts'){
      const localStructure=num(record.structure_local_id),artifactSite=num(record.site_id),explicitStructure=num(record.structure_id),structureId=explicitStructure!==null&&explicitStructure>=0?explicitStructure:localStructure!==null&&artifactSite!==null?num(aggregates?.structureLookup?.[artifactSite+':'+localStructure]):null;
      if(structureId!==null&&structureId>=0)add('存放建筑',ref('structures',structureId));
      add('类型',e(term(record.item_subtype||record.item_type||record.type)));
      for(const [title,field,target] of [['当前持有者','holder_hfid','figures'],['存放地点','site_id','sites'],['区域','subregion_id','regions'],['创造者','creator_hfid','figures'],['著作','writing','writtencontents']])if(num(record[field])!==null&&Number(record[field])>=0)add(title,ref(target,record[field]));
      if(num(record.creator_hfid)===null){const creation=model.events.find(event=>fold(event.type)==='artifact created'),creator=creation?valueFor(creation,['hfid','histfig_id','creator_hfid'],'figures'):null;if(creator!==null)add('创造者',ref('figures',creator));}
      const content=record.item?.page_written_content_id??record.item?.writing_written_content_id;if(num(content)!==null)add('著作',ref('writtencontents',content));
      if(num(record.page_count)!==null)add('页数',e(record.page_count));
      const itemCaption=typeof record.item==='string'?record.item:record.item?.name_string;
      if(itemCaption&&fold(itemCaption)!==fold(record.name)&&fold(itemCaption)!=='«untitled»')add('原名',e(global.LegendsItemTranslate?.translate(itemCaption)??term(itemCaption)));
      if(record.mat||record.material)add('材质',e(term(record.mat||record.material)));
      if(record.item_description||record.description)add('描述',e(global.DFTranslate.description?.(record.item_description||record.description)||term(record.item_description||record.description)));plain(info);
    }else if(kind==='writtencontents'){
      const author=record.author_hfid??record.author;if(num(author)!==null&&Number(author)>=0)add('作者',ref('figures',author));
      const artifacts=(await figureFacts(world,'written_artifacts',context)).get(id)||[];
      if(artifacts.length)add('神器',linkItems('artifacts',artifacts).join('、'));
      if(record.style)add('风格',list(record.style).map(style=>e(term(style))).join('、'));
      if(num(record.page_start)!==null&&num(record.page_end)!==null)add('页数',e(Number(record.page_end)-Number(record.page_start)+1));
      card('before','概览','此著作的重要细节摘要','mdi-book-open-page-variant',info);
    }else if(['danceforms','musicalforms','poeticforms'].includes(kind)){
      if(record.description)model.before.push({description:global.DFTranslate.description?.(record.description)||term(record.description),items:[]});
    }else if(isCollection&&['war','battle'].includes(fold(record.type))){
      const metrics=record.metrics||world.disk?.aggregates?.metrics?.collections?.[id]||record;
      for(const [title,fields,deathField] of [['进攻方',['attacker_enid','aggressor_ent_id','attacker_ent_id','attacker_civ_id','attacking_enid'],'attackerDeathCount'],['防守方',['defender_enid','defender_ent_id','defender_civ_id','defending_enid'],'defenderDeathCount']]){
        const faction=valueFor(record,fields,'entities'),outcome=fold(record.outcome||record.battle_outcome),victorious=fold(record.type)==='battle'&&(title==='进攻方'&&outcome==='attacker won'||title==='防守方'&&outcome==='defender won');if(faction!==null)add(title+(victorious?'（胜利）':''),ref('entities',faction)+(num(metrics[deathField])!==null?'（死亡：'+e(metrics[deathField])+' ✝）':''));
      }
      card('before',fold(record.type)==='war'?'战争概览':'战役概览','重要细节摘要','mdi-sword-cross',info);
      if(fold(record.type)==='war')appendCollection('before','战役','塑造这场战争的战役','mdi-sword-cross','battle');
      card('after','著名死亡','在此次冲突中逝世的重要人物','mdi-skull-crossbones-outline',deathItems());
    }
    // Fetch names in bounded batches, so links never remain opaque numeric IDs.
    const loaded={};
    const references=[...request.values()];
    for(let offset=0;offset<references.length;offset+=24){check(context.signal);await Promise.all(references.slice(offset,offset+24).map(async value=>{const full=kind==='entities'&&value.kind==='figures'&&model.leaderIds?.has(value.id);const record=preparedRecords.get(value.kind+':'+value.id)||await (full?context.getRecord:context.getNameRecord||context.getRecord)(value.kind,value.id);if(record)(loaded[value.kind]||(loaded[value.kind]=[])).push(record);}));}
    context.cacheRecords?.(loaded,world);
    model.records=loaded;
    const localRecords=new Map(Object.entries(loaded).flatMap(([target,records])=>records.map(record=>[target+':'+record.id,record])));
    for(const {row,id}of deityRows){const deity=localRecords.get('figures:'+id)||context.indexes.figures?.get(id);if(deity)row.subtitle=e(global.DFTranslate?.sphere?.(deity.sphere)||list(deity.sphere).map(value=>term(value,'sphere')).join('、'));}
    for(const {row,id}of worshipperRows){
      const figure=localRecords.get('figures:'+id)||context.indexes.figures?.get(id);if(!figure)continue;
      const positions=aggregates?.positionsByFigure?.[id]??[...list(figure.entity_position_link),...list(figure.entity_former_position_link)],position=positions.at(-1);
      if(position){
        const entityId=num(position.entityId??position.entity_id??position.entity??position.target),entity=entityId!==null?await readFull('entities',entityId):null,title=String(position.title??position.position??''),positionId=num(position.positionId??position.position_id),definition=list(entity?.entity_position).find(value=>title?fold(value.name)===fold(title):positionId!==null&&Number(value.id)===positionId);
        if(definition){const caste=fold(figure.caste),display=caste==='female'&&definition.name_female?definition.name_female:caste==='male'&&definition.name_male?definition.name_male:definition.name||title,end=num(position.end??position.end_year),dead=num(figure.death_year),former=end!==null&&end>=0||dead!==null&&dead>=0;row.subtitle=(former?'前任':'')+e(term(display,'profession'))+' · '+e(name(entity,'entities'));}
        else row.subtitle=e(term(title||figure.associated_type||'','profession'));
      }else row.subtitle=e(term(figure.associated_type||'','profession'));
    }
    // Rebuild just the generated link labels after the names have been cached.
    const relabel=html=>{const template=document.createElement('template');template.innerHTML=String(html);for(const element of template.content.querySelectorAll('[data-object-kind][data-object-id]')){const target=element.dataset.objectKind,targetId=Number(element.dataset.objectId),record=localRecords.get(target+':'+targetId);element.outerHTML=link(target,targetId,record?name(record,target):undefined);}return template.innerHTML;};
    for(const card of [...model.before,...model.after])card.items=card.items.map(value=>typeof value==='string'?relabel(value):{...value,title:relabel(value.title||''),subtitle:relabel(value.subtitle||'')});
    if(['sites','wars','battles'].includes(kind)){
      const races=new Map(),figures=new Map([...(loaded.figures||[]),...rows(world,'figures')].map(value=>[Number(value.id),value]));
      for(const event of deaths){const race=figures.get(victim(event))?.race;if(race)races.set(race,(races.get(race)||0)+1);}
      // Battle squad losses are independent of named historical figure deaths.
      const battles=kind==='battles'?[record]:model.collections.filter(value=>fold(value.type)==='battle');
      for(const battle of battles){const raceDeaths=battle.squadDeaths||battle.squad_deaths;
        if(raceDeaths)for(const [race,count] of Object.entries(raceDeaths))races.set(race,(races.get(race)||0)+Number(count));
        else for(const side of ['attacking','defending']){const race=list(battle[side+'_squad_race']),counts=list(battle[side+'_squad_deaths']);for(let index=0;index<race.length;index++)if(Number(counts[index])>0)races.set(race[index],(races.get(race[index])||0)+Number(counts[index]));}
      }
      if(races.size)model.charts.push({id:'detail-deaths',title:'各族死亡人数',subtitle:kind==='sites'?'按种族统计此地点的死亡人数':'按种族统计此次冲突的死亡人数',icon:'mdi-grave-stone',type:'doughnut',labels:[...races.keys()].map(race=>term(race,'creature')),values:[...races.values()],races:[...races.keys()]});
    }
    if(['regions','undergroundregions','rivers','wars','battles'].includes(kind)){model.before.push(...model.after);model.after=[];}
    return model;
  }
  global.LegendsDetails=Object.freeze({load,coordinates,scan,prepareGeography});
})(window);
