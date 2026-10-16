/* Compact byte-accurate Legends index. Original File objects remain the source
 * of full records; repeated army data is scanned without building JS arrays. */
(function legendsFileIndexerRuntime(global) {
  'use strict';
  const CHUNK_SIZE = 1024 * 1024, BLOCK_SIZE = 2048, MAX_SCALAR = 65536;
  const GROUPS = { historical_figures:'figures', sites:'sites', entities:'entities', artifacts:'artifacts', historical_events:'events', historical_eras:'eras', regions:'regions', historical_event_collections:'collections' };
  const SELECTED = new Set(['id','local_id','name','translated_name','name_string','title','type','year','start_year','end_year','race','caste','birth_year','death_year','coords','civ_id','cur_owner_id','owner_id','region_id','subregion_id','depth','height','sex','appeared','profession','deity','is_deity','force','skeleton','zombie','vampire','is_vampire','necromancer','is_necromancer','werebeast','is_werebeast','ghost','war_eventcol','parent_eventcol','parent','occasion_eventcol','competition_eventcol','performance_eventcol','site_id','feature_layer_id','attacker_civ_id','defender_civ_id','attacking_enid','defending_enid']);
  // Bounded analytical facts. Army lists are reduced while the current record
  // is open; only notable figure IDs and race totals survive in the index.
  const EXTRA_FIELDS = ['biome','evilness','is_volcano','volcano','path','end_pos','square_tiles','force_id','author','author_hfid','author_id','form','page_start','page_end','page_count','holder_hfid','holder_id','written_content_id','written_content','wc_id','worship_id','worship_hfid','religion','religion_id','entity_id','dungeon_type','subtype','item_type','item_subtype','material','mat','population','count','position','position_id','position_profile_id','link','link_type','site_civ_id','resident_civ_id','new_site_civ_id','old_site_civ_id','new_civ_id','old_civ_id','group_hfid','corruptor_hfid','histfig','aggressor_ent_id','attacker_ent_id','defender_ent_id','attacking_merc_enid','defending_merc_enid','individual_merc','company_merc','attacking_squad_animated','defending_squad_animated','outcome','battle_outcome','structure','structure_id','source_structure_id','dest_structure_id','source_site_id','dest_site_id','new_structure_id','old_structure_id','active_interaction','sphere','used_identity_id','inhabitant','copied_artifact_id','worshipped','reference','style','skill','total_ip','rating','name_male','name_female','name_plural','name2','item','wcid','master_wcid','master_construction_id','site_id1','site_id2','form_id','structure_local_id','ordinal','writing','abs_tile_x','abs_tile_y','abs_tile_z','reason','reason_id','circumstance','circumstance_id','method','relevant_id_for_method','relevant_entity_id','sanctify_hf','anon_4','ent_pop_id'];
  EXTRA_FIELDS.forEach(key=>SELECTED.add(key));
  // Landmass.cs reads the two bounds exported by DFHack as coordinates.
  ['coord_1','coord_2'].forEach(key=>SELECTED.add(key));
  ['seconds72','start_seconds72','end_seconds72','birth_seconds72','death_seconds72','page_number','adventurer','player','new_player','is_player','player_hfid'].forEach(key=>SELECTED.add(key));
  const LIST_FIELDS = new Set(['active_interaction','sphere','used_identity_id','inhabitant','copied_artifact_id','worshipped','style','attacking_hfid','defending_hfid','noncom_hfid','a_support_merc_hfid','d_support_merc_hfid','attacking_squad_animated','defending_squad_animated']);
  const SUM_FIELDS = new Set(['attacking_squad_number','defending_squad_number','attacking_squad_deaths','defending_squad_deaths']);
  const SQUAD_RACES = new Set(['attacking_squad_race','defending_squad_race']);
  const SMALL_OBJECTS = new Set(['entity_position','entity_position_assignment','entity_position_link','entity_former_position_link','hf_skill','item','reference','entity_link','hf_link','hfhf_link','site_link','circumstance']);
  const FACT_VERSION = 3;
  const NUMERIC = /^(?:id|local_id|year|start_year|end_year|birth_year|death_year|civ_id|cur_owner_id|owner_id|region_id|subregion_id|depth|sex|appeared|war_eventcol|parent_eventcol|parent|occasion_eventcol|competition_eventcol|performance_eventcol|site_id|feature_layer_id|attacker_civ_id|defender_civ_id|attacking_enid|defending_enid)$/;
  const CP437 = Array.from('ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ');
  const own = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
  const pause = () => new Promise(resolve => setTimeout(resolve,0));
  const singleByte = new TextDecoder('windows-1252');
  const highBytes = Uint8Array.from({length:128},(_,index) => index + 128);
  const reverseBytes = Object.create(null);
  const referenceKinds = new Map();
  const tagNames = new Map();
  const LINK_FIELDS = new Set(['entity_link','hf_link','hfhf_link','site_link','circumstance']);
  Array.from(singleByte.decode(highBytes)).forEach((character,index) => { if(character !== '\ufffd') reverseBytes[character] = index + 128; });
  const byteOf = character => character.charCodeAt(0) < 256 ? character.charCodeAt(0) : reverseBytes[character];
  // A short SlicedString can otherwise retain an entire 1 MiB source chunk.
  const detached = value => value ? JSON.parse(JSON.stringify(value)) : value;
  function tagName(value) { const cached=tagNames.get(value);if(cached)return cached;const copy=detached(value);tagNames.set(copy,copy);return copy; }
  function check(signal) { if(signal && signal.aborted) { const error = new Error('导入已取消。'); error.name = 'AbortError'; throw error; } }
  const fail = message => new Error('XML 解析失败：' + message);
  function decodeBytes(bytes,encoding) {
    if(!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if(/^(?:cp|ibm|windows-?)?437$/i.test(encoding || '')) {
      const text = singleByte.decode(bytes);
      return text.replace(/[\u0080-\uffff]/g,(_,index) => CP437[bytes[index] - 128]);
    }
    return new TextDecoder(encoding || 'utf-8',{fatal:true}).decode(bytes);
  }
  function entities(text) {
    if(!text.includes('&')) return text;
    const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    return text.replace(/&([^;\s<&]*);|&/g,(match,value) => {
      if(own(named,value)) return named[value];
      if(value && /^#(?:[0-9]+|x[0-9a-f]+)$/i.test(value)) {
        const number = value[1].toLowerCase() === 'x' ? parseInt(value.slice(2),16) : parseInt(value.slice(1),10);
        if(number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)) return String.fromCodePoint(number);
      }
      throw fail('存在无效或未声明的字符实体 ' + match + '。');
    });
  }
  function refKind(key,parent) {
    if(['attacking_hfid','defending_hfid','noncom_hfid','a_support_merc_hfid','d_support_merc_hfid'].includes(key))return null;
    if(key.endsWith('_hfid'))return 'figures';
    if(key.endsWith('_enid'))return 'entities';
    if(['author','author_id','author_hfid','group_hfid','corruptor_hfid','worship_hfid','holder_hfid','builder_hfid','creator_hfid'].includes(key))return 'figures';
    if(['site_civ_id','resident_civ_id','new_site_civ_id','old_site_civ_id','new_civ_id','old_civ_id','aggressor_ent_id','attacker_ent_id','defender_ent_id'].includes(key))return 'entities';
    if(['dest_site_id','source_site_id','site_id1','site_id2'].includes(key))return 'sites';
    if(['wcid','master_wcid','master_construction_id','world_construction_id'].includes(key))return 'world_constructions';
    if(['written_content_id','written_content','writing','wc_id','page_written_content_id','writing_written_content_id'].includes(key))return 'written_contents';
    if(key==='feature_layer_id')return 'underground_regions';
    if(key==='subregion_id')return 'regions';
    if(key === 'target') return {entity_link:'entities',hf_link:'figures',hfhf_link:'figures',site_link:'sites'}[parent] || null;
    if(/^(?:hfid|hf_id|hf|hf1|hf2|histfig|histfig_id|historical_figure_id|historical_figure|hist_figure_id|figure_id|slayer_hf|slayer_hfid|victim_hf|victim_hfid|doer|doer_hf|doer_hfid|target_hf|target_hfid|builder_hf|builder_hfid|creator_hf|creator_hfid|seeker_hf|holder_hf|giver_hf|receiver_hf|attacker_hf|defender_hf|hfid1|hfid2|source_hf|abducted_hf|body_hf|speaker_hf|student|teacher|maker|maker_hfid)$/.test(key) || /^(?:hf|histfig|hist_figure|historical_figure)_id_?\d?$/.test(key)) return 'figures';
    if(/^(?:site|site_id|siteid|source_site|target_site|dest_site|destination_site|old_site|new_site)$/.test(key)) return 'sites';
    if(/^(?:entity|entity_id|entityid|civ|civ_id|civid|site_civ|site_civ_id|cur_owner_id|attacker_civ|defender_civ|attacker_civ_id|defender_civ_id|attacker_enid|defender_enid|attacking_enid|defending_enid|attacker_ent_id|defender_ent_id|group|group_id|enid|entity_1|entity_2)$/.test(key)) return 'entities';
    if(/^(?:artifact|artifact_id|artifactid)$/.test(key)) return 'artifacts';
    if(/^(?:region|region_id|regionid)$/.test(key)) return 'regions';
    return null;
  }
  // Only associations actually registered with AddEvent in the upstream
  // constructors. IDs mentioned solely by Print() remain display references.
  const SOURCE_EVENT_TYPES=new Set(['dance form created','musical form created','poetic form created','written content composed','artifact possessed','artifact created','hfs formed intrigue relationship','failed intrigue corruption']);
  function sourceEventReferences(record,hasFigure){
    const type=String(record.type||'').replace(/_/g,' ').toLowerCase();if(!SOURCE_EVENT_TYPES.has(type))return [];
    const raw=record.raw||{},get=key=>record[key]??raw[key],norm=value=>String(value??'').replace(/_/g,' ').toLowerCase(),refs=[];
    const add=(kind,value,key,requiresFigure)=>{if(value===undefined||value===null||value===''||typeof value==='object')return;const id=Number(value);if(!Number.isSafeInteger(id)||id<0)return;if(requiresFigure!==undefined&&hasFigure&&!hasFigure(requiresFigure))return;refs.push({kind,id,key,...(requiresFigure===undefined?{}:{requiresFigure})});};
    const reason=norm(get('reason')),circumstance=get('circumstance'),circumstanceType=norm(circumstance),reasonId=Number(get('reason_id'));
    if(type==='dance form created'||type==='musical form created'||type==='poetic form created'){
      if(reason==='glorify hf')add('figures',get('reason_id'),'reason_id');
      if(circumstanceType==='pray to hf')add('figures',get('circumstance_id'),'circumstance_id');
    }else if(type==='written content composed'){
      if(reason==='glorify hf'){
        add('figures',get('reason_id'),'reason_id');
        // WrittenContentComposed.cs registers the circumstance figure only
        // when a distinct, existing glorified figure was resolved first.
        if(['pray to hf','dream about hf'].includes(circumstanceType)&&get('reason_id')!==undefined&&Number.isSafeInteger(reasonId)&&reasonId>=0&&Number(get('circumstance_id'))!==reasonId)add('figures',get('circumstance_id'),'circumstance_id',reasonId);
      }
    }else if(type==='artifact possessed'){
      if(reason==='artifact is heirloom of family hfid')add('figures',get('reason_id'),'reason_id');
      if(reason==='artifact is symbol of entity position')add('entities',get('reason_id'),'reason_id');
      if(circumstanceType==='hf is dead')add('figures',get('circumstance_id'),'circumstance_id');
    }else if(type==='artifact created'){
      add('figures',get('sanctify_hf')??get('anon_4'),'sanctify_hf');
      if(circumstance&&typeof circumstance==='object')add('figures',circumstance.defeated,'circumstance.defeated');
    }else if(type==='hfs formed intrigue relationship')add('entities',get('relevant_entity_id'),'relevant_entity_id');
    // RelevantIdForMethod is used by intrigue Print(), never AddEvent().
    return refs;
  }
  async function encodingFor(file) {
    const bytes = new Uint8Array(await file.slice(0,1024).arrayBuffer());
    if(bytes[0] === 0xff && bytes[1] === 0xfe) return {encoding:'utf-16le',unit:2,skip:2};
    if(bytes[0] === 0xfe && bytes[1] === 0xff) return {encoding:'utf-16be',unit:2,skip:2};
    if(bytes[0] === 60 && bytes[1] === 0) return {encoding:'utf-16le',unit:2,skip:0};
    if(bytes[0] === 0 && bytes[1] === 60) return {encoding:'utf-16be',unit:2,skip:0};
    const text = singleByte.decode(bytes);
    const match = text.match(/<\?xml[^>]*encoding\s*=\s*['"]([^'"]+)/i);
    const name = match ? match[1].toLowerCase() : 'utf-8';
    if(/^(?:cp|ibm|windows-?)?437$/.test(name)) return {encoding:'cp437',unit:1,skip:0};
    if(!/^utf-?8$/.test(name)) throw new Error('不支持 XML 声明的字符编码：' + name + '。请使用 UTF-8、CP437 或 UTF-16 导出。');
    return {encoding:'utf-8',unit:1,skip:bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0};
  }
  class HeaderReader {
    constructor(fileNo,format,onHeader,onMetadata,orders) {
      this.fileNo=fileNo;this.format=format;this.onHeader=onHeader;this.onMetadata=onMetadata;this.orders=orders;
      this.tags=[];this.children=[];this.captures=[];this.pending=null;this.buffer='';this.bufferOffset=0;
      this.rootSeen=false;this.rootClosed=false;this.record=null;this.recordHasData=false;this.link=null;this.refs=null;this.entity=null;this.emitted=0;this.recordDepth=3;this.parents=[];this.smallObjects=[];this.squads=null;
    }
    small(text) {
      if(this.format.unit === 2 || !/[\u0080-\uffff]/.test(text)) return text;
      if(this.format.encoding === 'cp437') return text.replace(/[\u0080-\uffff]/g,character => CP437[byteOf(character)-128]);
      return decodeBytes(Uint8Array.from(text,byteOf),this.format.encoding);
    }
    validateText(source,begin,end) {
      let position=begin;
      while(position < end) {
        if(this.entity !== null) {
          const character=source[position++];
          if(character === ';') { entities('&'+this.entity+';');this.entity=null; }
          else {
            if(/[\s<&]/.test(character)) throw fail('字符实体未正确结束。');
            this.entity+=character;
            if(this.entity.length>40) {
              this.entity=this.entity.replace(/^(#x?)0+/i,'$1');
              if(this.entity.length>40) throw fail('字符实体无效。');
            }
          }
        } else {
          if(this.nextAmp>=0 && this.nextAmp<position) this.nextAmp=source.indexOf('&',position);
          if(this.nextAmp<0 || this.nextAmp>=end) return;
          position=this.nextAmp+1;this.entity='';this.nextAmp=source.indexOf('&',position);
        }
      }
    }
    text(source,begin,end,cdata) {
      if(begin>=end) return;
      if(!cdata) this.validateText(source,begin,end);
      if(!this.tags.length) { if(source.slice(begin,end).trim()) throw fail('根元素之外含有文本。');return; }
      const capture=this.captures[this.tags.length-1];
      if(capture && capture.numeric) {
        for(let at=begin;at<end;at++){const code=source.charCodeAt(at);if(code>=48&&code<=57){capture.value=capture.value*10+code-48;capture.seen=true;}else if(code===45&&!capture.seen)capture.sign=-1;else if(code>32)capture.invalid=true;}
      } else if(capture && !capture.overflow) {
        capture.length+=end-begin;
        if(capture.length>capture.limit) { capture.overflow=true;capture.parts=null; }
        else capture.parts.push({text:source.slice(begin,end),cdata:!!cdata});
      }
      if(this.tags.length===this.recordDepth && !this.recordHasData && source.slice(begin,end).trim()) this.recordHasData=true;
    }
    open(token,offset,endOffset) {
      const selfClosing=/\/\s*$/.test(token),body=selfClosing?token.replace(/\/\s*$/,''):token;
      const match=body.match(/^([A-Za-z_][\w.:-]*)([\s\S]*)$/);
      if(!match) throw fail('无效的元素标签。');
      const tag=tagName(match[1]),depth=this.tags.length+1;
      let attributes=match[2],hasAttributes=false;
      if(attributes.trim()) {
        const names=new Set();
        while(attributes.trim()) {
          const attribute=attributes.match(/^\s+([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/);
          if(!attribute || names.has(attribute[1])) throw fail('属性格式无效或重复。');
          names.add(attribute[1]);entities(this.small(attribute[2]===undefined?attribute[3]:attribute[2]));hasAttributes=true;attributes=attributes.slice(attribute[0].length);
        }
      }
      if(depth===1) {
        if(this.rootSeen) throw fail('文档包含多个根元素。');
        if(tag!=='df_world' && tag!=='df_world_plus') throw fail('这不是 Dwarf Fortress Legends XML（需要 df_world 根元素）。');
        this.rootSeen=true;
      }
      if(depth>80) throw fail('元素嵌套层级过深。');
      if(depth>1) { this.children[depth-2]++;if(depth===3)this.captures[1]=null; }
      let capture=null;
      if(depth===2) capture={parts:[],length:0,limit:MAX_SCALAR};
      if(depth===3 || this.record && this.record.group==='sites' && tag==='structure' && (depth===4||depth===5)) {
        const nested=depth!==3,owner=this.record;
        if(nested)this.parents.push({record:this.record,refs:this.refs,recordHasData:this.recordHasData,recordDepth:this.recordDepth,link:this.link,smallObjects:this.smallObjects,squads:this.squads});
        const section=nested?'structures':this.tags[1],group=nested?'structures':own(GROUPS,section)?GROUPS[section]:null;
        this.record={fileNo:this.fileNo,group,section,tag,offset,refs:[],factsVersion:FACT_VERSION};
        if(nested){this.record.site_id=owner.id;this.record.coords=owner.coords;this.record.nested=true;}
        this.recordDepth=depth;this.recordHasData=hasAttributes;this.refs=new Map();this.link=null;this.smallObjects=[];this.squads=null;
      }
      const relative=depth-this.recordDepth;
      if(relative===1 && this.record) {
        this.recordHasData=true;
        if(!referenceKinds.has(tag))referenceKinds.set(tag,refKind(tag,''));
        const reference=referenceKinds.get(tag);
        if(SUM_FIELDS.has(tag))capture={numeric:true,value:0,sign:1,seen:false,invalid:false,sum:tag};
        else if(SELECTED.has(tag)||LIST_FIELDS.has(tag)||SQUAD_RACES.has(tag)||reference||this.record.group==='collections'&&['event','event_id','eventcol','collection'].includes(tag))capture={parts:[],length:0,limit:['coords','path','coord_1','coord_2'].includes(tag)?1024*1024:MAX_SCALAR,reference};
      }
      if(this.record && SMALL_OBJECTS.has(tag) && relative>=1 && relative<=3) {
        this.smallObjects.push({depth,tag,value:{}});
      }
      const object=this.smallObjects[this.smallObjects.length-1];
      if(object && depth===object.depth+1 && (SELECTED.has(tag)||tag==='target'||tag==='name_string'||tag.endsWith('_id')||tag==='hfid'||tag==='link_strength'||object.tag==='circumstance'&&tag==='defeated'))capture={parts:[],length:0,limit:MAX_SCALAR,reference:refKind(tag,object.tag),object};
      this.tags.push(tag);this.children.push(0);this.captures.push(capture);
      if(selfClosing) this.close(tag,endOffset);
    }
    value(capture) {
      if(!capture || capture.overflow) return null;
      if(capture.numeric)return capture.seen&&!capture.invalid?capture.value*capture.sign:null;
      const parts=capture.parts;let value='',binary='',mode=null;
      const flush=()=>{if(binary){const text=this.small(binary);value+=mode?text:entities(text);binary='';}};
      for(const part of parts) {if(mode!==null && mode!==part.cdata)flush();mode=part.cdata;binary+=part.text;}
      flush();return value.trim();
    }
    close(tag,endOffset) {
      const depth=this.tags.length;
      if(!depth || this.tags[depth-1]!==tag) throw fail('元素未正确闭合：'+tag+'。');
      const capture=this.captures.pop(),children=this.children.pop();this.tags.pop();
      const value=children?null:this.value(capture);
      if(depth===2 && !children && value!==null) this.onMetadata(tag,value);
      const relative=depth-this.recordDepth;
      if(relative===1 && this.record && value!==null) {
        if(capture.numeric){
          const key=capture.sum,number=value<0||value>100?100:value;
          this.record[key+'_sum']=(this.record[key+'_sum']||0)+number;
          const side=key.startsWith('attacking')?'attacking':'defending';
          if(!this.squads)this.squads={attacking:{races:[],numbers:[],deaths:[]},defending:{races:[],numbers:[],deaths:[]}};
          this.squads[side][key.endsWith('deaths')?'deaths':'numbers'].push(number);
        } else if(SQUAD_RACES.has(tag)) {
          if(!this.squads)this.squads={attacking:{races:[],numbers:[],deaths:[]},defending:{races:[],numbers:[],deaths:[]}};
          this.squads[tag.startsWith('attacking')?'attacking':'defending'].races.push(tagName(value));
        } else if(this.record.group==='collections' && ['event','event_id','eventcol','collection'].includes(tag)) {
          const number=Number(value);if(value!==''&&Number.isSafeInteger(number)&&number>=0){const key=tag==='event'||tag==='event_id'?'events':'children';if(!this.record[key])this.record[key]=[];this.record[key].push(number);}
        } else if(LIST_FIELDS.has(tag)) {
          const key=tag;if(!this.record[key])this.record[key]=[];
          this.record[key].push(/^(-?\d+)$/.test(value)?Number(value):detached(value));
        } else if((SELECTED.has(tag)||capture.reference) && !own(this.record,tag)) {
          this.record[tag]=(NUMERIC.test(tag)||capture.reference||/(?:_id|_hfid)$/.test(tag))&&/^-?\d+$/.test(value)?Number(value):detached(value);
        }
      }
      if(this.record && capture && capture.reference && value!==null && value!=='' && /^-?\d+$/.test(value))this.addRef(capture.reference,Number(value),tag);
      if(capture&&capture.object&&value!==null){const object=capture.object.value;object[tag]=/^-?\d+$/.test(value)?Number(value):detached(value);}
      const object=this.smallObjects[this.smallObjects.length-1];
      if(object&&object.depth===depth){
        this.smallObjects.pop();const values=object.value;
        if(Object.keys(values).length){
          // Keep explicit current-position evidence even when the compact HF
          // header retains only its first ordinary entity_link.
          if(this.record.group==='figures'&&['entity_link','entity_position_link','entity_former_position_link'].includes(object.tag)){
            let type='';for(const [key,value]of Object.entries(values)){if(key==='start_year')type='position';else if(key==='end_year')type='former position';else if(key==='link_type')type=String(value).trim().toLowerCase().replace(/_/g,' ');}
            const id=Number(values.entity_id);if(type==='position'&&Number.isSafeInteger(id)&&id>=0){const ids=this.record.civRacePositionIds||(this.record.civRacePositionIds=[]);if(!ids.includes(id))ids.push(id);}
          }
          if(['hf_link','hfhf_link'].includes(object.tag)&&String(values.link_type??values.type).toLowerCase()==='deity'){const id=Number(values.hfid??values.target??values.hf_id);if(Number.isFinite(id)&&id>=0)(this.record.deity_links||(this.record.deity_links=[])).push({id,strength:Number(values.link_strength)||0});}
          if(object.tag==='circumstance')this.record.circumstance=values;
          else if(object.tag==='item'){this.record.item=values;for(const key of ['name_string','item_type','item_subtype','material','page_number','page_written_content_id','writing_written_content_id'])if(values[key]!==undefined)this.record[key]=values[key];}
          else if(object.tag==='hf_skill'){if(!this.record.best_skill||Number(values.total_ip)>Number(this.record.best_skill.total_ip))this.record.best_skill=values;}
          else if(!['hf_link','hfhf_link','site_link'].includes(object.tag)&&!(object.tag==='entity_link'&&this.record.group==='figures'&&this.record.entity_link?.length)){if(!this.record[object.tag])this.record[object.tag]=[];this.record[object.tag].push(values);}
          if(object.tag==='entity_link'&&this.record.group==='entities'&&String(values.type||values.link_type||'').toLowerCase()==='parent')this.record.parentEntity=this.record.parentEntityId=Number(values.target??values.entity_id);
        }
      }
      if(depth===this.recordDepth) {
        if(this.recordHasData){
          const header=this.record,key=header.group||header.section,order=this.orders[key]||0;this.orders[key]=order+1;header.order=order;
          if(header.nested){header.local_id=Number(header.local_id??header.id??0);const lookup=this.orders.__structures||(this.orders.__structures=new Map()),compound=header.site_id+':'+header.local_id;if(!lookup.has(compound))lookup.set(compound,lookup.size);header.id=lookup.get(compound);header.compound=compound;this.addRef('sites',Number(header.site_id),'site_id');}
          else if(!Number.isFinite(header.id))header.id=Number.isFinite(header.local_id)?header.local_id:order;
          header.length=endOffset-header.offset;
          if(header.group==='events'&&String(header.type).replace(/_/g,' ')==='item stolen'&&Number.isFinite(Number(header.item)))this.addRef('artifacts',Number(header.item),'item');
          if(header.group==='events'&&Number.isFinite(Number(header.form_id))){const type=String(header.type).replace(/_/g,' '),kind=/dance/.test(type)?'dance_forms':/musical/.test(type)?'musical_forms':/poetic/.test(type)?'poetic_forms':null;if(kind)this.addRef(kind,Number(header.form_id),'form_id');}
          if(header.group==='events')for(const ref of sourceEventReferences(header)){const old=this.refs.get(ref.kind+':'+ref.id);this.addRef(ref.kind,ref.id,ref.key);if(!old){const added=this.refs.get(ref.kind+':'+ref.id);added.sourceCondition=true;if(ref.requiresFigure!==undefined)added.requiresFigure=ref.requiresFigure;}}
          if(this.squads){header.squad_races={};for(const side of ['attacking','defending']){const squads=this.squads[side];for(let index=0;index<squads.races.length;index++){const race=squads.races[index],entry=header.squad_races[race]||(header.squad_races[race]={attacking:0,defending:0,attacking_deaths:0,defending_deaths:0});entry[side]+=squads.numbers[index]||0;entry[side+'_deaths']+=squads.deaths[index]||0;}}}
          for(const key of ['events','children','attacking_hfid','defending_hfid','noncom_hfid','a_support_merc_hfid','d_support_merc_hfid'])if(header[key]&&header[key].every(number=>Number.isInteger(number)&&number>=0&&number<=0xffffffff))header[key]=Uint32Array.from(header[key]);
          this.onHeader(header);this.emitted++;
        }
        if(this.parents.length){const saved=this.parents.pop();Object.assign(this,saved);this.record.structure_count=(this.record.structure_count||0)+1;}
        else{this.record=null;this.refs=null;this.squads=null;this.smallObjects=[];}
      }
      if(depth===1)this.rootClosed=true;
    }
    addRef(kind,id,key){if(!Number.isFinite(id)||id<0)return;const token=kind+':'+id,old=this.refs.get(token);if(old){if(old.key!==key){if(!old.keys)old.keys=[old.key];if(!old.keys.includes(key))old.keys.push(key);}}else{const ref={kind,id,key};this.refs.set(token,ref);this.record.refs.push(ref);}}
    feed(text,baseOffset,final,budget) {
      if(this.buffer) {text=this.buffer+text;baseOffset=this.bufferOffset;this.buffer='';}
      this.nextAmp=text.indexOf('&');let at=0,first=this.emitted,yielded=false;
      const byteOffset=position=>baseOffset+position*this.format.unit;
      while(at<text.length) {
        if(this.emitted-first>=budget) {yielded=true;break;}
        if(this.pending) {
          const pending=this.pending;
          if(pending.kind==='tag') {
            const begin=at;
            for(;at<text.length;at++){const character=text[at];if(pending.quote){if(character===pending.quote)pending.quote='';}else if(character==='"'||character==="'")pending.quote=character;else if(character==='>')break;}
            pending.parts.push(text.slice(begin,at));if(at===text.length)break;
            const token=pending.parts.length===1?pending.parts[0]:pending.parts.join('');at++;this.pending=null;
            if(token[0]==='/'){if(!/^\/[A-Za-z_][\w.:-]*\s*$/.test(token))throw fail('结束标签格式无效。');this.close(token.slice(1).trim(),byteOffset(at));}
            else this.open(token,pending.offset,byteOffset(at));
          } else {
            const combined=pending.tail+text.slice(at),terminator=pending.kind==='comment'?'-->':pending.kind==='cdata'?']]>':'?>',end=combined.indexOf(terminator);
            if(pending.kind==='pi' && pending.prefix.length<4){pending.prefix=(pending.prefix+text.slice(at)).slice(0,4);if(/^xml(?:\s|\?)/i.test(pending.prefix)&&this.rootSeen)throw fail('XML 声明必须位于文档开头。');}
            if(end>=0){if(pending.kind==='comment'&&combined.slice(0,end).includes('--'))throw fail('注释中含有非法的连续连字符。');if(pending.kind==='cdata')this.text(combined,0,end,true);at+=end+terminator.length-pending.tail.length;this.pending=null;}
            else{const keep=terminator.length-1;if(pending.kind==='comment'){const double=combined.indexOf('--');if(double>=0&&double<combined.length-2)throw fail('注释中含有非法的连续连字符。');}if(pending.kind==='cdata'&&combined.length>keep)this.text(combined,0,combined.length-keep,true);pending.tail=combined.slice(-keep);at=text.length;}
          }
          continue;
        }
        const start=text.indexOf('<',at);
        if(start<0){this.text(text,at,text.length,false);at=text.length;break;}
        this.text(text,at,start,false);if(this.entity!==null)throw fail('字符实体未正确结束。');at=start;
        const available=text.length-start;
        if(available<2 || text[start+1]==='!'&&['<!--','<![CDATA['].some(prefix=>available<prefix.length&&prefix.startsWith(text.slice(start))))break;
        if(text.startsWith('<!--',start)){this.pending={kind:'comment',tail:''};at+=4;}
        else if(text.startsWith('<![CDATA[',start)){if(!this.tags.length)throw fail('CDATA 必须位于根元素内。');this.pending={kind:'cdata',tail:''};at+=9;}
        else if(text.startsWith('<?',start)){this.pending={kind:'pi',tail:'',prefix:''};at+=2;}
        else if(text.startsWith('<!',start))throw fail('不支持 DTD 或外部实体；请使用原始 Legends 导出。');
        else{this.pending={kind:'tag',parts:[],quote:'',offset:byteOffset(start)};at++;}
      }
      if(at<text.length){this.buffer=text.slice(at);this.bufferOffset=byteOffset(at);}
      if(final&&!yielded&&(this.buffer.trim()||this.pending||this.entity!==null||this.tags.length||!this.rootSeen||!this.rootClosed))throw fail('文档不完整，可能被截断。');
      return yielded;
    }
  }
  async function indexFiles(input,options) {
    options=options||{};check(options.signal);
    if(typeof options.onBlock!=='function')throw new Error('文件索引需要提供 onBlock 接收器。');
    const files=Array.from(input||[]),jobs=files.map((file,fileNo)=>({file,fileNo})).filter(job=>/\.xml$/i.test(job.file.name));
    if(!jobs.length)throw new Error('请选择 Legends XML 文件。');
    const exportNames=new Set(jobs.filter(job=>/-legends(?:_plus)?\.xml$/i.test(job.file.name)).map(job=>job.file.name.replace(/-legends(?:_plus)?\.xml$/i,'').toLowerCase()));
    if(exportNames.size>1)throw new Error('请选择同一个世界、同一次导出的 legends.xml 与 legends_plus.xml。');
    jobs.sort((a,b)=>Number(/legends_plus\.xml$/i.test(a.file.name))-Number(/legends_plus\.xml$/i.test(b.file.name)));
    const world={name:'',altname:'',id:'',year:0,sourceFiles:[],extra:{},counts:{},fileInfo:files.map(file=>({name:file.name,size:file.size,type:file.type||''}))};
    for(const group of Object.values(GROUPS))world[group]=[];
    const orders=Object.create(null),metadata=[];let block=[],bytesRead=0,records=0,reader=null,lastYield=Date.now();
    const totalBytes=jobs.reduce((sum,job)=>sum+job.file.size,0);
    const flushMetadata=async()=>{while(metadata.length){const pair=metadata.shift();if(options.onMetadata)await options.onMetadata(pair[0],pair[1]);}};
    const flushBlock=async()=>{check(options.signal);await flushMetadata();if(block.length){const batch=block;block=[];await options.onBlock(batch,{bytesRead,totalBytes,records});check(options.signal);}};
    const progress=()=>{if(options.progress)options.progress({percent:Math.min(99,bytesRead/Math.max(1,totalBytes)*99),bytesRead,totalBytes,records,section:reader&&reader.tags[1]||'',message:'正在索引 Legends XML…'});};
    for(const {file,fileNo} of jobs) {
      if(!file.size)throw new Error(file.name+' 是空文件。');
      const format=await encodingFor(file);world.fileInfo[fileNo].encoding=format.encoding;
      const validator=format.encoding==='utf-8'?new TextDecoder('utf-8',{fatal:true}):null;
      const utf16=format.unit===2?new TextDecoder(format.encoding,{fatal:true,ignoreBOM:true}):null;
      let decodedOffset=format.skip,documentName='';
      reader=new HeaderReader(fileNo,format,header=>{
        block.push(header);records++;const group=header.group||header.section;world.counts[group]=(world.counts[group]||0)+1;
        for(const key of ['year','start_year','end_year'])if(Number.isFinite(header[key]))world.year=Math.max(world.year,header[key]);
      },(key,value)=>{
        if(key==='name')documentName=value;
        if(value!==''){if(key==='name'||key==='altname'){if(!world[key])world[key]=value;}else if(key==='year')world.year=Math.max(world.year,Number(value)||0);else Object.defineProperty(world,key,{value,writable:true,enumerable:true,configurable:true});metadata.push([key,value]);}
      },orders);
      try {
        bytesRead+=format.skip;
        for(let offset=format.skip;offset<file.size;offset+=CHUNK_SIZE) {
          check(options.signal);const bytes=new Uint8Array(await file.slice(offset,offset+CHUNK_SIZE).arrayBuffer());
          if(validator)validator.decode(bytes,{stream:true});
          let text=utf16?utf16.decode(bytes,{stream:true}):singleByte.decode(bytes);
          if(!utf16&&text.includes('\ufffd'))text=text.replace(/\ufffd/g,(_,index)=>String.fromCharCode(bytes[index]));
          const base=utf16?decodedOffset:offset;decodedOffset+=text.length*format.unit;bytesRead+=bytes.byteLength;
          let more=reader.feed(text,base,false,BLOCK_SIZE-block.length);if(block.length>=BLOCK_SIZE)await flushBlock();
          while(more){more=reader.feed('',decodedOffset,false,BLOCK_SIZE-block.length);if(block.length>=BLOCK_SIZE)await flushBlock();}
          await flushMetadata();progress();
          if(typeof global.document!=='undefined'&&Date.now()-lastYield>20){await pause();lastYield=Date.now();}
        }
        if(validator)validator.decode();const tail=utf16?utf16.decode():'';
        let more=reader.feed(tail,decodedOffset,true,BLOCK_SIZE-block.length);if(block.length>=BLOCK_SIZE)await flushBlock();
        while(more){more=reader.feed('',decodedOffset,true,BLOCK_SIZE-block.length);if(block.length>=BLOCK_SIZE)await flushBlock();}
      } catch(error) {if(error.name==='AbortError')throw error;throw new Error(file.name+'：'+error.message);}
      if(documentName&&world.name&&documentName.toLowerCase()!==String(world.name).toLowerCase())throw new Error('所选 XML 的世界名称不同，请分别导入。');
      world.sourceFiles.push(file.name);
    }
    await flushBlock();if(!records)throw new Error('XML 中没有可浏览的 Legends 数据。');check(options.signal);
    if(options.progress)options.progress({percent:100,bytesRead,totalBytes,records,section:'',message:'文件索引完成'});
    world.factsVersion=FACT_VERSION;return world;
  }
  global.LegendsFileIndexer=Object.freeze({indexFiles,decodeBytes,sourceEventReferences,workerSource:'('+legendsFileIndexerRuntime.toString()+')(self);'});
})(typeof globalThis!=='undefined'?globalThis:window);
