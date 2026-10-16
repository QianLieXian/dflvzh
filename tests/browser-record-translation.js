/* Exercise old English aggregate entries through the actual record-card UI.
 * No parser, indexer or analytics code is loaded: localization must be a read
 * operation over the existing cache, including saved worlds imported earlier. */
(function(global){
'use strict';
global.runRecordTranslationRegression=async function(testOptions={}){
  await DFTranslate.ready;
  const checks=[],assert=(condition,label,actual)=>{if(!condition)throw new Error(label+': '+JSON.stringify(actual));checks.push(label);};
  const sphereTerm=value=>DFTranslate.sphere?.(value)??DFTranslate.term(value,{domain:'sphere'});
  const figure={id:1,name:'Urist Copperhammer',race:'DWARF',caste:'MALE',birth_year:1,death_year:-1,sphere:['metals','war']};
  const otherFigure={id:2,name:'Domas Silverspear',race:'DWARF',caste:'FEMALE',birth_year:2,death_year:150};
  // This author is deliberately absent from loaded figures: old large worlds
  // retain authorNames for record cards without hydrating the full population.
  const author={id:3,name:'Zasit Goldbeard',race:'DWARF'};
  const entity={id:1,name:'The Alchemical Barbarity',type:'civilization',race:'DWARF',entity_position:[{id:0,name:'monarch',name_male:'king',name_female:'queen'}]};
  const otherEntity={id:2,name:'The Copper Spears',type:'civilization',race:'GOBLIN',entity_position:[{id:0,name:'monarch',name_male:'king',name_female:'queen'}]};
  const site={id:1,name:'The Copper Mountain',type:'fortress',coords:'1,1',region_id:1};
  const region={id:1,name:'The Gold Mountains',type:'forest',evilness:'good',coords:'1,1|2,1|2,2'};
  const underground={id:1,name:'The First Cavern',type:'cavern',depth:1,coords:'1,1|2,1'};
  const work={id:1,name:'The Golden World',title:'The Golden World',author_hfid:3,form:'essay'};
  const artifact={id:1,name:'The Silver Hammer',item_type:'weapon',item_subtype:'warhammer',holder_hfid:1,site_id:1};
  const battle={id:1,name:'The Battle of Gold',type:'battle',attacking_enid:1,defending_enid:2,start_year:120};
  const rampage={id:2,name:'The Copper Rampage',type:'beast attack',start_year:120};
  const river={id:1,name:'The Silver River',path:'1,1|2,1',end_pos:'2,2'};
  const peak={id:1,name:'The Golden Peak',height:100,region_id:1,is_volcano:''};
  const rows={figures:[figure,otherFigure],entities:[entity,otherEntity],sites:[site],regions:[region],undergroundregions:[underground],writtencontents:[work],artifacts:[artifact],battles:[battle],rampages:[rampage],rivers:[river],mountainpeaks:[peak]};
  const entry=(kind,record,value,display,subtitle,detail='')=>({kind,id:record.id,record:JSON.parse(JSON.stringify(record)),value,display,subtitle,detail});
  const entries={};
  for(const [key,display]of[['top_slayers','10 次击杀'],['fiercest_duelists','10 次决斗获胜'],['greatest_scholars','10 次发现'],['prolific_authors','10 部作品'],['masters_of_disguise','10 个伪装身份'],['oldest_living','10 岁'],['most_travelled','10 次旅行']])entries[key]=[entry('figures',figure,10,display,'king • 领域：metals、war')];
  entries.top_slayers.push(entry('figures',otherFigure,8,'8 次击杀','领域：metals'));
  entries.bloodiest_battles=[entry('battles',battle,12,'12 人死亡','The Alchemical Barbarity 对 The Copper Spears','进攻方死亡：5，防守方死亡：7')];
  entries.devastating_rampages=[{...entry('rampages',rampage,7,'7 次击杀','120 年'),deathCount:7,eventCount:9}];
  entries.longest_reigns=[entry('figures',figure,99,'99 年',' · The Alchemical Barbarity','从 10 年至 109 年')];
  entries.shortest_reigns=[entry('figures',figure,49,'49 年','king · The Copper Spears','从 30 年至 79 年')];
  entries.contested_sites=[entry('sites',site,10,'10 次征服','fortress')];
  entries.largest_empires=[entry('entities',entity,10,'10 个地点','civilization • DWARF')];
  entries.notorious_syndicates=[entry('entities',otherEntity,10,'10 次犯罪','civilization • GOBLIN')];
  entries.most_copied_works=[entry('writtencontents',work,10,'10 个记录事件','作者：Zasit Goldbeard')];
  entries.oldest_artifacts=[entry('artifacts',artifact,10,'10 个事件','weapon')];
  entries.largest_regions=[entry('regions',region,3,'3 格','forest • good')];
  entries.bloodiest_regions=[entry('regions',region,10,'10 场战役','forest • good')];
  entries.largest_underground_regions=[entry('undergroundregions',underground,2,'2 格','cavern • 深度 1')];
  entries.longest_rivers=[entry('rivers',river,3,'3 格','河流')];
  entries.highest_peaks=[entry('mountainpeaks',peak,100,'300 米','火山')];
  const aggregates={version:5,records:{entries},authorNames:{3:author.name},positionsByFigure:{1:[{entityId:1,positionId:0,title:'',start:10,end:109},{entityId:2,positionId:0,title:'king',start:30,end:79}]},collectionSides:{1:{attacker:1,defender:2}},geographyRegions:{mountain_peaks:{1:1}},entityFacts:{1:{IsCiv:true},2:{IsCiv:true}},currentYear:200};
  const world={id:'cached-record-translation',name:'The World of Mountains',year:200,figures:[],sites:[site],entities:[entity,otherEntity],regions:[region],events:[],collections:[],artifacts:[],extra:{underground_regions:[underground],rivers:[river],mountain_peaks:[peak]},disk:{format:'file-index',id:'existing-index-no-rebuild',factsVersion:3,aggregates}};
  const before=JSON.stringify(aggregates),singular={figures:'figure',entities:'entity',sites:'site',artifacts:'artifact',regions:'region',undergroundregions:'undergroundregion',writtencontents:'writtencontent',mountainpeaks:'mountainpeak',rivers:'river'};
  const named=(record,kind)=>DFTranslate.name(record.translated_name||record.name||record.title||'',{kind:singular[kind]||kind,type:record.type,entityType:record.type,siteType:kind==='sites'?record.type:undefined,rawName:record.name,givenName:kind==='figures'?record.name?.split(/\s+/)[0]:undefined});
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options={name:named,term:DFTranslate.term,records:kind=>rows[kind]||[],record:(kind,id)=>(rows[kind]||[]).find(record=>record.id===Number(id)),link:(kind,id,label)=>'<a href="#/'+kind+'/'+id+'">'+esc(label)+'</a>'};
  const host=document.querySelector('#records'),dispose=LegendsRecords.render(host,world,options),report=[];
  const text=(card,selector)=>host.querySelector('[data-record-card="'+card+'"] '+selector)?.textContent||'';
  for(const tab of [...host.querySelectorAll('[data-record-tab]')]){
    tab.click();await new Promise(resolve=>setTimeout(resolve,0));
    const cards=[...host.querySelectorAll('[data-record-card]')];
    assert(cards.length>0,'tab has original cards '+tab.dataset.recordTab);
    for(const card of cards){
      const key=card.dataset.recordCard,expected=entries[key],tableRows=[...card.querySelectorAll('tbody tr')];
      assert(tableRows.length===expected.length,'cached rows preserved '+key,tableRows.length);
      assert(tableRows.map(row=>row.querySelector('.record-value').textContent).join('|')===expected.map(row=>row.display).join('|'),'cached metric values preserved '+key);
      assert(tableRows.map(row=>row.querySelector('.record-rank').textContent).join('|')===expected.map((_,index)=>'#'+(index+1)).join('|'),'rank order preserved '+key);
      for(let index=0;index<tableRows.length;index++)assert(tableRows[index].querySelector('.record-name a').getAttribute('href')==='#/'+expected[index].kind+'/'+expected[index].id,'record link preserved '+key+' '+index);
      const prose=[...card.querySelectorAll('.record-subtitle,.record-detail')].map(node=>node.textContent).join(' ');
      assert(!/[a-z]/i.test(prose),'cached English descriptions localized '+key,prose);
      report.push({key,subtitle:tableRows[0]?.querySelector('.record-subtitle')?.textContent||'',detail:tableRows[0]?.querySelector('.record-detail')?.textContent||''});
    }
    if(tab.dataset.recordTab==='sovereigns'){
      assert(text('longest_reigns','.record-subtitle').includes(named(entity,'entities')),'longest reign uses DFCN entity name',text('longest_reigns','.record-subtitle'));
      assert(text('shortest_reigns','.record-subtitle').includes(named(otherEntity,'entities')),'shortest reign selects matching position entity',text('shortest_reigns','.record-subtitle'));
      assert(!/^\s*·/.test(text('longest_reigns','.record-subtitle'))&&text('longest_reigns','.record-subtitle').includes(DFTranslate.term('king')),'missing cached position title resolves original gendered definition',text('longest_reigns','.record-subtitle'));
      assert(text('longest_reigns','.record-detail')==='从 10 年至 109 年'&&text('shortest_reigns','.record-detail')==='从 30 年至 79 年','reign dates unchanged');
    }
    if(tab.dataset.recordTab==='lore')assert(text('most_copied_works','.record-subtitle').includes(named(author,'figures')),'cached English author fallback uses historical figure name algorithm',text('most_copied_works','.record-subtitle'));
    if(tab.dataset.recordTab==='warfare')assert(text('top_slayers','.record-subtitle').includes(sphereTerm('metals'))&&text('top_slayers','.record-subtitle').includes(sphereTerm('war')),'sphere terms translated separately',text('top_slayers','.record-subtitle'));
  }
  assert(report.length===21,'all 21 original record cards checked',report.length);
  assert(JSON.stringify(aggregates)===before,'existing English aggregate cache is unchanged');
  assert(world.disk.id==='existing-index-no-rebuild'&&world.disk.factsVersion===3&&world.disk.aggregates.version===5,'no index or analytics upgrade required');
  if(!testOptions.keepMounted)dispose?.();
  const result={ok:true,checks:checks.length,cards:report,figureName:named(figure,'figures'),authorName:named(author,'figures'),entityName:named(entity,'entities')};document.querySelector('#result').textContent=JSON.stringify(result,null,2);return result;
};
})(window);
