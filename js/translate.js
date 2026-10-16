/* Browser port of DFCN's EnglishCharacterNames, surname context grammar,
 * MandarinNameReadings / MandarinNameProsody and native-name syllable renderer.
 * Source and limitations: ../TRANSLATION.md. No network or server dependency. */
(function () {
  'use strict';
  const D = window.DFCN_DATA;
  if (!D) throw new Error('请先加载 translation-data.js');
  const O = 1, Q = 2, A = 4, T = 8, G = 16, P = 32;
  const key = s => String(s ?? '').trim().replace(/\s+/g, ' ').replace(/[A-Z]/g, c => c.toLowerCase());
  const labels = s => [...new Set(key(s).split('|').filter(Boolean))].sort();
  const kinds = s => labels(s).reduce((n, x) => n | ({object: O, quality: Q, action: A, state: T, agent: G, prefix: P}[x] || 0), 0);
  const has = (p, k) => !!(p.kinds & k);
  const cat = (p, c) => p.categories.includes(c);
  const family = (p, cs) => (Array.isArray(cs) ? cs : [cs]).some(c => p.families.includes(c));
  const width = s => Array.from(s).length;
  const includes = (a, b) => a.every(x => b.includes(x));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const senseKey = (e, k, c, state, sense) => [e, k, c.join('|'), state, sense].join('\t');
  const S = n => D.strings[n];
  const words = new Map(), surnames = new Map(), classes = new Map(), images = new Map(), rules = new Map();
  const lexicalWords = new Set(), nativeWords = new Set(D.nativeWords);
  const cache = new Map(), surnameCache = new Map(), readingCache = new Map();
  let initialized = false;

  // The same British dictionaries and Phonetisaurus weighted FST as DFCN.
  // A browser stream only decompresses the bundled bytes; all FST evaluation
  // below is JavaScript and stays inside this tab, including file:// use.
  const E = window.DFCN_PHONETICS;
  let fst = null;
  async function loadPhonetics() {
    if (!E) return;
    const bytes = Uint8Array.from(atob(E.fst), c => c.charCodeAt(0));
    const buffer = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const view = new DataView(buffer), decoder = new TextDecoder();
    let offset = 0;
    const i32 = () => { const n=view.getInt32(offset,true);offset+=4;return n; };
    const i64 = () => { const n=Number(view.getBigInt64(offset,true));offset+=8;return n; };
    const text = () => { const n=i32(),s=decoder.decode(new Uint8Array(buffer,offset,n));offset+=n;return s; };
    if(i32()!==2125659606||text()!=='vector'||text()!=='standard'||i32()!==2)throw new Error('DFCN UK G2P 模型格式无效');
    const flags=i32();i64();const start=i64(),count=i64();i64();
    if((flags&3)!==3)throw new Error('DFCN UK G2P 缺少符号表');
    const symbols=()=>{if(i32()!==2125658996)throw new Error('DFCN UK G2P 符号表格式无效');text();i64();const n=i64(),out=[];for(let i=0;i<n;i++){const s=text(),label=i64();out[label]=s;}return out;};
    const input=symbols(),output=symbols(),labels=new Map(input.map((s,i)=>[s,i]));
    const clusters=input.map((s,i)=>i>=2?s.split(input[1]).filter(Boolean).map(s=>labels.get(s)):[]);
    const phones=output.map((s,i)=>i>=1?s.split(input[1]).filter(s=>s&&s!=='<eps>'&&s!==input[1]&&s!=='_'):[]);
    const positions=new Uint32Array(count),counts=new Uint32Array(count),finals=new Float32Array(count);
    for(let i=0;i<count;i++){finals[i]=view.getFloat32(offset,true);offset+=4;counts[i]=i64();positions[i]=offset;offset+=counts[i]*16;}
    if(offset!==buffer.byteLength)throw new Error('DFCN UK G2P 模型长度不匹配');
    fst={view,start,count,labels,clusters,phones,positions,counts,finals};
    E.fst='';
  }
  const g2pCache = new Map();
  function g2p(spelling) {
    if(g2pCache.has(spelling))return g2pCache.get(spelling);
    if(!fst)return[];
    const f=fst,letters=Array.from(key(spelling),c=>f.labels.get(c));
    if(!letters.length||letters.some(x=>x===undefined||x<=2))return[];
    const initial=f.start,nodes=new Map([[initial,{cost:0,previous:-1,arc:0,depth:0,queued:true}]]),queue=[initial];
    for(let cursor=0;cursor<queue.length;cursor++){
      const current=queue[cursor],node=nodes.get(current);node.queued=false;
      const currentCost=node.cost,epsilonDepth=node.depth,at=Math.floor(current/f.count),state=current%f.count;
      for(let i=0;i<f.counts[state];i++){
        const arc=f.positions[state]+i*16,input=f.view.getInt32(arc,true),weight=f.view.getFloat32(arc+8,true);if(!Number.isFinite(weight))continue;
        let nextOffset=at;
        if(input!==0){const cluster=f.clusters[input];if(!cluster.length||at+cluster.length>letters.length||cluster.some((x,j)=>x!==letters[at+j]))continue;nextOffset+=cluster.length;}
        const nextState=f.view.getInt32(arc+12,true),nextKey=nextOffset*f.count+nextState,cost=currentCost+weight;
        let next=nodes.get(nextKey);if(next&&!(cost<next.cost))continue;
        const depth=input===0?epsilonDepth+1:0;if(depth>=f.count)return[];
        if(!next){next={cost:Infinity,queued:false};nodes.set(nextKey,next);}
        Object.assign(next,{cost,previous:current,arc,depth});if(!next.queued){next.queued=true;queue.push(nextKey);}
      }
    }
    let best=Infinity,final=Infinity;
    for(const[k,n]of nodes){if(Math.floor(k/f.count)!==letters.length)continue;const cost=n.cost+f.finals[k%f.count];if(cost<best||cost===best&&k<final){best=cost;final=k;}}
    if(!Number.isFinite(best))return[];
    const path=[];
    while(final!==initial){const node=nodes.get(final);if(!node||path.length>=nodes.size)return[];path.push(node.arc);final=node.previous;}
    const result=[];for(let i=path.length-1;i>=0;i--)result.push(...f.phones[f.view.getInt32(path[i]+4,true)]);
    if(g2pCache.size>=32768)g2pCache.clear();g2pCache.set(spelling,result);return result;
  }
  const phoneBase=s=>s.replace(/[012]$/,'');
  const rpVowel=s=>['AA','AE','AH','AO','AW','AY','EH','EY','IH','IY','OY','UH','UW','LOT','GOAT','NURSE','NEAR','SQUARE','CURE'].includes(phoneBase(s));
  const ipaMap={'ɪə':'NEAR','ɛə':'SQUARE','eə':'SQUARE','ɛː':'SQUARE','ʊə':'CURE','ɒ':'LOT','əʊ':'GOAT','əw':'GOAT','ɜː':'NURSE','ɜ':'NURSE','ɔː':'AO','ɒː':'AO','ɑː':'AA','ɑ':'AA','æ':'AE','a':'AE','ɐ':'AH','ʌ':'AH','ə':'AH','ɛ':'EH','e':'EH','ɪ':'IH','iː':'IY','ʊ':'UH','uː':'UW','ʉː':'UW','ʉ':'UW','aɪ':'AY','aj':'AY','aʊ':'AW','aw':'AW','eɪ':'EY','ej':'EY','ɔɪ':'OY','ɔj':'OY','p':'P','b':'B','t':'T','ʔ':'T','d':'D','k':'K','c':'K','g':'G','ɡ':'G','ɟ':'G','tʃ':'CH','dʒ':'JH','f':'F','v':'V','θ':'TH','ð':'DH','s':'S','z':'Z','ʃ':'SH','ʒ':'ZH','h':'HH','m':'M','ɱ':'M','n':'N','ɲ':'N','ŋ':'NG','l':'L','ɫ':'L','ʎ':'L','ɹ':'R','r':'R','j':'Y','w':'W'};
  function ipaToRp(tokens) {
    const out=[];
    for(let i=0;i<tokens.length;i++){
      let token=tokens[i],stress=token.startsWith('ˈ')?1:token.startsWith('ˌ')?2:-1;token=token.replace(/^[ˈˌ]/,'');
      const next=(tokens[i+1]||'').replace(/^[ˈˌ]/,''),palatal=token.includes('ʲ')||['c','cʰ','cʷ','ɟ','ɟʷ','ɲ','ʎ'].includes(token),syllabic=token.includes('̩');token=token.replace(/[ʰʷʲ̪̩]/g,'');let phone;
      if(['ɪ','iː'].includes(token)&&next==='ə'){phone='NEAR';i++;}
      else if(['ɛ','e'].includes(token)&&next==='ə'){phone='SQUARE';i++;}
      else if(['ʊ','ʉː','uː'].includes(token)&&next==='ə'){phone='CURE';i++;}
      else if(token==='i'){phone=stress>0?'IY':'IH';if(stress<0)stress=0;}
      else if(token==='ç'){out.push('HH');if(['ʉː','uː'].includes(next))phone='Y';else continue;}
      else phone=ipaMap[token];
      if(!phone)return[];if(token==='ə')stress=0;if(syllabic&&out.at(-1)!=='AH0')out.push('AH0');if(stress>=0&&rpVowel(phone))phone+=stress;out.push(phone);if(palatal&&['uː','ʉː'].includes(next))out.push('Y');
    }
    for(let i=0;i<out.length;)if(out[i]==='R'&&(i+1===out.length||i>0&&rpVowel(out[i-1])&&!rpVowel(out[i+1])))out.splice(i,1);else i++;
    return out;
  }
  const phone=s=>{let sound=s.toUpperCase(),stress=-1;if(/[012]$/.test(sound)){stress=+sound.at(-1);sound=sound.slice(0,-1);}if(sound==='AX'){sound='AH';stress=0;}return{sound,stress};};
  function vowel(p) {
    const s=p.sound;if(s==='AA'||s==='AE')return 0;if(s==='AH')return p.stress===0?1:0;
    return ({EH:1,IH:2,IY:2,AO:3,OW:3,LOT:3,GOAT:3,UH:4,UW:4,AY:5,EY:6,AW:7,OY:8,ER:9,NURSE:10,NEAR:11,SQUARE:12,CURE:13}[s]??-1);
  }
  const weakCV={'':'阿',B:'伯',P:'珀',M:'默',F:'弗',V:'弗',D:'德',DH:'德',T:'特',N:'纳',L:'勒',R:'拉',K:'克',G:'格',HH:'赫',S:'瑟',TH:'瑟',Z:'泽',SH:'舍',ZH:'热',CH:'切',JH:'杰',W:'沃',Y:'耶',KW:'奎',GW:'圭',NG:'恩'};
  const separate={P:'普',B:'布',T:'特',D:'德',DH:'德',K:'克',G:'格',F:'弗',V:'弗',S:'斯',Z:'斯',TH:'斯',SH:'什',ZH:'日',CH:'奇',JH:'吉',HH:'赫',R:'尔',L:'勒',M:'姆',N:'恩',NG:'昂',W:'沃',Y:'伊'};
  function transcribe(pronunciation) {
    if(!E)return'';const phones=pronunciation.filter(Boolean).map(phone);if(phones.some(p=>vowel(p)<0&&!E.rows[p.sound]))return'';
    const starts=pos=>{
      let nucleus=pos;while(nucleus<phones.length&&vowel(phones[nucleus])<0&&nucleus-pos<4)nucleus++;
      if(nucleus===phones.length||vowel(phones[nucleus])<0)return false;const length=nucleus-pos;if(!length||length>3)return false;
      const first=phones[pos].sound;if(length===1)return first!=='NG';const second=phones[pos+1].sound,palatal=[4,13].includes(vowel(phones[nucleus]));
      if(length===2){if(second==='Y'&&palatal&&E.palatal[first])return true;if(second==='R'&&['P','B','T','D','K','G','F','TH','SH'].includes(first))return true;if(second==='L'&&['P','B','K','G','F','S'].includes(first))return true;if(second==='W'&&['K','G','T','D','S','TH','HH'].includes(first))return true;return first==='S'&&['P','T','K','M','N','F'].includes(second);}
      if(first!=='S')return false;const third=phones[pos+2].sound;return third==='R'?['P','T','K'].includes(second):third==='L'?['P','K'].includes(second):third==='W'?second==='K':third==='Y'&&palatal&&['P','T','K'].includes(second);
    };
    const coda=pos=>pos<phones.length&&vowel(phones[pos])<0&&!starts(pos);
    const nasal=pos=>coda(pos)&&(['N','NG'].includes(phones[pos].sound)||phones[pos].sound==='M'&&pos+1<phones.length&&['P','B'].includes(phones[pos+1].sound));
    const syll=(onset,nucleus,n,weak)=>{
      const row=E.rows[onset]||E.rows[''];if(nucleus>=10){const central=nucleus-10;if(n){const col=[1,2,1,4][central];return row[n==='N'?1:2][col];}return E.central[onset]?.[central]||'';}
      if(n&&nucleus<5){if(weak&&n==='N'){if(['D','DH'].includes(onset))return'登';if(onset==='T')return'顿';}return row[n==='N'?1:2][nucleus];}
      if(n&&nucleus>=5&&nucleus<=8)return E.diphthong[onset]?.[n==='N'?0:1][nucleus-5]||'';
      let result=weak?weakCV[onset]:row[0][nucleus];if(n){if(nucleus===9&&onset)result=weakCV[onset];result+=n==='N'?'恩':'昂';}return result;
    };
    const basic=pos=>{let onset='',nucleusPos=pos;if(vowel(phones[pos])<0){if(pos+1>=phones.length||vowel(phones[pos+1])<0)return null;onset=phones[pos].sound;nucleusPos=pos+1;}return{onset,nucleus:vowel(phones[nucleusPos]),weak:phones[nucleusPos].sound==='AH'&&phones[nucleusPos].stress===0,consumed:nucleusPos-pos+1};};
    let result='';
    for(let pos=0;pos<phones.length;){
      let consumed=0,hanzi='';const choose=(n,text)=>{if(n>consumed){consumed=n;hanzi=text;}};
      for(const [expected,text,endCoda]of E.fixed){if(pos+expected.length>phones.length)continue;const match=expected.every((s,i)=>{const p=phone(s);return phones[pos+i].sound===p.sound&&(p.stress<0||phones[pos+i].stress===p.stress);});if(match&&(!endCoda||coda(pos+expected.length-1)))choose(expected.length,text);}
      if(pos+2<phones.length){const first=phones[pos].sound,second=phones[pos+1].sound,nucleus=vowel(phones[pos+2]);if(nucleus>=0){const weak=phones[pos+2].sound==='AH'&&phones[pos+2].stress===0,isNasal=nasal(pos+3),n=isNasal?(phones[pos+3].sound==='M'?'N':phones[pos+3].sound):'';
        if(second==='W'&&['K','G'].includes(first))choose(isNasal?4:3,syll(first==='K'?'KW':'GW',nucleus,n,weak));
        if(second==='Y'&&E.rows[first]&&[4,13].includes(nucleus)&&E.palatal[first])choose(isNasal?4:3,E.palatal[first][isNasal?(n==='N'?2:3):nucleus===13?1:0]);}}
      if(!consumed){const input=basic(pos);if(input){const isNasal=nasal(pos+input.consumed),n=isNasal?(phones[pos+input.consumed].sound==='M'?'N':phones[pos+input.consumed].sound):'';choose(input.consumed+(isNasal?1:0),syll(input.onset,input.nucleus,n,input.weak));}}
      if(consumed){result+=hanzi;pos+=consumed;}else result+=separate[phones[pos++].sound]||'';
    }
    return result;
  }
  const ipa=s=>ipaToRp(s.split(/\s+/));
  function grammatical(spelling,pos) {
    if(pos<0)return[];const noun=pos===0||pos===1,adjective=pos===2,verb=pos>=4&&pos<=8;
    if(spelling==='read'&&verb)return ipa(pos===6||pos===7?'ɹ ˈɛ d':'ɹ ˈiː d');
    if(spelling==='wound'){if(noun||adjective||verb&&pos!==6&&pos!==7)return ipa('w ˈuː n d');if(verb)return ipa('w ˈaʊ n d');}
    if(spelling==='lead'){if(verb)return ipa('l ˈiː d');if(noun)return ipa('l ˈɛ d');}
    if(spelling==='tear'){if(verb)return ipa('t ˈɛə');if(noun)return ipa('t ˈɪə');}
    if(spelling==='bow'){if(verb)return ipa('b ˈaʊ');if(noun)return ipa('b ˈəʊ');}
    if(spelling==='live'){if(adjective)return ipa('l ˈaɪ v');if(verb)return ipa('l ˈɪ v');}
    if(spelling==='minute'&&adjective)return ipa('m aɪ n j ˈuː t');if(spelling==='subject'&&adjective)return ipa('s ə b dʒ ˈɛ k t');
    const contrast=E?.contrasts[spelling];return contrast&&(verb||noun||adjective)?contrast[verb?1:0].split(' '):[];
  }
  function plural(phones) {if(!phones.length)return phones;const last=phoneBase(phones.at(-1));return [...phones,...(['S','Z','SH','ZH','CH','JH'].includes(last)?['IH0','Z']:['P','T','K','F','TH'].includes(last)?['S']:['Z'])];}
  function past(phones) {if(!phones.length)return phones;const last=phoneBase(phones.at(-1));return [...phones,...(['T','D'].includes(last)?['IH0','D']:['P','K','F','TH','S','SH','CH'].includes(last)?['T']:['D'])];}
  function grammaticalForm(spelling,pos) {
    let selected=grammatical(spelling,pos);if(selected.length)return selected;
    if((pos===1||pos===5)&&spelling.endsWith('s')){selected=grammatical(spelling.slice(0,-1),pos===1?0:4);if(selected.length)return plural(selected);}return[];
  }
  function dictionaryWord(spelling,pos=-1) {
    const alternatives=E?.dictionary[spelling];if(!alternatives?.length)return[];
    const selected=grammaticalForm(spelling,pos);if(selected.length){for(const alternative of alternatives){const phones=alternative.split(' ');if(phones.length===selected.length&&phones.every((p,i)=>phoneBase(p)===phoneBase(selected[i])))return phones;}return selected;}
    return alternatives[0].split(' ');
  }
  const knownStem=(spelling,pos)=>{const p=dictionaryWord(spelling,pos);return p.length?p:grammaticalForm(spelling,pos);};
  function morphology(spelling,pos) {
    if(spelling.length<4)return[];
    if(spelling.endsWith("'s"))return plural(pronunciation(spelling.slice(0,-2),pos));if(spelling.endsWith("s'"))return pronunciation(spelling.slice(0,-1),pos);
    const mayPlural=pos<0||pos===1||pos===5,stemPos=pos===1?0:pos===5?4:pos;
    if(mayPlural&&spelling.endsWith('ies')&&spelling.length>4){const base=knownStem(spelling.slice(0,-3)+'y',stemPos);if(base.length)return plural(base);}
    if(mayPlural&&spelling.endsWith('s')&&!spelling.endsWith('ss')){let base=knownStem(spelling.slice(0,-1),stemPos);if(!base.length&&spelling.endsWith('es'))base=knownStem(spelling.slice(0,-2),stemPos);if(base.length)return plural(base);}
    const isPast=spelling.endsWith('ed')&&(pos<0||pos===6||pos===7),progressive=spelling.endsWith('ing')&&(pos<0||pos===8);
    if(isPast||progressive){const raw=spelling.slice(0,isPast?-2:-3);let base=knownStem(raw,4);if(!base.length)base=knownStem(raw+'e',4);if(!base.length&&raw.length>=4&&raw.at(-1)===raw.at(-2))base=knownStem(raw.slice(0,-1),4);if(!base.length&&isPast&&raw.endsWith('i'))base=knownStem(raw.slice(0,-1)+'y',4);if(base.length)return isPast?past(base):[...base,'IH0','NG'];}
    return[];
  }
  function pronunciation(spelling,pos=-1,roots=[]) {
    let known=dictionaryWord(spelling,pos);if(known.length)return known;known=grammaticalForm(spelling,pos);if(known.length)return known;known=morphology(spelling,pos);if(known.length)return known;
    if(roots.length>1&&roots.map(r=>key(r.english)).join('')===spelling){const parts=roots.map(r=>pronunciation(key(r.english),r.pos));if(parts.every(p=>p.length))return parts.flat();}
    return ipaToRp(g2p(spelling));
  }
  const fixedEnglish={hampton:'汉普顿',field:'菲尔德',campbell:'坎贝尔',panorama:'帕诺拉马','snow hill':'斯诺希尔'};
  function englishPhonetic(source,slots) {
    const text=String(source).trim();if(fixedEnglish[key(text)])return fixedEnglish[key(text)];if(!E)return text;
    const hints=[];
    if(slots){if(slots[0]?.english&&slots[1]?.english)hints.push({english:slots[0].english+slots[1].english,pos:-1,roots:[slots[0],slots[1]]});else for(const i of[0,1])if(slots[i]?.english)hints.push(slots[i]);
      if(slots[2]?.english||slots[3]?.english||slots[5]?.english){hints.push({english:'the',pos:-1});for(let i=2;i<=5;i++)if(slots[i]?.english)hints.push(slots[i]);}if(slots[6]?.english)hints.push({english:'of',pos:-1},slots[6]);}
    let hintIndex=0;const components=[];
    for(const match of text.matchAll(/[a-zA-Z'][a-zA-Z']*|[^\s]/g)){
      const token=match[0];if(!/[a-zA-Z]/.test(token)){components.push({literal:true,spelling:token});continue;}
      const spelling=key(token),candidate=hints[hintIndex++],hint=candidate&&key(candidate.english)===spelling?candidate:null,pos=hint?.pos??-1;
      if(hint?.roots?.length>1&&!dictionaryWord(spelling,pos).length&&!grammaticalForm(spelling,pos).length&&!morphology(spelling,pos).length)components.push(...hint.roots.map(r=>({spelling:key(r.english),pos:r.pos})));
      else components.push({spelling,pos});
    }
    const particle=c=>c.pos<0&&['the','a','an','of'].includes(c.spelling),hasContent=components.some(c=>!c.literal&&!particle(c));
    return components.map(c=>c.literal?c.spelling:hasContent&&particle(c)?'':fixedEnglish[c.spelling]||transcribe(pronunciation(c.spelling,c.pos))||c.spelling).join('');
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    for (const row of D.lexicon) {
      const [english, preferred, full, kind, category, action, state] = row.map(S);
      const e = {english: key(english), preferred, full: full || preferred, kinds: kinds(kind), categories: labels(category), action, state: key(state)};
      e.order = [e.english, labels(kind).join('|'), e.categories.join('|'), e.state, e.preferred, e.full, e.action].join('\t');
      if (!words.has(e.english)) words.set(e.english, []);
      words.get(e.english).push(e);
    }
    for (const es of words.values()) es.sort((a, b) => a.order < b.order ? -1 : a.order > b.order ? 1 : 0);
    for (const row of D.classes) {
      const [name, parent, traits] = row.map(S);
      classes.set(name, {parent, traits: labels(traits), ancestry: []});
    }
    for (const [name, c] of classes) {
      for (let ancestor = name; ancestor; ancestor = classes.get(ancestor).parent) {
        c.ancestry.push(ancestor);
        if (ancestor !== name) c.traits.push(...classes.get(ancestor).traits);
      }
      c.traits = [...new Set(c.traits)].sort();
    }
    for (const row of D.surnames) {
      const [sense, core, modifier, head, action, agent, compact, balanced, families, type, traits, valency, identity, full, objects, subjects, imagery] = row.map(S);
      const e = {sense, core, modifier, head, action, agent, compact, balanced, families: labels(families), type, traits: [...new Set([...labels(traits), ...classes.get(type).traits])].sort(), valency, identity, full, objects: labels(objects), subjects: labels(subjects), imagery};
      const old = surnames.get(sense);
      if (!old || [core,modifier,head,action,agent,compact,balanced].join('\t') < [old.core,old.modifier,old.head,old.action,old.agent,old.compact,old.balanced].join('\t')) surnames.set(sense, e);
      if (full) lexicalWords.add(full);
      if (identity) lexicalWords.add(identity);
    }
    const branches = D.branches.map(r => ({traits: labels(S(r[0])), single: S(r[1]).split('|'), double: S(r[2]).split('|'), singleUse: S(r[3]), doubleUse: S(r[4]), singleInterpretation: S(r[5]), doubleInterpretation: S(r[6]), forms: r[7], preference: r[8]}));
    for (const row of D.imagery) {
      const [sense, relation, role, partners] = row.slice(0, 4).map(S);
      const index = sense + '\t' + relation + '\t' + role;
      if (!images.has(index)) images.set(index, new Map());
      const map = images.get(index);
      for (const partner of labels(partners)) {
        if (!map.has(partner)) map.set(partner, []);
        map.get(partner).push(branches[row[4]]);
      }
    }
    for (const r of D.constructions) {
      const rule = {relation: S(r[0]), context: S(r[1]), leftRole: S(r[2]), rightRole: S(r[3]), direction: S(r[4]), ending: S(r[5]), leftKinds: r[6], rightKinds: r[7], leftTraits: labels(S(r[8])), rightTraits: labels(S(r[9])), forms: labels(S(r[10])), naturalness: r[11], preference: r[12]};
      for (const a of labels(S(r[13]))) for (const b of labels(S(r[14]))) {
        const index = a + '\t' + b;
        if (!rules.has(index)) rules.set(index, []);
        rules.get(index).push(rule);
      }
    }
  }

  function original(s) {
    const text = String(s ?? '').trim();
    return {text, short: text, full: text, english: key(text), action: '', state: '', order: '', rootLeft: '', rootRight: '', source: '', core: '', modifier: '', head: '', agent: '', compact: '', balanced: '', sourceAction: '', sourceFull: '', erIdentity: '', sense: '', kinds: 0, categories: [], families: [], known: false, complete: false, roots: 0, score: 0};
  }
  const finish = (p, text, score) => Object.assign(p, {text, short: text, full: text, score});
  const better = (a, b) => a.known !== b.known ? a.known : !a.known ? false : a.complete !== b.complete ? a.complete : a.score > b.score || (a.score === b.score && a.order < b.order);
  const group = (a, b) => !b ? a : a ? a + '·' + b : b;
  const override = s => {
    const p = original(s), target = D.overrides[p.english];
    return target ? Object.assign(p, {text: target, short: target, full: target, kinds: O, known: true, complete: true, roots: 1, order: '=' + p.english}) : p;
  };
  function variants(s, lexical = false) {
    if (!lexical) { const p = override(s); if (p.known) return [p]; }
    return (words.get(key(s)) || []).map(e => Object.assign(original(s), {text: e.full, full: e.full, short: e.preferred, english: e.english, source: e.preferred, action: e.action, state: e.state, order: e.order, kinds: e.kinds, categories: e.categories, known: true, complete: true, roots: 1}));
  }
  function roleScore(p, role = 'plain') {
    let score = 0;
    const add = (kind, value) => { if (has(p, kind)) score = Math.max(score, value); };
    if (role === 'modifier') { add(Q,95); add(T,90); add(P,85); add(O,55); }
    else { add(O,75); add(G,role === 'head' ? 80 : 70); add(Q|T,65); add(A,role === 'of' ? 80 : 50); add(P,30); }
    return score;
  }
  function literal(s, role = 'plain') {
    let best = original(s);
    for (const p of variants(s)) { p.score = roleScore(p, role); if (role === 'modifier') p.text = p.short; if (better(p, best)) best = p; }
    return best;
  }
  function combine(l, r) {
    const p = {...r, known: l.known || r.known, complete: l.complete && r.complete, roots: l.roots + r.roots, english: l.english + r.english, order: l.order + '\n' + r.order};
    const a = l.short, b = r.short;
    if (!p.complete) return finish(p, l.text + ' ' + r.text, 0);
    if (has(l,P)) {
      let prefix = a;
      if (['un','non','in','im','ir','il'].includes(l.english)) prefix = has(r,A) || r.state === 'result' ? '未' : has(r,Q|T) ? '不' : has(r,O|G) ? '无' : prefix;
      return finish(p,prefix+b,118);
    }
    if (has(r,G) && r.action && has(l,O) && !has(l,Q|T)) { p.kinds = G; return finish(p,r.action+a+'者',135); }
    if (has(l,A) && cat(l,'transitive') && has(r,O)) { p.kinds=A; return finish(p,(l.action||a)+b,125); }
    if (has(l,O) && has(r,A) && cat(r,'intransitive')) { p.kinds=T; return finish(p,a+(r.action||b),125); }
    if (has(l,Q|T) && has(r,O|G)) return finish(p,a+b,120);
    if (has(l,Q|T) && has(r,A)) return finish(p,l.full+'的'+r.full,110);
    if (has(l,O) && has(r,O)) {
      const physical = ['artifact','weapon','armor','body','building'].some(c=>cat(r,c));
      const countable = physical || ['creature','plant','person','food'].some(c=>cat(r,c));
      const direct = cat(l,'material') && physical || cat(l,'number') && countable || cat(r,'body') && ['nature','celestial','landscape','plant','creature'].some(c=>cat(l,c));
      return finish(p,direct?a+b:l.full+'与'+r.full,direct?115:105);
    }
    if (has(l,O) && has(r,A) && cat(r,'transitive')) return finish(p,l.full+'与'+r.full,100);
    if (has(l,G) && has(r,O)) return finish(p,l.full+'之'+b,100);
    if (has(l,Q|T) && has(r,Q|T)) return finish(p,l.full+'而'+r.full,90);
    return finish(p,l.full+'与'+r.full,has(l,O)&&has(r,Q|T|A)?85:70);
  }
  function splits(s) {
    const folded = key(s), out = [];
    if (folded.length > 512) return out;
    for (let cut=1; cut<folded.length;cut++) {
      const right = folded[cut] === '-' ? cut+1 : cut;
      if (right >= folded.length || /\s/.test(folded[cut-1]) || /\s/.test(folded[right]) || folded[cut-1] === '-') continue;
      out.push([folded.slice(0,cut),folded.slice(right)]);
    }
    return out;
  }
  function compound(s) {
    const exact = literal(s); if (exact.known) return exact;
    let best = original(s); const f = key(s);
    if (f.length>1 && f.startsWith('-') !== f.endsWith('-')) {
      const side = literal(f.startsWith('-') ? String(s).trim().slice(1) : String(s).trim().slice(0,-1));
      if (side.known) { finish(side,f.startsWith('-')?'-'+side.text:side.text+'-',0); side.english=f;side.complete=false;return side; }
    }
    for (const [a,b] of splits(s)) {
      if (!(words.has(a)||D.overrides[a]) || !(words.has(b)||D.overrides[b])) continue;
      for (const l of variants(a)) for (const r of variants(b)) {
        const p = combine(l,r); p.rootLeft=l.english;p.rootRight=r.english;
        if (better(p,best)) best=p;
      }
    }
    return best;
  }
  const erAgent = p => has(p,G) && /ers?$/.test(p.english);
  const actorLicensed = p => has(p,G) && (erAgent(p)||p.action||[p.agent,p.core,p.source,p.sourceFull].some(s=>s.endsWith('者')));
  function surnameVariants(s, lexical=false) {
    if (!lexical) { const p=override(s); if(p.known){p.core=p.text;if(width(p.text)===1)p.compact=p.text;if(width(p.text)===2)p.balanced=p.text;return[p];} }
    return variants(s,lexical).map(p=>{
      const e=surnames.get(senseKey(p.english,p.kinds,p.categories,p.state,p.source));
      if(!e)return p;
      p.sense=e.sense;p.sourceAction=p.action;p.sourceFull=p.full;
      p.text=p.short=p.full=p.core=e.core;p.modifier=e.modifier;p.head=e.head;p.action=e.action;p.agent=e.agent;p.compact=e.compact;p.balanced=e.balanced;p.families=e.families;
      if(has(p,G)&&(erAgent(p)||p.core.endsWith('者')||p.agent.endsWith('者'))){
        p.erIdentity=[p.agent,p.core,p.sourceFull].find(s=>s.endsWith('者')&&width(s)===3)||'';
        if(!p.erIdentity){const action=[p.action,p.sourceAction].find(s=>width(s)===2);if(action)p.erIdentity=action+'者';}
      }
      return p;
    });
  }

  // The original tone dictionary, word readings and two metrical hypotheses.
  function syllable(token,char) {
    let base='',tone=0,written=false;
    const invalid = () => ({char,base:'',initial:'',final:'',tone:0,certain:false});
    for(const ch of token.normalize('NFD')) {
      if(/[a-zA-Z]/.test(ch)){base+=ch.toLowerCase();continue;}
      if(ch==='\u0308'){if(!base.endsWith('u'))return invalid();base=base.slice(0,-1)+'v';continue;}
      if(ch==='\u0302'){if(!base.endsWith('e'))return invalid();base=base.slice(0,-1)+'ê';continue;}
      const t={'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4}[ch] ?? (/^[1-5]$/.test(ch)?(+ch===5?0:+ch):null);
      if(t===null||written&&tone!==t)return invalid();tone=t;written=true;
    }
    let initial='',final=base;
    if(base.startsWith('y')){const rest=base.slice(1);final=['i','in','ing'].includes(rest)?rest:rest.startsWith('u')?'v'+rest.slice(1):'i'+rest;}
    else if(base.startsWith('w')){const rest=base.slice(1);final=rest==='u'?rest:'u'+rest;}
    else if(!['m','n','ng'].includes(base)){
      initial=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s'].find(s=>base.startsWith(s))||'';
      final=base.slice(initial.length);
      if(['j','q','x'].includes(initial)&&final.startsWith('u'))final='v'+final.slice(1);
      if(final==='iu')final='iou';else if(final==='ui')final='uei';else if(final==='un')final='uen';
      else if(final==='i'){if(['z','c','s'].includes(initial))final='i-apical-front';else if(['zh','ch','sh','r'].includes(initial))final='i-apical-back';}
    }
    return {char,base,initial,final,tone,certain:!!base};
  }
  const sameSound=(a,b)=>a.base===b.base&&a.tone===b.tone;
  function wordReading(text) {
    const chars=Array.from(text),out=[];
    for(let cursor=0;cursor<chars.length;){
      let matched=0,chosen=[];
      for(let length=Math.min(6,chars.length-cursor);length>1;length--){
        const reading=D.phrases[chars.slice(cursor,cursor+length).join('')];if(!reading)continue;
        for(const alt of reading.split('\n')){
          const parts=alt.trim().split(/\s+/);if(parts.length!==length)continue;
          const candidate=parts.map((p,i)=>syllable(p,chars[cursor+i]));if(candidate.some(s=>!s.base))continue;
          if(!chosen.length)chosen=candidate;else chosen.forEach((s,i)=>s.certain&&=sameSound(s,candidate[i]));
        }
        if(chosen.length){matched=length;break;}
      }
      if(matched){out.push(...chosen);cursor+=matched;continue;}
      const char=chars[cursor++];const raw=char==='之'?'zhī':char==='者'?'zhě':D.characters[char]||'';
      let sound={char,base:'',initial:'',final:'',tone:0,certain:false};
      for(const alt of raw.split(/[\n,]/).filter(Boolean)){
        const s=syllable(alt.trim(),char);if(!s.base)continue;
        if(!sound.base)sound=s;else sound.certain&&=sameSound(sound,s);
      }
      out.push(sound);
    }
    return out;
  }
  function pronounce(text,context='') {
    const k=text+'\0'+context;if(readingCache.has(k))return readingCache.get(k);
    const out=wordReading(text);
    if(out.length===1&&context&&context!==text){
      const matches=wordReading(context).filter(s=>s.char===out[0].char);
      if(matches.length&&matches.every(s=>s.certain&&sameSound(s,matches[0])))out[0]=matches[0];
    }
    if(readingCache.size>=32768)readingCache.delete(readingCache.keys().next().value);
    readingCache.set(k,out);return out;
  }
  function prosody(first,second,link='',ending='',relation='nominal',firstContext='',secondContext='',firstActor=false,secondActor=false) {
    const units=[],counts=[0,0,0];
    const append=(text,word,actor,structural,context)=>{
      const sounds=pronounce(text,context);
      sounds.forEach((sound,i)=>{const suffix=actor&&i===sounds.length-1&&sound.char==='者';units.push({sound,word,support:structural||suffix,actor:suffix});if(!structural&&!suffix)counts[word]++;});
    };
    append(first,1,firstActor,false,firstContext);append(link,0,false,true,'');append(second,2,secondActor,false,secondContext);append(ending,0,ending==='者',true,'');
    if(!counts[1]||!counts[2])return -24;
    const prominent=u=>!u.support&&(!u.sound.certain||u.sound.tone!==0);
    const target=['verb_object','subject_verb','coordinate'].includes(relation)?2:1;
    let primary=units.findIndex(u=>u.word===target&&prominent(u));if(primary<0)primary=units.findIndex(prominent);
    const analyse=connected=>{
      const plans=Array.from({length:units.length+1},()=>({cost:1e6,feet:[]}));plans[0].cost=0;
      for(let begin=0;begin<units.length;begin++)for(let length=1;length<=3&&begin+length<=units.length;length++){
        const end=begin+length,head=primary>=begin&&primary<end?primary:units.findIndex((u,i)=>i>=begin&&i<end&&prominent(u));
        let cost=length===1?(units[begin].support?9:begin===primary?10:3):length===3?(units[end-1].actor?1:5):0;
        for(let i=begin;i<end;i++)if(units[i].support)cost++;
        if(head<0)cost+=6;
        for(let i=begin+1;i<end;i++)if(units[i-1].word&&units[i].word&&units[i-1].word!==units[i].word&&(counts[1]>1||counts[2]>1))cost+=connected?3:6;
        cost+=plans[begin].cost;if(cost>=plans[end].cost)continue;
        plans[end]={cost,feet:[...plans[begin].feet,{begin,end,head}]};
      }
      const result={...plans[units.length],primary,secondary:[],tones:units.map(u=>u.sound.tone)};
      if(primary>=0)for(const foot of result.feet){if(foot.head>=0&&foot.head!==primary&&units[foot.head].word!==units[primary].word){result.secondary.push(foot.head);break;}}
      const sameFoot=(a,b)=>result.feet.some(f=>a>=f.begin&&a<f.end&&b>=f.begin&&b<f.end);
      for(let i=0;i+1<units.length;i++){
        const a=units[i].sound,b=units[i+1].sound;if(!a.certain||!b.certain||b.tone<1||b.tone>4||!connected&&!sameFoot(i,i+1))continue;
        if(a.char==='不'&&a.tone===4&&b.tone===4)result.tones[i]=2;
        if(a.char==='一'&&a.tone===1&&!(i&&units[i-1].sound.char==='第'&&units[i-1].word===units[i].word))result.tones[i]=b.tone===4?2:4;
      }
      const before=[...result.tones];for(let i=0;i+1<units.length;i++)if(units[i].sound.certain&&units[i+1].sound.certain&&before[i]===3&&before[i+1]===3&&(connected||sameFoot(i,i+1)))result.tones[i]=2;
      return result;
    };
    const a=analyse(false),b=analyse(true);
    const boundary=a.feet.filter(f=>!b.feet.some(g=>f.begin===g.begin&&f.end===g.end)).length;
    const prominence=(a.primary===b.primary?0:1)+a.secondary.filter(x=>!b.secondary.includes(x)).length+b.secondary.filter(x=>!a.secondary.includes(x)).length;
    const soundRank=analysis=>{
      let collision=0,echo=0;
      for(let i=1;i<units.length;i++){
        const x=units[i-1],y=units[i];if(!x.sound.certain||!y.sound.certain||!x.sound.base||!y.sound.base||x.word===y.word)continue;
        if(x.sound.base===y.sound.base)collision+=analysis.tones[i-1]===analysis.tones[i]?(x.sound.char===y.sound.char?2:3):1;
        else {if(x.sound.final&&x.sound.final===y.sound.final)echo++;if(x.sound.initial&&x.sound.initial===y.sound.initial)echo++;}
      }
      return -Math.min(6,collision)-Math.min(2,echo);
    };
    return -Math.max(a.cost,b.cost)-Math.min(3,boundary)-Math.min(2,prominence)+Math.trunc((soundRank(a)+soundRank(b))/2)+(!link&&counts[1]===2&&counts[2]===2&&['nominal','property','attribute'].includes(relation)?3:0);
  }

  function contextWords(self,partner,relation,role) {
    const e=surnames.get(self.sense),other=surnames.get(partner.sense);if(!e||!other)return[];
    const index=images.get(e.imagery+'\t'+relation+'\t'+role);if(!index)return[];
    for(const ancestor of classes.get(other.type).ancestry){
      const branches=index.get(ancestor);if(!branches)continue;
      let specificity=-1,out=[];
      for(const branch of branches){
        if(!includes(branch.traits,other.traits))continue;
        if(branch.traits.length>specificity){specificity=branch.traits.length;out=[];}else if(branch.traits.length<specificity)continue;
        out.push(...branch.single.map(text=>({text,use:branch.singleUse,interpretation:branch.singleInterpretation,branch})),...branch.double.map(text=>({text,use:branch.doubleUse,interpretation:branch.doubleInterpretation,branch})));
      }
      if(specificity>=0)return out;
    }
    return[];
  }
  function argument(predicate,arg,subject) {
    const v=surnames.get(predicate.sense),n=surnames.get(arg.sense);
    return !!(v&&n&&labels(v.valency).includes(subject?'intransitive':'transitive')&&classes.get(n.type).ancestry.some(t=>(subject?v.subjects:v.objects).includes(t)));
  }
  const relationType=r=>r==='property'||r==='prefix'?'attribute':['verb_object','subject_verb','coordinate'].includes(r)?r:'nominal';
  const completeWord=(w,e)=>w.text===e.full||w.text===e.identity;
  const roleWord=(w,e,role)=>w.text===e.core||w.text===({modifier:e.modifier,head:e.head,patient:e.head,subject:e.head,action:e.action,stem:e.agent}[role])||role==='stem'&&w.text===e.identity;
  function naturalness(x,y,a,b,rule,pattern,text) {
    const word=(w,e,role)=>(completeWord(w,e)?6:roleWord(w,e,role)?3:lexicalWords.has(w.text)?2:0)+(['natural','complete','nominal'].includes(w.use)?2:0)-(w.use==='restricted'?4:0)-(w.interpretation==='property'&&!completeWord(w,e)?1:0);
    let score=word(x,a,rule.leftRole)+word(y,b,rule.rightRole);if(lexicalWords.has(text))return score+6;
    const dependent=(w,e)=>['bound','restricted','stem'].includes(w.use)&&!completeWord(w,e)&&!lexicalWords.has(w.text);
    const fragments=+dependent(x,a)+ +dependent(y,b);
    if(!pattern.link&&!rule.ending&&!['verb_object','subject_verb','prefix'].includes(rule.relation))score-=fragments*3+(fragments===2?2:0);
    return score;
  }
  const patterns=[['11','',1,1,1],['12','',1,2,2],['21','',2,1,4],['22','',2,2,8],['11z','之',1,1,16],['12z','之',1,2,32],['21z','之',2,1,64]].map(([form,link,a,b,bit])=>({form,link,a,b,bit}));
  function composed(head,l,r,text,english,score) {
    const p={...head,english,known:l.known&&r.known,complete:l.complete&&r.complete,roots:l.roots+r.roots,rootLeft:l.english,rootRight:r.english,order:l.order+'\n'+r.order};
    finish(p,text,score);p.source=p.sourceFull=p.core=p.modifier=p.head=p.agent=text;p.compact=width(text)===1?text:'';p.balanced=width(text)===2?text:'';p.sourceAction=p.action=has(p,A)?text:'';p.erIdentity='';return p;
  }
  function surnameCombine(left,right,entity=false) {
    let best=original(left.english+right.english),bestPreference=0,bestWidth=0;
    const ae=surnames.get(left.sense),be=surnames.get(right.sense);
    const fallback=()=>{
      if(entity)return original(left.english+right.english);
      return Object.assign(finish(original(left.english+right.english),(ae?ae.full:left.full)+(be?be.full:right.full),-100000000),{known:left.complete&&right.complete,complete:left.complete&&right.complete,roots:left.roots+right.roots,rootLeft:left.english,rootRight:right.english,order:left.order+'\n'+right.order});
    };
    if(!ae||!be||entity&&(left.roots>1||right.roots>1))return fallback();
    const actor=!entity&&!!(actorLicensed(left)||actorLicensed(right));
    const compose=(a,b,reversed)=>{
      const aE=surnames.get(a.sense),bE=surnames.get(b.sense);
      for(const aClass of classes.get(aE.type).ancestry)for(const bClass of classes.get(bE.type).ancestry)for(const rule of rules.get(aClass+'\t'+bClass)||[]){
        if(reversed&&rule.direction!=='either'||!has(a,rule.leftKinds)||!has(b,rule.rightKinds)||!includes(rule.leftTraits,aE.traits)||!includes(rule.rightTraits,bE.traits))continue;
        if(entity&&(rule.ending||rule.relation==='agent')||actor!==(rule.relation==='agent'))continue;
        if(rule.relation==='agent'&&(reversed||rule.ending!=='者'||has(a,G)&&!aE.identity||has(b,G)&&!bE.identity))continue;
        if(rule.relation==='verb_object'&&!argument(a,b,false)||rule.relation==='subject_verb'&&!argument(b,a,true))continue;
        if(rule.relation==='property'&&(has(a,T)||has(b,T))){const state=has(a,T)?aE:bE,head=has(a,T)?bE:aE,allowed=labels(state.valency).includes('transitive')?state.objects:state.subjects;if(!classes.get(head.type).ancestry.some(t=>allowed.includes(t)))continue;}
        const first=contextWords(a,b,rule.context,rule.leftRole),second=contextWords(b,a,rule.context,rule.rightRole);
        for(const pattern of patterns){
          if(!rule.forms.includes(pattern.form)||entity&&(pattern.link||pattern.a!==pattern.b))continue;
          for(const x of first)for(const y of second){
            if(rule.relation==='coordinate'&&(x.use==='restricted'||y.use==='restricted'))continue;
            if(rule.relation==='verb_object'&&x.use==='nominal'||rule.relation==='subject_verb'&&y.use==='nominal')continue;
            if(width(x.text)!==pattern.a||width(y.text)!==pattern.b)continue;
            if(entity&&(/[者之]/.test(x.text+y.text)||x.text.endsWith('的')||y.text.endsWith('的')))continue;
            if(!(x.branch.forms&pattern.bit)||!(y.branch.forms&pattern.bit))continue;
            if(pattern.link&&(rule.ending||x.use==='restricted'||y.use==='restricted'))continue;
            if(rule.ending&&(pattern.a!==1||pattern.b!==1))continue;
            if(x.text.includes('者')&&!aE.full.includes('者')||y.text.includes('者')&&!bE.full.includes('者'))continue;
            const preservation=(x.interpretation==='direct'?2:1)+(y.interpretation==='direct'?2:1);
            const preference=rule.preference+x.branch.preference+y.branch.preference;
            const relation=relationType(rule.relation);
            let pronunciation=prosody(x.text,y.text,pattern.link,rule.ending,relation,aE.full,bE.full);
            if(entity&&pronunciation< -3)continue;
            if(!pattern.link&&pattern.a===2&&pattern.b===2&&['nominal','attribute'].includes(relation))pronunciation-=3;
            const text=x.text+pattern.link+y.text+rule.ending;
            const score=rule.naturalness*4+preservation*6+naturalness(x,y,aE,bE,rule,pattern,text)*4+clamp(pronunciation,-48,12)*2;
            const w=width(text);
            if(best.known&&(score<best.score||score===best.score&&(preference<bestPreference||preference===bestPreference&&(w>bestWidth||w===bestWidth&&text>=best.text))))continue;
            best=Object.assign(finish({...b},text,score),{known:left.complete&&right.complete,complete:left.complete&&right.complete,roots:left.roots+right.roots,english:left.english+right.english,rootLeft:left.english,rootRight:right.english,order:left.order+'\n'+right.order});
            bestPreference=preference;bestWidth=w;
            if(entity){const formatted=composed(best,left,right,text,best.english,score);best={...formatted,order:best.order};}else best.sense='';
          }
        }
      }
    };
    compose(left,right,false);if(!actor)compose(right,left,true);
    return best.known?best:fallback();
  }
  function surname(s) {
    const source=String(s).trim();if(surnameCache.has(source))return surnameCache.get(source);
    const recognized=compound(source);let best=original(source);
    if(!recognized.known||!recognized.complete)best=recognized;
    else if(override(source).known)best=override(source);
    else if(recognized.roots===1){
      for(const p of surnameVariants(source)){const e=surnames.get(p.sense);if(e)finish(p,has(p,G)?e.identity:e.full,roleScore(p));else p.score=roleScore(p);if(better(p,best))best=p;}
    }else{
      for(const a of surnameVariants(recognized.rootLeft))for(const b of surnameVariants(recognized.rootRight)){const p=surnameCombine(a,b);if(better(p,best))best=p;}
      if(!best.known)best=recognized;
    }
    if(surnameCache.size>=32768)surnameCache.delete(surnameCache.keys().next().value);
    surnameCache.set(source,best);return best;
  }
  function nameOverride(s) {
    const p=override(s);if(!p.known)return p;
    const source=String(s).trim(),split=source.indexOf(' '),dot=p.text.indexOf('·');
    if(split<=0||source.indexOf(' ',split+1)>=0||dot<=0||p.text.indexOf('·',dot+1)>=0)return surname(s);
    const tail=surname(source.slice(split+1));if(tail.known&&tail.complete)finish(p,p.text.slice(0,dot)+'·'+tail.text,p.score);return p;
  }

  function appendEntity(out,p) {
    if(!p.known||!p.complete)return;
    const old=out.findIndex(q=>q.text===p.text&&q.kinds===p.kinds&&q.state===p.state&&q.categories.join('|')===p.categories.join('|')&&q.families.join('|')===p.families.join('|'));
    if(old<0)out.push(p);else if(better(p,out[old]))out[old]=p;
  }
  const entityResult=parts=>{let best=original('');for(const p of parts)if(p.known&&p.complete&&better(p,best))best=p;return best.known?best.text:null;};
  function entityJoin(left,right) {
    const out=[];for(const a of left)for(const b of right){appendEntity(out,surnameCombine(a,b,true));appendEntity(out,surnameCombine(b,a,true));}return out;
  }
  function entityParts(source,pos=-1) {
    const s=String(source).trim();if(!s)return[];
    let mask=O|Q|A|T|G|P;if(pos>=0)mask=pos<2?O|G:pos===2?Q|T:pos===3?P:pos<=8?A|T:0;
    const out=[],exact=surnameVariants(s,true);
    if(exact.length){for(const p of exact){p.kinds&=mask;if(!p.kinds||!p.text||/[之者]/.test(p.text)||p.text.endsWith('的'))continue;p.score=roleScore(p);appendEntity(out,p);}return out;}
    if(pos>=0)return[];
    for(const[a,b]of splits(s))for(const l of surnameVariants(a,true))for(const r of surnameVariants(b,true)){appendEntity(out,surnameCombine(l,r,true));appendEntity(out,surnameCombine(r,l,true));}
    return out;
  }
  function surnameForms(p,role) {
    if(role==='head'&&has(p,G))role='agent';const out=[];
    const add=text=>{if(!text||text.endsWith('的'))return;const full=text,actor=['agent','stem'].includes(role)&&has(p,G)&&text.endsWith('者');if(actor)text=text.slice(0,-1);const w=width(text);if(w<1||w>2||role==='stem'&&w!==1||role==='agent'&&erAgent(p)&&!actor)return;if(!out.some(s=>s.text===text&&s.actor===actor))out.push({text,actor,full});};
    if(role==='modifier')add(p.modifier);else if(role==='head')add(p.head);else if(role==='action'){add(p.sourceAction);add(p.action);return out;}
    else if(role==='agent'){add(p.erIdentity);add(p.agent);}else if(role==='stem'){if(actorLicensed(p))[p.source,p.agent,p.core,p.sourceFull,p.compact].forEach(add);return out;}
    add(p.core);if(role!=='agent')[p.sourceFull,p.balanced,p.compact].forEach(add);else if(/[者人士师主王君官工匠手徒客卫兵将使仆奴巫僧民医伯侯家公贤]$/.test(p.balanced))add(p.balanced);return out;
  }
  function wordFit(p,role,w) {
    const text=w.text+(w.actor?'者':'');if(role==='action'&&text===p.sourceAction)return 10;
    if(text===({modifier:p.modifier,head:p.head,action:p.action,agent:p.agent}[role]))return 8;
    if(text===p.source||text===p.sourceFull)return 8;if(text===p.compact||text===p.balanced)return 6;return text===p.core?4:0;
  }
  function phraseJoin(left,right) {
    const out=entityJoin(left,right);if(out.length)return out;
    const physical=p=>family(p,['body','weapon','armor','artifact','building'])||['body','weapon','armor','artifact','building'].some(c=>cat(p,c));
    const natural=p=>family(p,['nature','weather','celestial','light','shadow','landscape','plant','creature']);
    const forms=(p,role)=>{if(p.roots>1)return[{text:p.text,actor:false}];const ws=surnameForms(p,role);if(!ws.length&&!p.text.endsWith('的')&&!p.text.includes('者'))ws.push({text:p.text,actor:false});return ws;};
    const add=(a,ar,b,br,head,relation)=>{
      if(relation==='verb_object'&&!argument(a,b,false)||relation==='subject_verb'&&!argument(b,a,true))return;
      for(const x of forms(a,ar))for(const y of forms(b,br)){
        if(x.actor||y.actor)continue;const pronunciation=prosody(x.text,y.text,'','',relation,a.sourceFull,b.sourceFull);if(pronunciation< -3)continue;
        const fit=(a.roots>1?8:wordFit(a,ar,x))+(b.roots>1?8:wordFit(b,br,y));
        appendEntity(out,composed(head,a,b,x.text+y.text,a.english+' '+b.english,-4096+fit*3+clamp(pronunciation,-12,6)*2));
      }
    };
    for(const a of left)for(const b of right){
      if(has(a,Q|T)&&has(b,O|G)||has(a,P)&&has(b,O|G|Q|T))add(a,'modifier',b,'head',b,'attribute');
      if(has(a,O|G)&&has(b,Q|T))add(b,'modifier',a,'head',a,'attribute');
      if(has(a,A)&&cat(a,'transitive')&&has(b,O|G))add(a,'action',b,'head',a,'verb_object');
      if(has(a,O|G)&&has(b,A)&&cat(b,'intransitive'))add(a,'head',b,'action',b,'subject_verb');
      if(has(a,O)&&has(b,O)&&!has(a,G)&&!has(b,G)){
        const nominal=(family(a,'material')||cat(a,'material'))&&physical(b)||natural(a)&&(physical(b)||natural(b)||family(b,'voice'))||family(a,['emotion','virtue','oath','magic','ruin','decay','time'])&&(physical(b)||natural(b)||family(b,'voice'))||family(a,'body')&&physical(b)||family(b,'voice')&&!family(a,'attire');
        if(nominal)add(a,'modifier',b,'head',b,'nominal');
      }
    }
    return out;
  }
  function entityGroups(front,title,tail) {
    if(tail.length){let head=title.length?title:front;if(!head.length)head=tail;else{const related=[];for(const a of head)for(const b of tail)if(has(b,O|G|A))appendEntity(related,composed(a,a,b,b.text+'之'+a.text,a.english+' of '+b.english,a.score+b.score));if(!related.length)return[];head=related;}if(title.length)title=head;else front=head;}
    if(!front.length)return title;if(!title.length)return front;const out=[];for(const a of front)for(const b of title)appendEntity(out,composed(b,a,b,a.text+'·'+b.text,a.english+' the '+b.english,a.score+b.score));return out;
  }
  function lexicalMarker(source,at,length) {
    for(let start=0;start<=at;start++){if(start&&!/\s/.test(source[start-1]))continue;for(let end=at+length;end<=source.length;end++){if(end<source.length&&!/\s/.test(source[end]))continue;if(words.has(key(source.slice(start,end))))return true;}}return false;
  }
  function marker(source,word) {
    for(let i=0;i+word.length<=source.length;i++){if(i&&!/\s/.test(source[i-1])||i+word.length<source.length&&!/\s/.test(source[i+word.length]))continue;if(key(source.slice(i,i+word.length))===word&&!lexicalMarker(source,i,word.length))return i;}return -1;
  }
  function lexicalGroups(source,parse) {
    const groups=[];let start=0;
    while(start<source.length){while(/\s/.test(source[start]||'')&&start<source.length)start++;if(start===source.length)break;let first=start;while(first<source.length&&!/\s/.test(source[first]))first++;let chosen=first;
      for(let end=first;end<=source.length;end++){if(end<source.length&&!/\s/.test(source[end]))continue;if(words.has(key(source.slice(start,end))))chosen=end;}
      groups.push(parse(source.slice(start,chosen)));start=chosen;
    }
    return groups;
  }
  function entityPhrase(source) {
    const s=String(source).trim();if(!s)return[];
    if(words.has(key(s)))return entityParts(s);const whole=entityParts(s);if(whole.length)return whole;
    const groups=lexicalGroups(s,entityParts);if(!groups.length||groups.some(g=>!g.length))return[];
    let out=groups.pop();while(groups.length){out=phraseJoin(groups.pop(),out);if(!out.length)return[];}return out;
  }
  function entityName(source,slots) {
    if(slots){const present=i=>!!String(slots[i]?.english||'').trim(),part=i=>entityParts(slots[i].english,slots[i].pos??-1);let front=[],title=[];
      if(present(0)||present(1)){front=part(present(0)?0:1);if(present(0)&&present(1))front=phraseJoin(front,part(1));if(!front.length)return null;}
      for(let i=5;i>=2;i--)if(present(i)){const p=part(i);if(!p.length)return null;title=title.length?phraseJoin(p,title):p;if(!title.length)return null;}
      const tail=present(6)?part(6):[];if(present(6)&&!tail.length)return null;return entityResult(entityGroups(front,title,tail));
    }
    let s=String(source).trim();if(!s||nextQuote(s,0))return null;if(words.has(key(s)))return entityResult(entityParts(s));
    let tail=[],of=marker(s,'of');if(of>=0){tail=entityPhrase(s.slice(of+2));if(!tail.length)return null;s=s.slice(0,of).trim();if(!s)return entityResult(entityGroups([],[],tail));}
    const the=marker(s,'the');if(the>=0){const title=entityPhrase(s.slice(the+3));if(!title.length)return null;const front=the?entityPhrase(s.slice(0,the)):[];if(the&&!front.length)return null;return entityResult(entityGroups(front,title,tail));}
    const front=entityPhrase(s);return front.length?entityResult(entityGroups(front,[],tail)):null;
  }
  function phrase(source) {
    const s=String(source).trim(),exact=literal(s,'head');if(exact.known)return exact;const whole=compound(s);if(whole.known)return whole;
    const parts=lexicalGroups(s,s=>{const p=literal(s,'head');return p.known?p:compound(s);});if(!parts.length)return original(s);
    if(parts.some(p=>!p.complete)){const p=original(s);p.text=parts.map(p=>p.text).join(' ');p.short=p.full=p.text;p.known=parts.some(p=>p.known);return p;}
    let out=parts.pop();while(parts.length){let p=parts.pop(),modifier=literal(p.english,'modifier');out=combine(modifier.known?modifier:p,out);}return out;
  }
  function title(source) {
    const s=String(source).trim(),exact=literal(s,'head');if(exact.known)return exact;let body=s;if(/^the\s/i.test(body))body=body.slice(4).trim();const of=marker(body,'of');
    if(of>=0){const head=phrase(body.slice(0,of)),tail=phrase(body.slice(of+2));if(!head.known&&!tail.known)return original(s);return Object.assign(finish({...head},tail.text+'之'+head.text,0),{known:head.known||tail.known,complete:head.complete&&tail.complete});}
    const p=phrase(body);return p.known?p:original(s);
  }
  function firstGroup(source,given) {
    const s=String(source).trim();if(!s)return original(s);const fixed=nameOverride(s);if(fixed.known)return fixed;
    if(given){const dot=s.lastIndexOf('·');if(dot>0&&dot+1<s.length){const v=given(s.slice(0,dot).trim()),tail=surname(s.slice(dot+1));if(v&&tail.known&&tail.complete)return Object.assign(finish(original(s),group(v,tail.text),0),{known:true,complete:true});}
      if(!/\s/.test(s)){const v=given(s);if(v)return Object.assign(finish(original(s),v,0),{known:true,complete:true});}
      for(let cut=1;cut<s.length;cut++){if(!/\s/.test(s[cut])||/\s/.test(s[cut-1]))continue;const value=given(s.slice(0,cut).trim());if(!value)continue;const tail=surname(s.slice(cut).trim());return Object.assign(finish(original(s),group(value,tail.text),0),{known:true,complete:tail.complete});}
    }
    if(s.includes(' ')&&literal(s).known)return surname(s);const p=compound(s);if(p.known)return surname(s);
    if(/\s/.test(s)){const t=phrase(s);if(t.known&&t.complete)return t;}
    for(let cut=1;cut<s.length;cut++){if(!/\s/.test(s[cut])||/\s/.test(s[cut-1]))continue;const tail=compound(s.slice(cut));if(!tail.known||tail.roots<2)continue;const translated=surname(s.slice(cut));return Object.assign(finish(original(s),group(s.slice(0,cut).trim(),translated.text),0),{known:true,complete:translated.complete});}
    return p;
  }
  function unquoted(source,given) {
    const s=String(source).trim();if(!s)return original(s);const fixed=nameOverride(s);if(fixed.known)return fixed;
    const the=marker(s,'the');if(the>=0){if(the===0)return title(s);const first=firstGroup(s.slice(0,the),given),tail=title(s.slice(the));if(!first.known&&!tail.known)return original(s);return Object.assign(finish({...first},group(first.text,tail.text),0),{known:first.known||tail.known,complete:first.complete&&tail.complete});}
    const of=marker(s,'of');if(of>=0){const head=firstGroup(s.slice(0,of),given),tail=phrase(s.slice(of+2));if(!head.known&&!tail.known)return original(s);return Object.assign(finish({...head},tail.text+'之'+head.text,0),{known:head.known||tail.known,complete:head.complete&&tail.complete});}
    return firstGroup(s,given);
  }
  function nextQuote(s,from) {
    for(let i=from;i<s.length;i++){if(i&&!/\s/.test(s[i-1]))continue;const open=s[i],close={'\'':'\'','"':'"','`':'\'','“':'”','‘':'’'}[open];if(!close)continue;let matched=null;for(let end=s.indexOf(close,i+1);end>=0;end=s.indexOf(close,end+1)){const after=end+1;if(after===s.length||/\s/.test(s[after])){matched={begin:i,content:i+1,end,after};if(open!=='`')return matched;}}if(matched)return matched;}return null;
  }
  function character(source,context) {
    const s=String(source).trim();if(!s)return null;const fixed=nameOverride(s);if(fixed.known)return fixed.text;
    const first=s.split(' ')[0],proven=String(context.givenName||'');
    const suffix=s.slice(first.length).trim().replace(/^`.*?'\s*/,'');
    const generated=key(suffix).startsWith('the ')?title(suffix).known:compound(suffix.split(/\s(?:the|of)\s/i)[0]).known;
    const given=value=>{
      const provenFirst=!!proven&&(value===proven||value===first);if(provenFirst&&context.givenTranslation)return context.givenTranslation;if(/[\u3400-\u9fff]/.test(value))return value;
      const raw=provenFirst?proven:value,k=key(raw);if(!nativeWords.has(k)&&!provenFirst&&!(generated&&value===first&&!compound(value).known))return null;
      return D.native[k]||nativeName(raw);
    };
    let translated='',recognized=false,cursor=0,q;
    while((q=nextQuote(s,cursor))){const before=unquoted(s.slice(cursor,q.begin),given);translated=group(translated,before.text);recognized ||= before.known;const nick=s.slice(q.content,q.end);translated+='“'+(D.terms[key('Unit nickname: '+nick)]||nick)+'”';recognized=true;cursor=q.after;}
    const rest=s.slice(cursor).trim();if(cursor&&rest&&marker(rest,'of')===0&&rest.slice(2).trim())return phrase(rest.slice(2)).text+'之'+translated;
    const after=unquoted(s.slice(cursor),cursor?null:given);translated=group(translated,after.text);recognized ||= after.known;
    return !recognized||rest&&!after.complete?null:translated;
  }

  // Exactly the compact CV/onset/coda fallback in history_names.inc.
  const cvRows={
    '':['阿','埃','伊','奥','乌'],b:['巴','贝','比','博','布'],c:['卡','塞','西','科','库'],d:['达','德','迪','多','杜'],f:['法','费','菲','福','弗'],g:['加','盖','吉','戈','古'],h:['哈','赫','希','霍','胡'],j:['贾','杰','吉','乔','朱'],k:['卡','凯','基','科','库'],l:['拉','莱','利','洛','卢'],m:['玛','梅','米','莫','穆'],n:['纳','内','尼','诺','努'],p:['帕','佩','皮','波','普'],q:['卡','奎','基','科','库'],r:['拉','雷','里','罗','鲁'],s:['萨','塞','西','索','苏'],t:['塔','泰','蒂','托','图'],v:['瓦','维','维','沃','武'],w:['瓦','韦','维','沃','乌'],x:['克萨','克塞','克西','克索','克苏'],y:['亚','耶','伊','约','尤'],z:['扎','泽','齐','佐','祖'],ch:['查','切','奇','乔','楚'],sh:['沙','谢','希','绍','舒'],th:['萨','瑟','西','索','苏'],ph:['法','费','菲','福','弗'],wh:['瓦','韦','维','沃','乌'],qu:['夸','奎','奎','阔','库'],ck:['卡','凯','基','科','库'],tr:['特拉','特雷','特里','特罗','特鲁'],dr:['德拉','德雷','德里','德罗','德鲁'],gr:['格拉','格雷','格里','格罗','格鲁'],br:['布拉','布雷','布里','布罗','布鲁'],cr:['克拉','克雷','克里','克罗','克鲁'],pr:['普拉','普雷','普里','普罗','普鲁'],fr:['弗拉','弗雷','弗里','弗罗','弗鲁'],fl:['弗拉','弗莱','弗利','弗洛','弗卢'],pl:['普拉','普莱','普利','普洛','普卢'],bl:['布拉','布莱','布利','布洛','布卢'],cl:['克拉','克莱','克利','克洛','克卢'],gl:['格拉','格莱','格利','格洛','格卢'],st:['斯塔','斯泰','斯蒂','斯托','斯图']};
  function nativeName(raw) {
    const text=String(raw).toLowerCase().replace(/[æÆ]/g,'ae').replace(/[ß]/g,'ss').replace(/[ðÐ]/g,'d').replace(/[þÞ]/g,'th').replace(/[øØ]/g,'o').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    const vowel=c=>({a:0,e:1,i:2,y:2,o:3,u:4}[c]??-1),at=i=>i<text.length&&!(text[i]==='y'&&/[aeiou]/.test(text[i+1]||''))&&vowel(text[i])>=0;
    const coda=s=>Array.from(s,c=>({b:'普',p:'普',c:'克',k:'克',q:'克',x:'克',d:'特',t:'特',f:'弗',v:'弗',g:'格',h:'赫',l:'尔',r:'尔',m:'姆',n:'恩',s:'斯',z:'斯',w:'乌',y:'伊'}[c]||'')).join('');
    let result='',cursor=0;
    while(cursor<text.length){if(/\d/.test(text[cursor])){result+=text[cursor++];continue;}const start=cursor;while(cursor<text.length&&!at(cursor)&&!/\d/.test(text[cursor]))cursor++;
      if(cursor>=text.length||/\d/.test(text[cursor])){result+=coda(text.slice(start,cursor));continue;}const onset=text.slice(start,cursor),vowelIndex=vowel(text[cursor]);while(cursor<text.length&&at(cursor))cursor++;const consonants=cursor;while(cursor<text.length&&!at(cursor)&&!/\d/.test(text[cursor]))cursor++;let next=cursor;
      if(cursor<text.length&&at(cursor)){const cluster=text.slice(consonants,cursor);if(cluster){if(cvRows[cluster])next=consonants;else if(cluster.length>=2&&cvRows[cluster.slice(-2)])next=cursor-2;else next=cursor-1;}}
      let row=cvRows[onset];if(!row){if(onset.length>1)result+=coda(onset.slice(0,-1));row=cvRows[onset.slice(-1)]||cvRows[''];}
      result+=row[Math.max(0,vowelIndex)]+coda(text.slice(consonants,next));cursor=next;
    }
    return result||'异域';
  }

  const siteSuffixes={'hamlet':'村','village':'村','town':'城','castle':'堡','fort':'堡','fortress':'堡','tower':'塔','monastery':'修道院','tomb':'陵墓','vault':'秘库','mysterious palace':'宫殿','mysterious dungeon':'地牢','mysterious lair':'巢穴','monument':'纪念地','camp':'营地','pits':'坑寨','dark pits':'坑寨','forest retreat':'林居','mountain halls':'山厅','hillocks':'丘堡','cave':'洞窟','shrine':'圣所','labyrinth':'迷宫','lair':'巢穴','important location':'地标','settlement':'聚落','ruin':'遗址','ruins':'遗址'};
  const civil=new Map(D.civilization.map(r=>[r[0]+'\t'+r[1],r[2]]));
  const government=new Map(D.government.map(r=>[r[0]+'\t'+r[1],r[2]]));
  const formsIndex=new Map();
  for(const [id,forms]of Object.entries(D.englishForms))forms.forEach((form,pos)=>{if(form){const k=key(form);if(!formsIndex.has(k))formsIndex.set(k,[]);formsIndex.get(k).push({id,pos,english:form});}});
  const senseIndex=new Map(D.senses.map(r=>[r[0]+'\t'+r[1],r[3]]));
  const posPart=pos=>pos<=1?'NOUN':pos===2?'ADJ':pos===3?'PREFIX':'VERB';
  function formSenses(source) {
    const out=[];for(const w of formsIndex.get(key(source))||[]){const part=posPart(w.pos),gloss=senseIndex.get(w.id+'\t'+part);if(gloss&&!out.some(m=>m.id===w.id&&m.part===part))out.push({id:w.id,part,gloss,pos:w.pos});}return out;
  }
  function reviewedComponent(source,part) {
    const all=formSenses(source),selected=all.filter(m=>m.part===part);if(!selected.length)return null;const first=selected[0];
    if(selected.some(m=>m.id!==first.id||m.gloss!==first.gloss)||all.some(m=>m.id!==first.id||m.part!==part&&!(part==='ADJ'&&m.part==='VERB')))return null;return first.gloss;
  }
  function nameTerm(source,terminal=false) {
    const all=formSenses(source);if(all.length&&all.every(m=>m.gloss===all[0].gloss))return all[0].gloss;
    let gloss=D.proceduralTerms[key(source)];if(!gloss)return null;
    if(terminal&&gloss.endsWith('的')){
      const meanings=D.proceduralMeanings[key(source)]||[];
      if(meanings.some(m=>m[1]==='NOUN'&&m[2]===gloss))return gloss;
      gloss=meanings.find(m=>m[1]==='ADJ'&&!m[2].endsWith('的'))?.[2]||meanings.find(m=>!m[2].endsWith('的'))?.[2]||gloss.replace(/的+$/,'');
    }
    return gloss;
  }
  const compoundScore=(f,r)=>!(f&(1|4|16|32))||!(r&(2|8|32))?-1:f&1&&r&2?60:f&(4|16)&&r&2?55:f&1&&r&8?50:f&1&&r&32?45:f&32&&r&2?40:10;
  const renderRawCompound=(f,r,fr,rr)=>fr&1&&!(rr&2)&&rr&(8|32)?r+f:f+r;
  function rawCompound(source) {
    const folded=key(source);let best=null,score=-1,shorter=0;
    for(let cut=2;cut+2<=folded.length;cut++)for(const f of D.proceduralMeanings[folded.slice(0,cut)]||[])for(const r of D.proceduralMeanings[folded.slice(cut)]||[]){
      const s=compoundScore(f[3],r[3]),size=Math.min(cut,folded.length-cut);if(s<0||s<score||s===score&&size<=shorter)continue;
      best=renderRawCompound(f[2],r[2],f[3],r[3]);score=s;shorter=size;
    }
    return best;
  }
  function segmentRaw(source,terminal) {
    const f=key(source),best=Array(f.length+1).fill(null),pieces=Array(f.length+1).fill(Infinity);best[f.length]='';pieces[f.length]=0;
    for(let at=f.length-1;at>=0;at--){if(!/[a-z]/.test(f[at]))continue;for(let end=at+2;end<=Math.min(f.length,at+28);end++){if(best[end]===null)continue;const term=nameTerm(f.slice(at,end),terminal&&end===f.length);if(!term)continue;const n=pieces[end]+1;if(best[at]===null||n<pieces[at]||n===pieces[at]&&end-at>3){best[at]=term+best[end];pieces[at]=n;}}}
    return best[0]&&pieces[0]>=2?best[0]:null;
  }
  function generatedName(source,context={}) {
    const nameHead=word=>{
      if(context.kind==='region')return D.terms['region name: '+key(word)]||D.terms['mountain name: '+key(word)]||null;
      if(context.kind==='world'&&['land','lands'].includes(key(word)))return D.terms['world map landform: land']||null;
      return null;
    };
    const token=(s,terminal)=>{const word=s.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi,'');if(!word)return'';return nameTerm(word,terminal)||rawCompound(word)||segmentRaw(word,terminal)||nativeName(key(word));};
    const phrase=(s,scoped)=>{
      const parts=s.trim().split(/\s+/).filter(w=>!['the','a','an'].includes(key(w)));if(!parts.length)return'';
      const last=parts.at(-1),hyphen=last.indexOf('-');
      if(parts.length<=3&&hyphen>0&&hyphen+1<last.length&&last.indexOf('-',hyphen+1)<0){
        const modifier=reviewedComponent(last.slice(0,hyphen),'NOUN'),head=reviewedComponent(last.slice(hyphen+1),'NOUN'),adjectives=parts.slice(0,-1).map(s=>reviewedComponent(s,'ADJ'));
        if(modifier&&head&&adjectives.every(Boolean)){const adj=adjectives.join(''),scopedHead=scoped&&nameHead(last.slice(hyphen+1));return adj+(adj&&!adj.endsWith('的')?'的':'')+modifier+'之'+(scopedHead||head);}
      }
      const flat=parts.join(' ').replace(/-/g,' ').split(/\s+/),modifiers=Array(flat.length).fill(null);
      if(flat.length>1&&formSenses(flat.at(-1)).some(m=>m.part==='NOUN'))for(let i=flat.length-2;i>=0;i--){const adjective=reviewedComponent(flat[i],'ADJ');if(!adjective)break;modifiers[i]=adjective;}
      return flat.map((s,i)=>i===flat.length-1&&scoped&&nameHead(s)||modifiers[i]||token(s,i===flat.length-1)).join('');
    };
    const render=(source,scoped)=>{
      let s=source.trim(),ellipsis='';if(/\.+$/.test(s)){s=s.replace(/\.+$/,'').trim();ellipsis='……';}
      const nested=s.indexOf(' of The '),titled=s.indexOf(' the ');let result;
      if(nested>=0)result=render(s.slice(nested+4),false)+'所属'+render(s.slice(0,nested),scoped);
      else if(s.startsWith('The ')){s=s.slice(4);const of=s.indexOf(' of ');result=of>=0?phrase(s.slice(of+4),false)+'之'+phrase(s.slice(0,of),scoped):phrase(s,scoped);}
      else if(titled>=0)result=phrase(s.slice(0,titled),false)+'·'+render('The '+s.slice(titled+5),scoped);
      else if(s.includes(' of '))result=render('The '+s,scoped);else result=phrase(s,scoped);
      return (result||'异域')+ellipsis;
    };
    return render(String(source),true);
  }
  function wordSlot(s,role) {
    const matches=formsIndex.get(key(s))||[];
    return matches.find(w=>role==='head'?w.pos<=1:role==='adj'?w.pos===2:role==='of'?w.pos<=1||w.pos>=4:true)||null;
  }
  function governmentSuffix(context) {
    if(context.parentHead){const number=context.parentPlural?'plural':'singular',exact=D.parentSuffixes.find(r=>r[0]===context.parentHead&&r[2]===number),any=D.parentSuffixes.find(r=>r[0]===context.parentHead&&r[2]==='*');if(exact||any)return(exact||any)[1];}
    if(!context.governance)return'治所';
    let best=null,score=-1;
    for(const row of D.independentSuffixes){
      const values=[String(context.entityTypeId??1),context.raceRaw||'',context.cultureRaw||'',context.governance,key(context.siteType||context.type||'')];
      if(row.slice(0,5).some((s,i)=>s!=='*'&&s!==values[i]))continue;
      const weights=[16,2,4,8,1],n=row.slice(0,5).reduce((n,s,i)=>n+(s!=='*'?weights[i]:0),0);if(n>score){score=n;best=row;}
    }
    return best?best[5]:'治所';
  }
  function polityHead(source) {
    initialize();
    let body=String(source??'').trim();const the=marker(body,'the');if(the>=0)body=body.slice(the+3).trim();
    const of=marker(body,'of');if(of>=0)body=body.slice(0,of).trim();
    const head=body.split(/[\s-]+/).at(-1),matches=(formsIndex.get(key(head))||[]).filter(w=>w.pos<=1);
    if(!matches.length||new Set(matches.map(w=>w.id)).size!==1)return null;
    const id=matches[0].id,forms=D.englishForms[id];
    return {head:id,plural:key(forms[1])===key(head)&&key(forms[0])!==key(head)};
  }
  function polityName(source,context) {
    const isGovernment=context.entityType==='sitegovernment'||context.entityType==='site government'||context.entityType==='government'||context.entityTypeId===1;
    const isCivil=!isGovernment&&(context.entityType==='civilization'||context.entityTypeId===0);
    if(!isGovernment&&!isCivil)return entityName(source);
    let front='',body=String(source).trim(),the=marker(body,'the');if(the>0){front=entityName(body.slice(0,the))||body.slice(0,the);body=body.slice(the+3).trim();}else if(the===0)body=body.slice(3).trim();
    const of=marker(body,'of'),tail=of>=0?body.slice(of+2).trim():'';if(of>=0)body=body.slice(0,of).trim();
    let headText='',head=null,modifiers='';
    for(let start=0;start<body.length;start++){if(start&&!/\s/.test(body[start-1]))continue;const candidate=wordSlot(body.slice(start),'head');if(candidate){head=candidate;headText=body.slice(start);modifiers=body.slice(0,start).trim();break;}}
    if(!head){const natural=entityName(source)||englishPhonetic(source);return isGovernment?natural+governmentSuffix(context):natural;}
    const table=isCivil?civil:government;let core=table.get(head.id+'\tHEAD');
    if(!core){const natural=entityName(source)||englishPhonetic(source);return isGovernment?natural+governmentSuffix(context):natural;}
    if(isCivil&&head.id==='NATION'&&head.pos===1)core='诸国';
    if(modifiers){core=modifiers.split(/\s+/).map(s=>{const p=wordSlot(s,'adj');return p?(table.get(p.id+'\tADJ')||isGovernment&&civil.get(p.id+'\tADJ')||senseIndex.get(p.id+'\tADJ')||englishPhonetic(s)):englishPhonetic(s);}).join('')+core;}
    if(tail){const p=wordSlot(tail,'of');const term=p&&(table.get(p.id+'\tOF:'+head.id)||table.get(p.id+'\tOF')||isGovernment&&civil.get(p.id+'\tOF')||senseIndex.get(p.id+'\t'+posPart(p.pos)));core=(term||englishPhonetic(tail))+core;}
    core=group(front,core);if(isGovernment)core+=governmentSuffix(context);return core;
  }
  const ordinalWords=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth'];
  const chineseOrdinals=['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九'];
  function eraName(s) {
    let text=String(s).trim().replace(/^the\s+/i,''),ordinal=0;const first=key(text.split(' ')[0]);
    if(ordinalWords.includes(first)){ordinal=ordinalWords.indexOf(first)+1;text=text.slice(first.length).trim();}else if(/^\d+(st|nd|rd|th)$/.test(first)){ordinal=parseInt(first,10);text=text.slice(first.length).trim();}
    let translated=D.terms[key(text)]||D.terms[key('Native Legends age: '+text)];
    if(!translated){const m=text.match(/^age of (?:the )?(.+)$/i);if(m)translated=term(m[1])+'时代';else if(/ age$/i.test(text))translated=term(text.slice(0,-4))+'时代';}
    return translated?(ordinal?'第'+(chineseOrdinals[ordinal-1]||ordinal)+translated:translated):null;
  }
  function historyName(slots,context) {
    const isGovernment=['sitegovernment','site government','government'].includes(context.entityType)||context.entityTypeId===1;
    const isCivil=!isGovernment&&(context.entityType==='civilization'||context.entityTypeId===0);
    const political=isGovernment||isCivil,glosses=Array(7).fill(''),roles=Array(7).fill(0);
    let reviewed=false;
    for(let i=0;i<7;i++){
      const w=slots[i];if(!w?.english)continue;const pos=w.pos,part=posPart(pos),id=w.id||wordSlot(w.english,i===5?'head':i===6?'of':pos===2?'adj':'')?.id;
      roles[i]=pos<=1?3:pos===2?12:pos===3?16:32;
      let term;
      if(political&&id){
        const table=isGovernment?government:civil;
        const role=i===5&&part==='NOUN'?'HEAD':(i===2||i===3)&&part==='ADJ'?'ADJ':i===6&&(part==='NOUN'||part==='VERB')?'OF':null;
        if(role){term=table.get(id+'\t'+role);if(isCivil&&i===6)term=table.get(id+'\tOF:'+slots[5]?.id)||term;if(isGovernment&&role!=='HEAD')term ||= civil.get(id+'\t'+role);}
        if(isCivil&&i===5&&id==='NATION'&&pos===1&&term)term='诸国';if(term)reviewed=true;
      }
      glosses[i]=term||id&&senseIndex.get(id+'\t'+part)||'';
      if(!glosses[i]){if(!political)return null;const natural=entityResult(entityParts(w.english,pos));glosses[i]=natural||englishPhonetic(w.english);}
      if(context.kind==='region'&&i===5&&part==='NOUN')glosses[i]=D.terms['region name: '+key(w.english)]||D.terms['mountain name: '+key(w.english)]||glosses[i];
    }
    if(political&&!reviewed){const natural=entityName('',slots)||englishPhonetic(reconstructName(slots),slots);return natural+(isGovernment?governmentSuffix(context):'');}
    let compound=renderRawCompound(glosses[0],glosses[1],roles[0],roles[1]);
    if(political&&(slots[0]?.english||slots[1]?.english)){
      const a=slots[0]?.english?entityParts(slots[0].english,slots[0].pos):[],b=slots[1]?.english?entityParts(slots[1].english,slots[1].pos):[];
      compound=entityResult(a.length&&b.length?entityJoin(a,b):a.length?a:b)||compound;
    }
    let title='';if(slots[2]?.english||slots[3]?.english||slots[5]?.english){
      if(glosses[4]&&glosses[5]&&(roles[4]&1)&&(roles[5]&2)&&(!glosses[2]||(roles[2]&4))&&(!glosses[3]||(roles[3]&4))){const adj=glosses[2]+glosses[3];title=adj+(adj&&!adj.endsWith('的')?'的':'')+glosses[4]+'之'+glosses[5];}
      else title=glosses.slice(2,6).join('');
    }
    if(glosses[6]){const owner=glosses[6]+(political?'':'之');if(title)title=owner+title;else if(compound)compound=owner+compound;else title=owner;}
    return group(compound,title)+(isGovernment?governmentSuffix(context):'');
  }
  function reconstructName(slots) {
    let front=(slots[0]?.english||'')+(slots[1]?.english||'');
    if(slots[2]?.english||slots[3]?.english||slots[5]?.english){const title=[slots[2]?.english,slots[3]?.english,slots[4]?.english?slots[4].english+'-'+(slots[5]?.english||''):slots[5]?.english].filter(Boolean).join(' ');front+=(front?' the ':'The ')+title;}
    if(slots[6]?.english)front+=(front?' of ':'Of ')+slots[6].english;return front;
  }
  function term(text) {
    const s=String(text??'');if(!s)return s;const k=key(s);
    let target=D.terms[k];if(target)return target;
    const clean=k.replace(/_/g,' ');target=D.terms[clean];if(target)return target;
    // XML enums are identifiers; match complete reviewed words only.
    const lexical=D.senses.find(r=>key(r[2])===clean&&r[1]==='NOUN');
    return lexical?lexical[3]:s;
  }
  function explain(text,context='figure') {
    initialize();const source=String(text??'').trim(),ctx=typeof context==='string'?{kind:context}:{...context},kind=ctx.kind||'figure';
    if(!source)return{source,text:'',method:'empty',context:ctx};
    const memo=JSON.stringify([source,ctx]);if(cache.has(memo))return cache.get(memo);
    if(ctx.words){ctx.words=Array.from({length:7},(_,i)=>{const w=ctx.words[i]||{},pos=w.pos??w.part_of_speech??-1;return{...w,pos,english:w.english||w.english_form||D.englishForms[w.id]?.[pos]||''};});if(!ctx.words[2].english&&!ctx.words[3].english&&!ctx.words[5].english)ctx.words[4]={english:'',pos:-1};}
    let translated=null,method='preserved';
    if(/[\u3400-\u9fff]/.test(source)){translated=source;method='chinese';}
    else if(kind==='figure'){translated=character(source,ctx);method='dfcn-character';}
    else if(kind==='era'){translated=eraName(source);method='dfcn-era';}
    else if(ctx.words&&kind!=='site'){translated=historyName(ctx.words,ctx);method='dfcn-word-pos';}
    else if(kind==='site'){
      translated=entityName(source,ctx.words)||englishPhonetic(source,ctx.words);method='dfcn-entity';
      if(translated&&ctx.type!==false&&ctx.appendSuffix!==false){const type=key(ctx.siteType||ctx.type||'');if(type){translated+=siteSuffixes[type]||(ctx.siteTypeId===5?'聚落':'地点');method+='-site-suffix';}}
    }else if(kind==='entity'){translated=polityName(source,ctx)||englishPhonetic(source,ctx.words);method='dfcn-polity';}
    else {translated=generatedName(source,ctx);method='dfcn-generated';}
    if(!translated||translated===source){
      const native=ctx.nativeName===true||ctx.phonetic===true||nativeWords.has(key(source));
      if(native){translated=D.native[key(source)]||nativeName(source);method='dfcn-native-phonetic';}
      else{translated=translated||source;if(translated===source)method='preserved';}
    }
    const result={source,text:translated,method,context:ctx};
    if(cache.size>32768)cache.clear();cache.set(memo,result);return result;
  }
  const ready=loadPhonetics().then(()=>{initialize();return true;});
  window.DFTranslate=Object.freeze({ready,name:(text,context)=>explain(text,context).text,term,explain,version:D.version,counts:D.counts,
    // Exposed for transparent parity inspection and advanced RAW-aware callers.
    nativeName:text=>D.native[key(text)]||nativeName(text),
    compound:text=>{initialize();const p=surname(text);return p.known&&p.complete?p.text:null;},
    entityName:(text,slots)=>{initialize();return entityName(text,slots);},
    prosody:(...args)=>{initialize();return prosody(...args);},
    englishPhonetic,transcribe,polityHead,generatedName
  });
})();
