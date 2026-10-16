#!/usr/bin/env python3
"""Read-only import of DFCN prose rules and upstream LegendsViewer skill/schema data.
Development utility only; generated assets run directly under file:// in the browser.
"""
from pathlib import Path
import csv,json,re,sys,tomllib,collections
ROOT=Path(__file__).resolve().parents[1]
DF=Path(sys.argv[1] if len(sys.argv)>1 else '~/workspace/dfcn').expanduser()
UP=Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/dfcs-reference-upstream')
rows=[r for r in csv.reader((DF/'data/runtime/translations.tsv').read_text(encoding='utf-8-sig').splitlines(),delimiter='\t') if len(r)>=3 and not r[0].startswith('#')]
literal={r[0].lower():r[1] for r in rows if '{' not in r[0]}
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
roles={}
for ruleset in tomllib.loads((DF/'data/runtime/rulesets/zh-Hans/skills.toml').read_text()).get('rulesets',[]):
 if ruleset.get('name')=='name':roles.update({norm(k):v for k,v in ruleset.get('rules',{}).items() if '{' not in k})
source=(UP/'LegendsViewer.Backend/Utilities/SkillDictionary.cs').read_text(encoding='utf-8-sig')
skillAliases={'Detailer':'Engraver','Carver':'Stone Carver','Grower':'Planter','Building designer':'Architect','Keyboard Instrumentalist':'Keyboardist','String Instrumentalist':'Stringed Instrumentalist','Drummer':'Percussionist','Optician':'Optics Engineer','Fluids Engineer':'Fluid Engineer'}
legacySkillNames={'Alchemist':'炼金术师','Building designer':'建筑设计师'}
skills=[]
for key,category,token,name,desc in re.findall(r'\{"([^"]+)", new SkillDescription\("([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"\)\}',source):
 zhName=roles.get(norm(skillAliases.get(name,name))) or legacySkillNames.get(name) or literal.get(name.lower()) or literal.get('skill name: '+name.lower()) or name
 zhDesc=literal.get('skill name: '+desc.lower()) or literal.get('skill name: '+name.lower()) or literal.get(desc.lower()) or zhName
 skills.append([key,category,token,name,desc,zhName,zhDesc])
rankSource=(UP/'LegendsViewer.Backend/Legends/Various/Skill.cs').read_text()
cutoffs=list(map(int,re.search(r'PointCutoffs\s*=\s*\{([^}]+)',rankSource)[1].replace('\n','').split(',')))
ranks=re.findall(r'"([^"]+)"',re.search(r'Titles\s*=\s*\{([^}]+)',rankSource)[1])
rankTerms={name:literal.get('skill rating: '+name.lower()) or literal.get(name.lower()) or name for name in ranks+['Unknown']}
# These are the original compiled h grammar productions. UI/help/item grammars
# have independent resolvers and are deliberately not admitted into event prose.
accepted={'h','hi','ht','hti','htEi','hEi','htu','htN','hN','htv','hvt','hv','htC','hl','htl'}
rules=[r[:3] for r in rows if r[2] in accepted and '{' in r[0]]
terms={r[0].lower():r[1] for r in rows if r[2] in accepted and '{' not in r[0]}
# DFCN's r namespace is a separate semantic dictionary. In particular,
# mountains/山峦 and muck/污泥 must not use name-composition glosses. The
# native resolver also accepts no sphere and the three spelling aliases.
domains={'sphere':{r[0].lower():r[1] for r in rows if r[2]=='r' and '{' not in r[0]}}
def enumTerms(filename):
 body=(UP/'LegendsViewer.Backend/Legends/Enums'/filename).read_text(encoding='utf-8-sig').split('{',1)[1]
 description=None
 for line in body.splitlines():
  match=re.search(r'\[Description\("([^\"]+)"\)\]',line)
  if match:description=match[1];continue
  match=re.fullmatch(r'\s*(\w+),?\s*',line)
  if match:
   identifier=match[1];yield identifier,description or re.sub(r'(?<=[a-z])(?=[A-Z])',' ',identifier);description=None
domains['terrain']={}
for identifier,label in enumTerms('RegionType.cs'):
 key=label.lower();target=literal.get('book title subject: '+key) or literal.get('region name: '+key) or literal.get(key)
 if identifier=='Default':target=literal.get('unknown')
 if target:domains['terrain'][identifier.lower()]=target
domains['entityType']={}
for identifier,label in enumTerms('EntityType.cs'):
 if identifier=='Unknown':continue # The generic DFCN Unknown caption is terrain-specific.
 key=label.lower();target=literal.get(key) or literal.get('book title subject: '+key)
 if target:domains['entityType'][identifier.lower()]=target;domains['entityType'][key]=target
# Legends XML stores CREATURE raw IDs, which are not always display names:
# BIRD_ROC -> roc, COLOSSUS_BRONZE -> bronze colossus. Use DFCN's extracted
# vanilla NAME[0] evidence and reviewed creature-name namespace, never token
# reversal or word-by-word guesses. Unknown/mod IDs have no inferred alias.
creatureNames={}
# name.toml delegates first to raw_names::singular/plural. Import that literal
# branch as well, including the reviewed extinct species and caste forms.
for relative in ['creatures/name/raw_names.toml','creatures/name.toml']:
 for ruleset in tomllib.loads((DF/'data/runtime/rulesets/zh-Hans'/relative).read_text()).get('rulesets',[]):
  if ruleset.get('name') in {'singular','plural'}:
   for source,target in ruleset.get('rules',{}).items():
    if '{' not in source and '{' not in target:creatureNames.setdefault(source.lower(),target)
