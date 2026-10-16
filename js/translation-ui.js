/* Source UI/skill adapters and DFCN historical-prose grammar. This module never
 * replaces the DFCN personal-name, center-word, suffix, or pronunciation engines. */
(function(global){
'use strict';
const base=global.DFTranslate,U=global.DFCN_UI;if(!base||!U)throw new Error('请先加载 DFCN 翻译和界面数据。');
// Prose probes revisit the same captures. Cache exact literal results, including
// misses, so the unchanged DFCN noun fallback is not rescanned for every rule.
const cachedTerms=new Map();function uiBaseTerm(value){const source=String(value??'');if(cachedTerms.has(source))return cachedTerms.get(source);const output=base.term(source);if(cachedTerms.size>=16384)cachedTerms.delete(cachedTerms.keys().next().value);cachedTerms.set(source,output);return output;}
const fold=value=>String(value??'').trim().toLowerCase().replace(/_/g,' ').replace(/\s+/g,' ');
const token=value=>fold(value).replace(/[^a-z0-9]/g,'');
const arr=value=>value===undefined||value===null?[]:Array.isArray(value)||ArrayBuffer.isView(value)?Array.from(value):[value];
const first=value=>Array.isArray(value)?first(value[0]):value;
const number=value=>{value=first(value);if(value===undefined||value===null||value===''||typeof value==='object')return undefined;const n=Number(value);return Number.isFinite(n)?n:undefined;};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const skillByKey=new Map(U.skills.map(row=>[fold(row[0]),row]));const skillMap=new Map();for(const row of U.skills)for(const key of [row[0],row[2],row[3],row[4]])if(!skillMap.has(token(key)))skillMap.set(token(key),row);
function skill(input,total_ip){
 const object=input&&typeof input==='object'?input:null,source=String(first(object?.skill??object?.name??object?.Name??input)??'');
 const points=number(total_ip??object?.total_ip??object?.points??object?.Points)??0,row=skillByKey.get(fold(source))||skillMap.get(token(source));
 const index=U.cutoffs.findIndex(cutoff=>points>=cutoff),rankSource=index<0?'Unknown':U.ranks[index];
 return {name:row?.[5]??uiBaseTerm(source),description:row?.[6]??uiBaseTerm(source),category:row?.[1]??'unk',token:row?.[2]??source,
  rank:U.rankTerms[rankSource]??uiBaseTerm(rankSource),rankSource,points,subrank:rankSource.toLowerCase().replace(/ /g,'').slice(0,5),sourceName:row?.[3]??source,sourceDescription:row?.[4]??source,known:!!row};
}
const eventLabels=Object.fromEntries(`battle fought|参加战役
add hf entity link|建立人物与组织联系
add hf hf link|建立人物关系
attacked site|进攻地点
body abused|亵渎遗体
change hf job|更换职业
change hf state|改变生活状态
changed creature type|改变生物类型
create entity position|设立职位
created site|建立地点
created world construction|建造世界工程
creature devoured|吞食生物
destroyed site|摧毁地点
field battle|野战
hf abducted|绑架人物
hf died|人物死亡
hf new pet|获得宠物
hf reunion|人物重逢
hf simple battle event|人物交战
hf travel|人物旅行
hf wounded|人物受伤
impersonate hf|假冒人物
item stolen|物品被盗
new site leader|任命地点领袖
peace accepted|接受和平
peace rejected|拒绝和平
plundered site|劫掠地点
reclaim site|收复地点
remove hf entity link|结束人物与组织联系
artifact created|创造神器
diplomat lost|外交官失踪
entity created|组织成立
hf revived|人物复生
masterpiece arch design|杰作建筑设计
masterpiece arch constructed|建成杰作建筑
masterpiece engraving|杰作雕刻
masterpiece food|杰作食物
masterpiece lost|杰作损毁
masterpiece item|杰作物品
masterpiece item improvement|杰作装饰
merchant|商人来访
site abandoned|废弃地点
site died|聚落消亡
add hf site link|建立人物与地点联系
created structure|建造建筑
hf razed structure|人物拆毁建筑
remove hf site link|结束人物与地点联系
replaced structure|替换建筑
site taken over|接管地点
entity relocate|组织迁移
hf gains secret goal|获得秘密目标
hf profaned structure|人物亵渎建筑
hf does interaction|施展能力
entity primary criminals|主要犯罪组织
hf confronted|人物遭到质问
assume identity|采用假身份
entity law|组织法律
change hf body state|改变身体状态
razed structure|拆毁建筑
hf learns secret|习得秘密
artifact stored|存放神器
artifact possessed|持有神器
agreement made|提出协议
agreement rejected|拒绝协议
artifact lost|神器遗失
site dispute|地点争端
hf attacked site|人物进攻地点
hf destroyed site|人物摧毁地点
agreement formed|缔结协议
site tribute forced|强迫地点纳贡
insurrection started|发动叛乱
procession|游行
ceremony|仪式
performance|表演
competition|竞赛
written content composed|创作书面作品
poetic form created|创立诗歌形式
musical form created|创立音乐形式
dance form created|创立舞蹈形式
knowledge discovered|发现知识
hf relationship denied|拒绝人物关系
regionpop incorporated into entity|地区族群加入组织
artifact destroyed|摧毁神器
first contact|首次接触
site retired|聚落恢复理智
agreement concluded|协议终结
hf reach summit|登顶
artifact transformed|改造神器
masterpiece dye|杰作染色
hf disturbed structure|惊扰建筑
hfs formed reputation relationship|建立名誉关系
artifact given|赠予神器
artifact claim formed|宣称神器所有权
hf recruited unit type for entity|为组织招募成员
hf prayed inside structure|在建筑内祈祷
artifact copied|复制神器
artifact recovered|寻回神器
artifact found|发现神器
hf viewed artifact|观看神器
sneak into site|潜入地点
spotted leaving site|发现部队离开地点
entity searched site|组织搜索地点
hf freed|解救人物
tactical situation|战术态势
squad vs squad|小队交战
agreement void|协议作废
entity rampaged in site|组织在地点肆虐
entity fled site|组织逃离地点
entity expels hf|组织驱逐人物
site surrendered|地点投降
remove hf hf link|结束人物关系
holy city declaration|宣布圣城
hf performed horrible experiments|进行恐怖实验
entity incorporated|组织合并
gamble|赌博
trade|贸易
hf equipment purchase|人物购买装备
entity overthrown|组织被推翻
failed frame attempt|陷害失败
hf convicted|人物被定罪
failed intrigue corruption|腐化阴谋失败
hfs formed intrigue relationship|建立阴谋关系
entity alliance formed|结成联盟
entity dissolved|组织解散
add hf entity honor|授予组织荣誉
entity breach feature layer|组织突破地下区域
entity equipment purchase|组织购买装备
hf ransomed|赎回人物
hf preach|人物传教
modified building|改建建筑
hf interrogated|审讯人物
entity persecuted|组织遭受迫害
building profile acquired|取得建筑使用权
hf enslaved|奴役人物
hf asked about artifact|询问神器
hf carouse|人物宴饮
sabotage|破坏活动`.split('\n').map(line=>line.split('|')));
function eventLabel(value){const text=String(value?.type??value??'');return eventLabels[fold(text)]??term(text);}
const roleLabels={"HistoricalFigure":"历史人物","HistoricalFigureTarget":"目标人物","AppointerHf":"任命者","PromiseToHf":"承诺对象","CorruptorHf":"腐化者","TargetHf":"目标人物","LureHf":"诱导者","RelevantEntity":"相关组织","SiteEntity":"地方政府","SiteCiv":"地方政府","Civ":"文明","Attacker":"进攻方","Defender":"防守方","AttackerGeneral":"进攻方将领","DefenderGeneral":"防守方将领","AttackerMercenaries":"进攻方佣兵","DefenderMercenaries":"防守方佣兵","AttackerSupportMercenaries":"进攻方侦察佣兵","DefenderSupportMercenaries":"防守方侦察佣兵","HistoricalFigure1":"人物一","HistoricalFigure2":"人物二","Woundee":"伤者","Wounder":"致伤者","Snatcher":"绑架者","Trickster":"伪装者","Cover":"假冒神祇","NewLeader":"新领袖","NewSiteEntity":"新政府","InvolvedEntity":"涉嫌组织","Maker":"制作者","MakerEntity":"制作组织","Improver":"改进者","ImproverEntity":"改进组织","Student":"学生","Teacher":"导师","Eater":"吞食者","Victim":"受害者","Abuser":"亵渎者","SanctifyFigure":"神圣化对象","WorldConstruction":"世界工程","MasterWorldConstruction":"主工程","Site1":"地点一","Site2":"地点二","Entity1":"组织一","Entity2":"组织二","JoinerEntity":"加入方组织","JoinedEntity":"接纳方组织","JoinEntity":"接纳组织","PopSourceRegion":"原居地区","FreeingHf":"解救者","FreeingCiv":"解救组织","HoldingCiv":"关押组织","SearcherCiv":"搜索组织","LeaverCiv":"离开组织","Spotter":"发现者","RampageCiv":"肆虐组织","FledCiv":"逃离组织","PersecutorHf":"迫害者","PersecutorEntity":"迫害组织","TargetEntity":"目标组织","Instigator":"政变发起者","OverthrownHistoricalFigure":"被推翻人物","PositionTaker":"新掌权者","ConvictedHf":"被定罪者","ConvicterEntity":"定罪组织","FooledHf":"受骗者","FramerHf":"陷害者","PlotterHf":"策划者","CorruptConvictorHf":"腐败定罪者","CoConspiratorHf":"同谋","ImplicatedHf":"受牵连者","InterrogatorHf":"审讯者","ContactHf":"联络人","ConfessedAfterApbArrestEntity":"逮捕组织","RansomedHf":"被赎回者","RansomerHf":"收取赎金者","PayerHf":"付款者","PayerEntity":"付款组织","MovedToSite":"迁往地点","EnslavedHf":"被奴役者","SellerHf":"卖方","SpeakerHf":"传教者","ModifierHf":"改建者","AcquirerHf":"取得者","AcquirerEntity":"取得组织","LastOwnerHf":"前拥有者","SaboteurHf":"破坏者","GroupHf":"历史人物","GroupHistoricalFigure":"历史人物","AttackerHistoricalFigure":"进攻方人物","DefenderHistoricalFigure":"防守方人物","AttackerLeader":"进攻方领队","DefenderLeader":"防守方领队","AttackerTactician":"进攻方战术家","DefenderTactician":"防守方战术家","ReligionEntity":"宗教组织","Contactor":"接触方","Contacted":"被接触方","EntityGiver":"赠予组织","EntityReceiver":"接收组织","HistoricalFigureGiver":"赠予者","HistoricalFigureReceiver":"接收者","NewArtifact":"新神器","OldArtifact":"原神器","DestSite":"目的地点","SourceSite":"来源地点","DestEntity":"接收组织","SourceEntity":"来源组织","Winner":"优胜者","competitor":"参赛者","conspirator":"共谋者","rescuedHf":"被解救者","propertyConfiscatedFromHf":"财产被没收者","expelledHf":"被驱逐者","body":"遗体"};
const uiTerms={
 'unknown historical figure':'不明历史人物','unknown written content':'不明书面作品','unknown author':'不明作者','unknown location':'未知地点','unknown structure':'未知建筑','unknown site':'未知地点','unknown race':'不明种族','unknown item':'不明物品','unknown creature':'不明生物','none':'无','unknown':'未知',
 'rampage':'肆虐','coup':'政变','invasion':'入侵','conquest':'征服','destruction':'毁灭','pillaging':'劫掠','tribute enforcement':'强制纳贡',
 'flayed':'剥皮','hung':'吊挂','horribly mutilated':'残酷肢解','animated':'复活为亡灵','abused':'亵渎','made a threat':'进行威胁','made flattering remarks':'阿谀奉承','offered a bribe':'提出贿赂','pulled rank':'以权势施压','offered immortality':'许诺永生',
 'duel':'决斗','raid':'袭掠','site conquered':'地点征服','insurrection':'叛乱','persecution':'迫害','beast attack':'巨兽袭击','abduction':'绑架','journey':'旅程','purge':'清洗','competition':'竞赛','battle':'战役','war':'战争','theft':'盗窃','reclamation':'收复','occasion':'庆典','performance':'表演','ceremony':'仪式','procession':'游行','writtencontents':'书面作品','figures':'历史人物','sites':'地点','artifacts':'神器','structures':'建筑','regions':'地区','collections':'事件集',
 'historical figure':'历史人物','historical figures':'历史人物','site':'地点','entity':'组织','entities':'组织','artifact':'神器','region':'地区','underground region':'地下区域','written content':'书面作品',
 'mountain peak':'山峰',
 'civilization':'文明','sitegovernment':'地方政府','site government':'地方政府','militaryunit':'军事单位','mercenarycompany':'佣兵团','performancetroupe':'表演团','merchantcompany':'商团','nomadicgroup':'游牧群体','migratinggroup':'迁徙群体',
 'notable kills':'著名击杀','copies / references':'副本与引用','assumed identities':'假身份','heists & crimes':'盗窃与犯罪','journeys / travels':'旅程与旅行','area (tiles)':'面积（格）','height (meters)':'高度（米）',
 'participant':'参与者','participants':'参与者','cause':'原因','reason':'缘由','circumstance':'情形','state':'状态','old state':'原状态','new state':'新状态','old job':'原职业','new job':'新职业','link type':'关系类型','position':'职位','target':'目标','source':'来源','victim':'受害者','slayer':'杀戮者','builder':'建造者','author':'作者','creator':'创作者','trader':'商人','recipient':'接收者','giver':'赠予者','holder':'持有者','attacker':'进攻方','defender':'防守方'
};
// Port of DFCN Overlay::translate_deity_spheres. Its r dictionary has priority
// over ordinary nouns: mountains/山峦 and muck/污泥 are semantic sphere labels.
// Native lists accept an optional article, comma separators and a final and.
function sphere(value){
 if(Array.isArray(value)||ArrayBuffer.isView(value))return Array.from(value,sphere).join('、');
 const original=String(value??'');if(!original)return original;const source=fold(original);let begin=0,result='';
 while(begin<source.length){
  const comma=source.indexOf(', ',begin),conjunction=source.indexOf(' and ',begin),end=Math.min(comma<0?Infinity:comma,conjunction<0?Infinity:conjunction);
  const key=source.slice(begin,end===Infinity?undefined:end).trim().replace(/^the /,'');if(!key)return original;
  let target=U.domains?.sphere?.[key];
  if(!target){const literal=uiBaseTerm(key);target=literal!==key?literal:global.DFCN_DATA?.proceduralTerms?.[key];}
  if(!target||/[a-z]/i.test(target))return original;
  result+=target;if(end===Infinity)break;
  if(end===conjunction){result+='和';begin=end+5;}
  else if(source.slice(end,end+6)===', and '){result+='和';begin=end+6;}
  else {result+='、';begin=end+2;}
  if(begin>=source.length)return original;
 }
 return result||original;
}
function term(value,scope){
 const source=String(value??'');if(!source)return source;const clean=fold(source),requested=typeof scope==='object'&&scope?scope.domain??scope.scope:scope,domainKey=token(requested),domain=({spheres:'sphere',deitysphere:'sphere',deityspheres:'sphere',regiontype:'terrain',biome:'terrain',geography:'terrain',entitytype:'entityType',entity:'entityType',race:'creature',species:'creature'})[domainKey]||domainKey;
 if(domain==='sphere')return sphere(value);
 const domainTerm=U.domains?.[domain]?.[clean]??(domain==='creature'?undefined:U.domains?.[domain]?.[token(source)]);if(domainTerm)return domainTerm;
 const scopeNames={skill:'Skill name: ',rating:'Skill rating: ',profession:'Profession name: ',creature:'Legends creature: '};
 if(scopeNames[domain]){const prefix=scopeNames[domain],scoped=uiBaseTerm(prefix+source);if(scoped!==prefix+source)return scoped;}
 if(uiTerms[clean])return uiTerms[clean];let out=uiBaseTerm(source);if(out!==source&&out!==source.replace(/_/g,' '))return out;
 if(U.domains?.terrain?.[clean])return U.domains.terrain[clean];
 if(U.legendsTerms[clean])return U.legendsTerms[clean];if(eventLabels[clean])return eventLabels[clean];if(uiTerms[clean])return uiTerms[clean];
 const procedure=clean.match(/^(forgotten beast|titan|demon|angel|night troll|bogeyman|nightmare|werebeast)(?: (\d+))$/);
 if(procedure){const known=uiBaseTerm(procedure[1]);if(known!==procedure[1])return known+' '+procedure[2];}
 return out;
}
// These clauses localize the reference application's Print() wording where it
// differs from native DF Legends. Names and captured nouns still use DFCN.
const viewerProductions=[
 ['{s} after {s}','{s1}，在{s2}后'],
 ['{a} fought in {e}','{a1}参加了{e1}'],['{a} was hired to fight in {e}','{a1}受雇参加了{e1}'],['{a} was hired as a scout to fight in {e}','{a1}受雇担任侦察兵，参加了{e1}'],
 ['{s}, an assault on {p}','{s1}，进攻{p1}'],['{s} in defense of {p}','{s1}，保卫{p1}'],

 ['{a}, thrust a spire of slade up from the underworld, naming it {p}, and established a gateway between worlds in {p}','{a1}从冥界升起一座黑石尖塔，将其命名为{p1}，并在{p2}建立了世界间的通道'],
 ['Leader of the attack was {n}, and the defenders were led by {n}','进攻由{n1}率领，防守由{n2}率领'],
 ['Leader of the attack was {n}','进攻由{n1}率领'],['The defenders were led by {n}','防守由{n1}率领'],
 ['{a} were hired by the attackers','{a1}受雇于进攻方'],['{a} were hired by the defenders','{a1}受雇于防守方'],
 ['{a} were hired as scouts by the attackers','{a1}受雇担任进攻方的侦察兵'],['{a} were hired as scouts by the defenders','{a1}受雇担任防守方的侦察兵'],
 ['{a} purchased equipment','{a1}购买了装备'],['{a} purchased {s} equipment','{a1}购买了{s1}装备'],
 ['{a} purchased equipment, which {n} received','{a1}购买了装备，由{n1}接收'],
 ['{p} was offered to {a} by {a}','{p1}由{a2}赠予了{a1}'],
 ['{p} was made a {s} by {a}','{a1}将{p1}定为{s1}'],
 ['{s} as an heirloom of the {n} family','{s1}，作为{n1}家族的传家宝'],
 ['{s} as a symbol of authority within {p}','{s1}，作为{p1}内部的权力象征'],
 ['{s} after the death of {n}','{s1}，在{n1}死后'],
 ['{a} bit {a}, passing on the {s}','{a1}咬了{a2}，传播了{s1}'],

 ['{a} got an honorable position in {p}','{a1}在{p1}获得了一个荣誉职位'],
 ['{a} stopped being an unspecified position of {p}','{a1}卸任了{p1}的一个未详职位'],
 ['an agreement has been formed','一项协议缔结了'],
 ['{a} acquired {p}','{a1}取得了{p1}'],
 ['{a} attempted to frame {n} for {s} by fooling {n} and {p} with fabricated evidence, but nothing came from it','{a1}试图用伪造的证据欺骗{n2}和{p1}，以{s1}陷害{n1}，但未能得逞'],
 ['{p} was created by {a} in {p} after a {s}','{a1}在{s1}后于{p2}创作了{p1}'],
 ['{a} performed horrible experiments inside {p} in {p}','{a1}在{p2}的{p1}内进行了恐怖实验'],
 ['{a} UNKNOWN LINKTYPE ({s}) {p}','{a1}与{p1}建立了地点联系（关系类型：{s1}）'],
 ['{a} ENDED UNKNOWN LINKTYPE ({s}) {p}','{a1}与{p1}结束了地点联系（关系类型：{s1}）'],
 ['{a} was convicted of {s} by {p} and sentenced to {d} hammerstrokes','{a1}被{p1}判定犯有{s1}罪，判处{d1}次锤刑'],
 ['{s} and imprisoned for a term of {d} years','{s1}，并被判入狱{d1}年'],
 ['{s} and imprisoned for a term of {d} month','{s1}，并被判入狱{d1}个月'],
 ['{s}, beaten','{s1}，并遭到殴打'],['{s} and sentenced to death','{s1}，并被判死刑'],['{s} and exiled','{s1}，并被流放'],
 ['{a} was expelled','{a1}被驱逐了'],['{a} were expelled and some sacred sites were desecrated','{a1}被驱逐了，一些圣地遭到了亵渎'],
 ['{a} were expelled','{a1}被驱逐了'],
 ['{a} was convicted of {s} by {p} and {n} plotted by {n} after {n} fooled {n} with fabricated evidence','{a1}被{p1}和{n1}判定犯有{s1}罪，此事由{n2}策划，此前{n3}用伪造的证据欺骗了{n4}'],

 ['{a} was wounded by {a}','{a1}被{a2}打伤了'],
 ['{a} was wounded by {a} as a means of torture','{a1}被{a2}作为酷刑打伤了'],
 ['{a} gave up being {s} to become {s}','{a1}放弃了{s1}的身份，成为了{s2}'],
 ['{a} changed {a} from {s} into {s}','{a1}将{a2}从{s1}变成了{s2}'],
 ['{s}, appointed by {n} as promised to {n}','{s1}，由{n1}任命，履行了对{n2}的承诺'],
 ['{s}, appointed by {n}','{s1}，由{n1}任命'],['{s} as promised to {n}','{s1}，履行了对{n1}的承诺'],
 ['{a} linked ({s}) to {a}','{a1}与{a2}建立了{s1}关系'],
 ['{a} unlinked ({s}) to {a}','{a1}与{a2}结束了{s1}关系'],
 ['the body of {n} was {s} by {a}','{n1}的遗体被{a1}{s1}'],
 ['the bodies of {a} were {s} by {a}','{a1}的遗体被{a2}{s1}'],
 ['{a} constructed {p} as part of {p} connecting {p} and {p}','{a1}建造了{p1}，作为{p2}的一部分，连接{p3}和{p4}'],
 ['{a} tamed the creatures named {s}','{a1}驯服了名为{s1}的生物'],
 ['{a} fooled {a} into believing he/she was a manifestation of the deity {n}','{a1}欺骗了{a2}，使其相信自己是神祇{n1}的化身'],
 ['{p} was {s} in {p} by {a} and brought to {p}','{p1}在{p2}被{a1}{s1}，并被带到了{p3}'],
 ['{p} was stolen in {p} by {a} and brought to {p}','{p1}在{p2}被{a1}盗走，并被带到了{p3}'],
 ['{a} lost a diplomat at {p}','{a1}的一名外交官在{p1}失踪了'],
 ['They suspected the involvement of {p}','他们怀疑{p1}参与其中'],
 ['{a} designed a masterful {s} for {p}','{a1}为{p1}设计了杰作级的{s1}'],
 ['{a} created a masterful {s} for {p}','{a1}为{p1}创造了杰作级的{s1}'],
 ['{a} prepared a masterful {s} for {p}','{a1}为{p1}制作了杰作级的{s1}'],
 ['{a} masterfully dyed a {s} with {s} for {p}','{a1}用{s2}为{p1}精湛地染制了{s1}'],
 ['{a} added a masterful image in {s} to a {s} for {p}','{a1}用{s1}为{p1}的{s2}添加了杰作级的图像'],
 ['{a} added a masterful covering in {s} to a {s} for {p}','{a1}用{s1}为{p1}的{s2}添加了杰作级的覆盖物'],
 ['{a} added masterful {s} in {s} to a {s} for {p}','{a1}用{s2}为{p1}的{s3}添加了杰作级的{s1}'],
 ['{a} abandoned the settlement at {p}','{a1}废弃了位于{p1}的聚落'],
 ['{a} replaced {p} in {p} with {p}','{a1}用{p3}替换了{p2}的{p1}'],
 ['{a} performed {s} {a}','{a1}对{a2}施展了{s1}'],
 ['{a} aroused general suspicion after {s}','{a1}因{s1}而引起了普遍怀疑'],
 ['{a} aroused general suspicion in {p} after {s}','{a1}因{s1}而在{p1}引起了普遍怀疑'],
 ['{a} assumed the identity of {a}','{a1}采用了{a2}的身份'],
 ['{s} proposed by {p} was accepted by {p} at {p}','{p2}在{p3}接受了{p1}提出的{s1}'],
 ['{s} proposed by {p} was rejected by {p} at {p}','{p2}在{p3}拒绝了{p1}提出的{s1}'],
 ['{a} secured tribute from {p}, to be delivered from {p} every {s}','{a1}迫使{p1}纳贡，每{s1}从{p2}交付贡品'],
 ['{a} held a {s} in {p} as part of {s}','{a1}在{p1}举行了{s1}，作为{s2}的一部分'],
 ['Competing were {a}','参赛者有{a1}'],['The winner was {n}','优胜者是{n1}'],
 ['{a} independently discovered the {s} in the field of {s}','{a1}独立发现了{s2}领域的{s1}'],
 ['{a} was the first to discover the {s} in the field of {s}','{a1}首次发现了{s2}领域的{s1}'],
 ['{a} was denied an apprenticeship under {n} in {p} due to jealousy of {n}','{a1}由于嫉妒{n2}而在{p1}被拒绝拜{n1}为师'],
 ['{a} reached the summit, which rises above {p} in {p}','{a1}在{p2}登上了耸立于{p1}之上的山峰'],
 ['{p} was made from {p} in {p} by {a}','{a1}在{p3}用{p2}制作了{p1}'],
 ['{a}, formed a false friendship with {a} in order to extract information','{a1}与{a2}建立了虚假的友谊，以获取情报'],
 ['{a} recruited {s} into {p}','{a1}为{p1}招募了{s1}'],
 ['{a} prayed','{a1}祈祷了'],
 ['{a} made a copy of {p} from {p} of {p}, keeping it within {p}','{a1}复制了来自{p4}的{p3}所属{p2}的{p1}，并将副本保存在{p5}'],
 ['{a} slipped into {p} undetected by {p}','{a1}潜入了{p1}，未被{p2}察觉'],
 ['{a} as part of a squad led by {n}, clashed with {a} as part of squad in {p} led by {n}, slaying {d}','{a1}在{n1}率领的小队中，与{n2}率领的小队中的{a2}在{p1}交战，杀死了{d1}名敌人'],
 ['an agreement has been annulated','一项协议作废了'],
 ['{a} toppled the government of {n} of {p} and assumed control','{a1}推翻了{p1}的{n1}政府，并掌握了控制权'],
 ['{a} toppled the government of {n} of {p} placed {n} in power','{a1}推翻了{p1}的{n1}政府，扶持{n2}掌权'],
 ['The support of {a} was crucial to the coup','{a1}的支持对这次政变至关重要'],
 ['{a} attempted to frame {n} for {s} at the behest of {n} by fooling {n} and {p} with fabricated evidence, but nothing came from it','{a1}受{n2}指使，试图用伪造的证据欺骗{n3}和{p1}，以{s1}陷害{n1}，但未能得逞'],
 ['{a} was convicted of {s} by {p}','{a1}被{p1}判定犯有{s1}罪'],
 ['{a} was wrongfully convicted of {s} by {p}','{a1}被{p1}错误地判定犯有{s1}罪'],
 ['{s} and {n} plotted by {n} after {n} fooled {n} with fabricated evidence','{s1}，{n1}参与其中；该事由{n2}策划，此前{n3}用伪造的证据欺骗了{n4}'],
 ['{a} implicated {n} during interrogation','{a1}在审讯时牵连出了{n1}'],['Interrogation was led by {n}','审讯由{n1}主持'],
 ['{a} attempted to corrupt {n} in order to have law enforcement look the other way','{a1}试图腐化{n1}，以使执法者睁一只眼闭一只眼'],
 ['{a} attempted to corrupt {n} in order to secure embezzled funds','{a1}试图腐化{n1}，以获取侵吞的资金'],
 ['{a} attempted to corrupt {n} in order to have an agent','{a1}试图腐化{n1}，以安插一名代理人'],
 ['{a} attempted to corrupt {n} in order to have someone to act on plots and schemes','{a1}试图腐化{n1}，以找人执行阴谋诡计'],
 ['{a} lured {n} into a meeting and, while completely misreading the situation, {s}','{a1}诱使{n1}参加会面，但完全误判了形势，{s1}'],
 ['{a} met with {n} and, while completely misreading the situation, {s}','{a1}与{n1}会面，但完全误判了形势，{s1}'],
 ['{a} lured {n} into a meeting and {s}','{a1}诱使{n1}参加会面，并{s1}'],['{a} met with {n} and {s}','{a1}与{n1}会面，并{s1}'],
 ['The plan failed','计划失败了'],['The plan worked','计划成功了'],
 ['{a} began accepting bribes in {p} under the influence of {n}','{a1}受{n1}影响，在{p1}开始收受贿赂'],
 ['{a} began embezzling funds in {p} under the influence of {n}','{a1}受{n1}影响，在{p1}开始侵吞资金'],
 ['{a} was corrupted to be an agent in {p} under the influence of {n}','{a1}受{n1}影响，在{p1}被腐化成为代理人'],
 ['{a} was corrupted to act on plots and schemes in {p} under the influence of {n}','{a1}受{n1}影响，在{p1}被腐化并开始执行阴谋诡计'],
 ['{a} swore to support {p} in war if the latter did likewise','{a1}发誓，只要{p1}在战争中同样支持自己，就会支持对方'],
 ['{a} dissolved due to {s}','{a1}因{s1}而解散了'],
 ['{a} received the title {s} in {p}','{a1}在{p1}获得了{s1}头衔'],
 ['{a} purchased {s} equipment in {p}, which {n} received','{a1}在{p1}购买了{s1}装备，由{n1}接收'],
 ['{a} ransomed {n} to {n} of {p}','{a1}将{n1}赎交给了{p1}的{n2}'],['{a} sold {n} to {n} of {p}','{a1}将{n1}卖给了{p1}的{n2}'],
 ['{a} was sent to {p}','{a1}被送往了{p1}'],
 ['{a} preached to {p}, urging love to be shown to {p}','{a1}向{p1}传教，敦促他们向{p2}表达关爱'],
 ['{a} preached to {p}, inveighing against {p}','{a1}向{p1}传教，抨击{p2}'],
 ['{a} had a {s} added to {p}','{a1}让人在{p1}添加了{s1}'],
 ['{a} was interrogated by {n}','{a1}被{n1}审讯了'],
 ['{a} acquired {p} in {p} formerly owned by {n}','{a1}取得了{p2}中原属{n1}的{p1}'],
 ['{a} purchased {p} in {p} formerly owned by {n}','{a1}买下了{p2}中原属{n1}的{p1}'],
 ['{a} inherited {p} in {p} formerly owned by {n}','{a1}继承了{p2}中原属{n1}的{p1}'],
 ['{a} rebuilt {p} in {p} formerly owned by {n}','{a1}重建了{p2}中原属{n1}的{p1}'],
 ['{s} in {p}','在{p1}，{s1}'],['{s} at {p}','在{p1}，{s1}'],['{s} within {p}','在{p1}，{s1}'],
 ['{s} during {e}','在{e1}期间，{s1}'],['{s} as part of {e}','{s1}，作为{e1}的一部分'],
 ['{a} of {p}','{p1}的{a1}'],['{p} of {p}','{p2}的{p1}'],
 ['{a} and {a}','{a1}和{a2}'],['{s} and {s}','{s1}和{s2}'],['{s} {s}','{s1}{s2}']
];
function viewerGrammar(){const rules=[];for(const[source,target]of viewerProductions){const forms=[[source,target]];if(/\{[an]\}/.test(source)){const slots={};for(const match of source.matchAll(/\{([a-z])\}/g))slots[match[1]]=(slots[match[1]]||0)+1;for(const prep of ['in','at','within'])forms.push([source+' '+prep+' {p}','在{p'+((slots.p||0)+1)+'}，'+target]);forms.push([source+' during {e}','在{e'+((slots.e||0)+1)+'}期间，'+target]);forms.push([source+' in the wilds','在荒野中，'+target]);}for(const[english,chinese]of forms)for(const period of ['', '.'])rules.push([english+period,chinese+(period?'。':''),'ht']);}return rules;}
const proseRules=[...U.legendsRules,...viewerGrammar()];

// DFCN compiled Legends h productions, with the original typed capture indices.
// Clickable XML references are opaque atoms, so grammar matching cannot reorder
// IDs independently from the names they represent or admit source HTML.
let grammarIndex=null;const compiled=new Map(),proseCache=new Map();
const regexEscape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function grammar(){
 if(grammarIndex)return grammarIndex;const words=new Map(),index=new Map(),metadata=[];
 for(let i=0;i<proseRules.length;i++){const [source,target,flags]=proseRules[i],parts=source.split(/\{([a-z])\}/),literals=parts.filter((_,j)=>j%2===0),tokens=[...new Set(literals.join(' ').toLowerCase().match(/[a-z]{3,}/g)||[])];metadata.push({i,parts,tokens,size:literals.join('').length});for(const word of tokens)words.set(word,(words.get(word)||0)+1);}
 for(const row of metadata){const key=row.tokens.sort((a,b)=>(words.get(a)-words.get(b))||b.length-a.length)[0]||'';if(!index.has(key))index.set(key,[]);index.get(key).push(row);}
 return grammarIndex={index,metadata};
}
function templateCaptures(row,source,work){
 const insensitive=proseRules[row.i][2].includes('i'),text=insensitive?source.toLowerCase():source,parts=insensitive?row.parts.map((part,i)=>i%2?part:part.toLowerCase()):row.parts,matches=[];
 if(!text.startsWith(parts[0]))return matches;
 function consume(field,at,captures){
  if(--work.remaining<=0||matches.length>=16)return;
  if(field>=parts.length){if(at===source.length)matches.push([null,...captures]);return;}
  const literal=parts[field+1],last=field+2>=parts.length,max=source.length-literal.length;
  for(let stop=max;stop>at;stop--){if(--work.remaining<=0)return;if(!text.startsWith(literal,stop)||(last&&stop!==max))continue;if(!literal&&stop<source.length&&!/[ .,;!?]/.test(source[stop]))continue;consume(field+2,stop+literal.length,[...captures,source.slice(at,stop)]);if(last)return;}
 }
 consume(1,parts[0].length,[]);return matches;
}
function prose(source,context={},depth=0){
 source=String(source??'').trim();if(!source||depth>12||source.length>2048)return null;if(!context.work)context={...context,work:{remaining:50000,memo:new Map(),active:new Set()}};if(--context.work.remaining<=0)return null;
 if(context.work.memo.has(source))return context.work.memo.get(source);const atoms=context.atoms||[],atomic=source.match(/^\uE100(\d+)\uE101$/);if(atomic)return atoms[+atomic[1]]?.html??null;
 const literal=U.legendsTerms[fold(source)];if(literal)return escape(literal);
 const dated=source.match(/^In (?:(a time before time)|(\d+)),\s*(?:in (early |mid|late )?(spring|summer|autumn|winter),\s*)?([\s\S]+)$/i);
 if(dated){const rest=prose(dated[5],context,depth+1);if(rest)return(dated[1]?'远古之时，':'第'+dated[2]+'年'+(dated[4]?({spring:'春',summer:'夏',autumn:'秋',winter:'冬'}[dated[4].toLowerCase()])+({'early ':'初',mid:'中','late ':'末'}[dated[3]]||''):'')+'，')+rest;}
 const pieces=source.match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/g);if(pieces?.length>1&&context.split!==false){const outputs=pieces.map(piece=>prose(piece,{...context,split:false,work:{remaining:50000,memo:new Map()}},depth+1));if(outputs.every(Boolean))return outputs.join('');}
 const {index}=grammar(),candidates=[];for(const word of new Set(source.toLowerCase().match(/[a-z]{3,}/g)||[]))if(index.has(word))candidates.push(...index.get(word));if(index.has(''))candidates.push(...index.get(''));
 // The compiled table is already ordered by fixed specificity in DFCN.
 candidates.sort((a,b)=>b.size-a.size||a.i-b.i);let work=0;
 for(const row of candidates){if(++work>12000)break;if(row.size<1)continue;if(--context.work.remaining<=0)break;let at=0,fit=true;const compareSource=proseRules[row.i][2].includes('i')?source.toLowerCase():source;for(let k=0;k<row.parts.length;k+=2){const literal=proseRules[row.i][2].includes('i')?row.parts[k].toLowerCase():row.parts[k];const pos=k===row.parts.length-1?compareSource.length-literal.length:compareSource.indexOf(literal,at);if(pos<at||!compareSource.startsWith(literal,pos)||(k===0&&pos!==0)||(k===row.parts.length-1&&pos+literal.length!==source.length)){fit=false;break;}at=pos+literal.length+(k<row.parts.length-1?1:0);}if(!fit)continue;const matches=templateCaptures(row,source,context.work);for(const match of matches){const values={},counts={};let valid=true;
  for(let j=1;j<row.parts.length;j+=2){const kind=row.parts[j],raw=match[(j+1)/2],key=kind+(counts[kind]=(counts[kind]||0)+1),atom=raw.match(/^\uE100(\d+)\uE101$/);let translated;
   if(atom){const value=atoms[+atom[1]],allowed={a:['figures','entities'],n:['figures'],p:['sites','regions','undergroundregions','entities','structures','artifacts','constructions','poeticforms','musicalforms','danceforms','writtencontents'],b:['writtencontents'],e:['collections','battles'],s:['term'],i:['term'],t:['term'],r:['term'],q:['term']};if(value&&allowed[kind]?.includes(value.kind))translated=value.html;}
   else if(kind==='d'){if(/^[+-]?\d+(?:\.\d+)?$/.test(raw))translated=escape(raw);}
   else {if(raw.length>=source.length){valid=false;break;}const item=kind==='i'?global.LegendsItemTranslate?.translate(raw):undefined,nested=item!==undefined&&item!==raw?escape(item):prose(raw,context,depth+1);if(nested)translated=nested;else if(!/[\uE100\uE101]/.test(raw)){
    const known=term(raw);if(known!==raw)translated=escape(known);
    else if(['a','n','p','b','e'].includes(kind)&&/^[A-Z]/.test(raw)&&!/\b(?:was|were|is|are|has|had|became|from|after|before|in|at|during|by|with)\b/.test(raw)&&raw.split(' ').length<=8){const name=base.name(raw,{kind:['a','n'].includes(kind)?'figure':kind==='b'?'artifact':kind==='e'?'era':'site'});if(name!==raw)translated=escape(name);}
   }}
   if(translated===undefined){valid=false;break;}values[key]=translated;if(counts[kind]===1)values[kind]=translated;
  }
  if(valid){const output=proseRules[row.i][1].replace(/\{([a-z]\d*)\}/g,(_,key)=>values[key]??'');context.work.memo.set(source,output);return output;}
 }}
 // Complete sentences remain independently matchable, as in native line runs.
 const sentences=source.match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/g);if(sentences?.length>1){const translated=sentences.map(sentence=>prose(sentence,context,depth+1));if(translated.every(Boolean))return translated.join('');}
 context.work.memo.set(source,null);return null;
}
function narrative(source,context={}){return prose(source,context)??escape(source);}
function description(source){const text=String(source??'');if(proseCache.has(text))return proseCache.get(text);const result=text.split(/(\n+)/).map(part=>/^\n+$/.test(part)?part:(prose(part)||escape(term(part)))).join('');const node=document.createElement('textarea');node.innerHTML=result;const output=node.value;if(proseCache.size>=2048)proseCache.delete(proseCache.keys().next().value);proseCache.set(text,output);return output;}

