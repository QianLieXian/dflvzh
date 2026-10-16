/* The WorldRecords.vue / RecordCard.vue screen and WorldRecordsCalculator.cs
 * ranking definitions from Kromtec/LegendsViewer-Next, evaluated over local XML.
 * Only observed fields and explicit event links supply a metric. */
(function (global) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const array = value => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
  const first = value => Array.isArray(value) ? first(value[0]) : value;
  const normalize = value => String(first(value) ?? '').trim().toLowerCase().replace(/_/g, ' ');
  const number = value => {
    value = first(value);
    if (value === undefined || value === null || value === '' || typeof value === 'object') return null;
    const result = Number(value); return Number.isFinite(result) ? result : null;
  };
  const valueOf = (object, keys) => {
    for (const key of keys) if (object && object[key] !== undefined && object[key] !== null) return first(object[key]);
    return undefined;
  };
  const idOf = (object, keys) => number(valueOf(object, keys));
  const ids = value => array(value).flatMap(item => {
    if (item && typeof item === 'object') return ids(item.id ?? item.event_id ?? item.eventcol_id ?? item['#text']);
    const n = number(item); return n !== null && n >= 0 ? [n] : [];
  });
  const flag = (record, keys) => keys.some(k => record?.[k] !== undefined && record[k] !== null && record[k] !== false && !['false','0'].includes(normalize(record[k])));
  const mdi = icon => `<i class="mdi ${icon}" aria-hidden="true"></i>`;
  const definitions = [
    {id:'warfare',title:'战争与战斗',english:'Warfare & Combat',icon:'mdi-sword-cross',cards:[
      ['top_slayers','最致命的杀戮者与巨兽','Deadliest Slayers & Megabeasts','mdi-skull','著名击杀','Notable Kills'],
      ['bloodiest_battles','最惨烈的战役与围攻','Bloodiest Battles & Sieges','mdi-sword-cross','伤亡人数','Casualties'],
      ['fiercest_duelists','最勇猛的决斗者','Fiercest Duelists','mdi-sword','决斗次数','Duels Fought'],
      ['devastating_rampages','最具毁灭性的肆虐','Most Devastating Rampages','mdi-fire','受害者','Victims']
    ]},
    {id:'sovereigns',title:'君主与帝国',english:'Sovereigns & Empires',icon:'mdi-crown',cards:[
      ['longest_reigns','在位最久的领袖','Longest Reigning Leaders','mdi-crown','在位时长','Reign Duration'],
      ['shortest_reigns','在位最短的领袖','Shortest Reigning Leaders','mdi-emoticon-sad-outline','在位时长','Reign Duration'],
      ['contested_sites','争夺最激烈的地点与城市','Most Contested Sites & Cities','mdi-castle','征服次数','Conquests'],
      ['largest_empires','最大的文明与帝国','Largest Civilizations & Empires','mdi-shield-crown-outline','控制的地点','Sites Controlled']
    ]},
    {id:'lore',title:'学识、科学与艺术',english:'Lore, Science & Arts',icon:'mdi-book-open-page-variant',cards:[
      ['greatest_scholars','最杰出的学者与发现者','Greatest Scholars & Discoverers','mdi-school','发现次数','Discoveries'],
      ['prolific_authors','最多产的作者','Most Prolific Authors','mdi-feather','书面作品','Written Works'],
      ['most_copied_works','复制最多的手稿与书籍','Most Copied Manuscripts & Books','mdi-book-multiple','副本与引用','Copies / References']
    ]},
    {id:'intrigue',title:'阴谋与犯罪',english:'Conspiracies & Crime',icon:'mdi-incognito',cards:[
      ['masters_of_disguise','伪装大师与冒名者','Masters of Disguise & Impostors','mdi-incognito','假身份','Assumed Identities'],
      ['notorious_syndicates','最活跃的犯罪团体','Most Active Crime Syndicates','mdi-handcuffs','盗窃与犯罪','Heists & Crimes']
    ]},
    {id:'longevity',title:'长寿与奇闻',english:'Longevity & Curiosities',icon:'mdi-timelapse',cards:[
      ['oldest_living','在世最年长者','Venerable Ancients (Oldest Living)','mdi-timelapse','年龄','Age'],
      ['most_travelled','旅行最多的冒险者','Most Travelled Adventurers','mdi-compass','旅程与旅行','Journeys / Travels'],
      ['oldest_artifacts','最具历史的遗物与神器','Most Historic Relics & Artifacts','mdi-diamond-stone','事件数量','Event Count']
    ]},
    {id:'geography',title:'地理与世界奇观',english:'Geography & World Wonders',icon:'mdi-earth',cards:[
      ['largest_regions','最辽阔的生物群系与地表区域','Vastest Biomes & Surface Regions','mdi-map-legend','面积（格）','Area (tiles)'],
      ['largest_underground_regions','最辽阔的地下洞窟与深层世界','Vastest Underground Caverns & Deep Realms','mdi-tunnel','面积（格）','Area (tiles)'],
      ['bloodiest_regions','战斗最多的区域','Bloodiest Conflict Regions','mdi-map-marker-path','战役次数','Battles Fought'],
      ['longest_rivers','最长的河流','Longest Rivers','mdi-waves','长度（格）','Length (tiles)'],
      ['highest_peaks','最高的山峰与火山','Highest Mountain Peaks & Volcanoes','mdi-image-filter-hdr','高度（米）','Height (meters)']
    ]}
  ];

  function assemble(entries, named) {
    const categories=definitions.map(category=>({...category,cards:category.cards.map(([id,title,english,icon,metric,metricEnglish])=>{
      const rows=entries[id]||[];
      if(id==='shortest_reigns')rows.sort((a,b)=>a.value-b.value||a.id-b.id);
      else if(id==='devastating_rampages')rows.sort((a,b)=>b.deathCount-a.deathCount||b.eventCount-a.eventCount);
      else if(id==='notorious_syndicates')rows.sort((a,b)=>b.value-a.value||a.id-b.id);
      else rows.sort((a,b)=>b.value-a.value);
      return{id,title,english,icon,metric,metricEnglish,entries:rows.slice(0,10).map((entry,index)=>({...entry,rank:index+1}))};
    })}));
    const cards=new Map(categories.flatMap(c=>c.cards.map(card=>[card.id,card])));
    const highlights=[['top_slayers','最致命的生物','Deadliest Creature','mdi-skull'],['longest_reigns','最长在位','Longest Reign','mdi-crown'],['bloodiest_battles','最惨烈的战役','Bloodiest Battle','mdi-sword-cross'],['oldest_living','最年长的在世生物','Oldest Living Being','mdi-timelapse']].flatMap(([id,title,english,icon])=>{
      const entry=cards.get(id)?.entries[0];return entry?[{title,english,icon,entry}]:[];
    });
    return{categories,highlights,named};
  }

  function calculate(world, options = {}) {
    if (world.disk || world.aggregates || options.entries) {
      const supplied=options.entries??world.disk?.aggregates?.records??world.aggregates?.records??{},source=supplied.entries??supplied,entries={};
      const named=(record,kind)=>String(options.name?.(record,kind)??record?.name??record?.title??'#'+record?.id);
      // These original geography metrics only use retained map records. They
      // remain available without reading any disk-backed figures or events.
      const geographicKinds=new Set(['regions','undergroundregions','rivers','mountainpeaks']);
      const geographicExtra={undergroundregions:'underground_regions',mountainpeaks:'mountain_peaks'};
      const geographic=calculate({year:world.year}, {
        name:options.name,term:options.term,
        records:kind=>geographicKinds.has(kind)?array(world[kind]??world.extra?.[geographicExtra[kind]||kind]):[]
      });
      for(const card of geographic.categories.find(category=>category.id==='geography').cards)entries[card.id]=card.entries;
      for(const category of definitions)for(const [key]of category.cards){
        if(!Array.isArray(source[key]))continue;
        entries[key]=source[key].filter(entry=>entry&&typeof entry==='object'&&entry.value!==null&&entry.value!==undefined&&Number.isFinite(Number(entry.value))&&entry.id!==null&&entry.id!==undefined&&Number.isFinite(Number(entry.id))&&typeof entry.kind==='string').map(entry=>({
          ...entry,id:Number(entry.id),value:Number(entry.value),record:entry.record||{id:Number(entry.id),name:entry.name},
          display:entry.display===undefined?String(entry.value):String(entry.display)
        }));
      }
      return assemble(entries,named);
    }
    const get = kind => {
      const supplied = options.records?.(kind);
      if (Array.isArray(supplied)) return supplied;
      if (Array.isArray(world[kind])) return world[kind];
      const extraKeys = {writtencontents:'written_contents',undergroundregions:'underground_regions',mountainpeaks:'mountain_peaks'};
      return array(world.extra?.[extraKeys[kind] || kind]);
    };
    const figures = get('figures'), entities = get('entities'), sites = get('sites'), artifacts = get('artifacts');
    const events = get('events'), collections = get('collections'), works = get('writtencontents');
    const regions = get('regions'), underground = get('undergroundregions'), rivers = get('rivers'), peaks = get('mountainpeaks');
    const maps = {figures:new Map(figures.map(r=>[Number(r.id),r])),entities:new Map(entities.map(r=>[Number(r.id),r])),sites:new Map(sites.map(r=>[Number(r.id),r])),regions:new Map(regions.map(r=>[Number(r.id),r])),collections:new Map(collections.map(r=>[Number(r.id),r]))};
    const eventMap = new Map(events.map(e => [Number(e.id), e]));
    const names = new Map();
    const named = (record,kind) => {
      if (!record) return '';
      const key = kind + ':' + record.id;
      if (!names.has(key)) names.set(key, String(options.name?.(record,kind) ?? record.name ?? record.title ?? '#' + record.id));
      return names.get(key);
    };
    const term = text => text === undefined || text === null || text === '' ? '' : String(options.term?.(text) ?? text);
    const row = (kind,record,value,display,subtitle='',detail='') => ({kind,id:Number(record.id),record,value,display,subtitle,detail});
    const byCount = (counts,kind,display,subtitle) => [...counts].filter(([id,count])=>count>0&&maps[kind]?.has(id)).map(([id,count])=>row(kind,maps[kind].get(id),count,display(count),subtitle?.(maps[kind].get(id))||''));
    const increment = (map,id,n=1) => {if(id!==null&&id>=0)map.set(id,(map.get(id)||0)+n);};
    const linkedIds = ['event','event_id','events'];
    const childIds = ['eventcol','event_collection','event_collection_id','collection','collection_id'];
    const reverseChildren = new Map(), directCollectionParents = new Map();
    for (const c of collections) {
      for (const key of linkedIds) for (const id of ids(c[key])) {if(!directCollectionParents.has(id))directCollectionParents.set(id,new Set());directCollectionParents.get(id).add(Number(c.id));}
      const parent = idOf(c,['parent_eventcol','war_eventcol']);
      if(parent!==null&&parent>=0){if(!reverseChildren.has(parent))reverseChildren.set(parent,[]);reverseChildren.get(parent).push(Number(c.id));}
    }
    const subEventCache = new Map();
    function subEvents(collection, ancestors = new Set()) {
      const id = Number(collection.id);if(subEventCache.has(id))return subEventCache.get(id);if(ancestors.has(id))return[];
      const seen = new Set(ancestors);seen.add(id);const result = new Map();
      for(const key of linkedIds)for(const eventId of ids(collection[key]))if(eventMap.has(eventId))result.set(eventId,eventMap.get(eventId));
      const children = [...childIds.flatMap(k=>ids(collection[k])),...array(reverseChildren.get(id))];
      for(const childId of children){const child=maps.collections.get(childId);if(child)for(const e of subEvents(child,seen))result.set(Number(e.id),e);}
      const list=[...result.values()];subEventCache.set(id,list);return list;
    }
    const typeOf = r => normalize(r?.type);
    const deadEvent = e => typeOf(e)==='hf died';
    const victim = e => idOf(e,['hfid','victim_hf','hf_id','histfig_id','historical_figure_id']);
    const killer = e => idOf(e,['slayer_hfid','slayer_hf']);
    const amount = (record,key) => array(record[key]).reduce((sum,value)=>sum+Math.max(0,number(value)||0),0);
    const rawCoordinates = value => {
      if(Array.isArray(value)&&value.length===2&&value.every(v=>typeof v!=='object'&&number(v)!==null))return[value.map(Number)];
      if(Array.isArray(value))return value.flatMap(rawCoordinates);
      if(value&&typeof value==='object')return Number.isFinite(Number(value.x))&&Number.isFinite(Number(value.y))?[[Number(value.x),Number(value.y)]]:[];
      return String(value??'').split('|').map(s=>s.trim().split(',').slice(0,2).map(Number)).filter(xy=>xy.length===2&&xy.every(Number.isFinite));
    };
    const coordinateKey = xy => xy[0]+','+xy[1];
    const grid = new Map();for(const r of regions)for(const xy of rawCoordinates(r.coords??r.coordinates))grid.set(coordinateKey(xy),r);
    const regionOf = record => {
      const explicit=idOf(record,['subregion_id','region_id']);if(explicit!==null&&maps.regions.has(explicit))return maps.regions.get(explicit);
      const xy=rawCoordinates(record.coords??record.coordinates)[0];return xy?grid.get(coordinateKey(xy)):null;
    };
    const positions = new Map(), kills = new Map(), killVictims = new Map(), scholars = new Map(), travellers = new Map(), siteConquests = new Map();
    const crimeCounts = new Map(), fallbackRefs = new Map();
    const addRef = (kind,id,event) => {if(id===null||id<0)return;const key=kind+':'+id;if(!fallbackRefs.has(key))fallbackRefs.set(key,new Set());fallbackRefs.get(key).add(Number(event.id));};
    for(const e of events){
      const type=typeOf(e);
      if(deadEvent(e)){
        const slayer=killer(e);if(maps.figures.has(slayer)){increment(kills,slayer);const dead=maps.figures.get(victim(e));if(dead){if(!killVictims.has(slayer))killVictims.set(slayer,[]);if(killVictims.get(slayer).length<3)killVictims.get(slayer).push(named(dead,'figures'));}}
      }
      if(type==='knowledge discovered')increment(scholars,idOf(e,['hfid']));
      if(type==='hf travel')increment(travellers,idOf(e,['group_hfid']));
      if(type==='created site'||type==='site taken over')increment(siteConquests,idOf(e,['site_id']));
      if(type==='add hf entity link'||type==='remove hf entity link'){
        const hf=idOf(e,['hfid','histfig']),entityId=idOf(e,['civ_id','civ']),positionId=idOf(e,['position_id']),year=number(e.year);
        if(hf===null||positionId===null||positionId<0||year===null||!maps.figures.has(hf))continue;
        const entity=maps.entities.get(entityId),title=String(first(e.position)??'');
        if(!positions.has(hf))positions.set(hf,[]);const list=positions.get(hf);
        if(type==='add hf entity link'&&normalize(e.link_type??e.link)==='position'){
          if(!list.some(p=>p.entityId===entityId&&p.title===title&&p.start===year))list.push({entityId,entity,positionId,title,start:year,end:null});
        }else if(type==='remove hf entity link'){
          const last=[...list].reverse().find(p=>p.entityId===entityId&&p.positionId===positionId);if(last)last.end=year;
        }
      }
      for(const key of ['artifact_id','artifact','shooter_artifact_id'])for(const id of ids(e[key]))addRef('artifacts',id,e);
      if(type==='item stolen')for(const id of ids(e.item))addRef('artifacts',id,e);
      for(const key of ['written_content_id','written_content','wc_id'])for(const id of ids(e[key]))addRef('writtencontents',id,e);
    }
    const figureSubtitle = hf => {
      const parts=[];
      if(flag(hf,['is_vampire','vampire']))parts.push('吸血鬼');
      else if(flag(hf,['is_necromancer','necromancer']))parts.push('死灵法师');
      else if(flag(hf,['is_deity','deity']))parts.push('神祇');
      else if(flag(hf,['force']))parts.push('自然之力');
      else if(hf.associated_type&&normalize(hf.associated_type)!=='standard')parts.push(term(hf.associated_type));
      const position=positions.get(Number(hf.id))?.[0];if(position){const title=position.title||positionName(position,hf);if(title)parts.push(term(title));}
      const skills=array(hf.skillDescriptions??hf.skill_descriptions).filter(s=>s&&number(s.points)>0&&s.name&&s.name!=='None');
      if(skills.length)parts.push([term(skills[0].rank),term(skills[0].name)].filter(Boolean).join(' '));
      const spheres=array(hf.sphere??hf.spheres).filter(s=>typeof s==='string'&&s);if(spheres.length)parts.push('领域：'+spheres.map(term).join('、'));
      return parts.join(' • ');
    };
    function positionName(position,hf) {
      const source=position.entity?.entity_position??position.entity?.entity_positions??position.entity?.positions;
      const candidates=array(source?.entity_position??source?.position??source),definition=candidates.find(p=>number(p?.id)===position.positionId);
      return String(first(normalize(hf?.caste)==='female'?definition?.name_female:definition?.name_male)??first(definition?.name)??position.title??'');
    }
    const entitySubtitle = entity => [term(entity.type),term(entity.race)].filter(Boolean).join(' • ');
    const eventCount = (kind,record) => {
      const supplied=options.eventsFor?.(kind,Number(record.id));if(Array.isArray(supplied))return supplied.length;
      const explicit=number(record.eventCount??record.event_count);if(explicit!==null)return explicit;
      return fallbackRefs.get(kind+':'+record.id)?.size||0;
    };
    const entries=Object.create(null);
    entries.top_slayers=byCount(kills,'figures',n=>n+' 次击杀',figureSubtitle).map(r=>({...r,detail:(killVictims.get(r.id)?.length?'被杀的著名人物：'+killVictims.get(r.id).join('、'): '')}));
    const battles=collections.filter(c=>typeOf(c)==='battle'),duels=collections.filter(c=>typeOf(c)==='duel'),rampages=collections.filter(c=>typeOf(c)==='beast attack');
    const battleMetric = battle => {
      const direct=subEvents(battle).filter(deadEvent),attacking=new Set(ids(battle.attacking_hfid)),defending=new Set(ids(battle.defending_hfid));
      const a=amount(battle,'attacking_squad_deaths')+direct.filter(e=>attacking.has(victim(e))).length;
      const d=amount(battle,'defending_squad_deaths')+direct.filter(e=>defending.has(victim(e))).length;
      const explicitA=number(battle.attacker_death_count),explicitD=number(battle.defender_death_count);
      return {attacker:explicitA??a,defender:explicitD??d,total:(explicitA??a)+(explicitD??d)};
    };
    entries.bloodiest_battles=battles.map(b=>{
      const metric=battleMetric(b),attacker=maps.entities.get(idOf(b,['attacking_enid','attacker_civ_id','attacker_ent_id'])),defender=maps.entities.get(idOf(b,['defending_enid','defender_civ_id','defender_ent_id']));
      return row('battles',b,metric.total,metric.total+' 人死亡',(attacker?named(attacker,'entities'):'进攻方')+' 对 '+(defender?named(defender,'entities'):'防守方'),'进攻方死亡：'+metric.attacker+'，防守方死亡：'+metric.defender);
    }).filter(r=>r.value>0);
    const duelVictories=new Map();for(const duel of duels)for(const e of subEvents(duel).filter(deadEvent))increment(duelVictories,killer(e));
    entries.fiercest_duelists=byCount(duelVictories,'figures',n=>n+' 次决斗获胜',figureSubtitle);
    entries.devastating_rampages=rampages.map(r=>{
      const nested=subEvents(r),deaths=nested.filter(e=>deadEvent(e)&&maps.figures.has(victim(e))).length,count=number(r.event_count??r.eventCount)??nested.length;
      return {...row('rampages',r,deaths||count,deaths?deaths+' 次击杀':count+' 个事件',number(r.start_year)!==null?String(r.start_year)+' 年':''),deathCount:deaths,eventCount:count};
    });
    const maxEventYear=events.reduce((n,e)=>Math.max(n,number(e.year)??n),0),currentYear=number(world.year)??maxEventYear;
    const allReigns=[];
    for(const [hfId,list]of positions){const hf=maps.figures.get(hfId);for(const position of list){
      const title=positionName(position,hf),monarch=position.positionId===0||/monarch|king|queen|emperor|empress|ruler|overlord|high priest|law-giver|lawgiver/i.test(title);
      if(!monarch||position.start===null)continue;
      const death=number(hf.death_year),end=position.end??(death!==null&&death!==-1?death:currentYear),ended=position.end!==null||death!==null&&death!==-1,duration=end-position.start;
      const subtitle=[term(title),position.entity?named(position.entity,'entities'):''].filter(Boolean).join(' · '),detail='从 '+position.start+' 年至 '+(ended?end+' 年':'今日');
      allReigns.push({...row('figures',hf,duration,duration+' 年',subtitle,detail),ended});
    }}
    entries.longest_reigns=allReigns.filter(r=>r.value>0);
    entries.shortest_reigns=allReigns.filter(r=>r.ended&&r.value>=0).map(r=>({...r,display:r.value===0?'不足 1 年':r.value+' 年'}));
    entries.contested_sites=byCount(siteConquests,'sites',n=>n+' 次征服',s=>term(s.type));
    // SiteHistory counts ownership periods, not present-day site counts. An
    // export without those periods cannot substitute a different metric.
    entries.largest_empires=entities.filter(e=>normalize(e.type)==='civilization').map(e=>{
      const history=e.site_history??e.siteHistory;if(!history)return null;const n=array(history.owner_period??history).length;return n?row('entities',e,n,n+' 个地点',entitySubtitle(e)):null;
    }).filter(Boolean);
    entries.greatest_scholars=byCount(scholars,'figures',n=>n+' 次发现',figureSubtitle);
    const authorCounts=new Map();for(const work of works)increment(authorCounts,idOf(work,['author_hfid','author']));
    entries.prolific_authors=byCount(authorCounts,'figures',n=>n+' 部作品',figureSubtitle);
    entries.most_copied_works=works.map(work=>{const count=eventCount('writtencontents',work),author=maps.figures.get(idOf(work,['author_hfid','author']));return row('writtencontents',work,count,count+' 个记录事件',author?'作者：'+named(author,'figures'):'佚名');}).filter(r=>r.value>0);
    const identities=get('identities'),identityCounts=new Map();for(const identity of identities)increment(identityCounts,idOf(identity,['histfig_id','nemesis_id']));
    entries.masters_of_disguise=figures.map(hf=>{
      const used=ids(hf.used_identity_id),defined=array(hf.identities??hf.identity).filter(v=>v&&typeof v==='object'),count=Math.max(used.length,defined.length,identityCounts.get(Number(hf.id))||0);
      return row('figures',hf,count,count+' 个伪装身份',figureSubtitle(hf));
    }).filter(r=>r.value>0);
    const perpetrator = hf => {
      if(!hf)return null;const pos=positions.get(Number(hf.id))?.find(p=>p.entity);if(pos)return pos.entityId;
      for(const link of array(hf.entity_link)){const id=idOf(link,['entity_id','entity','target']);if(maps.entities.has(id))return id;}return null;
    };
    for(const collection of collections)if(['theft','abduction'].includes(typeOf(collection)))increment(crimeCounts,idOf(collection,['attacking_enid']));
    for(const e of events){
      const type=typeOf(e);
      if(type==='item stolen'){
        const parents=directCollectionParents.get(Number(e.id));if(parents&&[...parents].some(id=>typeOf(maps.collections.get(id))==='theft'))continue;
        increment(crimeCounts,perpetrator(maps.figures.get(idOf(e,['histfig']))));
      }else if(type==='failed intrigue corruption'||type==='hfs formed intrigue relationship')increment(crimeCounts,perpetrator(maps.figures.get(idOf(e,['corruptor_hfid']))));
    }
    entries.notorious_syndicates=byCount(crimeCounts,'entities',n=>n+' 次犯罪',entitySubtitle);
    entries.oldest_living=figures.map(hf=>{
      const birth=number(hf.birth_year),death=number(hf.death_year);if(birth===null||birth===-1||death!==-1||flag(hf,['is_deity','deity']))return null;
      const age=currentYear-birth;return age>0?row('figures',hf,age,age+' 岁',figureSubtitle(hf)):null;
    }).filter(Boolean);
    entries.most_travelled=byCount(travellers,'figures',n=>n+' 次旅行',figureSubtitle);
    entries.oldest_artifacts=artifacts.map(a=>{
      const count=eventCount('artifacts',a),type=term(a.subtype??a.item_type??a.type??'Artifact');let subtitle=type;
      for(const [key,kind,particle]of[['holder_hfid','figures','由'],['site_id','sites','存放于'],['region_id','regions','位于']]){const r=maps[kind]?.get(number(a[key]));if(r){subtitle=type+' · '+particle+named(r,kind)+(key==='holder_hfid'?'持有':'');break;}}
      return row('artifacts',a,count,count+' 个事件',subtitle);
    }).filter(r=>r.value>0);
    const area=record=>number(record.square_tiles??record.squareTiles)??rawCoordinates(record.coords??record.coordinates).length;
    const regionSubtitle=r=>[term(r.type),term(r.evilness)].filter(Boolean).join(' • ');
    entries.largest_regions=regions.map(r=>{const n=area(r);return row('regions',r,n,n+' 格',regionSubtitle(r));}).filter(r=>r.value>0);
    entries.largest_underground_regions=underground.map(r=>{const n=area(r),depth=number(r.depth);return row('undergroundregions',r,n,n+' 格',[term(r.type),depth!==null?'深度 '+depth:''].filter(Boolean).join(' • '));}).filter(r=>r.value>0);
    const regionBattles=new Map();for(const battle of battles){const region=regionOf(battle);if(region)increment(regionBattles,Number(region.id));}
    entries.bloodiest_regions=byCount(regionBattles,'regions',n=>n+' 场战役',regionSubtitle);
    entries.longest_rivers=rivers.map(r=>{
      const coords=rawCoordinates(r.path),end=rawCoordinates(r.end_pos);coords.push(...end);const regionNames=[];
      for(const xy of coords){const region=grid.get(coordinateKey(xy));if(region){const s=named(region,'regions');if(!regionNames.length||regionNames.at(-1)!==s)regionNames.push(s);}}
      return row('rivers',r,coords.length,coords.length+' 格',regionNames.length?'流经 '+regionNames.join('、'):'河流');
    }).filter(r=>r.value>0);
    entries.highest_peaks=peaks.map(p=>{
      const height=number(p.height);if(height===null)return null;const region=regionOf(p),type=flag(p,['is_volcano'])?'火山':'山峰';
      return row('mountainpeaks',p,height,height*3+' 米',type+(region?' • 位于 '+named(region,'regions'):''));
    }).filter(Boolean);
    return assemble(entries,named);
  }

  // Cached statistics keep source text. Translate each field when presenting a
  // card so existing worlds get language fixes without rebuilding their index.
  function entryPresenter(world,options,data) {
    const a=world.disk?.aggregates||world.aggregates||{},maps=new Map();
    const extras={writtencontents:'written_contents',undergroundregions:'underground_regions',mountainpeaks:'mountain_peaks'};
    const lookup=(kind,id)=>{
      id=number(id);if(id===null)return null;
      const found=options.record?.(kind,id);if(found)return found;
      if(!maps.has(kind))maps.set(kind,new Map(array(options.records?.(kind)??world[kind]??world.extra?.[extras[kind]||kind]).map(record=>[Number(record.id),record])));
      return maps.get(kind).get(id)||null;
    };
    const term=(value,domain)=>value===undefined||value===null||value===''?'':String(options.term?.(value,domain?{domain}:undefined)??global.DFTranslate?.term(value,domain?{domain}:undefined)??value);
    const named=(kind,id,fallback)=>{
      const record=lookup(kind,id);if(record)return data.named(record,kind);
      if(!fallback)return '';
      return data.named({...a.entityFacts?.[kind==='entities'?id:undefined],id:id??('name:'+fallback),name:String(fallback)},kind);
    };
    const spheres=value=>{
      const values=array(value).flatMap(part=>String(part).split(/[、，]/)).map(part=>part.trim()).filter(Boolean);
      return global.DFTranslate?.sphere?global.DFTranslate.sphere(values):array(values).flatMap(v=>String(v).split(',')).map(v=>term(v.trim(),'sphere')).filter(Boolean).join('、');
    };
    const figureSubtitle=entry=>String(entry.subtitle||'').split(/\s*[•·]\s*/).map(part=>{
      const match=part.match(/^(?:领域|spheres?)\s*[:：]\s*(.*)$/i);
      const source=entry.record.sphere??entry.record.spheres;
      return match?'领域：'+spheres(array(source).length?source:match[1]):term(part,'profession');
    }).filter(Boolean).join(' • ');
    const positionSubtitle=entry=>{
      const hf=entry.record,dates=String(entry.detail||'').match(/从\s*(-?\d+)\s*年至\s*(-?\d+|今日)/),source=String(entry.subtitle||''),separator=source.lastIndexOf(' · '),rawEntity=separator<0?'':source.slice(separator+3),rawTitle=separator<0?source:source.slice(0,separator);
      let candidates=array(a.positionsByFigure?.[entry.id]);
      if(dates){const start=Number(dates[1]),end=dates[2]==='今日'?Number(world.year):Number(dates[2]);candidates=candidates.filter(p=>Number(p.start)===start&&Number(p.end??(number(hf.death_year)!==null&&Number(hf.death_year)!==-1?hf.death_year:world.year))===end);}
      const p=candidates.find(p=>{const e=lookup('entities',p.entityId);return e&&[e.name,e.translated_name,e.raw?.name].includes(rawEntity);})||candidates[0];
      const entity=p?lookup('entities',p.entityId):null;
      const definition=entity&&array(entity.entity_position??entity.raw?.entity_position).find(item=>Number(item.id)===Number(p.positionId));
      const gender=normalize(hf.caste),title=rawTitle||p?.title||(gender==='female'?definition?.name_female:gender==='male'?definition?.name_male:null)||definition?.name||'';
      return [term(title,'profession'),named('entities',p?.entityId,rawEntity)].filter(Boolean).join(' · ');
    };
    return (card,entry)=>{
      const record=entry.record||{},kind=entry.kind;let subtitle=entry.subtitle||'',detail=entry.detail||'';
      if(['longest_reigns','shortest_reigns'].includes(card))subtitle=positionSubtitle(entry);
      else if(kind==='figures'){
        subtitle=figureSubtitle(entry);
        if(/^被杀的著名人物：/.test(detail))detail='被杀的著名人物：'+detail.slice('被杀的著名人物：'.length).split('、').map(value=>named('figures',null,value)).join('、');
      }else if(card==='bloodiest_battles'){
        const sides=a.collectionSides?.[entry.id]||{},parts=String(subtitle).split(' 对 '),attacker=idOf(record,['attacker_enid','attacking_enid','attacker_ent_id','attacker_civ_id'])??sides.attacker,defender=idOf(record,['defender_enid','defending_enid','defender_ent_id','defender_civ_id'])??sides.defender;
        subtitle=(named('entities',attacker,parts[0])||'进攻方')+' 对 '+(named('entities',defender,parts.slice(1).join(' 对 '))||'防守方');
      }else if(card==='most_copied_works'){
        const id=idOf(record,['author_hfid','author','author_id']),fallback=a.authorNames?.[id]||String(subtitle).replace(/^(?:作者|author)\s*[:：]\s*/i,'');
        subtitle=/^(?:佚名|anonymous)$/i.test(fallback)?'佚名':'作者：'+(named('figures',id,fallback)||'佚名');
      }else if(kind==='entities'){
        const fields=String(subtitle).split(/\s*[•·]\s*/),facts=a.entityFacts?.[entry.id]||{};
        subtitle=[term(record.type??facts.type??fields[0],'entityType'),term(record.race??facts.race??fields[1],'creature')].filter(Boolean).join(' • ');
      }else if(kind==='sites')subtitle=term(record.type||subtitle,'siteType');
      else if(kind==='regions'||kind==='undergroundregions'){
        subtitle=String(subtitle).split(/\s*[•·]\s*/).map((part,index)=>/^深度\s/.test(part)?part:term(part,index===0?'terrain':undefined)).filter(Boolean).join(' • ');
      }else if(kind==='artifacts'){
        const parts=String(subtitle).split(' · ');subtitle=term(parts[0]);
        if(parts.length>1){let placed=false;for(const [key,target,before,after]of [['holder_hfid','figures','由','持有'],['site_id','sites','存放于',''],['region_id','regions','位于','']]){const id=number(record[key]),value=id!==null?named(target,id):'';if(value){subtitle+=' · '+before+value+after;placed=true;break;}}if(!placed)subtitle+=' · '+parts.slice(1).map(value=>term(value)).join(' · ');}
      }else if(kind==='rivers'&&/^流经 /.test(subtitle))subtitle='流经 '+subtitle.slice(3).split('、').map(value=>named('regions',null,value)).join('、');
      else if(kind==='mountainpeaks'&&subtitle.includes('位于 ')){const parts=subtitle.split('位于 '),region=number(record.region_id)??a.geographyRegions?.mountain_peaks?.[entry.id];subtitle=term(parts[0].replace(/\s*[•·]\s*$/,''))+' • 位于 '+named('regions',region,parts.slice(1).join('位于 '));}
      return {...entry,subtitle,detail};
    };
  }

  function renderReady(container, world, options = {}) {
    const data=calculate(world,options);
    const present=entryPresenter(world,options,data);
    const safeLink = entry => {
      const label=data.named(entry.record,entry.kind);
      return options.link?String(options.link(entry.kind,entry.id,label)):`<a href="#${escape(entry.kind)}/${entry.id}">${escape(label)}</a>`;
    };
    const worldName=String(options.name?.({id:'world',name:world.name,translated_name:world.altname??world.translated_name},'world')??world.name??'世界');
    const query=String(global.location?.hash||'').split('?')[1]||global.location?.search||'';
    const initial=new URLSearchParams(query).get('tab');let active=data.categories.some(c=>c.id===initial)?initial:'warfare';
    container.innerHTML=`<div class="page-title"><span class="page-title-icon">${mdi('mdi-trophy-outline')}</span><div><h1>世界纪录</h1><p>${escape(worldName)}最伟大的传说、最黑暗的悲剧与非凡成就</p></div></div>
      ${data.highlights.length?`<div class="record-highlight-grid">${data.highlights.map(highlight=>`<section class="record-highlight" title="${escape(highlight.title)}">${mdi(highlight.icon)}<div class="record-highlight-body"><div class="record-highlight-label">${escape(highlight.title)}</div><div class="record-highlight-name">${safeLink(highlight.entry)}</div></div><span class="record-value chip">${escape(highlight.entry.display)}</span></section>`).join('')}</div>`:''}
      <div class="tabs record-tabs" role="tablist" aria-label="世界纪录">${data.categories.map(category=>`<button class="tab record-tab${category.id===active?' active':''}" id="record-tab-${category.id}" data-record-tab="${category.id}" role="tab" aria-controls="record-panel" aria-selected="${category.id===active}" title="${escape(category.title)}">${mdi(category.icon)}<span>${escape(category.title)}</span></button>`).join('')}</div><div id="record-panel" role="tabpanel" class="record-grid"></div>`;
    const panel=container.querySelector('#record-panel');
    const draw=()=>{
      const category=data.categories.find(c=>c.id===active);
      panel.setAttribute('aria-labelledby','record-tab-'+active);
      panel.innerHTML=category.cards.map(card=>`<section class="section-card record-card" data-record-card="${card.id}" title="${escape(card.title)}"><div class="section-heading">${mdi(card.icon)}<div><h2>${escape(card.title)}</h2><p>按${escape(card.metric)}排名</p></div></div>${card.entries.length?`<table class="data-table record-table" aria-label="${escape(card.title)}"><tbody>${card.entries.map(source=>{const entry=present(card.id,source);return `<tr><td class="record-rank-cell"><span class="record-rank record-rank-${entry.rank<=3?entry.rank:'other'} chip">#${entry.rank}</span></td><td class="record-name-cell"><div class="record-name">${safeLink(entry)}</div>${entry.subtitle?`<div class="record-subtitle">${escape(entry.subtitle)}</div>`:''}${entry.detail?`<div class="record-detail">${escape(entry.detail)}</div>`:''}</td><td class="record-metric-cell"><span class="record-value chip">${escape(entry.display)}</span></td></tr>`;}).join('')}</tbody></table>`:'<div class="record-empty">未找到纪录。</div>'}</section>`).join('');
    };
    const activate=(tab,updateUrl)=>{
      if(!data.categories.some(c=>c.id===tab))return;active=tab;
      container.querySelectorAll('[data-record-tab]').forEach(button=>{const selected=button.dataset.recordTab===active;button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));});
      draw();
      if(updateUrl&&global.history?.replaceState){const url=new URL(global.location.href),hash=url.hash.split('?')[0];url.hash=hash+'?tab='+active;global.history.replaceState(null,'',url);}
    };
    const click=event=>{const button=event.target.closest('[data-record-tab]');if(button&&container.contains(button))activate(button.dataset.recordTab,true);};
    const keydown=event=>{
      const button=event.target.closest('[data-record-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const index=data.categories.findIndex(c=>c.id===active),next=event.key==='Home'?0:event.key==='End'?data.categories.length-1:(index+(event.key==='ArrowRight'?1:-1)+data.categories.length)%data.categories.length;
      activate(data.categories[next].id,true);container.querySelector('#record-tab-'+active)?.focus();
    };
    container.addEventListener('click',click);container.addEventListener('keydown',keydown);draw();
    return()=>{container.removeEventListener('click',click);container.removeEventListener('keydown',keydown);};
  }
  function render(container,world,options={}){
    if(world.disk?.format!=='file-index'||world.disk.aggregates?.records)return renderReady(container,world,options);
    const controller=new AbortController();let disposed=false,cleanup;
    container.innerHTML='<div class="page-title"><span class="page-title-icon">'+mdi('mdi-trophy-outline')+'</span><div><h1>世界纪录</h1></div></div><div class="record-empty" role="status">正在计算世界纪录…</div>';
    global.LegendsFastStore.analytics(world,{signal:controller.signal,progress:options.progress}).then(()=>{if(!disposed)cleanup=renderReady(container,world,options);},error=>{if(!disposed&&error.name!=='AbortError')container.querySelector('[role="status"]').textContent=error.message;});
    return()=>{disposed=true;controller.abort();cleanup?.();};
  }
  global.LegendsRecords=Object.freeze({render,calculate});
})(window);
