/* DFCN's typed Legends item-caption parser. No proper-name fallback. */
(function(global){
  'use strict';
  const data=global.DFCN_ITEMS,cache=new Map(),indexes=new Map(),woodAliases=new Map();
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const trim=value=>String(value).replace(/^[ \t\r\n]+|[ \t\r\n]+$/g,''),fold=value=>String(value).replace(/[A-Z]/g,c=>c.toLowerCase());
  const completeTarget=value=>typeof value==='string'&&value.length>0&&!/[A-Za-z\r\n]/.test(value)&&!value.includes('[C:');
  const equipmentFamilies=['armor','helm','gloves','shoes','pants','shield','weapon','ammo','trapcomp'];
  const furnitureFamilies=['altar','bed','chair','table','cabinet','coffin','box','bookcase','statue','door','floodgate','hatch_cover','grate','armorstand','weaponrack','pedestal','anvil','animaltrap'];
  class ItemWorkBudgetError extends Error {}
  let namesReady=!global.DFTranslate?.ready;
  const ready=Promise.resolve(global.DFTranslate?.ready).then(()=>{namesReady=true;cache.clear();return true;});

  function initialize(){
    if(indexes.size||!data)return;
    for(const [namespace,rules]of Object.entries(data.grammar)){
      const unrestricted=[],literal=new Map();
      rules.forEach((rule,order)=>{const first=rule[0][0],entry={rule,order};if(!first||first[0]||!first[1])unrestricted.push(entry);else{const key=fold(first[1][0]);if(!literal.has(key))literal.set(key,[]);literal.get(key).push(entry);}});
      indexes.set(namespace,{unrestricted,literal});
    }
    for(const canonical of data.native.woods){
      let singular=canonical;
      if(canonical.endsWith(' wood')){singular=canonical.slice(0,-5);if(singular!=='date palm')singular+=' tree';}
      else singular=({oaken:'oak',birchen:'birch',ashen:'ash','saguaro rib':'saguaro'})[canonical]||canonical;
      let plural=singular;if(singular!=='blood thorn')plural=/[^aeiou]y$/.test(singular)?singular.slice(0,-1)+'ies':/(?:s|x|z|ch|sh)$/.test(singular)?singular+'es':singular+'s';
      for(const alias of [canonical,singular,plural])if(!woodAliases.has(alias))woodAliases.set(alias,canonical);
    }
  }
  function splitDesignation(value){
    let item=trim(value),prefix='',suffix='';
    for(;;){const marker=data.markers.find(([left,right])=>item.length>left.length+right.length&&item.startsWith(left)&&item.endsWith(right));if(!marker)return{item,prefix,suffix};item=trim(item.slice(marker[0].length,-marker[1].length));prefix+=marker[2];suffix=marker[3]+suffix;}
  }
  function boundaries(text){const result=[0];for(let at=0;at<text.length;at++)if(text[at]===' ')result.push(at);result.push(text.length);return result;}
  function compact(rows){
    const byEnd=new Map();for(const row of rows){const key=row.end+':'+Boolean(row.material),old=byEnd.get(key);if(!old)byEnd.set(key,{first:row,best:row});else if(row.weight<old.best.weight)old.best=row;}
    const result=[];for(const {first,best}of byEnd.values()){result.push(first);if(best!==first)result.push(best);}return result;
  }
  function work(){return{memo:new Map(),active:new Set(),materials:new Map(),creatures:new Map(),steps:0};}
  function step(state){if(++state.steps>150000)throw new ItemWorkBudgetError('item grammar work budget');}
  function prefix(namespace,text,state){
    step(state);const key=namespace+'\0'+text;if(state.memo.has(key))return state.memo.get(key);if(state.active.has(key))return[];state.active.add(key);
    let result=[];
    try{
      if(namespace==='#digits'){const match=text.match(/^\d+/);return match?[{end:match[0].length,value:match[0],weight:1,material:false}]:[];}
      if(namespace==='::text::native_item_name')return[];
      if(namespace==='::materials::item_qualifier'){
        for(const end of boundaries(text).slice(1)){const value=materialQualifier(text.slice(0,end),state);if(value)result.push({end,value,weight:1,material:true});}
      }else if(namespace==='::items::storage_container'||namespace==='::text::material'){
        for(const end of boundaries(text).slice(1)){const value=namespace==='::text::material'?materialNoun(text.slice(0,end),state):storageContainer(text.slice(0,end),state);if(value)result.push({end,value,weight:1,material:namespace==='::text::material'});}
      }else if(namespace.startsWith('%item_designation:')){
        const first=namespace.indexOf(':'),second=namespace.indexOf(':',first+1),base=namespace.slice(first+1,second),config=namespace.slice(second+1),inner=config.startsWith('::')?config:'::'+base+(config?'::'+config:''),ends=new Set();
        for(const [left,right]of data.markers)if(text.startsWith(left))for(let at=text.indexOf(right,left.length+1);at>=0;at=text.indexOf(right,at+1))ends.add(at+right.length);
        if(!ends.size)return prefix(inner,text,state);
        for(const end of [...ends].sort((a,b)=>a-b)){const designated=splitDesignation(text.slice(0,end));if(!designated.prefix)continue;const value=resolve(inner,designated.item,state);if(value)result.push({end,value:designated.prefix+value+designated.suffix,weight:2,material:false});}
      }
      const index=indexes.get(namespace);if(index){
        const candidates=[...index.unrestricted,...(index.literal.get(fold(text[0]||''))||[])].sort((a,b)=>a.order-b.order);
        for(const {rule:[original,target]}of candidates){
          step(state);let paths=[{end:0,bindings:new Map(),weight:0,material:false}];
          for(let at=0;at<original.length&&paths.length;at++){
            const [reference,value]=original[at],next=[];
            for(const path of paths){const remaining=text.slice(path.end);
              if(!reference){if(fold(remaining.slice(0,value.length))===fold(value))next.push({...path,end:path.end+value.length});continue;}
              if(value.startsWith('@')){const following=original[at+1],end=following&&!following[0]?fold(remaining).indexOf(fold(following[1])):remaining.length;if(end<0)continue;const bindings=new Map(path.bindings);bindings.set(value,remaining.slice(0,end));next.push({...path,end:path.end+end,bindings});continue;}
              for(const child of prefix(value,remaining,state)){const bindings=new Map(path.bindings);bindings.set(value,child.value);next.push({end:path.end+child.end,bindings,weight:path.weight+child.weight,material:path.material||child.material});}
            }
            paths=compact(next);
          }
          for(const path of paths){let value='';for(const [reference,token]of target)value+=reference?(path.bindings.get(token)||''):token;result.push({end:path.end,value,weight:path.weight+(path.end?1:0),material:path.material||Boolean(path.end&&namespace.startsWith('::materials'))});}
        }
      }
      result=compact(result);state.memo.set(key,result);return result;
    }finally{state.active.delete(key);}
  }
  function resolve(namespace,text,state){
    let best;for(const row of prefix(namespace,text,state))if(row.end===text.length&&row.value&&(!best||row.weight<best.weight))best=row;
    return best?.value;
  }
  function literal(source){return data.literals[source]??data.literals[fold(source)];}
  function materialNoun(raw,state){const source=fold(trim(raw));return data.magicalMaterials[source]?.noun||resolve('::materials',source,state);}
  function materialQualifier(raw,state){
    const source=fold(trim(raw));if(state.materials.has(source))return state.materials.get(source);
    // A recursive callback cannot claim its own still-unresolved material.
    state.materials.set(source,null);let value=null;
    if(own(data.magicalMaterials,source))value=data.magicalMaterials[source].qualifier;
    else if(woodAliases.has(source)){
      const canonical=woodAliases.get(source);value=resolve('::materials::finished_adjective',canonical,state)||resolve('::materials::state::adjective',canonical,state);
      if(value){if(canonical==='mangrove')value='红树木';else if(canonical==='goblin-cap')value='哥布林菇木';else if(/(?:木质|木制|木头)$/.test(value))value=value.slice(0,-2)+'木';else if(value.endsWith('树'))value=value.slice(0,-1)+'木';else if(!value.endsWith('木'))value+='木';}
    }else{
      value=resolve('::materials::woven_plant',source,state)||resolve('::materials::finished_adjective',source,state);
      if(!value){const ore=data.native.ores.find(row=>row[0]===source);if(ore)value=ore[2];}
      if(!value){const noun=resolve('::materials',source,state),adjective=resolve('::materials::adjective',source,state);if(noun||adjective){value=literal(source)||noun||adjective;if(value.endsWith('骨头'))value=value.slice(0,-2)+'骨';if(value.endsWith('牙齿'))value=value.slice(0,-2)+'牙';if(value.endsWith('矿'))value+='石';}}
    }
    if(!completeTarget(value))value=null;state.materials.set(source,value);return value;
  }
  function modifiers(source,state){let value='';for(const word of trim(source).split(' ').filter(Boolean)){const part=resolve('::items::prefix::equipment_modifier',word,state);if(!part)return null;value+=part;}return value;}
  function equipmentType(source,state,wearable=false){
    for(const family of equipmentFamilies){if(wearable&&['weapon','ammo','trapcomp'].includes(family))continue;for(const form of ['default','singular','plural']){const value=resolve('::items::'+family+'::'+form+'::main',source,state);if(value)return value;}}
    return null;
  }
  function equipmentFields(source,state,wearable=false){
    source=trim(source);const words=source.split(' ');for(let begin=0;begin<words.length;begin++){const before=modifiers(words.slice(0,begin).join(' '),state);if(before===null)continue;for(let end=words.length;end>begin;end--){const noun=equipmentType(words.slice(begin,end).join(' '),state,wearable);if(!noun)continue;const after=modifiers(words.slice(end).join(' '),state);if(after!==null)return before+after+noun;}}
    for(const family of equipmentFamilies.slice(0,6))for(const row of prefix('::items::'+family,source,state))if(row.end===source.length&&!row.material&&completeTarget(row.value))return row.value;
    return null;
  }
  function findNoun(source,table){let found;for(const [noun,target]of table){let at=source.indexOf(noun);while(at>=0){const end=at+noun.length;if((!at||source[at-1]===' ')&&(end===source.length||source[end]===' ')&&(!found||noun.length>found.noun.length))found={at,noun,target};at=source.indexOf(noun,at+1);}}return found;}
  function nativeWordLanguages(source){const word=fold(source);let languages=data.nativeLanguageMasks[word]||0;for(let at=1;at<word.length;at++)languages|=(data.nativeLanguageMasks[word.slice(0,at)]||0)&(data.nativeLanguageMasks[word.slice(at)]||0);return languages;}
  function englishNameWord(source){
    const word=fold(source),meanings=global.DFCN_DATA?.proceduralMeanings||{};if(own(meanings,word))return true;
    for(let at=2;at+2<=word.length;at++){const front=meanings[word.slice(0,at)]||[],rear=meanings[word.slice(at)]||[];if(front.some(a=>rear.some(b=>(Number(a[3])&(1|4|16|32))&&(Number(b[3])&(2|8|32)))))return true;}return false;
  }
  function generatedOwner(source,definite){let common=255,count=0,semantic=true;for(const word of source.split(' ').filter(Boolean)){const connector=count>0&&['of','the','and','in','with','a','an','for','to','from'].includes(fold(word));count++;if(definite&&connector)continue;common&=nativeWordLanguages(word);semantic=semantic&&englishNameWord(word);}return count>0&&(common!==0||semantic&&(definite||count===1));}
  function creatureDescriptor(raw,state){
    if((state.creatureDepth||0)>16)return null;state.creatureDepth=(state.creatureDepth||0)+1;
    try{return creatureDescriptorInner(raw,state);}finally{state.creatureDepth--;}
  }
  function creatureDescriptorInner(raw,state){
    const source=trim(raw).replace(/ +/g,' '),key=fold(source);step(state);if(state.creatures.has(key))return state.creatures.get(key);state.creatures.set(key,null);
    const tables=data.creatures,lookup=(scope,text)=>tables[scope]?.[fold(text)],staticSpecies=text=>{const value=resolve('::creatures::name',fold(text),state);return value?(literal(text)||value):null;},kind=text=>lookup('kind',text)||lookup('kind_adjective',text),speciesAdjective=text=>staticSpecies(text)||lookup('kind_adjective',text)||lookup('race_adjective',text);
    const finish=value=>{state.creatures.set(key,value||null);return value||null;};
    for(const training of ['war ','hunting '])if(key.startsWith(training)){const purpose=resolve('::creatures::caste::name::purpose',training,state),animal=creatureDescriptor(source.slice(training.length),state);return finish(purpose&&animal?purpose+animal:null);}
    let remaining=source,status='',statusCount=0;for(;;){let match;for(const [prefix,target]of Object.entries(tables.status_prefix||{}))if(fold(remaining).startsWith(prefix+' ')&&(!match||prefix.length>match[0].length))match=[prefix,target];if(!match)break;if(++statusCount>16)return finish(null);status+=match[1];remaining=remaining.slice(match[0].length+1);}
    if(statusCount){const known=staticSpecies(source),base=known||creatureDescriptor(remaining,state);return finish(known||base&&status+base);}
    if(!/^[A-Za-z0-9\u0080-\u024f '-]+$/.test(source))return finish(staticSpecies(source));
    const modifier=(rawValue,owner=false)=>{
      let value=trim(rawValue).replace(/^of /i,''),definite=/^the /i.test(value);if(definite)value=value.slice(4);if(!value)return null;
      for(const scope of ['modifier','sphere_modifier']){const target=lookup(scope,value);if(target)return target;}
      const known=staticSpecies(value)||lookup('profile',value)||data.magicalMaterials[fold(value)]?.noun||resolve('::materials::state',fold(value),state)||resolve('::color::name',fold(value),state)||global.DFCN_UI?.domains?.sphere?.[fold(value)]||global.DFCN_DATA?.proceduralTerms?.[fold(value)];if(known)return known;
      if(owner&&namesReady&&generatedOwner(value,definite)&&global.DFTranslate){const title=(definite?'The ':'')+value.split(' ').map((word,index)=>index&&['of','the','and','in','with','a','an','for','to','from'].includes(fold(word))?fold(word):word[0].toUpperCase()+word.slice(1)).join(' '),target=global.DFTranslate.name(title,{kind:'figure',nativeName:true});if(completeTarget(target))return target;}
      return null;
    };
    for(const [size,target]of Object.entries(tables.size_prefix||{}))if(key.startsWith(size+' ')){const base=creatureDescriptor(source.slice(size.length+1),state);if(base)return finish(target+base);}
    const whole=kind(source)||lookup('race_adjective',source)||staticSpecies(source);if(whole)return finish(whole);
    const words=source.split(' ');
    for(let at=0;at+1<words.length;at++){const purpose=resolve('::creatures::caste::name::purpose',words[at]+' ',state);if(!purpose)continue;const animal=staticSpecies(words.slice(at+1).join(' '));if(!animal)continue;if(!at)return finish(purpose+animal);const flavor=modifier(words.slice(0,at).join(' '));if(flavor)return finish(flavor+purpose+animal);}
    const profile=lookup('profile',source);if(profile)return finish(profile);
    for(const [role,target]of Object.entries(tables.role||{})){const suffix=' '+role,prefix=role+' ';let adjective;if(key.endsWith(suffix))adjective=lookup('mythical_prefix',key.slice(0,-suffix.length));else if(key.startsWith(prefix))adjective=lookup('mythical_suffix',key.slice(prefix.length));if(adjective)return finish(adjective+target);}
    for(let at=source.length-1;at>0;at--){if(source[at-1]===' '||source[at]===' ')continue;const title=lookup('display_name',source.slice(at));if(title){const race=speciesAdjective(source.slice(0,at));if(race)return finish(race+title);}}
    if(key.startsWith('were')){
      const stem=key.slice(4);let animal=lookup('were_species',stem)||lookup('were_plural',stem);
      const abbreviated=value=>{if(!value||value.includes(' '))return null;let target;for(const [name,translated]of Object.entries(tables.were_species||{}))if(name.startsWith(value+' ')){if(target&&target!==translated)return null;target=translated;}return target;};
      animal=animal||abbreviated(stem)||(stem.endsWith('s')?abbreviated(stem.slice(0,-1)):null);const prefix=lookup('form_prefix','were');if(animal&&prefix)return finish(prefix+animal);
    }
    for(const [spouse,target]of Object.entries(tables.spouse||{})){const prefix=spouse+' of the ',suffix=' '+spouse;let owner;if(key.startsWith(prefix))owner=creatureDescriptor(source.slice(prefix.length),state);else if(key.endsWith(suffix))owner=creatureDescriptor(source.slice(0,-suffix.length),state);if(owner)return finish(owner+'的'+target);}
    for(let at=words.length-1;at>0;at--){const before=words.slice(0,at).join(' ');if(lookup('modifier',before)||lookup('sphere_modifier',before))continue;const race=speciesAdjective(before);if(!race)continue;const status=creatureDescriptor(words.slice(at).join(' '),state);if(status)return finish(race+status);}
    const of=key.indexOf(' of ');if(of>=0){const head=creatureDescriptor(source.slice(0,of),state),owner=head&&modifier(source.slice(of+4),true);if(head&&owner)return finish(owner+'之'+head);}
    const possessive=key.lastIndexOf("'s ");if(possessive>=0){const head=creatureDescriptor(source.slice(possessive+3),state),owner=head&&modifier(source.slice(0,possessive),true);if(head&&owner)return finish(owner+'之'+head);}
    for(let at=1;at<words.length;at++){const title=lookup('display_name',words.slice(at).join(' '));if(!title)continue;const race=creatureDescriptor(words.slice(0,at).join(' '),state);if(race)return finish(race+title);}
    for(let at=1;at<words.length;at++){const head=kind(words.slice(at).join(' '));if(!head)continue;const flavor=modifier(words.slice(0,at).join(' '));if(flavor)return finish(flavor+head);}
    return finish(null);
  }
  function species(source,state){source=trim(source).replace(/^(?:of|from) /,'').replace(/'s$/,'');return creatureDescriptor(source,state);}
  function writingMaterial(source,state){
    if(source==='parchment')return '兽皮纸';if(source.endsWith(' parchment')){const creature=species(source.slice(0,-10),state);return creature?creature+'皮纸':null;}
    if(source==='paper')return literal('Writing material: paper');
    const plant=source.replace(/ (?:paper|pulp)$/,'');if(source!==plant){const name=resolve('::plants::name::singular',plant,state);if(name)return name+(literal('Writing material: paper')||'纸');}
    return materialQualifier(source,state);
  }
  function writtenItem(source,state){
    for(const [pattern,target]of data.written){
      const parts=pattern.split(/(\{s\})/),captures=[];
      const match=(at,offset)=>{
        step(state);if(at===parts.length)return offset===source.length;
        const part=parts[at];if(part!=='{s}')return fold(source.slice(offset,offset+part.length))===fold(part)&&match(at+1,offset+part.length);
        const following=parts[at+1]||'',ends=[];if(following){for(let end=fold(source).indexOf(fold(following),offset);end>=0;end=fold(source).indexOf(fold(following),end+1))ends.push(end);}else ends.push(source.length);
        for(const end of ends){if(end<=offset)continue;const captured=trim(source.slice(offset,end));if(captured.length>=source.length)continue;const value=literal(captured)||data.magicalMaterials[fold(captured)]?.noun||creatureDescriptor(captured,state)||materialNoun(captured,state)||parse(captured,state);if(!completeTarget(value))continue;captures.push(value);if(match(at+1,end))return true;captures.pop();}return false;
      };
      if(match(0,0)){let occurrence=0;return target.replace(/\{s(\d*)\}/g,(_,index)=>captures[index?Number(index)-1:occurrence++]||'');}
    }return null;
  }
  function storageContainer(raw,state){
    const source=trim(raw),folded=fold(source),nouns=['barrel','bag','bin','pot','waterskin','flask','vial','bucket','goblet','cup','mug','jug','pouch'];let found;
    for(const noun of nouns){const at=folded.lastIndexOf(noun);if(at<0||at&&folded[at-1]!==' ')continue;let end=at+noun.length;if(noun==='pouch'&&folded.slice(end,end+2)==='es')end+=2;else if(folded[end]==='s')end++;if(end<folded.length&&folded[end]!==' ')continue;if(!found||at>found.at)found={at,end,noun};}
    if(!found)return null;
    const {at,end,noun}=found,before=trim(source.slice(0,at)),after=trim(source.slice(end)),bag=noun==='bag',portable=['waterskin','flask','vial','bucket','goblet','cup','mug','jug','pouch'].includes(noun),scope=({waterskin:'flask',vial:'flask',cup:'goblet',mug:'goblet',pouch:'tool'})[noun]||noun;
    if((bag||portable)&&!before&&!after)return null;
    let material='',contents='',size='',materialTarget=null,contentsTarget=null;
    if(after){if(after.length<=2||after[0]!=='('||after.at(-1)!==')')return null;material=trim(after.slice(1,-1));if(!material||/[()]/.test(material))return null;if(noun==='pot'&&material.includes(',')){const comma=material.lastIndexOf(',');size=resolve('::items::pot::^size',trim(material.slice(comma+1))+' ',state);if(!size)return null;material=trim(material.slice(0,comma));if(!material)return null;}contents=before;}
    else if(before){materialTarget=materialQualifier(before,state);if(materialTarget){if(bag||portable)return null;material=before;}else{contentsTarget=resolve('::items::storage_contents',fold(before),state);if(!contentsTarget)return null;contents=before;}}
    const nounSource=folded.slice(at,end);let name;
    if(bag){const phrase=material?material+' '+nounSource:nounSource;name=typed(fold(phrase),state)||resolve('::items::bag',fold(phrase),state);if(!completeTarget(name))return null;}
    else{const target=literal(nounSource)||resolve('::items::'+scope+'::main',nounSource,state);if(!completeTarget(target))return null;if(material){materialTarget=materialTarget||materialQualifier(material,state);if(!materialTarget)return null;}name=size+(materialTarget||'')+target;}
    if(contents){contentsTarget=contentsTarget||resolve('::items::storage_contents',fold(contents),state)||literal(contents);const packing=literal('Storage container packing: '+noun);if(!completeTarget(contentsTarget)||!completeTarget(packing))return null;name=packing+contentsTarget+'('+name+')';}
    return name;
  }
  function trapComponent(raw,state){
    const words=fold(trim(raw)).split(' ').map(word=>word.replace(/,/g,'')),claimed=new Set(),claim=(single,plural)=>{const at=words.findIndex((word,index)=>!claimed.has(index)&&(word===single||word===plural));if(at<0)return null;claimed.add(at);return at;};let specification,noun;
    const blade=claim('blade','blades');if(blade!==null){if(claim('axe')===null||claim('giant')===null)return null;specification='giant';noun=words[blade]==='blades'?'axe blades':'axe blade';}
    else for(const [single,plural,required,prefix]of [['corkscrew','corkscrews',['enormous'],'enormous'],['ball','balls',['spiked'],'spiked'],['disc','discs',['large','serrated'],'large, serrated'],['spike','spikes',['menacing'],'menacing']]){const at=claim(single,plural);if(at===null)continue;if(required.some(word=>claim(word)===null))return null;specification=prefix;noun=words[at];break;}
    if(!noun)return null;const material=words.filter((_,index)=>!claimed.has(index)).join(' ');if(!material)return null;
    const component=resolve('::items::trapcomp',specification+' '+noun,state),qualifier=materialQualifier(material,state);return component&&qualifier?qualifier+component:null;
  }
  function typed(source,state){
    if(own(data.magicalMaterials,source))return data.magicalMaterials[source].noun;
    const wool=findNoun(source,data.native.woolItems);if(wool){const rest=trim(source.slice(0,wool.at)+' '+source.slice(wool.at+wool.noun.length)),match=rest.match(/^(?:(.+) wool|wool (.+))$/);if(match){const creature=species(match[1]||match[2],state);if(creature)return creature+wool.target;}}
    for(const [family,table]of [['crafts',data.native.crafts],['weapons',data.native.weapons],['tools',data.native.tools]]){
      const item=findNoun(source,table);if(!item)continue;const rest=trim(source.slice(0,item.at)+' '+source.slice(item.at+item.noun.length)).replace(/ +/g,' ');if(!rest||findNoun(rest,table))continue;
      const material=family==='tools'&&['scroll','scrolls','quire','quires'].includes(item.noun)?writingMaterial(rest,state):materialQualifier(rest,state);if(material)return material+(family==='weapons'?item.target:literal(item.noun)||item.target);
    }
    const words=source.split(' ');
    for(let split=words.length-1;split>0;split--){const noun=words.slice(split).join(' ');for(const family of furnitureFamilies){const item=resolve('::items::'+family+'::main',noun,state);if(!item)continue;const material=materialQualifier(words.slice(0,split).join(' '),state);if(material)return material+(literal(noun)||item);}}
    // Native equipment columns can put modifiers and nouns on either side of
    // the complete material. Match that field, then emit material + modifiers + noun.
    for(let begin=0;begin<words.length;begin++)for(let end=words.length;end>begin;end--){if(begin===0&&end===words.length)continue;const fields=[...words.slice(0,begin),...words.slice(end)].join(' '),item=equipmentFields(fields,state);if(!item)continue;const material=materialQualifier(words.slice(begin,end).join(' '),state);if(material)return material+item;}
    return equipmentFields(source,state);
  }
  function piece(source,state){
    if(own(data.magicalMaterials,source))return data.magicalMaterials[source].qualifier;
    let value=literal(source);if(value===undefined)for(const namespace of ['::items','::materials','::plants','::creatures::name']){value=resolve(namespace,source,state);if(value)break;}
    return completeTarget(value)?value:null;
  }
  function segmented(source,state){
    const whole=piece(source,state);if(whole)return whole;
    const words=source.split(' ').filter(Boolean),best=new Array(words.length+1);best[words.length]={pieces:0,score:0,value:''};
    for(let begin=words.length-1;begin>=0;begin--)for(let end=words.length;end>begin;end--){if(begin===0&&end===words.length||!best[end])continue;const value=piece(words.slice(begin,end).join(' '),state);if(!value)continue;const pieces=best[end].pieces+1,score=best[end].score+(end-begin)**2,old=best[begin];if(old&&(old.pieces<pieces||old.pieces===pieces&&old.score>=score))continue;best[begin]={pieces,score,value:value+best[end].value};}
    return best[0]?.value;
  }
  function parse(raw,state){
    step(state);let source=trim(raw).replace(/^(?:a|an|the) /i,'');if(!source)return null;
    const designated=splitDesignation(source);if(designated.prefix){const value=parse(designated.item,state);return value?designated.prefix+value+designated.suffix:null;}
    const count=source.match(/ (?:\[\d+\]|\(%\d+\)|\(\d+%\)|<#\d+>|x\d+)$/);if(count){const value=parse(source.slice(0,-count[0].length),state);return value?value+count[0]:null;}
    const sex=source.match(/, ([\x0b\x0c♂♀])$/);if(sex){const creature=species(fold(source.slice(0,-sex[0].length)),state);return creature?creature+(['\x0b','♂'].includes(sex[1])?'（♂）':'（♀）'):null;}
    if(/^large, serrated /i.test(source))return trapComponent(source,state);
    if(/[()]/.test(source))return storageContainer(source,state);
    if(/[.,;:!?"]/.test(source))return null;
    source=fold(source);return storageContainer(source,state)||writtenItem(source,state)||typed(source,state)||segmented(source,state);
  }
  function explain(value){
    const source=String(value??'');if(cache.has(source))return cache.get(source);initialize();let translated=null,reason='unknown';
    if(data&&source.length<=2048){try{translated=parse(source,work());if(translated)reason='dfcn-item';}catch(error){if(!(error instanceof ItemWorkBudgetError))throw error;reason='work-budget';}}
    const result=Object.freeze({source,text:translated||source,known:Boolean(translated),method:reason});if(namesReady){if(cache.size>=32768)cache.delete(cache.keys().next().value);cache.set(source,result);}return result;
  }
  global.LegendsItemTranslate=Object.freeze({translate:source=>explain(source).text,explain,ready,counts:data?.counts});
})(typeof globalThis!=='undefined'?globalThis:window);