function honorRequirements(honor){if(!honor)return '';const requirements=[];if(honor.required_skill)requirements.push('在'+skill(honor.required_skill,honor.required_skill_ip_total).name+'方面达到足够的技艺水平');else if(honor.requires_any_melee_or_ranged_skill!==undefined&&honor.requires_any_melee_or_ranged_skill!==false)requirements.push('在武器或技巧方面达到足够的技艺水平');const battles=number(honor.required_battles),kills=number(honor.required_kills),years=number(honor.required_years);if(battles===1)requirements.push('参加战斗');else if(battles>1)requirements.push('参加'+battles+'场战斗');if(kills===1)requirements.push('杀死一名敌人');else if(kills>1)requirements.push('杀死'+kills+'名敌人');if(years===1)requirements.push('入伍满一年');else if(years>1)requirements.push('入伍满'+years+'年');return requirements.join('、');}

function eventReferences(record){
 const result=new Map(),raw=record?.raw||record||{},type=fold(record?.type),get=key=>record?.[key]??raw[key];
 const add=(kind,value,key)=>{for(const item of arr(value)){const id=number(item);if(id!==undefined&&id>=0)result.set(kind+':'+id,{kind,id,key});}};
 for(const[, [kind,...keys]]of Object.entries(U.events[type]?.bindings||{}))for(const key of keys)if(get(key)!==undefined)add(kind,get(key),key);
 const reason=fold(get('reason')),circumstance=get('circumstance');
 if(['glorify hf','artifact is heirloom of family hfid'].includes(reason))add('figures',get('reason_id'),'reason_id');
 if(reason==='artifact is symbol of entity position')add('entities',get('reason_id'),'reason_id');
 if(['pray to hf','dream about hf','hf is dead'].includes(fold(circumstance)))add('figures',get('circumstance_id'),'circumstance_id');
 if(circumstance&&typeof circumstance==='object')add('figures',circumstance.defeated,'circumstance.defeated');
 if(['religious sympathy','revenge on grudge'].includes(fold(get('method'))))add('figures',get('relevant_id_for_method'),'relevant_id_for_method');
 return [...result.values()];
}

