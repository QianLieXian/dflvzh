/* Browser adaptations of WarfareGraph.vue, MonarchTimeline.vue and chart components.
 * Data rules follow EntityExtensions, Entity.GetLeaderTimelines and War/Battle.DeathsByRace.
 * All references are DOM text or escaped generated markup; no XML HTML is trusted. */
(function (global) {
  'use strict';
  const list = value => value == null ? [] : Array.isArray(value) ? value : ArrayBuffer.isView(value) ? Array.from(value) : [value];
  const fold = value => String(value ?? '').toLowerCase().replace(/[_-]/g, ' ').trim();
  const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get = (record, ...keys) => { for (const key of keys) if (record?.[key] != null) return record[key]; return null; };
  const term = (value, options = {}, scope) => options.term ? options.term(String(value ?? ''),scope) : global.DFTranslate?.term(String(value ?? ''),scope) || String(value ?? '');
  const name = (record, kind, options = {}) => options.name ? options.name(record, kind) : global.DFTranslate?.name(record?.translated_name || record?.name || '', {kind:kind === 'entities' ? 'entity' : kind === 'figures' ? 'figure' : 'collection', type:record?.type}) || record?.name || '#' + record?.id;
  function alpha(color, opacity) {
    const values = String(color || '').match(/[\d.]+/g);
    if (values?.length >= 3 && /^rgba?\(/i.test(color)) return 'rgba(' + values.slice(0,3).join(',') + ',' + opacity + ')';
    if (/^#[a-f\d]{6}$/i.test(color || '')) return 'rgba(' + [1,3,5].map(i => parseInt(color.slice(i,i+2),16)).join(',') + ',' + opacity + ')';
    return color || 'rgba(112,128,144,' + opacity + ')';
  }
  function entityColor(record, world, opacity = 1) {
    return global.LegendsMap?.entityColor ? global.LegendsMap.entityColor(record, world, opacity) : alpha(record?.color || global.LegendsMap?.raceColors(world).get(String(record?.race || '')) || 'rgb(112,128,144)', opacity);
  }
  function foreground(color) {
    const rgb = String(color).match(/[\d.]+/g)?.slice(0,3).map(Number);
    return rgb?.length === 3 && (.299*rgb[0]+.587*rgb[1]+.114*rgb[2])/255 > .5 ? '#000000' : '#FFFFFF';
  }
  function side(record, attacking) { return number(get(record, ...(attacking ? ['aggressor_ent_id','attacker_ent_id','attacker_civ_id','attacker_id','attacker_enid','attacking_enid','attackerId'] : ['defender_ent_id','defender_civ_id','defender_id','defender_enid','defending_enid','defenderId']))); }
  function deaths(record) {
    const total = number(get(record, 'death_count','deaths','deathCount','DeathCount','TotalDeaths'));
    if (total !== null) return total;
    const a = number(get(record,'attacker_death_count','attackerDeathCount','AttackerDeathCount')), d = number(get(record,'defender_death_count','defenderDeathCount','DefenderDeathCount'));
    return a !== null || d !== null ? (a || 0) + (d || 0) : null;
  }
  function parentId(entity) {
    const parent = list(entity?.entity_link).find(link => fold(link.type || link.link_type) === 'parent');
    return number(parent?.target ?? parent?.entity_id ?? entity?.parent_id);
  }
  function warfareData(records, world, options = {}) {
    if (records?.nodes && records?.edges) return records;
    const entities = new Map(list(world?.entities).map(entity => [Number(entity.id),entity])), nodes = new Map(), edges = [];
    function add(entity) {
      if (!entity || nodes.has(Number(entity.id))) return;
      const isCiv = /^(civilization|civ)$/i.test(entity.type || ''), color = entityColor(entity,world,.6), parent = parentId(entity);
      nodes.set(Number(entity.id), {data:{id:'node-'+entity.id,label:term(entity.race,options,'creature')+(isCiv?'\n──────── ✶ ────────':'')+'\n'+name(entity,'entities',options)+'\n'+term(entity.type,options),href:'/entity/'+entity.id,kind:'entities',recordId:entity.id,backgroundColor:color,foregroundColor:foreground(color)},classes:[isCiv?'is-civilization':'',Number(options.current?.id)===Number(entity.id)?'current':''].filter(Boolean).join(' ')});
      if (!isCiv && parent !== null && parent !== Number(entity.id) && entities.has(parent)) { const seen=new Set([Number(entity.id)]);let ancestor=entities.get(parent);while(ancestor&&!/^(civilization|civ)$/i.test(ancestor.type||'')&&!seen.has(Number(ancestor.id))){seen.add(Number(ancestor.id));ancestor=entities.get(parentId(ancestor));}if(ancestor&&!seen.has(Number(ancestor.id))&&/^(civilization|civ)$/i.test(ancestor.type||'')){add(ancestor);nodes.get(Number(entity.id)).data.parent='node-'+ancestor.id;} }
    }
    const collections = new Map(list(world?.collections).concat(list(records),list(options.collections)).map(record=>[Number(record.id),record])),eventIndex=new Map(list(world?.events).concat(list(options.events)).map(event=>[Number(event.id),event]));
    function countFor(record){
      const known=deaths(record),metrics=world?.disk?.aggregates?.metrics?.collections?.[record.id]||record.metrics;if(known!==null)return known;const metric=metrics&&deaths(metrics);if(metric!==null&&metric!==undefined)return metric;
      if(world?.disk)return null;
      const pending=[record],seen=new Set(),eventIds=new Set();let squads=0;
      while(pending.length){const collection=pending.pop();if(!collection||seen.has(Number(collection.id)))continue;seen.add(Number(collection.id));list(collection.event??collection.events).forEach(id=>eventIds.add(Number(id)));for(const id of list(collection.eventcol??collection.children)){const child=collections.get(Number(id));if(child)pending.push(child);}if(fold(collection.type)==='battle')for(const prefix of ['attacking','defending'])for(const value of list(collection[prefix+'_squad_deaths']))if(number(value)!==null)squads+=Number(value);}
      let named=0;const notable=fold(record.type)==='battle'?new Set(list(record.attacking_hfid).concat(list(record.defending_hfid)).map(Number)):null;for(const id of eventIds){const event=eventIndex.get(id);if(event&&fold(event.type)==='hf died'&&(!notable||notable.has(Number(event.hfid??event.histfig_id))))named++;}return named+squads;
    }
    for (const record of list(records)) {
      const parent=collections.get(number(record.war_eventcol??record.war_id)),events=list(record.event??record.events).map(id=>eventIndex.get(Number(id))).filter(Boolean),attackEvent=events.find(event=>fold(event.type)==='attacked site')||events.find(event=>fold(event.type)==='field battle');
      const attacker = entities.get(side(record,true)??side(attackEvent,true)??side(parent,true)), defender = entities.get(side(record,false)??side(attackEvent,false)??side(parent,false));
      if (attacker) add(attacker); if (defender) add(defender);
      if (!attacker || !defender) continue;
      const count = countFor(record), width = count === null ? 1 : Math.min(15,Math.max(1,Math.floor(count/10))), type=fold(record.type)==='war'?'war':'battle', color=entityColor(attacker,world,.6);
      edges.push({data:{id:'edge-'+type+'-'+record.id,source:'node-'+attacker.id,target:'node-'+defender.id,href:'/'+type+'/'+record.id,kind:type==='war'?'wars':'battles',recordId:record.id,backgroundColor:color,foregroundColor:foreground(color),width,label:count===null?'':count+' ✝',tooltip:escape(name(record,type==='war'?'wars':'battles',options))+'<br>'+escape(name(attacker,'entities',options))+' → '+escape(name(defender,'entities',options))}});
    }
    return {nodes:[...nodes.values()],edges};
  }
  const warfareStyles = [
    {selector:'node',style:{shape:'roundrectangle',width:'label',height:'label',label:'data(label)','text-wrap':'wrap','font-family':'Helvetica','font-size':16,'text-valign':'center','background-color':'data(backgroundColor)','background-opacity':1,color:'data(foregroundColor)','padding-top':'6px'}},
    {selector:':parent',style:{shape:'round-hexagon',label:'data(label)','text-background-shape':'roundrectangle','text-background-padding':4,'text-background-color':'data(backgroundColor)','text-background-opacity':.8,'background-opacity':.8,'text-valign':'top','text-halign':'center','text-margin-y':-6,'font-size':14}},
    {selector:'node.is-civilization',style:{'padding-left':'16px',shape:'round-hexagon'}},
    {selector:'node.current',style:{'background-blacken':.1,'border-width':'2px','border-style':'dashed','border-color':'orange'}},
    {selector:'edge',style:{label:'data(label)',width:'data(width)','line-color':'data(backgroundColor)','line-cap':'round','line-opacity':.8,'curve-style':'bezier','target-arrow-shape':'triangle','target-arrow-color':'data(backgroundColor)','text-rotation':'autorotate','text-background-shape':'roundrectangle','text-background-padding':4,'text-background-color':'data(backgroundColor)','text-background-opacity':1,'font-size':14,color:'data(foregroundColor)'}}
  ];
  function selectHref(href, options) {
    const match = String(href || '').match(/^\/(entity|war|battle|hf|historicalfigure)\/(\d+)$/);
    if (!match) return;
    const kind = {entity:'entities',war:'wars',battle:'battles',hf:'figures',historicalfigure:'figures'}[match[1]];
    if (options.onSelect) options.onSelect(kind,Number(match[2]));
    else location.hash = '#/'+match[1]+'/'+match[2];
  }
  function mountWarfare(container, data, options = {}) {
    if (!global.cytoscape || !global.cytoscapeCola) throw new Error('Cytoscape Cola is required');
    global.cytoscape.use(global.cytoscapeCola);
    container.style.height = options.fullscreen ? '780px' : '360px'; container.classList.add('warfare-graph');
    const cy = global.cytoscape({container,zoom:1,wheelSensitivity:.1,elements:data,style:warfareStyles,layout:{name:'cola',animate:false,nodeDimensionsIncludeLabels:true,avoidOverlap:true,padding:50,centerGraph:true,fit:true,convergenceThreshold:.01,edgeLength:()=>100,nodeSpacing:node=>node.isOrphan()?50:10}});
    const readable=()=>{if(!cy.destroyed()&&cy.zoom()<.875){cy.zoom(.875);cy.center();}};cy.on('layoutstop',readable);readable();cy.center(); const tips=[];
    cy.on('tap','node, edge',event=>selectHref(event.target.data('href'),options));
    cy.on('mouseover','node, edge',()=>{container.style.cursor='pointer';});
    cy.on('mouseout','node, edge',()=>{container.style.cursor='';});
    if (global.tippy) cy.edges().forEach(edge=>{
      const tip=global.tippy(document.createElement('div'),{allowHTML:true,content:edge.data('tooltip')||'',trigger:'manual',placement:'top',appendTo:()=>document.body});tips.push(tip);
      edge.on('mouseover',()=>{const box=edge.renderedBoundingBox(),rect=container.getBoundingClientRect();tip.setProps({getReferenceClientRect:()=>new DOMRect(rect.left+(box.x1+box.x2)/2,rect.top+(box.y1+box.y2)/2,0,0)});tip.show();});edge.on('mouseout',()=>tip.hide());
    });
    const observer = typeof ResizeObserver==='function' ? new ResizeObserver(()=>{if(!cy.destroyed()){cy.resize();cy.center();}}) : null; observer?.observe(container);
    return {cy,data,destroy(){observer?.disconnect();tips.forEach(tip=>tip.destroy());cy.destroy();container.style.cursor='';}};
  }
  function relation(leader, previous, options) {
    if (!previous) return '创始者';
    const links=list(leader.hf_link).concat(list(leader.hfhf_link)), previousLinks=list(previous.hf_link).concat(list(previous.hfhf_link)), link=links.find(item=>number(item.hfid??item.target??item.hf_id)===Number(previous.id));
    const female=fold(leader.caste)==='female',male=fold(leader.caste)==='male', previousName=name(previous,'figures',options);
    if (link) {
      const type=fold(link.link_type??link.type);
      const roles={father:female?'女儿':male?'儿子':'子女',mother:female?'女儿':male?'儿子':'子女',child:female?'母亲':male?'父亲':'父母',spouse:female?'妻子':male?'丈夫':'配偶','former spouse':female?'妻子':male?'丈夫':'配偶','deceased spouse':female?'妻子':male?'丈夫':'配偶',apprentice:'学徒',master:'师傅'};
      return roles[type] ? previousName+'的'+roles[type] : '接替'+previousName+'（'+term(type,options)+'）';
    }
    if (links.some(item=>['father','mother'].includes(fold(item.link_type??item.type))&&previousLinks.some(other=>fold(other.link_type??other.type)===fold(item.link_type??item.type)&&number(other.hfid??other.target)===number(item.hfid??item.target)))) return previousName+'的'+(female?'姐妹':male?'兄弟':'手足');
    return previousName+'的继任者';
  }
  function timelineData(entity, world, options = {}) {
    if (entity?.leaderTimelines) return entity.leaderTimelines;
    const figures = new Map(list(options.figures ?? world?.figures).map(figure=>[Number(figure.id),figure])), definitions=list(entity.entity_position ?? entity.entity_positions), positions=[];
    const defFor=id=>definitions.find(position=>Number(position.id)===Number(id));
    const titleFor=(definition,figure)=>fold(figure?.caste)==='female' ? definition?.name_female||definition?.name : fold(figure?.caste)==='male' ? definition?.name_male||definition?.name : definition?.name;
    function add(hfid,positionId,startYear,endYear,title) {
      const figure=figures.get(Number(hfid)); if(!figure)return;
      let position=positions.find(item=>item.hfid===Number(hfid)&&item.positionId===Number(positionId)&&item.startYear===startYear);
      if (!position) positions.push(position={hfid:Number(hfid),positionId:Number(positionId),startYear,endYear,title:title||defFor(positionId)?.name||'Leader',figure});
      else if(endYear!==null)position.endYear=endYear;
    }
    // Explicit positions are accepted when reconstructed by the disk relation provider.
    for(const figure of figures.values()) for(const position of list(figure.positions??figure.entity_position_link).concat(list(figure.entity_former_position_link))) if(number(position.entity_id??position.entityId??position.civ_id)===Number(entity.id)) {const end=number(position.end_year??position.endYear);add(figure.id,position.position_id??position.positionId,number(position.start_year??position.startYear),end===-1?null:end,position.title);}
    const events=list(options.events ?? world?.events).filter(event=>number(event.civ_id??event.civ??event.entity_id??event.enid)===Number(entity.id)&&number(event.position_id)!==null&&/^(add|remove) hf entity link$/.test(fold(event.type))).sort((a,b)=>(number(a.year)??-1)-(number(b.year)??-1)||Number(a.id)-Number(b.id));
    for(const event of events){const hfid=number(event.hfid??event.histfig_id??event.histfig),positionId=Number(event.position_id),year=number(event.year);if(fold(event.type)==='add hf entity link')add(hfid,positionId,year,null,event.position);else{const position=positions.filter(item=>item.hfid===hfid&&item.positionId===positionId&&item.endYear===null).at(-1);if(position)position.endYear=year;else if(event.position)add(hfid,positionId,null,year,event.position);}}
    for(const assignment of list(entity.entity_position_assignment??entity.entity_position_assignments))if(!positions.some(position=>position.hfid===number(assignment.histfig??assignment.hfid)&&position.positionId===Number(assignment.position_id)))add(assignment.histfig??assignment.hfid,assignment.position_id,null,null);
    const grouped=new Map();for(const position of positions){if(!grouped.has(position.title))grouped.set(position.title,[]);grouped.get(position.title).push(position);}
    const currentYear=Number(world?.year??world?.current_year??0);
    return [...grouped].map(([leaderType,items])=>{
      items.sort((a,b)=>(a.startYear??-1)-(b.startYear??-1)||(number(a.figure.birth_year??a.figure.birthyear)??-1)-(number(b.figure.birth_year??b.figure.birthyear)??-1));
      const unique=items.filter((item,index)=>items.findIndex(other=>other.hfid===item.hfid)===index);
      const leaders=unique.map((position,index)=>{const figure=position.figure,birthYear=number(figure.birth_year??figure.birthyear)??-1,deathYear=number(figure.death_year??figure.deathyear)??-1,endYear=position.endYear??(deathYear!==-1?deathYear:null),duration=position.startYear===null?null:(endYear??currentYear)-Math.max(0,position.startYear);return {id:figure.id,name:figure.name,record:figure,link:'/hf/'+figure.id,race:figure.race,caste:figure.caste,positionTitle:titleFor(defFor(position.positionId),figure)||position.title,startYear:position.startYear,endYear,startYearDisplay:position.startYear===null||position.startYear===-1?'时间之初之前':'第 '+position.startYear+' 年',endYearDisplay:endYear===null?'现在':'第 '+endYear+' 年',reignDuration:duration===null?'任期未知':duration<=0?'不到一年':duration+' 年'+(endYear===null?'（在位）':''),isAlive:deathYear===-1,birthYear,deathYear,deathCause:figure.death_cause||'',predecessorRelation:relation(figure,unique[index-1]?.figure,options)};}).reverse();
      return {positionId:Math.min(...items.map(item=>item.positionId)),leaderType,leaders};
    }).sort((a,b)=>a.positionId-b.positionId||a.leaderType.localeCompare(b.leaderType));
  }
  function available(timelines,options={}) { return options.mode==='primaryOnly' ? options.isCiv ? list(timelines).slice(0,1) : [] : options.isCiv ? list(timelines).slice(1) : list(timelines); }
  function mountTimeline(container,timelines,options={}) {
    const choices=available(timelines,options);let selected=choices[0]?.leaderType;
    container.classList.add('monarch-timeline-container');container.classList.toggle('monarch-expanded',!!options.fullscreen);
    function render(){container.replaceChildren();if(options.mode==='otherPositions'&&choices.length>1){const label=document.createElement('label');label.className='position-select-wrapper';label.innerHTML='<span><i class="mdi mdi-seal" aria-hidden="true"></i> 贵族职位</span>';const select=document.createElement('select');select.setAttribute('aria-label','贵族职位');for(const choice of choices){const option=new Option(term(choice.leaderType,options,'profession'),choice.leaderType);select.add(option);}select.value=selected;select.onchange=()=>{selected=select.value;render();};label.append(select);container.append(label);}
      const scroll=document.createElement('div');scroll.className='timeline-scroll-container'+(options.fullscreen?' timeline-expanded':'');
      for(const item of choices.find(choice=>choice.leaderType===selected)?.leaders||[]){const current=item.endYear===null,row=document.createElement('div');row.className='monarch-timeline-item';row.innerHTML='<span class="monarch-timeline-dot '+(current?'is-current':'')+'"><i class="mdi mdi-crown'+(current?'':'-outline')+'" aria-hidden="true"></i></span>';
        const card=document.createElement('div');card.className='bubble-card';const record=item.record||{id:item.id,name:item.name,race:item.race};const title=name(record,'figures',options);card.innerHTML='<div class="timeline-row"><a href="#/hf/'+escape(item.id)+'" class="timeline-name">'+escape(title)+'</a>'+(current?'<span class="timeline-current">现任</span>':'')+'</div><div class="timeline-row timeline-caption"><div class="timeline-period"><span class="timeline-position">'+escape(term(item.positionTitle,options,'profession'))+'</span><span><i class="mdi mdi-calendar-clock" aria-hidden="true"></i> '+escape(item.startYearDisplay)+' – '+escape(item.endYearDisplay)+'</span></div><span class="timeline-duration">'+(options.fullscreen?'任期：':'')+escape(item.reignDuration)+'</span></div><div class="timeline-row timeline-caption"><span class="timeline-relation">'+escape(item.predecessorRelation)+'</span><span class="timeline-lifespan">'+(item.birthYear!==-1||item.deathYear!==-1?'生于 '+(item.birthYear===-1?'?':item.birthYear)+(item.isAlive?'':' · 卒于 '+(item.deathYear===-1?'?':item.deathYear)):'')+(item.deathCause?' <span class="timeline-death">（'+escape(term(item.deathCause,options))+'）</span>':'')+'</span></div>';
        card.querySelector('a').onclick=event=>{event.preventDefault();options.onSelect?.('figures',Number(item.id));};row.append(card);scroll.append(row);
      }container.append(scroll);
    }render();return{destroy(){container.replaceChildren();},select(position){selected=position;render();}};
  }
  function deathsByRace(record,world,options={}) {
    if(record.deathsByRace?.labels)return record.deathsByRace;
    const counts=new Map(),figures=new Map(list(options.figures??world?.figures).map(figure=>[Number(figure.id),figure])),isBattle=fold(record.type)==='battle'||options.kind==='battles';
    const notable=new Set(list(record.attacking_hfid).concat(list(record.defending_hfid)).map(Number));
    for(const event of list(options.events))if(fold(event.type)==='hf died'&&(!isBattle||notable.has(Number(event.hfid??event.histfig_id)))){const figure=figures.get(Number(event.hfid??event.histfig_id)),race=figure?.race;if(race)counts.set(String(race),(counts.get(String(race))||0)+1);}
    const battles=isBattle?[record]:list(options.collections).filter(collection=>fold(collection.type)==='battle');
    for(const battle of battles)for(const prefix of ['attacking','defending']){const races=list(battle[prefix+'_squad_race']),values=list(battle[prefix+'_squad_deaths']);for(let i=0;i<races.length;i++)if(number(values[i])!==null)counts.set(String(races[i]),(counts.get(String(races[i]))||0)+Number(values[i]));}
    if(options.counts)for(const [race,count] of Object.entries(options.counts))counts.set(race,Number(count));
    const palette=global.LegendsMap?.raceColors(world)||new Map(),races=[...counts.keys()],colors=races.map(race=>palette.get(race)||'rgb(112,128,144)');
    return {labels:races.map(race=>term(race,options,'creature')),datasets:[{data:races.map(race=>counts.get(race)),borderColor:colors,backgroundColor:colors.map(color=>alpha(color,.2))}]};
  }
  function mountChart(canvas,type,source,options={}) {
    if(!global.Chart)throw new Error('Chart.js is required');
    const data={labels:list(source?.labels),datasets:list(source?.datasets).map(dataset=>type==='doughnut'?{...dataset,borderRadius:4,spacing:4,borderWidth:2}:type==='line'?{...dataset,fill:true,borderColor:'rgb(75,192,192)',backgroundColor:'rgba(75,192,192,.2)',tension:.2}:{...dataset,borderWidth:1})};
    return new Chart(canvas,{type,data,options:{responsive:true,maintainAspectRatio:false,indexAxis:type==='bar'?'y':'x',plugins:{legend:{display:type==='doughnut',position:'right',labels:{color:'#fff',font:{size:16}}}},scales:type==='doughnut'?{}:{x:{ticks:{color:'#b0bec5',font:{size:14}},grid:{color:'#37474f'}},y:{ticks:{color:'#b0bec5',font:{size:14}},grid:{color:'#37474f'}}},...options}});
  }
  global.LegendsWarfare={dataFor:warfareData,mount:mountWarfare,styles:warfareStyles,deaths};
  global.LegendsTimeline={dataFor:timelineData,mount:mountTimeline,available};
  global.LegendsCharts={mount:mountChart,deathsByRace,alpha,foreground,entityColor};
}(window));
