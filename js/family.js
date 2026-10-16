/* FamilyTree.vue Cytoscape styles and original node PNGs from
 * Kromtec/LegendsViewer-Next. Ancestor/direct-child traversal follows
 * Extensions/HistoricalFigureExtensions.cs. Static libraries are pinned to
 * the upstream package-lock; enlarged node text and initial zoom are the
 * requested readability change. No browser network requests are made. */
(function (global) {
  'use strict';
  const leaderImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuOWwzfk4AAAHsSURBVEhLYxgFgwIIQWlaAGEQ4QnEMSAGEcASiokB8UDsBWIYAPFXIDYEcfAAaXEhhufiwgxPgGxJiBBOYALE34FYB8QRkZdk+CfEx/AQyBYFCWABHOxsDMf3z2L4v3cGw39WZoajQDE2iBQGEBURYHgoJ8HwF8jmBgmwq8oxfN42ieE/ExPDXiCfBSSIBmZOLGH4//8sBPcVMfwHiUGkUAAr0IwDW4FmyYozvAXymcCiQNc/+HOa4X9rNlhjH1gQAdJivRn+/zuDsADEjvYEq02DKAEDRiCe2JbD8P/7MYb/3JwMNyDCQMDIyLD/0yGG/3+BlgQ5MfwDCsEi3dpIg+HXN6AGmOEwDBIz1mT4AVQDi/S4UBeGfyDLX+5m+A+0bQ9UHAzmX1wB0QiySFsJHEE+EsBIfbQV03AYvr+Z4b+oAMNToFovXRWG71+PQsTPLQX7bj7IYBho3tiP0HhrPcN/YIr5v28mQgwX3jMdaIkgRA9MDGQWyEyI0RCQPrUCVePrvah8fPjVHlQ+yCyQmRCjIcCrMhFVESUYZBbQTFAGhgO9GC/sisnBILOAZqpDjIYAMQdjhr/YFJODHU0YfgHN5IcYDQEsUqIMP9f3MvynBpYWY/gANJMZYjQCFANxA5VwARCPgpEBGBgAxBHRUN6IEB4AAAAASUVORK5CYII=';
  const necromancerImageData = 'data:image/png;base64,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';
  const vampireImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuOWwzfk4AAAQWSURBVEhLnVVbSFxXFL0zGRFCoBmF1o8GKzqjZZwa1H5USj5CAhZhKlJbFY0j1hgVn63ph7F1qthqmCYfEmnRWEURraC0ovGBoh92JJEqFN+jlakYH5D6qEa0ru597h0xSX1MFyzOPvt5zz773iudgHNElSyeCo2yuoQk4oeyeCKMxGJZdAGekvSIlgh5dyLefl2SphT5zDj/sVr9nNZweXsi9AmSBFr95O2r+ISYTfyGWEN8pFarx35QqaDVaid8fHxser3eZjAYbEajUTAwMNAWEBBg8/X1tXl5eY0+pAIatXqSY4k/Er8lck7OLf1dXFyMqakprKysYHd3F9Y7d/CrVovOzk6cBo5rvXAB1hs3ROzy8jImJiaQlZX1D+fmArPV1dWKu4yvoqLwOCIC7e3tiuZ4jI+Po+3KFXwZFqZoZJSXl3Pb7Fygu6ysTFEDe3t7uHXtGn6/dw+1tbU4ODgQZNjtdkGGU9/U1ISfb99GSWQkFhcXhY1RUFDABbq5wP3c3FxFDYyOjqKAAuxjY7BarcjPz9/nQpubmwgKChohPmG5rq4OOTk5e42Njehpa8PDBw/Q2tqqZAFSUlK4wH0uYI6OjlbUQFVVFerr67G6ugq6YHaK8fT0/D42NpblQGZcXBxYR/K7fn5+W8PDw+jt7UVJSYmSBQgPD2d/M1EyhIaGKmrAYrGgo6NDtIqmaZDsIUR+q78jvqaQZdYxumZmZkRMUVGRkgWgyXM+kKSmcXym6FFYWIiWlhYh+/v7V7DDEagVHkXe1tYW+vr6kJmZKeJ4mjQazTOyHfr+srS0JC4tOTkZXV1dwtFkMnWQzZ34DvE88X1iEPENIiNMp9NVsC/fXWJiomgty2Rrl11k5PX09GBhYQFmsxmDg4OiAF3in/QkX5A9mY5cSy3LJDnC29t7gFYP2g/FxMQI5+npaWRkZKC/vx81NTVc4DPiIYw8t/zkaWlpGBgYEAUaGhoQHBz8Gw3BYnNzM6Kioh7TvsVms4Hu7Y/4+Pi/SktLn7Pv5OQkTxwqKytFDsrJpz6EKjEhwVFBs5+dnX04btxbnoa1tTXs7++LoztfPn7rk5KSMD8/L/ZDQ0NIT08XQxISEuLgnHJqBQadrvLrmzcxOzsrEjnhcDgU6VUctfEbzcxKTcU5lapSSfsCrsddvaq4/398IM//dTnli9Bc9vB4aqE+8iXxpfNJuAXcjvX1dWxvb2NnZ0esGxsbQj83N4eRkRHROuvdu/C9dOkp55JTvoRkd3drt5sbP8GnxPeIJmI8MZXIn1+ejHzi58Qc4i0i2/nHlDdw8SLedHOzknws9GTlz+xZfpUvw2SRY/Xy9hjoJOknWqLlnUv4yCDHnoq3iJGy6BL41Bx7Jjg/ZK7gP2Ik6V89SVqJoK3vSAAAAABJRU5ErkJggg==';
  const werebeastImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuOWwzfk4AAALhSURBVEhLrVbNSmpRFPZJus9gZmGS4L9NIhQKSQdOhDBBEpUyCpLURkWpNFDIUMOgTBv1QD1Bw6J197c4+7D3Oda9cO+Cz3PO2mt962f/6fhJXC7XgkB5cXHxVTzfxPMDMN6hK8PGMP97cTqdvwTBUOBzbW2NMpkMHR4eUr1eZ+AdOozBBrbwMdx/FmG8I7J6j0Qi1Gg0aDqd0svLCz9rtRr1ej3+ljrYwBY+8DVo5otR8tfe3h49Pz/TcDhk0oeHByYSY+R2u+ns7MwMAsAWPvAFh0Gni5H519HRkemYTCaZdGtri6rVKr8Dy8vLdHt7qwUB4AsOWyXonxh4RxaqQzweZ8KlpSU6ODgwAwCoSLWVMCp51+YEk4Q+olQYNZtNarfb1Ol0yOPxcMatVosDgTyVSpm2VkAPLnAyuXBYEB+fMqPJZMJE6PXl5SWNRiO6ubmh2WzG391u10ZqBbjACW6eWCw3uVqAUCjEmW5ubrJ+f3+fvF4v6xAc+p8CwQec4EZ7XrGm5SAm7+TkhLa3t+n8/JxyuRwTWxGLxTRSK8AJblTwho0DJSKvrKxwz6+vrzmY7LsVgUDARqoCnMLuDRV8YHfKAWQOgkQiQaVSSSNVcXx8rBFaAU5w2wI8Pj5SoVCgcrlM6XTaRozqKpWKRjYPZgDhZLbICmwwlbhYLNLd3R2PjcdjbsPp6Sk9PT3ZfNUWaZOsQq0ArZN6udblWDQapcFgoPmqk2xbphJolSQJBoOmDTKWy1YCq036actU/GgbTcXV1ZVGsru7yxsOY/1+XwuSz+dNP22jQcSHdlRIgAzlSxJgfX2dW+fz+TT9xcUF+9iOCsh3hx2AKnBsqGRWbGxsmJXNPewgIqLtuJbA4be6umojBvx+v7myvj2upYhB7cJRg+DQQ5/D4TDvbkxiNpul+/t7tjUy//7CkWJUYrsy5wFjsDGW7J+vTCnoHyZJ4P9f+qqIrP7xb4vD8RsUqEDd6L8qtAAAAABJRU5ErkJggg==';
  const ghostImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuOWwzfk4AAAQtSURBVEhLnVZJbFtFGDa0tGUTEpCc4MoBiVy4RFwicai4NT3kgnqoglUoKgdEGgQCGagavL7YbhtVCOgiurhBsRtFarO0JS2tiVclQWlcN4uTponXeHfsPHuYb96MHbeAC7/06b03nv/7/u3Ns6qRaTSa7aZe/YejYyPjd5y3UxTZ8Vs3PGar1E1/e45v+39mNBpfdVwecCWTyUqpVCIbGxsUBVIsFkk+nyNXh6/co3ve4Nv/m3V0dGy7POS4tbm5SUqlIkWJX4tUQBHC/bXrYwGdTvcid3tyM5kNH6TTKRY5RGRZZhCCQgRZnTrzYw93e3K7efOGV5BRIUpcIuVymQnQkpFCIc/IC4UCcU7cTqFX3LWxabXal3x+Nw2+SOz2AdLc3EwMBgMTcDjspKmpieh0Wi6QJw8frshak7aVuze2o4ajby6GFkoow+HDXaSl5S3Svredlaj63L6HlQgC2WyGmK2mfdy9sWmNR94Jh9cqIHA675BDn3zMIkc/nE4ne0ZmIMc0oUxU4BB3b2ySpN+TSqHOykjKMnpRmyL0AdmBPJfLslIZJX03d29sdHMXCMWUQKQGZXpE9BDA2vE+q5a7NzbHoP00pgaOIBWRC5GtAqg/rsMjV0a4+78bJsjjdSUVUuUdgJgokcggn8+z6DOZNBtjl3si19PT8wqn+Wez9V/oByHqjqnBaOJevBNiNEGezaYJepVMJpjQuQtnh+j78DSnetzMx6SPYrFoWRBXKpWqADJA9GIsQZ5OK+SJRIysr8fJ6upK2XrC/PfNpqV5ze/3phEpCMvl2tGwtbGIfG1ttUoOYggAePb6PEW9Wd/CaWt29pfTJ0SUW5uqRKs0UkQeDN6rRv4oMpkUuWg7N8RpFdNc0uzAWY8Ia8ixqMPhVVZfpZlJWvN1MjnpJ7FYpI4Y+8S9z+8tGY1HXuf09OSk58jSckgW0QIgzOVyZG4uWG0kyoGrz+chDx4s1QlEo+HqWiQSJpLFeIDTo7mm92lzGREiBDB6iUSczMz8WVdnwONxUeH7dWtAIHCXxONRlqnO8P03nF6lOvlDnwTySGStSoYslpdDZHp6qo4kHo8Rt9tFZmdn6tYBCCALBEjH/SojN1lMbbOBu5tQhbMQQFPhMDU1WUeCTF2uCZbZ1nVgfv4+WViYYxyhpUXZYpHUKmOvrt0xOBCUzHqL2drbT6MuYwMygIDL/YcsosJ6NBohdJzpJAXI5JRfnpsPVkR/0HiLVRrTfPu11nbp/O8mk+4rlgW1pyi2t7a2vtz/q22afs2K9Hsc+vyLzwy739vd2ane/93xvmO/jY4NFygqF23nF7u6P/2p7d02tfpA55enzvw8fu36aGJwyL5y8KD6bcq1i2Ib533MsIjXHRvwGdxBAQf8RXme4gV+fZZiJ8UzFNiH/Y8cEyrVX3mEHgOFKQYMAAAAAElFTkSuQmCC';

  const styles = [
                        {
                            selector: 'node',
                            style: {
                                'shape': 'roundrectangle',
                                'width': 'label',
                                'height': 'label',
                                'content': 'data(label)',
                                'text-wrap': 'wrap',
                                'font-family': 'Helvetica',
                                'font-size': 16,
                                'text-valign': 'center',
                                'color': '#eee',
                                "padding-top": '6px'
                            },
                        },
                        {
                            selector: 'node.current',
                            style: {
                                'background-blacken': 0.1,
                                'border-width': '2px',
                                'border-style': 'dashed',
                                'border-color': 'orange'
                            },
                        },
                        {
                            selector: 'node.dead',
                            style: {
                                'background-opacity': 0.3,
                                'border-opacity': 0.3,
                            },
                        },
                        {
                            selector: 'node.male',
                            style: {
                                'background-color': 'blue',
                            },
                        },
                        {
                            selector: 'node.female',
                            style: {
                                'background-color': 'magenta',
                            },
                        },
                        {
                            selector: 'node.leader',
                            style: {
                                'shape': 'round-octagon',
                                'background-image': 'url(' + leaderImageData + ')',
                                'background-width': '24px',
                                'background-height': '24px',
                                'background-position-y': '2px',
                                'padding-left': '30px',
                            },
                        },
                        {
                            selector: 'node.necromancer',
                            style: {
                                'shape': 'round-hexagon',
                                'background-blacken': 0.1,
                                'background-image': 'url(' + necromancerImageData + ')',
                                'background-width': '24px',
                                'background-height': '24px',
                                'background-position-y': '2px',
                                'padding-left': '36px',
                            },
                        },
                        {
                            selector: 'node.vampire',
                            style: {
                                'shape': 'hexagon',
                                'background-blacken': 0.2,
                                'background-image': 'url(' + vampireImageData + ')',
                                'background-width': '24px',
                                'background-height': '24px',
                                'background-position-y': '2px',
                                'padding-left': '36px',
                            },
                        },
                        {
                            selector: 'node.werebeast',
                            style: {
                                'shape': 'hexagon',
                                'background-blacken': 0.1,
                                'background-image': 'url(' + werebeastImageData + ')',
                                'background-width': '24px',
                                'background-height': '24px',
                                'background-position-y': '2px',
                                'padding-left': '36px',
                            },
                        },
                        {
                            selector: 'node.ghost',
                            style: {
                                'shape': 'hexagon',
                                'background-blacken': -0.1,
                                'background-image': 'url(' + ghostImageData + ')',
                                'background-width': '24px',
                                'background-height': '24px',
                                'background-position-y': '2px',
                                'padding-left': '36px',
                            },
                        },
                        {
                            selector: 'edge',
                            style: {
                                'width': '2px',
                                'line-color': '#666',
                                'curve-style': 'straight'
                            },
                        },
                    ];
  const list = value => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
  const scalar = value => Array.isArray(value) ? scalar(value[0]) : value;
  const fold = value => String(scalar(value) ?? '').trim().toLowerCase().replace(/_/g, ' ');
  const numeric = value => {
    value = scalar(value);
    if(value === '' || value === null || value === undefined || typeof value === 'object') return null;
    const n=Number(value);return Number.isFinite(n) ? n : null;
  };
  const activeFlag = (record,keys) => keys.some(key=>record?.[key]!==undefined&&record[key]!==null&&record[key]!==false&&!['false','0'].includes(fold(record[key])));
  const pickId = (record,keys) => {for(const key of keys){const id=numeric(record?.[key]);if(id!==null&&id>=0)return id;}return null;};
  const cache = new WeakMap();
  function indexFor(world) {
    if(cache.has(world))return cache.get(world);
    const figures=list(world.figures),index=new Map(figures.map(r=>[Number(r.id),r])),entities=new Map(list(world.entities).map(r=>[Number(r.id),r]));
    const relations=new Map(),leaders=new Set();
    for(const figure of figures){
      const family=[];
      const add=(type,id)=>{if(id!==null&&['mother','father','child'].includes(type)&&!family.some(r=>r.type===type&&r.id===id))family.push({type,id});};
      for(const group of [figure.hf_link,figure.hfhf_link,figure.related_historical_figures,figure.relatedHistoricalFigures]){
        for(const link of list(group)){if(!link||typeof link!=='object')continue;add(fold(link.link_type??link.type),pickId(link,['hfid','hf_id','histfig_id','historical_figure_id','target']));}
      }
      add('mother',pickId(figure,['mother_id']));add('father',pickId(figure,['father_id']));
      relations.set(Number(figure.id),family);
      if(activeFlag(figure,['is_main_civ_leader','isMainCivLeader']))leaders.add(Number(figure.id));
      for(const group of [figure.entity_position_link,figure.entity_former_position_link,figure.positions,figure.entity_link])for(const link of list(group)){
        const entity=entities.get(pickId(link,['entity_id','entity','target']));
        if(entity&&fold(entity.type)==='civilization'&&numeric(link?.position_id)===0)leaders.add(Number(figure.id));
      }
    }
    for(const entity of entities.values())if(fold(entity.type)==='civilization')for(const assignment of list(entity.entity_position_assignment))if(numeric(assignment.position_id)===0&&numeric(assignment.histfig??assignment.hfid)!==null)leaders.add(Number(assignment.histfig??assignment.hfid));
    let lastYear=numeric(world.year??world.current_year);
    for(const event of list(world.events)){
      const year=numeric(event.year);if(year!==null)lastYear=lastYear===null?year:Math.max(lastYear,year);
      if(fold(event.type)!=='add hf entity link'||fold(event.link_type??event.link)!=='position'||numeric(event.position_id)!==0)continue;
      const entity=entities.get(pickId(event,['civ_id','civ'])),hf=pickId(event,['hfid','histfig']);
      if(entity&&fold(entity.type)==='civilization'&&hf!==null)leaders.add(hf);
    }
    const result={figures:index,entities,relations,leaders,lastYear};cache.set(world,result);return result;
  }
  function dataFor(figure,world,options={}) {
    if(!figure||!world)return{nodes:[],edges:[],hasFamily:false};
    const index=indexFor(world),originalId=Number(figure.id),nodes=new Map(),edges=new Map();
    const term=(value,scope)=>String(options.term?.(value,scope)??global.DFTranslate?.term?.(value,scope)??value);
    const name=record=>String(options.name?.(record,'figures')??record.name??record.translated_name??'#'+record.id);
    const labelFor=record=>{
      const classes=[];if(Number(record.id)===originalId)classes.push('current');
      let label='',description='';
      if(record.race&&figure.race&&fold(record.race)!==fold(figure.race))label=term(scalar(record.race),'creature')+' \n────────────\n';
      const interactions=list(record.active_interaction??record.active_interactions).filter(value=>typeof value==='string');
      const vampire=activeFlag(record,['is_vampire','vampire'])||interactions.some(value=>value.includes('VAMPIRE')||value.includes('DEITY_MAJOR_CURSE'));
      const werebeast=activeFlag(record,['is_werebeast','werebeast'])||interactions.some(value=>value.includes('WEREBEAST'));
      const necromancer=activeFlag(record,['is_necromancer','necromancer'])||interactions.some(value=>value.includes('SECRET')&&!value.includes('ANIMATE')&&!value.includes('UNDEAD_RES'));
      for(const [present,type,text]of[[vampire,'vampire','吸血鬼'],[werebeast,'werebeast','兽化人'],[necromancer,'necromancer','死灵法师'],[activeFlag(record,['ghost','is_ghost']),'ghost','幽灵']])if(present){description+='\n'+text+'\n';classes.push(type);}
      if(index.leaders.has(Number(record.id)))classes.push('leader');
      if(fold(record.caste)==='male')classes.push('male');else if(fold(record.caste)==='female')classes.push('female');
      const positions=list(record.positions).concat(list(record.entity_position_link),list(record.entity_former_position_link)).slice().sort((a,b)=>(numeric(a.start_year??a.startYear)??-1)-(numeric(b.start_year??b.startYear)??-1)),lastPosition=positions.at(-1),positionEntity=index.entities.get(pickId(lastPosition,['entity_id','entity','target'])),definition=list(positionEntity?.entity_position).find(position=>numeric(position.id)===numeric(lastPosition?.position_id));
      const title=lastPosition?.title||(fold(record.caste)==='female'?definition?.name_female:fold(record.caste)==='male'?definition?.name_male:null)||definition?.name;
      const assignment=scalar(record.last_assignment??record.lastAssignment??title??record.profession??record.associated_type);
      let skill=scalar(record.highest_skill??record.highestSkill);
      if(!skill){const highest=list(record.hf_skill).filter(value=>numeric(value.total_ip)!==null).sort((a,b)=>Number(b.total_ip)-Number(a.total_ip))[0];if(highest){const translated=global.DFTranslate?.skill?.(highest.skill,highest.total_ip);skill=translated?[translated.rank,translated.name].filter(Boolean).join(' '):term(highest.skill,'skill');}}
      if(assignment&&fold(assignment)!=='standard'&&assignment!==label&&!(skill&&String(skill).includes(assignment))){if(description)description+='\n';description+=term(assignment,'profession');}
      if(skill){if(description)description+='\n──────── ✶ ────────\n\n';description+=term(skill,'skill');}
      if(description)description+='\n────────────\n';
      label+=description+name(record);
      const birth=numeric(record.birth_year),death=numeric(record.death_year),dead=death!==null&&death!==-1;
      if(dead)classes.push('dead');
      const end=dead?death:index.lastYear;
      if(birth!==null&&birth!==-1&&end!==null&&end-birth>=0)label+=dead?'\n\n(年龄：'+(end-birth)+'✝)':'\n\n年龄：'+(end-birth);
      return {data:{id:String(record.id),label,href:'/hf/'+record.id,figureId:Number(record.id)},classes:classes.join(' ')};
    };
    const addNode=record=>{if(record&&!nodes.has(Number(record.id)))nodes.set(Number(record.id),labelFor(record));};
    const addEdge=(source,target)=>{if(source===target)return;const id=source+'-'+target;if(!edges.has(id))edges.set(id,{data:{id:'family-'+id,source:String(source),target:String(target)}});};
    addNode(figure);
    const parents=(current,motherDepth,fatherDepth,path)=>{
      const id=Number(current.id);if(path.has(id))return;const nextPath=new Set(path);nextPath.add(id);
      const relations=index.relations.get(id)||[];
      for(const type of ['mother','father'])for(const relation of relations.filter(r=>r.type===type)){
        const parent=index.figures.get(relation.id);if(!parent)continue;addNode(parent);addEdge(relation.id,id);
        const mothers=motherDepth+(type==='mother'?1:0),fathers=fatherDepth+(type==='father'?1:0);
        if(type==='mother'?mothers<3:fathers<3)parents(parent,mothers,fathers,nextPath);
      }
    };
    parents(figure,0,0,new Set());
    for(const relation of index.relations.get(originalId)||[])if(relation.type==='child'){
      const child=index.figures.get(relation.id);if(child){addNode(child);addEdge(originalId,relation.id);}
    }
    return{nodes:[...nodes.values()],edges:[...edges.values()],hasFamily:(index.relations.get(originalId)||[]).some(r=>['mother','father','child'].includes(r.type))};
  }
  let registered=false;
  function mount(container,figure,world,options={}) {
    if(!container)throw new Error('Family tree container is required');
    if(typeof global.cytoscape!=='function'||!global.dagre||!global.cytoscapeDagre)throw new Error('Family tree libraries are unavailable');
    if(!registered){global.cytoscape.use(global.cytoscapeDagre);registered=true;}
    container.__legendsFamily?.destroy();
    const data=dataFor(figure,world,options);
    if(!container.style.height&&!container.clientHeight)container.style.height=options.fullscreen?'720px':'360px';
    const cy=global.cytoscape({container,zoom:1,wheelSensitivity:0.1,elements:{nodes:data.nodes,edges:data.edges},style:styles,layout:{name:'dagre',fit:false}});
    cy.zoom(1);cy.center();
    const tap=event=>{const id=event.target.data('figureId');if(Number.isFinite(id))options.onSelect?.('figures',id);};
    const over=()=>{container.style.cursor='pointer';},out=()=>{container.style.cursor='';};
    cy.on('tap','node',tap);cy.on('mouseover','node',over);cy.on('mouseout','node',out);
    let frame=0,destroyed=false;
    const recenter=()=>{if(destroyed)return;global.cancelAnimationFrame(frame);frame=global.requestAnimationFrame(()=>{if(!destroyed){cy.resize();cy.center();}});};
    const observer=global.ResizeObserver?new ResizeObserver(recenter):null;observer?.observe(container);
    const instance={cy,data,destroy(){if(destroyed)return;destroyed=true;global.cancelAnimationFrame(frame);observer?.disconnect();cy.destroy();container.style.cursor='';if(container.__legendsFamily===instance)delete container.__legendsFamily;}};
    container.__legendsFamily=instance;
    return instance;
  }
  global.LegendsFamily=Object.freeze({mount,dataFor,hasFamily:(figure,world)=>dataFor(figure,world).hasFamily,styles});
})(window);