function eventInfo(record,context={}){
 const type=fold(record?.type),schema=U.events[type],atoms=[],used=new Set(),raw=record?.raw||record||{};
 const get=(...keys)=>{for(const object of [record,raw])for(const key of keys)if(object&&Object.prototype.hasOwnProperty.call(object,key))return first(object[key]);return undefined;};
 const atom=(html,kind)=>{const index=atoms.push({html,kind})-1;return '\uE100'+index+'\uE101';};
 const ref=(kind,id)=>{id=number(id);if(id===undefined||id<0)return '';const key=kind+':'+id;used.add(key);const found=context.record?.(kind,id);let label=found?(context.name?.(found,kind)||base.name(found.translated_name||found.name,{kind:kind.replace(/s$/,'')})):undefined;const html=context.link?.(kind,id,label)??escape(label||term(kind)+' #'+id);return atom(html,kind);};
 const defaults={HistoricalFigure:['figures','hfid','histfig','hist_figure_id','hist_fig_id','hf_id','group_hfid','group'],Site:['sites','site_id','site'],Region:['regions','subregion_id','region_id','region'],UndergroundRegion:['undergroundregions','feature_layer_id'],Entity:['entities','entity_id','entity','civ_id','civ'],Artifact:['artifacts','artifact_id','item'],Civ:['entities','civ_id','civ'],Builder:['figures','builder_hfid','builder_hf'],Maker:['figures','maker','hfid'],MakerEntity:['entities','maker_entity','entity_id'],SiteEntity:['entities','site_civ_id','site_civ'],GroupHistoricalFigure:['figures','group_hfid'],Doer:['figures','doer_hfid','doer'],Target:['figures','target_hfid','target'],Student:['figures','student_hfid','student'],Teacher:['figures','teacher_hfid','teacher'],Trickster:['figures','trickster_hfid','trickster','identity_histfig_id','identity_nemesis_id'],Source:['entities','source'],Destination:['entities','destination'],HistoricalFigureTarget:['figures','hf_target','hfid_target']};
 const binding=role=>{const original=schema?.bindings?.[role],fallback=defaults[role];return original?[original[0],...new Set([...original.slice(1),...(fallback?.slice(1)||[])])]:fallback;};
 const optional=role=>{const keys=binding(role);return keys?ref(keys[0],get(...keys.slice(1))):'';};
 const b=role=>optional(role)||atom(escape(term('unknown '+({'figures':'historical figure',sites:'site',artifacts:'item',writtencontents:'written content'}[binding(role)?.[0]]||'creature'))),binding(role)?.[0]);
 const scalar=(value,scope)=>atom(escape(term(String(value??''),scope)),'term');
 const field=(...keys)=>scalar(get(...keys));
 const present=(...keys)=>keys.some(key=>get(key)!==undefined&&get(key)!==false&&get(key)!=='false');
 const loc=()=>optional('Site')||optional('Region')||optional('UndergroundRegion');
 const at=(prep='in')=>{const place=loc();return place?' '+prep+' '+place:'';};
 const of=(role='SiteEntity',other='Civ')=>optional(role)?b(role)+(optional(other)?' of '+b(other):''):b(other);
 const structure=(...keys)=>{const id=number(get(...(keys.length?keys:['structure_id','structure','building_id']))),siteId=number(get('site_id','site'));if(id===undefined||id<0)return atom(escape(term('unknown structure')),'structures');const site=context.record?.('sites',siteId),list=arr(site?.structures?.structure??site?.structures),found=list.find(s=>Number(s.id??s.local_id)===id);return atom(context.link?.('structures',siteId+':'+id,found?(context.name?.(found,'structures')||base.name(found.name,{kind:'artifact'})):undefined)??escape(found?.name||term('structure')+' #'+id),'structures');};
 const siteProperty=(...keys)=>{const site=context.record?.('sites',number(get('site_id','site'))),properties=arr(site?.site_properties?.site_property??site?.site_properties?.property??site?.site_properties),id=number(get(...keys)),property=properties.find(p=>number(p.id)===id);if(property?.structure_id!==undefined){const structures=arr(site?.structures?.structure??site?.structures??site?.structure),found=structures.find(s=>number(s.local_id??s.id)===number(property.structure_id));if(found)return atom(context.link?.('structures',site.id+':'+property.structure_id,context.name?.(found,'structures')||base.name(found.name,{kind:'artifact'}))??escape(found.name),'structures');}return atom(escape(property?term(property.type||'unknown structure'):term('unknown structure')),'structures');};
 const list=(kind,values)=>arr(values).map(v=>ref(kind,v)).filter(Boolean).join(' and ');
 let source='',complete=true;
 const actor=b('HistoricalFigure'),place=loc();
 switch(type){
 case 'battle fought':{const battle=ref('battles',get('battle_id'))||atom('不明战役','battles');source=actor+' '+(present('was_hired')?'was hired'+(present('as_scout')?' as a scout':'')+' to fight in ':'fought in ')+battle+(optional('Site')?(present('as_attacker')?', an assault on ':' in defense of ')+b('Site'):at());break;}
 case 'created site':source=optional('Builder')?b('Builder')+' constructed '+b('Site')+(optional('ResidentCiv')?' for '+b('ResidentCiv'):''):of()+' founded '+b('Site');break;
 case 'created world construction':source=of()+' constructed '+b('WorldConstruction')+(optional('MasterWorldConstruction')?' as part of '+b('MasterWorldConstruction'):'')+' connecting '+b('Site1')+' and '+b('Site2');break;
 case 'entity created':source=optional('Creator')?b('Creator')+' formed '+b('Entity'):b('Entity')+' formed';source+=at();break;
 case 'entity relocate':source=b('Entity')+' moved to '+(present('structure_id','structure')?structure()+' in ':'')+b('Site');break;
 case 'entity primary criminals':source=b('Entity')+' became the primary criminal organization in '+b('Site');break;
 case 'entity fled site':source=b('FledCiv')+' fled '+b('Site');break;
 case 'entity rampaged in site':source='the forces of '+b('RampageCiv')+' rampaged throughout '+b('Site');break;
 case 'entity expels hf':source=b('Entity')+' expelled '+actor+' from '+b('Site');break;
 case 'entity alliance formed':source=b('InitiatingEntity')+' swore to support '+b('JoiningEntity')+' in war if the latter did likewise';break;
 case 'entity dissolved':source=b('Entity')+' dissolved';if(present('reason'))source+=' due to '+field('reason');break;
 case 'entity breach feature layer':source=of('SiteEntity','CivEntity')+' breached '+b('UndergroundRegion')+' at '+b('Site');break;
 case 'entity incorporated':source=b('JoinerEntity')+(present('partial_incorporation')?' began operating at the direction of ':' fully incorporated into ')+b('JoinedEntity')+(optional('Leader')?' under the leadership of '+b('Leader'):'')+at();break;
 case 'entity law':source=actor+(present('law_add')?' laid a series of oppressive edicts upon ':' lifted numerous oppressive laws from ')+b('Entity');break;
 case 'site abandoned':source=of()+' abandoned the settlement at '+b('Site');break;
 case 'site died':source=(optional('Civ')?b('Civ')+' abandoned the settlement of ':'the settlement of ')+b('Site')+(optional('Civ')?'':' withered');break;
 case 'site retired':source=of()+' at the settlement of '+b('Site')+' regained their senses after an initial period of questionable judgment';break;
 case 'reclaim site':source=of()+(present('unretire')?' were taken by a mood to act against their better judgment at ':' launched an expedition to reclaim ')+b('Site');break;
 case 'attacked site':case 'field battle':source=b('Attacker')+' attacked '+(type==='attacked site'&&optional('SiteEntity')?b('SiteEntity'):b('Defender'))+at(type==='attacked site'?'at':'in');break;
 case 'destroyed site':source=b('Attacker')+' defeated '+of('SiteEntity','Defender')+' and destroyed '+b('Site');break;
 case 'plundered site':source=present('took_livestock','took_items')?b('Attacker')+' stole '+(present('took_livestock')?'livestock':'treasure')+' from '+of('SiteEntity','Defender')+at():b('Attacker')+' defeated '+of('SiteEntity','Defender')+' and pillaged '+b('Site');break;
 case 'new site leader':source=b('Attacker')+' defeated '+of('SiteEntity','Defender')+' and placed '+b('NewLeader')+' in charge of '+b('Site');if(optional('NewSiteEntity'))source+='. The new government was called '+b('NewSiteEntity');break;
 case 'site taken over':source=b('Attacker')+' defeated '+of('SiteEntity','Defender')+' and took over '+b('Site');if(optional('NewSiteEntity'))source+='. The new government was called '+b('NewSiteEntity');break;
 case 'site surrendered':source=of('SiteEntity','Defender')+' surrendered '+b('Site')+' to '+b('Attacker');break;
 case 'site tribute forced':source=b('Attacker')+' secured tribute from '+of('SiteEntity','Defender')+', to be delivered from '+b('Site')+' every '+field('season');break;
 case 'site dispute':source=b('Entity1')+' of '+b('Site1')+' and '+b('Entity2')+' of '+b('Site2')+' became embroiled in a dispute over '+field('dispute');break;
 case 'first contact':source=b('Contactor')+' made contact with '+b('Contacted')+at('at');break;
 case 'holy city declaration':source=b('ReligionEntity')+' declared '+b('Site')+' to be a holy city';break;
 case 'sneak into site':source=b('Attacker')+' slipped into '+b('Site')+' undetected by '+of('SiteCiv','Defender');break;
 case 'spotted leaving site':source=of('Spotter','SiteCiv')+' spotted the forces of '+b('LeaverCiv')+' slipping out of '+b('Site');break;
 case 'entity searched site':source='the forces of '+b('SearcherCiv')+' searched '+b('Site');break;
 case 'hf attacked site':source=b('Attacker')+' attacked '+of('SiteCiv','DefenderCiv')+' at '+b('Site');break;
 case 'hf destroyed site':source=b('Attacker')+' routed '+of('SiteCiv','DefenderCiv')+' and destroyed '+b('Site');break;
 case 'hf travel':source=actor+(present('escape')?' escaped from the ':present('return')?' returned to ':' made a journey to ')+(present('escape')?b('UndergroundRegion'):optional('UndergroundRegion')||place||atom(escape('荒野'),'regions'));break;
 case 'hf reunion':source=b('HistoricalFigure1')+' was reunited with '+b('HistoricalFigure2')+at();break;
 case 'hf abducted':source=b('Snatcher')+' abducted '+b('Target')+at('from');break;
 case 'hf wounded':source=b('Woundee')+' was wounded by '+b('Wounder')+at()+(present('torture')?' as a means of torture':'');break;
 case 'hf carouse':source=b('GroupHf')+' caroused'+at()+(present('structure_id')?' in '+structure():'');break;
 case 'hf prayed inside structure':source=actor+' prayed'+(present('structure_id','structure')?' inside '+structure():'')+at();break;
 case 'hf performed horrible experiments':source=b('GroupHistoricalFigure')+' performed horrible experiments'+(present('structure_id')?' inside '+structure():'')+at();break;
 case 'hf viewed artifact':source=actor+' viewed '+b('Artifact')+(present('structure_id')?' in '+structure():'')+at();break;
 case 'hf asked about artifact':source=actor+' asked about '+b('Artifact')+(present('structure_id')?' inside '+structure():'')+at();break;
 case 'hf razed structure':case 'hf profaned structure':case 'hf disturbed structure':source=actor+' '+({'hf razed structure':'razed','hf profaned structure':'profaned','hf disturbed structure':'disturbed'}[type])+' '+structure()+at();break;
 case 'razed structure':source=b('Entity')+' razed '+structure()+at();break;
 case 'hf reach summit':source=actor+' reached the summit'+(optional('Region')?', which rises above '+b('Region'):optional('UndergroundRegion')?', in the depths of '+b('UndergroundRegion'):'')+(optional('Site')?' in '+b('Site'):'');break;
 case 'changed creature type':source=b('Changer')+' changed '+b('Changee')+' from '+scalar(get('old_race'),'creature')+' into '+scalar(get('new_race'),'creature');break;
 case 'hf gains secret goal':source=actor+(fold(get('secret_goal','goal'))==='immortality'?' became obsessed with their own mortality and sought to extend their life by any means':' gained secret goal ('+field('secret_goal','goal')+')');break;
 case 'hf does interaction':{let action=String(get('interaction_action')||'').replace(/\[IS_HIST_STRING_[12]:|\]/g,'');source=b('Doer')+' '+(action?action.replace('bit,','bit '+b('Target')+',').replace('cursed to','cursed '+b('Target')+' to'):'bit '+b('Target')+', passing on the '+field('interaction'))+(optional('Site')?' in '+b('Site'):'');break;}
 case 'hf learns secret':source=optional('Teacher')?b('Teacher')+' taught '+b('Student')+' '+field('secret_text','interaction'):b('Student')+' learned '+field('secret_text','interaction')+(optional('Artifact')?' from '+b('Artifact'):'');break;
 case 'hf new pet':source=actor+' tamed the creatures named '+scalar(get('pets','pet'),'creature')+at();break;
 case 'hf revived':source=actor+(present('disturbance')?' was disturbed from eternal rest':optional('Actor')?' was brought back from the dead':' came back from the dead')+(present('raised_before')?' once more':'')+(optional('Actor')?' by '+b('Actor'):'')+(get('ghost')?' as a '+field('ghost'):'')+at();break;
 case 'change hf body state':source=actor+' was entombed'+at()+' within '+structure();break;
 case 'change hf job':{const old=get('old_job','old_profession'),job=get('new_job','new_profession');source=actor+(old&&fold(old)!=='standard'?' gave up being '+scalar(old,'profession')+' to become '+scalar(job||'peasant','profession'):job?' became '+scalar(job,'profession'):' became a peasant')+at();break;}
 case 'change hf state':{const state=fold(get('state')),mood=fold(get('mood')),sub=number(get('substate'));const action={visiting:'visited ',settled:sub===45?'fled to ':[46,47].includes(sub)?'moved to study in ':'settled in ',wandering:'began wandering ',refugee:'became a refugee in ',snatcher:'became a snatcher in ',thief:'became a thief in ',scouting:'began scouting the area around ',hunting:'began hunting great beasts in '}[state]||{macabre:'began to skulk and brood in ',secretive:'withdrew from society in ',insane:'became crazed in ',possessed:'was possessed in ',berserk:'went berserk in ',fey:'was taken by a fey mood in ',melancholy:'was stricken by melancholy in ',fell:'was taken by a fell mood in ',catatonic:'stopped responding to the outside world in '}[mood]||'changed state in ';source=actor+' '+action+(place||atom('荒野','regions'));const reasons={'failed mood':' after failing to create an artifact','gather information':' to gather information','be with master':' in order to be with the master',flight:' in order to flee',scholarship:' in order to pursue scholarship',pilgrimage:' on a pilgrimage','lack of sleep':' due to lack of sleep','great deal of stress':' after a great deal of stress','exiled after conviction':' after being exiled following a criminal conviction'};source+=reasons[fold(get('reason'))]||'';break;}
 case 'add hf hf link':case 'remove hf hf link':{const key=fold(get('link_type','link')),verbs=type==='add hf hf link'?{apprentice:'became the master of',master:'began an apprenticeship under',deity:'began worshipping',lover:'became romantically involved with',spouse:'married','former spouse':'divorced',prisoner:'imprisoned','pet owner':'became the pet of'}:{apprentice:'ceased being the master of',master:'ceased being the apprentice of',spouse:'divorced','former spouse':'divorced','former apprentice':'ceased being the master of','former master':'ceased being the apprentice of'};source=actor+' '+(verbs[key]||'linked ('+scalar(key)+') to')+' '+b('HistoricalFigureTarget');break;}
 case 'add hf entity link':case 'remove hf entity link':{const removing=type==='remove hf entity link',key=fold(get('link_type','link')),position=get('position','position_name')||(()=>{const entity=context.record?.('entities',number(get('civ_id','civ'))),positions=arr(entity?.entity_position??entity?.positions?.entity_position??entity?.positions),profile=positions.find(p=>number(p.id)===number(get('position_id'))),figure=context.record?.('figures',number(get('hfid','histfig')));return profile?.[String(figure?.caste).toLowerCase().includes('female')?'name_female':'name_male']||profile?.name;})();const verb=(removing?{prisoner:'escaped from the prisons of',slave:'fled from',enemy:'stopped being an enemy of',member:'left'}:{prisoner:'was imprisoned by',slave:'was enslaved by',enemy:'became an enemy of',member:'became a member of','former member':'became a former member of'})[key]||(['squad','position'].includes(key)?position?(removing?'stopped being the ':'became the ')+scalar(position,'profession')+' of':removing?'stopped being an unspecified position of':'got an honorable position in':removing?'stopped being linked to':'linked to');source=actor+' '+verb+' '+b('Entity');if(optional('AppointerHf'))source+=', appointed by '+b('AppointerHf');if(optional('PromiseToHf'))source+=' as promised to '+b('PromiseToHf');break;}
 case 'add hf site link':case 'remove hf site link':{const removing=type==='remove hf site link',key=token(get('link_type','link')),verbs=removing?{homesiteabstractbuilding:'moved out of',homesiterealizationbuilding:'moved out of',hangout:'stopped ruling from',seatofpower:'stopped working from',occupation:'stopped working at'}:{homesiteabstractbuilding:'took up residence in',homesiterealizationbuilding:'took up residence in',hangout:'ruled from',seatofpower:'started working from',occupation:'started working at'};source=actor+' '+(verbs[key]||((removing?'ENDED ':'')+'UNKNOWN LINKTYPE ('+scalar(get('link_type','link')||'unknown')+')'))+' '+structure()+(optional('Civ')?' of '+b('Civ'):'')+at();break;}
 case 'hf simple battle event':{const a=b('HistoricalFigure1'),d=b('HistoricalFigure2'),key=token(get('subtype')),verbs={attacked:'attacked',confronted:'confronted',happenedupon:'happened upon',ambushed:'ambushed',cornered:'cornered',surprised:'surprised',gotintoabrawl:'got into a brawl with',subdued:'fought with and subdued'};source=key==='hf2lostaftergivingwounds'?d+' was forced to retreat from '+a+" despite the latter's wounds":key==='hf2lostaftermutualwounds'?a+' eventually prevailed and '+d+' was forced to make a hasty escape':key==='hf2lostafterreceivingwounds'?d+' managed to escape from '+a+"'s onslaught":a+' '+(verbs[key]||'fought with')+' '+d+(key==='scuffle'?'. While defeated, the latter escaped unscathed':'');break;}
 case 'hf died':{const victim=ref('figures',get('hfid','victim_hf','hf_id'))||actor,slayer=ref('figures',get('slayer_hfid','slayer_hf'))||(get('slayer_race')&&get('slayer_race')!=='-1'?scalar(get('slayer_race'),'creature'):''),cause=fold(get('cause','death_cause'));const active={murdered:'was murdered by',shot:'was shot and killed by',struck:'was struck down by','exec generic':'was executed by','exec buried alive':'was buried alive by','exec burned alive':'was burned alive by','exec crucified':'was crucified by','exec drowned':'was drowned by','exec fed to beasts':'was fed to beasts by','exec hacked to pieces':'was hacked to pieces by','exec beheaded':'was beheaded by','blood drained':'was drained of blood by',collapsed:'collapsed, struck down by','scared to death':'was scared to death by',blood:'bled to death, slain by',spikes:'was impaled by'};const passive={thirst:'died of thirst','old age':'died of old age',air:'suffocated',blood:'bled to death',cold:'froze to death','crushed bridge':'was crushed by a drawbridge',drown:'drowned',hunger:'starved to death',infection:'succumbed to infection',obstacle:'died after colliding with an obstacle','put to rest':'was put to rest',quitdead:'starved',trap:'was killed by a trap',crushed:'was crushed under a collapsing ceiling','cage blasted':'died in a cage','freezing water':'was incased in ice',scuttled:'was scuttled',slaughtered:'was slaughtered','flying object':'was killed by a flying object',melt:'melted',spikes:'was impaled',heat:'died in the heat',vanish:'vanished','cooling magma':'was encased in cooling lava',vehicle:'was crushed by a vehicle','suicide drowned':'drowned themselves','suicide leaping':'leapt from a great height',chasm:'fell into a deep chasm'};source=victim+' '+(slayer?cause==='dragonfire'?'burned up in '+slayer+"'s dragon fire":cause==='fire'?'was burned to death by '+slayer+"'s fire":(active[cause]||'was slain by')+' '+slayer:passive[cause]||active[cause]?.replace(/ by$/,'')||'died')+at();break;}
 case 'artifact created':source=b('Artifact')+(present('name_only')?' received its name':' was created')+at()+(optional('HistoricalFigure')?(present('name_only')?' from ':' by ')+actor:'');if(optional('SanctifyFigure')){source+=' in order to sanctify '+b('SanctifyFigure');if(get('circumstance')?.type==='preservebody')source+=' by preserving a part of the body';if(get('circumstance')?.type==='favoritepossession')source+="'s favorite possession";}if(get('circumstance')?.defeated!==undefined)source+=' after defeating '+ref('figures',get('circumstance').defeated);break;
 case 'artifact stored':source=b('Artifact')+' was stored'+(optional('HistoricalFigure')?' by '+actor:'')+at();break;
 case 'artifact possessed':{const reason=fold(get('reason'));source=b('Artifact')+(['artifact is heirloom of family hfid','artifact is symbol of entity position'].includes(reason)?' was acquired':' was claimed')+at()+' by '+actor;if(reason==='artifact is heirloom of family hfid')source+=' as an heirloom of the '+ref('figures',get('reason_id'))+' family';if(reason==='artifact is symbol of entity position')source+=' as a symbol of authority within '+ref('entities',get('reason_id'));if(fold(get('circumstance'))==='hf is dead')source+=' after the death of '+ref('figures',get('circumstance_id'));break;}
 case 'artifact lost':source=b('Artifact')+' was lost'+at();break;
 case 'artifact destroyed':source=b('Artifact')+' was destroyed'+(optional('Destroyer')?' by '+b('Destroyer'):'')+at();break;
 case 'artifact found':source=b('Artifact')+' was found'+(optional('HistoricalFigure')?' by '+actor:'')+(present('site_property_id')?' in '+siteProperty('site_property_id'):present('structure_id')?' inside '+structure():'')+at();break;
 case 'artifact recovered':source=b('Artifact')+' was recovered by '+actor+(present('structure_id')?' from '+structure():'')+at();break;
 case 'artifact transformed':source=b('NewArtifact')+' was made from '+b('OldArtifact')+at()+(optional('HistoricalFigure')?' by '+actor:'');break;
 case 'artifact given':source=b('Artifact')+' was offered to '+(optional('HistoricalFigureReceiver')?b('HistoricalFigureReceiver')+(optional('EntityReceiver')?' of '+b('EntityReceiver'):''):b('EntityReceiver'))+' by '+(optional('HistoricalFigureGiver')?b('HistoricalFigureGiver')+(optional('EntityGiver')?' of '+b('EntityGiver'):''):b('EntityGiver'))+({'part of trade negotiation':' as part of a trade negotiation','cement bonds of friendship':' in order to cement the bonds of friendship'}[fold(get('reason'))]||'');break;
 case 'artifact claim formed':{const claim=fold(get('claim')),special=(claim==='symbol'||claim==='heirloom'&&optional('HistoricalFigure'))&&get('circumstance')!=='from afar';source=b('Artifact')+(special?' was made a '+scalar(claim):' was claimed')+(optional('Entity')?' by '+b('Entity'):'')+(optional('HistoricalFigure')?' by '+actor:'')+(get('circumstance')?' '+field('circumstance'):'');break;}
 case 'artifact copied':source=b('DestEntity')+' made a copy of '+b('Artifact')+(optional('SourceSite')?' from '+b('SourceSite'):'')+(optional('SourceEntity')?' of '+b('SourceEntity'):'')+(optional('DestSite')?', keeping it within '+b('DestSite'):'');break;
 case 'written content composed':case 'poetic form created':case 'musical form created':case 'dance form created':{const content=type==='written content composed'?ref('writtencontents',get('wc_id','written_content_id')):ref(type.split(' ')[0]+'forms',get('form_id'));source=(content||atom(escape(term(type==='written content composed'?'unknown written content':'unknown form')),'writtencontents'))+(type==='written content composed'?' was authored by ':' was created by ')+actor+at();if(fold(get('reason'))==='glorify hf')source+=' in order to glorify '+ref('figures',get('reason_id'));const circumstance=fold(get('circumstance'));if(['pray to hf','dream about hf'].includes(circumstance))source+=' after '+(circumstance==='pray to hf'?'praying to ':'dreaming of ')+ref('figures',get('circumstance_id'));else if(circumstance)source+=' after a '+field('circumstance');break;}
 case 'gamble':case 'trade':{const shift=number(get('account_shift'))||0,result=shift>=5000?'made a fortune':shift>=1000?'did well':shift<=-1000?'did poorly':shift<=-5000?'lost a fortune':'broke even';source=b(type==='trade'?'Trader':'Gambler')+(optional('TraderEntity')?' of '+b('TraderEntity'):'')+' '+result+(type==='trade'?' trading goods'+(optional('SourceSite')?' from '+b('SourceSite'):'')+(optional('DestSite')?' to '+b('DestSite'):''):' gambling'+at());break;}
 case 'merchant':source='merchants from '+b('Source')+' visited '+b('Destination')+at('at')+(present('hardship')?' and suffered great hardships':'');if(present('lost'))source+='. They never returned';break;
 case 'diplomat lost':source=b('Entity')+' lost a diplomat at '+b('Site')+'. They suspected the involvement of '+b('InvolvedEntity');break;
 case 'peace accepted':case 'peace rejected':source=b('Destination')+' '+(type==='peace accepted'?'accepted':'rejected')+' an offer of peace from '+b('Source');break;
 case 'agreement made':case 'agreement rejected':case 'agreement concluded':{const topic=fold(get('topic')),name={wood:'a lumber agreement',tree:'a lumber agreement',tribute:'a tribute agreement','land holder':'the establishment of landed nobility','land holder elevation':'the elevation of the landed nobility'}[topic]||field('topic');source=type==='agreement concluded'?name+' between '+b('Source')+' and '+b('Destination')+at('at')+' concluded':name+' proposed by '+b('Source')+' was '+(type==='agreement made'?'accepted':'rejected')+' by '+b('Destination')+at('at');break;}
 case 'agreement formed':source=(optional('RelevantEntity')?b('RelevantEntity')+' formed an agreement':'an agreement has been formed');break;
 case 'agreement void':source='an agreement has been annulated';break;
 case 'hf enslaved':case 'hf ransomed':source=b(type==='hf enslaved'?'SellerHf':'RansomerHf')+(type==='hf enslaved'?' sold ':' ransomed ')+b(type==='hf enslaved'?'EnslavedHf':'RansomedHf')+' to '+b('PayerHf')+(optional('PayerEntity')?' of '+b('PayerEntity'):'');if(optional('MovedToSite'))source+='. '+b(type==='hf enslaved'?'EnslavedHf':'RansomedHf')+' was sent to '+b('MovedToSite');break;
 case 'sabotage':source=b('SaboteurHf')+' sabotaged the activities of '+b('TargetHf')+at('at');break;
 case 'impersonate hf':source=b('Trickster')+' fooled '+b('Target')+' into believing he/she was a manifestation of the deity '+b('Cover');break;
 case 'assume identity':source=b('Trickster')+' assumed the identity of '+(get('identity_name')?field('identity_name'):atom(escape('其他人'),'figures'));break;
 case 'hf relationship denied':source=b('Seeker')+' was denied an apprenticeship under '+b('Target')+at()+(optional('ReasonHf')?' due to jealousy of '+b('ReasonHf'):fold(get('reason'))==='prefers working alone'?' as '+b('Target')+' prefers to work alone':'');break;
 case 'hfs formed reputation relationship':source=b('HistoricalFigure1')+", formed a false friendship with "+b('HistoricalFigure2')+' in order to extract information'+at();break;
 case 'hf recruited unit type for entity':source=actor+' recruited '+field('unit_type')+' into '+b('Entity')+at();break;
 case 'hf equipment purchase':case 'entity equipment purchase':{const quality=['','well-crafted ','finely-crafted ','superior quality ','exceptional ','masterwork '][number(get('quality'))]||'';source=b(type==='hf equipment purchase'?'GroupHistoricalFigure':'Entity')+' purchased '+quality+'equipment'+(type==='hf equipment purchase'?at()+(present('structure_id')?' at '+structure():''):'')+(type==='entity equipment purchase'&&optional('HistoricalFigure')?', which '+actor+' received':'');break;}
 case 'hf preach':source=b('SpeakerHf')+' preached to '+b('Entity1')+(fold(get('topic'))==='set entity 1 against entity 2'?', inveighing against ':', urging love to be shown to ')+b('Entity2')+at('at');break;
 case 'modified building':source=b('ModifierHf')+' had a '+field('modification')+' added to '+structure()+at();break;
 case 'hf interrogated':source=b('TargetHf')+' was interrogated'+(optional('InterrogatorHf')?' by '+b('InterrogatorHf'):'');break;
 case 'created structure':source=optional('Builder')?b('Builder')+', thrust a spire of slade up from the underworld, naming it '+structure()+', and established a gateway between worlds in '+b('Site'):of()+(present('rebuild','rebuilt')?' rebuilt ':' constructed ')+structure()+at();break;
 case 'replaced structure':source=of()+' replaced '+structure('old_structure','old_structure_id')+at()+' with '+structure('new_structure','new_structure_id');break;
 case 'building profile acquired':source=(optional('AcquirerHf')?b('AcquirerHf')+(optional('AcquirerEntity')?' of '+b('AcquirerEntity'):''):atom('某人','figures'))+' '+(present('purchased_unowned')?'purchased':present('inherited')?'inherited':present('rebuilt_ruined')?'rebuilt':'acquired')+' '+siteProperty('building_profile_id')+at()+(optional('LastOwnerHf')?' formerly owned by '+b('LastOwnerHf'):'');break;
 case 'creature devoured':{const race=get('victim_race','race'),prey=optional('Victim')||(String(race??'').trim()?'a '+(get('caste')?scalar(get('caste'))+' ':'')+scalar(race,'creature'):b('Victim'));source=b('Eater')+' devoured '+prey+at();break;}
 case 'hf confronted':source=actor+' aroused general suspicion'+at()+' after '+arr(get('reason')).map(value=>({'murder':'a murder','ageless':'appearing not to age'}[fold(value)]||scalar(value))).join(' and ');break;
 case 'body abused':{const bodies=list('figures',get('bodies','hfid','histfig')),many=arr(get('bodies')).length>1,abuse=fold(get('abuse_type'));source=(many?'the bodies of ':'the body of ')+(bodies||actor)+(many?' were ':' was ')+({impaled:'impaled on a '+field('props_item_subtype','props_item_type','item_subtype','item_type'),piled:'added to a '+field('pile_type'),flayed:'flayed',hung:'hung',mutilated:'horribly mutilated',animated:'animated'}[abuse]||'abused')+' by '+(optional('HistoricalFigure')?actor+(optional('Abuser')?' of '+b('Abuser'):''):b('Abuser'))+(present('structure')?' in '+structure():'')+at();break;}
 case 'create entity position':{const reason=token(get('reason')),position=field('position');source=reason==='collaboration'?b('SiteCiv')+' collaborated to create the position of '+position:actor+' of '+b('Civ')+(reason==='threatofviolence'?' compelled the creation of the position of ':' created the position of ')+position+({forceofargument:' through force of argument',threatofviolence:' with threats of violence',waveofpopularsupport:', pushed by a wave of popular support',asamatterofcourse:' as a matter of course'}[reason]||'');break;}
 case 'insurrection started':source=present('outcome')?fold(get('outcome'))==='leadership overthrown'?'the insurrection in '+b('Site')+' concluded with '+b('Civ')+' overthrown':fold(get('outcome'))==='population gone'?'the insurrection in '+b('Site')+' ended with the disappearance of the rebelling population':'the insurrection in '+b('Site')+' against '+b('Civ')+' concluded with ('+field('outcome')+')':'an insurrection against '+b('Civ')+' began in '+b('Site');break;
 case 'hf freed':source=(optional('FreeingHf')?b('FreeingHf'):'the forces of '+b('FreeingCiv'))+' freed '+list('figures',get('rescued_hfid'))+(optional('Site')?' from '+b('Site'):'')+(optional('SiteCiv')?' and '+b('SiteCiv'):'')+(optional('HoldingCiv')?' of '+b('HoldingCiv'):'');break;
 case 'item stolen':source=(optional('Artifact')?b('Artifact'):'a '+field('mat')+' '+field('item_subtype','item_type'))+' was '+(get('theft_method')||'stolen')+(present('structure')?' from '+structure():'')+at()+' by '+b('Thief')+(optional('ReturnSite')?' and brought to '+b('ReturnSite'):'');break;
 case 'entity overthrown':source=b('Instigator')+' toppled the government of '+b('OverthrownHistoricalFigure')+' of '+b('Entity')+(get('pos_taker_hfid')!==get('instigator_hfid')?' placed '+b('PositionTaker')+' in power':' and assumed control')+at();if(get('conspirator_hfid')!==undefined)source+='. The support of '+list('figures',raw.conspirator_hfid)+' was crucial to the coup';break;
 case 'entity persecuted':source=b('PersecutorHf')+' of '+b('PersecutorEntity')+' persecuted '+b('TargetEntity')+at();if(raw.expelled_hfid!==undefined)source+='. '+list('figures',raw.expelled_hfid)+(arr(raw.expelled_hfid).length>1?' were expelled':' was expelled');if(present('destroyed_structure_id'))source+='. '+structure('destroyed_structure_id')+' was destroyed'+(number(get('shrine_amount_destroyed'))>0?' along with several smaller sacred sites':'');else if(number(get('shrine_amount_destroyed'))>0)source+=' and some sacred sites were desecrated';break;
 case 'failed frame attempt':source=b('FramerHf')+' attempted to frame '+b('TargetHf')+' for '+field('crime')+(optional('PlotterHf')?' at the behest of '+b('PlotterHf'):'')+' by fooling '+b('FooledHf')+(optional('ConvicterEntity')?' and '+b('ConvicterEntity'):'')+' with fabricated evidence, but nothing came from it';break;
 case 'hf convicted':source=b('ConvictedHf')+' was '+(present('wrongful_conviction')?'wrongfully ':'')+'convicted '+(present('convict_is_contact')?'as a go-between in a conspiracy to commit ':'of ')+field('crime')+(optional('ConvicterEntity')?' by '+b('ConvicterEntity'):'')+(optional('CorruptConvictorHf')?' and '+b('CorruptConvictorHf'):'')+(optional('PlotterHf')?' plotted by '+b('PlotterHf'):'')+(optional('FooledHf')&&optional('FramerHf')?' after '+b('FramerHf')+' fooled '+b('FooledHf')+' with fabricated evidence':'');if(present('beating'))source+=', beaten';else if(number(get('hammerstrokes'))>0)source+=', sentenced to '+get('hammerstrokes')+' hammerstrokes';if(number(get('prison_months'))>0)source+=' and imprisoned for a term of '+(number(get('prison_months'))>12?Math.floor(number(get('prison_months'))/12)+' years':get('prison_months')+' month');else if(present('death_penalty'))source+=' and sentenced to death';if(present('exiled'))source+=' and exiled';if(optional('ImplicatedHf'))source+='. '+b('ConvictedHf')+' implicated '+b('ImplicatedHf')+' during interrogation';if(optional('InterrogatorHf'))source+='. Interrogation was led by '+b('InterrogatorHf');break;
 case 'failed intrigue corruption':case 'hfs formed intrigue relationship':{const failed=type==='failed intrigue corruption',action=fold(get('action')),actions=failed?{'bribe official':' in order to have law enforcement look the other way','induce to embezzle':' in order to secure embezzled funds','corrupt in place':' in order to have an agent','bring into network':' in order to have someone to act on plots and schemes'}:{'bribe official':' began accepting bribes','induce to embezzle':' began embezzling funds','corrupt in place':' was corrupted to be an agent','bring into network':' was corrupted to act on plots and schemes'};source=failed?b('CorruptorHf')+' attempted to corrupt '+b('TargetHf')+(actions[action]||''):b('TargetHf')+(actions[action]||' was corrupted');source+=at()||' in the wilds';if(!failed)source+=' under the influence of '+b('CorruptorHf');source+='. '+(optional('LureHf')?b('LureHf')+' lured '+b('TargetHf')+' into a meeting':b('CorruptorHf')+' met with '+b('TargetHf'))+(failed?' and, while completely misreading the situation, ':' and ');const methods={intimidate:'made a threat',flatter:'made flattering remarks',bribe:'offered a bribe',precedence:'pulled rank','offer immortality':'offered immortality','religious sympathy':'played on sympathy by appealing to a shared worship of '+ref('figures',get('relevant_id_for_method')),'blackmail over embezzlement':'made a blackmail threat, due to embezzlement using the position '+field('relevant_position_profile_id')+' of '+b('RelevantEntity'),'revenge on grudge':'offered revenge upon '+ref('figures',get('relevant_id_for_method'))};source+=methods[fold(get('method'))]||field('method');source+='. The plan '+(failed?'failed':'worked');break;}
 case 'regionpop incorporated into entity':source=(number(get('pop_number_moved'))>200?'hundreds of ':number(get('pop_number_moved'))>24?'dozens of ':'several ')+'UNKNOWN RACE from '+b('PopSourceRegion')+' joined with '+b('JoinEntity')+at('at');break;
 case 'knowledge discovered':{const knowledge=String(get('knowledge')||'').split(':');source=actor+(present('first')?' was the first to discover ':' independently discovered ')+(knowledge.length>1?'the '+scalar(knowledge[1])+(knowledge.length>2?' ('+scalar(knowledge[2])+')':'')+' in the field of '+scalar(knowledge[0]):field('knowledge'));break;}
 case 'add hf entity honor':{const entity=context.record?.('entities',number(get('entity_id'))),honors=arr(entity?.honor??entity?.honors?.honor??entity?.honors),honor=honors.find(h=>number(h.id)===number(get('honor_id')));source=actor+' received the title '+scalar(honor?.name??get('honor_id'))+' in '+b('Entity');const requirements=honorRequirements(honor);if(requirements)source+=' after '+atom(escape(requirements),'term');break;}
 case 'masterpiece arch design':case 'masterpiece arch constructed':source=b('Maker')+' '+(type==='masterpiece arch design'?'designed':'constructed')+' a masterful '+field('building_subtype','building_type')+' for '+b('MakerEntity')+at();break;
 case 'masterpiece engraving':source=b('Maker')+' created a masterful engraving for '+b('MakerEntity')+at();break;
 case 'masterpiece food':source=b('Maker')+' prepared a masterful '+({0:'biscuits',1:'stew',2:'roasts'}[get('item_subtype')]||'meal')+' for '+b('MakerEntity')+at();break;
 case 'masterpiece item':source=b('Maker')+' created a masterful '+field('mat')+' '+field('item_subtype','item_type')+' for '+b('MakerEntity')+at();break;
 case 'masterpiece dye':source=b('Maker')+' masterfully dyed a '+field('mat')+' '+field('item_subtype','item_type')+' with '+field('dye_mat')+' for '+b('MakerEntity')+at();break;
 case 'masterpiece item improvement':source=b('Improver')+({ 'art image':' added a masterful image',covered:' added a masterful covering'}[get('improvement_type')]||' added masterful '+field('improvement_subtype','improvement_type'))+' in '+field('improvement_mat')+' to a '+field('mat')+' '+field('item_subtype','item_type')+' for '+b('ImproverEntity')+at('at');break;
 case 'masterpiece lost':{const creation=context.record?.('events',number(get('creation_event')));source='the masterful '+(creation?scalar([creation.mat,creation.item_subtype||creation.item_type].filter(Boolean).join(' ')):'UNKNOWN ITEM')+' was destroyed by '+actor+at();break;}
 case 'squad vs squad':{const aRoll=number(get('a_leadership_roll')),dRoll=number(get('d_leadership_roll'));source=b('AttackerHistoricalFigure')+(optional('AttackerLeader')?' as part of a squad'+(aRoll<=25?' poorly':aRoll>=100?' ably':'')+' led by '+b('AttackerLeader')+',':'')+' clashed with '+(optional('DefenderHistoricalFigure')?b('DefenderHistoricalFigure')+' as part of squad':number(get('d_number'))>0?get('d_number')+' creatures':'another squad')+at()+(optional('DefenderLeader')?(dRoll<=25?' poorly':dRoll>=100?' ably':'')+' led by '+b('DefenderLeader'):'')+(get('d_number')===get('d_slain')?', slaying them':number(get('d_slain'))>0?', slaying '+get('d_slain'):'');break;}
 case 'tactical situation':{const aRoll=number(get('a_tactics_roll'))||0,dRoll=number(get('d_tactics_roll'))||0,situation=fold(get('situation'));source=optional('AttackerTactician')&&optional('DefenderTactician')?b(aRoll>dRoll?'AttackerTactician':'DefenderTactician')+(situation.includes('strongly')?' entirely outwitted ':' outmanuevered ')+b(aRoll>dRoll?'DefenderTactician':'AttackerTactician'):optional('AttackerTactician')?b('AttackerTactician')+' used '+(aRoll>dRoll?'good':'poor')+' tactics':optional('DefenderTactician')?b('DefenderTactician')+' used '+(aRoll>dRoll?'poor':'good')+' tactics':'the forces shifted';source+=({'neither favored':', but neither side had a positional advantage','a slightly favored':', but the attackers had a slight positional advantage','d slightly favored':', but the defenders had a slight positional advantage','a strongly favored':', and the attackers had a strong positional advantage','d strongly favored':', and the defenders had a strong positional advantage'}[situation]||'')+at();break;}
 case 'ceremony':case 'competition':case 'performance':case 'procession':{const entity=context.record?.('entities',number(get('civ_id'))),occasions=arr(entity?.occasion??entity?.occasions?.occasion??entity?.occasions),occasion=occasions.find(o=>number(o.id)===number(get('occasion_id'))),schedules=arr(occasion?.schedule??occasion?.schedules?.schedule??occasion?.schedules),schedule=schedules.find(s=>number(s.id)===number(get('schedule_id')));source=b('Civ')+' held a '+scalar(schedule?.type||type)+' in '+b('Site')+' as part of '+scalar(occasion?.name??get('occasion_id'));if(type==='competition'){if(raw.competitor_hfid!==undefined)source+='. Competing were '+list('figures',raw.competitor_hfid);if(optional('Winner'))source+='. The winner was '+b('Winner');}break;}
 default:complete=false;
 }
 if(['attacked site','field battle'].includes(type)){
  if(optional('AttackerGeneral'))source+='. Leader of the attack was '+b('AttackerGeneral')+(optional('DefenderGeneral')?', and the defenders were led by '+b('DefenderGeneral'):'');
  else if(optional('DefenderGeneral'))source+='. The defenders were led by '+b('DefenderGeneral');
  for(const[role,action]of [['AttackerMercenaries','were hired by the attackers'],['DefenderMercenaries','were hired by the defenders'],['AttackerSupportMercenaries','were hired as scouts by the attackers'],['DefenderSupportMercenaries','were hired as scouts by the defenders']])if(optional(role))source+='. '+b(role)+' '+action;
 }
 if(source&&!/[.!?]$/.test(source))source+='.';
 // Parent links are passed explicitly; XML references are never inferred by order.
 if(source&&context.parents?.length)source=source.replace(/\.$/,'')+context.parents.map((parent,i)=>(i===0?' during ':' as part of ')+ref('collections',parent.id)).join('')+'.';
 const translated=source?prose(source,{atoms}):null;
 const restore=text=>String(text).split(/(\uE100\d+\uE101)/).map(part=>{const match=part.match(/^\uE100(\d+)\uE101$/);return match?atoms[+match[1]]?.html||'':escape(part);}).join('');
 let html=translated;
 if(!html){const roles=Object.entries(schema?.bindings||{}).map(([role,keys])=>{const value=get(...keys.slice(1));if(number(value)===undefined||number(value)<0)return '';return '<span class="event-role">'+escape(roleLabels[role]||term(role.replace(/([a-z])([A-Z])/g,'$1 $2')))+'：'+restore(ref(keys[0],value))+'</span>';}).filter(Boolean);html=escape(eventLabel(type))+(roles.length?'：'+roles.join('；'):'');}
 const year=number(get('year')),seconds=number(get('seconds72'));if(context.includeDate!==false&&year!==undefined){let date=year===-1?'远古之时':year+'年';if(year>=0&&seconds!==undefined&&seconds>=0){const season=Math.floor(seconds%403200/100800),part=seconds%100800;date+=['春','夏','秋','冬'][season]+(part<=33600?'初':part<=67200?'中':'末');}html=escape(date)+'，'+html;}
 return {html,source:restore(source),type,complete,translated:!!translated,roles:[...used],...(context.debug?{debug:(source.match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/g)||[source]).map(piece=>({source:restore(piece),html:prose(piece,{atoms})}))}:{})};
}
function event(record,context){return eventInfo(record,context).html;}