domains['creature']=dict(creatureNames)
creatureAliases={}
def addCreatureAlias(rawId,source):
 target=creatureNames.get(source.lower())
 if not target:return
 key=rawId.lower().replace('_',' ')
 if key in creatureAliases and creatureAliases[key]!=target:raise ValueError('Ambiguous creature RAW alias: '+rawId)
 creatureAliases[key]=target
with (DF/'data/extracted/adventure-smell/odor-raw-creature-name-sources.tsv').open(encoding='utf-8-sig',newline='') as file:
 for row in csv.DictReader(file,delimiter='\t'):
  if row['image']!='reference' or row['token']!='NAME' or row['field']!='1':continue
  addCreatureAlias(row['creature'],row['expanded_text'])
# The original odor table covers only the 767 base creatures. DFCN's native
# RAW catalog also records NAME tokens for the 200 vanilla extinct creatures.
# Use its explicit CREATURE ID -> NAME[0] evidence, not era-prefix stripping.
with (DF/'data/extracted/symbol-picker-descriptions/artifact-shared-source-catalog.tsv').open(encoding='utf-8-sig',newline='') as file:
 for row in csv.DictReader((line for line in file if not line.startswith('#')),delimiter='\t'):
  if row.get('kind')!='raw-token' or not row['owner'].startswith('CREATURE:'):continue
  name=re.fullmatch(r'\[NAME:([^:\]]+):[^:\]]+:[^:\]]+\]',row['source'])
  if name:addCreatureAlias(row['owner'][len('CREATURE:'):],name[1])
domains['creature'].update(creatureAliases)
eventPath=UP/'LegendsViewer.Backend/Legends/Events'
classes={re.search(r'class\s+(\w+)',s)[1]:(p,s) for p in eventPath.glob('*.cs') if (s:=p.read_text(encoding='utf-8-sig')) and re.search(r'class\s+(\w+)',s)}
parser=(UP/'LegendsViewer.Backend/Legends/Parser/XMLParser.cs').read_text();parser=parser[parser.index('private void AddEvent('):]
def bindingsFor(className,seen=None):
 seen=set() if seen is None else seen
 if className in seen or className not in classes:return {}
 seen.add(className);file,body=classes[className]
 parent=re.search(r'class\s+'+className+r'\s*:\s*(\w+)',body)
 bindings=bindingsFor(parent[1],seen) if parent else {}
 for match in re.finditer(r'((?:\s*case "[^"]+":\s*)+)([^;]*?world\.Get(\w+)\(Convert\.ToInt32\(property.Value\)\))',body):
  keys=re.findall(r'case "([^"]+)"',match[1]); prop=re.search(r'(\w+)\s*=',match[2]);kind={'HistoricalFigure':'figures','Entity':'entities','Site':'sites','Artifact':'artifacts','Region':'regions','UndergroundRegion':'undergroundregions','WrittenContent':'writtencontents','WorldConstruction':'constructions'}.get(match[3])
  if prop and kind:
   previous=bindings.get(prop[1],[kind]);bindings[prop[1]]=[kind,*dict.fromkeys([*previous[1:],*keys])]
 return bindings
events={}
for typeName,className in re.findall(r'case "([^"]+)":\s*World\.Events\.Add\(new (\w+)',parser):
 file,body=classes[className];bindings=bindingsFor(className)
 prints=body[body.find('public override string Print('):] if 'public override string Print(' in body else ''
 literals=re.findall(r'\.Append\("([^"\n]*)"\)',prints)
 events[typeName]={'class':className,'source':str(file.relative_to(UP)),'bindings':dict(bindings),'literals':literals}
events['battle fought']={'class':'BattleFought','source':'LegendsViewer.Backend/Legends/Events/IncidentalEvents/BattleFought.cs','synthetic':True,'bindings':{'HistoricalFigure':['figures','hfid'],'Battle':['battles','battle_id'],'Site':['sites','site_id'],'Region':['regions','subregion_id'],'UndergroundRegion':['undergroundregions','feature_layer_id']},'literals':['fought in ','was hired',' as a scout',' to fight in ',', an assault on ',' in defense of ']}
result={'skills':skills,'cutoffs':cutoffs,'ranks':ranks,'rankTerms':rankTerms,'legendsRules':rules,'legendsTerms':terms,'domains':domains,'events':events,'counts':{'skills':len(skills),'ranks':len(ranks),'legendsRules':len(rules),'legendsTerms':len(terms),'sphereTerms':len(domains['sphere']),'terrainTerms':len(domains['terrain']),'creatureNames':len(creatureNames),'creatureRawIds':len(creatureAliases),'events':len(events)}}
(ROOT/'js/translation-ui-data.js').write_text('/* DFCN grammar + LegendsViewer source metadata. Generated by tools/import-dfcn-ui.py; see TRANSLATION.md. */\nwindow.DFCN_UI='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print(json.dumps(result['counts']))
print('Untranslated skills:',[r[3] for r in skills if r[3]==r[5]])