const collectionKinds={war:'wars',battle:'battles',duel:'duels',raid:'raids','site conquered':'siteconquerings',insurrection:'insurrections',persecution:'persecutions',purge:'purges','entity overthrown':'coups','beast attack':'rampages',abduction:'abductions',theft:'thefts',procession:'processions',performance:'performances',journey:'journeys',competition:'competitions',ceremony:'ceremonies',occasion:'occasions'};
function collectionName(record,context={}){
 const raw=record?.raw||record,type=fold(record?.type),source=String(raw?.name??'').trim(),ordinal=number(record?.ordinal),description=type==='beast attack'?'rampage':type==='entity overthrown'?'coup':type==='site conquered'?record.subtype||record.conquer_type||'invasion':type;
 if(source)return context.name?.(record,collectionKinds[type]||'collections')||base.name(source,{kind:'era'});
 if(ordinal!==undefined&&ordinal>=0)return '第'+ordinal+'次'+(type==='purge'&&record.adjective?term(record.adjective):'')+term(description);
 return term(type)+' #'+record.id;
}
function collection(record,context={}){
 if(!record)return '';const raw=record.raw||record,type=fold(record.type),kind=collectionKinds[type]||'collections',pov=context.pointOfView||{},id=number(record.id),label=collectionName(record,context);
 const link=(k,id,label)=>context.link?.(k,id,label)??escape(label||context.name?.(context.record?.(k,id),k)||term(k)+' #'+id);
 let html=link(kind,id,label);
 const reference=(k,...keys)=>{const value=keys.map(key=>number(record[key]??raw[key])).find(v=>v!==undefined&&v>=0);return value!==undefined&&!(pov.kind===k&&number(pov.id)===value)?link(k,value):'';};
 const site=reference('sites','site_id','site'),region=reference('regions','subregion_id','region_id'),under=reference('undergroundregions','feature_layer_id'),location=site||region||under;
 if(['war','battle'].includes(type))return html;
 if(type==='duel'){const a=reference('figures','attacking_hfid'),d=reference('figures','defending_hfid');if(a)html+='，'+a;if(d)html+=' 对 '+d;for(const place of [site,region,under])if(place)html+='，在 '+place;return html;}
 if(['persecution','insurrection'].includes(type)){const entity=reference('entities','target_entity_id','target_enid');if(entity)html+='，针对 '+entity;}
 if(type==='journey'){const figure=reference('figures','hfid','histfig','group_hfid');if(figure)html+='，'+figure;if(location)html+=' 前往 '+location;return html;}
 if(type==='abduction'){const target=reference('figures','abductee_hfid','target_hfid');if(target)html+='，受害者 '+target;}
 if(type==='beast attack'){const beast=reference('figures','beast_hfid','attacking_hfid');if(beast)html+='，'+beast;}
 if(type==='entity overthrown'){for(const place of [site,region,under])if(place)html+='，在 '+place;return html;}
 if(location)html+='，在 '+location;
 if(type==='site conquered'&&!(pov.kind===kind&&number(pov.id)===id)){const battle=reference('battles','battle_id','battle_eventcol');if(battle)html+='，由 '+battle+' 导致';}
 return html;
}

// Additional formatters are installed below. Skill/name rendering is available
// immediately, while the shared DFCN ready promise keeps its original meaning.
global.DFTranslate=Object.freeze({...base,term,sphere,eventLabel,skill,description,narrative,event,eventInfo,eventReferences,honorRequirements,collection,collectionName,uiCounts:Object.freeze({...U.counts,viewerClauses:viewerProductions.length,viewerRules:proseRules.length-U.legendsRules.length})});
})(window);
