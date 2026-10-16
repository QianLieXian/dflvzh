#!/usr/bin/env python3
"""Refresh bundled DFCN tables. Development utility only; the viewer uses no Python.

Reads DFCN and game RAWs without changing either. Run with an optional DFCN path.
The packed format interns identical strings and imagery branches losslessly.
"""
import csv
import base64
import gzip
import json
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '~/workspace/dfcn').expanduser()
DATA = SRC / 'data/runtime'
GAME = pathlib.Path.home() / '.local/share/Steam/steamapps/common/Dwarf Fortress/data/vanilla/vanilla_languages/objects'

def table(filename, header=True):
    rows = [r for r in csv.reader((DATA / filename).read_text(encoding='utf-8-sig').splitlines(), delimiter='\t') if r and not r[0].startswith('#')]
    return [dict(zip(rows[0], r)) for r in rows[1:]] if header else rows

def labels(s):
    return '|'.join(sorted(set(x.strip().lower() for x in s.split('|') if x.strip())))

bits = dict(object=1, quality=2, action=4, state=8, agent=16, prefix=32)
def kind(s):
    return sum(bits.get(x, 0) for x in set(s.split('|')))

def sense(r, english='english', meaning='sense'):
    return '\t'.join([r.get(english, '').strip().lower(), str(kind(r['kind'])), labels(r['category']), r['state'].strip().lower(), r[meaning].strip()])

strings, string_ids = [], {}
def intern(s):
    if s not in string_ids:
        string_ids[s] = len(strings)
        strings.append(s)
    return string_ids[s]

def pack(rows):
    return [[intern(x) if isinstance(x, str) else x for x in r] for r in rows]

lexicon = table('character-name-lexicon.tsv')
surnames = table('character-surname-lexicon.tsv')
imagery = table('character-surname-context-imagery.tsv')
classes = table('character-surname-classes.tsv')
constructions = table('character-surname-constructions.tsv')
branches, branch_ids, image_rows = [], {}, []
forms = dict(zip(['11','12','21','22','11z','12z','21z'], [1,2,4,8,16,32,64]))
for r in imagery:
    branch = [labels(r['partner_traits']), r['single'], r['double'], r['single_use'], r['double_use'], r['single_interpretation'], r['double_interpretation'], sum(forms.get(f, 0) for f in r['construction'].split('|')), int(r['preference'])]
    branch_key = json.dumps(branch, ensure_ascii=False)
    if branch_key not in branch_ids:
        branch_ids[branch_key] = len(branches)
        branches.append(branch)
    image_rows.append([sense(r), r['relation'], r['self_role'], labels(r['partner_class']), branch_ids[branch_key]])

result = {
    'version': 'dfcn-2026-10-16',
    'lexicon': pack([[r['english'],r['preferred'],r['full'],r['kind'],labels(r['category']),r['action'],r['state']] for r in lexicon]),
    'surnames': pack([[sense(r),r['core'],r['modifier'],r['head'],r['action'],r['agent'],r['compact'],r['balanced'],labels(r['family']),r['semantic_class'],labels(r['traits']),r['valency'],r['identity'],r['full_meaning'],labels(r['allowed_objects']),labels(r['allowed_subjects']),sense(r,'imagery_english')] for r in surnames]),
    'classes': pack([[r['class'],r['parent'],labels(r['traits'])] for r in classes if r['record_type']=='class']),
    'branches': pack(branches),
    'imagery': pack(image_rows),
    'constructions': pack([[r['relation'],r['context_relation'],r['left_role'],r['right_role'],r['direction'],r['ending'],kind(r['left_kind']),kind(r['right_kind']),labels(r['left_traits']),labels(r['right_traits']),labels(r['forms']),int(r['naturalness']),int(r['preference']),labels(r['left_class']),labels(r['right_class'])] for r in constructions]),
    'overrides': {r['english'].lower():r['chinese'] for r in table('character-name-overrides.tsv')},
    'senses': table('procedural-word-senses.tsv',False),
    'civilization': [r[:3] for r in table('civilization-name-terms.tsv',False)],
    'government': [r[:3] for r in table('site-government-name-terms.tsv',False)],
    'parentSuffixes': [[r[0],r[1],r[3]] for r in table('site-government-parent-suffixes.tsv',False)],
    'independentSuffixes': table('site-government-independent-suffixes.tsv',False),
    'siteDecisions': table('site-name-decisions.tsv',False),
    'proceduralTerms': {r[0]:r[1] for r in table('procedural-terms.tsv',False) if len(r)==2},
    'strings': strings,
}

# Retain the complete reviewed phonetic namespace, including short roots.
native = {}
for filename in ['dwarf_language/none.toml','dwarf_language/adj.toml','dwarf_language/veb.toml']:
    import tomllib
    content = tomllib.loads((DATA/'rulesets/zh-Hans'/filename).read_text(encoding='utf-8'))
    for ruleset in content.get('rulesets',[]):
        if ruleset.get('name') == 'prename':
            native.update({k.lower():v for k,v in ruleset.get('rules',{}).items() if '{' not in k})
        elif ruleset.get('name') in ['main']:
            native.update({k.lower():v for k,v in ruleset.get('rules',{}).items() if '{' not in k})

terms = {}
for r in table('translations.tsv',False):
    if len(r)<3 or '{' in r[0]:
        continue
    source,target,flags=r[:3]
    if source.startswith('Native name pronunciation: '):
        native[source.removeprefix('Native name pronunciation: ').lower()] = target
    elif 'w' in flags and 'i' in flags and source[:1].isupper() and ' ' not in source:
        native[source.lower()] = target
    # All literal entries are bundled; context prefixes remain scoped keys.
    terms[source.lower()] = target
result['terms'] = terms
result['native'] = native
result['nativeWords'] = []
result['englishForms'] = {}
result['proceduralMeanings'] = {}
if GAME.is_dir():
    words = set()
    for language in ['DWARF','ELF','GOBLIN','HUMAN']:
        raw=(GAME/f'language_{language}.txt').read_text(encoding='cp437')
        words.update(m.group(1).lower() for m in re.finditer(r'\[T_WORD:[^:\]]+:([^\]]+)\]',raw))
    result['nativeWords'] = sorted(words)
    raw=(GAME/'language_words.txt').read_text(encoding='cp437')
    word=None
    definition=None
    forms=[]
    offsets={'NOUN':0,'ADJ':2,'PREFIX':3,'VERB':4}
    senses={(r[0],r[1]):r[3] for r in result['senses']}
    role_tokens={'FRONT_COMPOUND_NOUN_SING':(0,1),'FRONT_COMPOUND_NOUN_PLUR':(1,1),'REAR_COMPOUND_NOUN_SING':(0,2),'REAR_COMPOUND_NOUN_PLUR':(1,2),'FRONT_COMPOUND_ADJ':(0,4),'REAR_COMPOUND_ADJ':(0,8),'FRONT_COMPOUND_PREFIX':(0,16)}
    for token in re.findall(r'\[([^\]]+)\]',raw):
        parts=token.split(':')
        if parts[0]=='WORD':
            word=parts[1]
            result['englishForms'][word]=['']*9
            definition=None;forms=[]
        elif word and parts[0] in ['NOUN','ADJ','PREFIX','VERB']:
            definition=parts[0]
            forms=[s.lower() for s in parts[1:] if s]
            start=offsets[parts[0]]
            for i,form in enumerate(parts[1:]):
                if start+i<9:
                    result['englishForms'][word][start+i]=form
        elif word and definition and parts[0] in role_tokens or word and definition and parts[0]=='STANDARD_VERB':
            targets=[(i,32) for i in range(len(forms))] if parts[0]=='STANDARD_VERB' else [role_tokens[parts[0]]]
            for i,role in targets:
                if i>=len(forms) or not (gloss:=senses.get((word,definition))):continue
                meanings=result['proceduralMeanings'].setdefault(forms[i],[])
                existing=next((m for m in meanings if m[0]==word and m[1]==definition),None)
                if existing:existing[3]|=role
                else:meanings.append([word,definition,gloss,role])
    # Only entries that really occur in game language vocabularies belong to
    # the native phonetic namespace, exactly as DFCN's membership gate.
    result['native']={k:v for k,v in native.items() if k in words}

# Keep every reading reachable from the complete naming tables. Scoring reads
# each registered form separately (never a generated concatenation), so this
# removes unrelated dictionary entries without changing any candidate score.
chinese_texts=set()
for r in surnames:
    for value in r.values():
        if re.search(r'[\u3400-\u9fff]',value):
            chinese_texts.update(value.split('|'))
for r in imagery:
    chinese_texts.update(r['single'].split('|'))
    chinese_texts.update(r['double'].split('|'))
reachable_phrases=set()
for value in chinese_texts:
    for start in range(len(value)):
        for length in range(2,min(6,len(value)-start)+1):
            reachable_phrases.add(value[start:start+length])
reachable_characters=set(''.join(chinese_texts)+'之者')
characters={}
for line in (DATA/'pinyin-data/pinyin.txt').read_text().splitlines():
    line=line.split('#',1)[0].strip()
    m=re.match(r'U\+([0-9A-Fa-f]+):\s*(.+)',line)
    if m:
        char=chr(int(m.group(1),16))
        if char in reachable_characters:
            characters[char] = characters.get(char,'') + ('\n' if char in characters else '') + m.group(2)
phrases={}
for line in (DATA/'phrase-pinyin-data/large_pinyin.txt').read_text().splitlines():
    line=line.split('#',1)[0].strip()
    if ':' not in line:
        continue
    word,reading=[s.strip() for s in line.split(':',1)]
    if word in reachable_phrases and len(reading.split())==len(word):
        existing=phrases.get(word,'').split('\n')
        if reading not in existing:
            phrases[word]=phrases.get(word,'')+ ('\n' if word in phrases else '') + reading
result['characters']=characters
result['phrases']=phrases
result['counts']={k:len(v) for k,v in result.items() if isinstance(v,(list,dict))}
out=ROOT/'js/translation-data.js'
out.write_text('/* DFCN data; provenance and licenses: TRANSLATION.md. Generated by tools/import-dfcn.py. */\nwindow.DFCN_DATA='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')

def vowel(phone):
    return re.sub(r'[012]$','',phone) in 'AA AE AH AO AW AY EH EY IH IY OY UH UW LOT GOAT NURSE NEAR SQUARE CURE'.split()

def rp(tokens):
    output=[]
    reductions=0
    i=0
    ipa_map={'ɪə':'NEAR','ɛə':'SQUARE','eə':'SQUARE','ɛː':'SQUARE','ʊə':'CURE','ɒ':'LOT','əʊ':'GOAT','əw':'GOAT','ɜː':'NURSE','ɜ':'NURSE','ɔː':'AO','ɒː':'AO','ɑː':'AA','ɑ':'AA','æ':'AE','a':'AE','ɐ':'AH','ʌ':'AH','ə':'AH','ɛ':'EH','e':'EH','ɪ':'IH','iː':'IY','ʊ':'UH','uː':'UW','ʉː':'UW','ʉ':'UW','aɪ':'AY','aj':'AY','aʊ':'AW','aw':'AW','eɪ':'EY','ej':'EY','ɔɪ':'OY','ɔj':'OY','p':'P','b':'B','t':'T','ʔ':'T','d':'D','k':'K','c':'K','g':'G','ɡ':'G','ɟ':'G','tʃ':'CH','dʒ':'JH','f':'F','v':'V','θ':'TH','ð':'DH','s':'S','z':'Z','ʃ':'SH','ʒ':'ZH','h':'HH','m':'M','ɱ':'M','n':'N','ɲ':'N','ŋ':'NG','l':'L','ɫ':'L','ʎ':'L','ɹ':'R','r':'R','j':'Y','w':'W'}
    while i<len(tokens):
        token=tokens[i]
        stress=1 if token.startswith('ˈ') else 2 if token.startswith('ˌ') else -1
        token=token.lstrip('ˈˌ')
        next_token=tokens[i+1].lstrip('ˈˌ') if i+1<len(tokens) else ''
        palatal='ʲ' in token or token in ['c','cʰ','cʷ','ɟ','ɟʷ','ɲ','ʎ']
        syllabic='̩' in token
        reductions+=int(token=='ʔ' or syllabic)
        for marker in ['ʰ','ʷ','ʲ','̪','̩']:
            token=token.replace(marker,'')
        if token in ['ɪ','iː'] and next_token=='ə':
            phone='NEAR';i+=1
        elif token in ['ɛ','e'] and next_token=='ə':
            phone='SQUARE';i+=1
        elif token in ['ʊ','ʉː','uː'] and next_token=='ə':
            phone='CURE';i+=1
        elif token=='i':
            phone='IY' if stress>0 else 'IH'
            if stress<0: stress=0
        elif token=='ç':
            output.append('HH')
            if next_token in ['ʉː','uː']:
                phone='Y'
            else:
                i+=1;continue
        else:
            phone=ipa_map.get(token)
            if not phone:
                return [],reductions
        if token=='ə':stress=0
        if syllabic and (not output or output[-1]!='AH0'):output.append('AH0')
        if stress>=0 and vowel(phone):phone+=str(stress)
        output.append(phone)
        if palatal and next_token in ['uː','ʉː']:output.append('Y')
        i+=1
    i=0
    while i<len(output):
        if output[i]=='R' and (i+1==len(output) or i>0 and vowel(output[i-1]) and not vowel(output[i+1])):
            output.pop(i)
        else:i+=1
    return output,reductions

pronunciation_dir=DATA/'english-pronunciation'
dictionary={}
for row in csv.reader((pronunciation_dir/'britfone.csv').read_text().splitlines()):
    if not row or row[0].startswith('#'):continue
    spelling=row[0].strip().lower()
    variant=0
    match=re.search(r'\((\d+)\)$',spelling)
    if match:variant=int(match.group(1));spelling=spelling[:match.start()]
    phones,_=rp(row[1].split())
    dictionary.setdefault(spelling,[]).append((variant,' '.join(phones)))
for spelling,rows in dictionary.items():
    dictionary[spelling]=[r[1] for r in sorted(rows,key=lambda r:r[0])]
supplement={}
for line in (pronunciation_dir/'mfa-english-uk.dict').read_text().splitlines():
    row=line.split()
    if not row or row[0].startswith(('#','<','[')):continue
    try:
        probability=float(row[1]);phone_start=5
    except ValueError:
        probability=1;phone_start=1
    phones,reduced=rp(row[phone_start:])
    supplement.setdefault(row[0].lower(),[]).append((reduced,-probability,' '.join(phones)))
for spelling,rows in supplement.items():
    if spelling not in dictionary:dictionary[spelling]=[r[2] for r in sorted(rows,key=lambda r:r[:2])]

transcription=(SRC/'src/english_hanzi_transcription.h').read_text()
quoted=lambda s:re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"',s)
section=lambda start,end:transcription.split(start,1)[1].split(end,1)[0]
row_pattern=r'\{"([A-Z]*)",\s*\{([^{}]+)\},\s*\{([^{}]+)\},\s*\{([^{}]+)\}\}'
rows={m[0]:[quoted(m[1]),quoted(m[2]),quoted(m[3])] for m in re.findall(row_pattern,section('rows_{{','struct DiphthongNasalRow'))}
# KW/GW declarations have their row name outside the initializer.
for name in ['kw','gw']:
    content=section('Row '+name+'_row_{','};')
    values=quoted(content)
    rows[values[0]]=[values[1:11],values[11:16],values[16:21]]
central={m[0]:quoted(m[1]) for m in re.findall(r'CentralRow\{"([A-Z]*)",\s*\{([^{}]+)\}',section('central_rows_{','struct PalatalRow'))}
palatal={m[0]:quoted(m[1]) for m in re.findall(r'PalatalRow\{"([A-Z]*)",\s*\{([^{}]+)\}',section('palatal_rows_{','struct Row'))}
diphthong={m[0]:[quoted(m[1]),quoted(m[2])] for m in re.findall(r'DiphthongNasalRow\{"([A-Z]*)",\s*\{([^{}]+)\},\s*\{([^{}]+)\}',section('diphthong_nasal_rows_{','static Phone parse'))}
fixed=[[quoted(m[0]),m[1],m[2]=='true'] for m in re.findall(r'FixedRule\{\{([^{}]+)\},\s*"([^"]+)",\s*(true|false)\}',section('fixed_rules_{','struct CentralRow'))]
engine=(SRC/'src/english_name_transliteration.h').read_text()
contrasts={m[0]:[' '.join(rp(m[1].split())[0]),' '.join(rp(m[2].split())[0])] for m in re.findall(r'\{"([a-z]+)",\s*"([^"]+)",\s*"([^"]+)"\}',engine.split('contrasts[] = {',1)[1].split('};',1)[0])}
phonetics={'dictionary':dictionary,'rows':rows,'central':central,'palatal':palatal,'diphthong':diphthong,'fixed':fixed,'contrasts':contrasts,
    'fst':base64.b64encode(gzip.compress((pronunciation_dir/'mfa-english-uk-g2p.fst').read_bytes(),compresslevel=9,mtime=0)).decode('ascii')}
(ROOT/'js/translation-phonetics.js').write_text('/* DFCN British pronunciation resources. Licenses: ../TRANSLATION.md. */\nwindow.DFCN_PHONETICS='+json.dumps(phonetics,ensure_ascii=False,separators=(',',':'))+';\n')
licenses=ROOT/'licenses'
licenses.mkdir(exist_ok=True)
for source,target in [(SRC/'LICENSE','dfcn-LICENSE.txt'),(SRC/'THIRD_PARTY_NOTICES.md','dfcn-THIRD_PARTY_NOTICES.md'),(DATA/'pinyin-data/LICENSE','pinyin-LICENSE.txt'),(DATA/'phrase-pinyin-data/LICENSE','phrase-pinyin-LICENSE.txt'),(pronunciation_dir/'britfone.LICENSE','britfone-LICENSE.txt'),(pronunciation_dir/'MFA-LICENSE.txt','MFA-LICENSE.txt'),(pronunciation_dir/'SOURCE','english-pronunciation-SOURCE.txt')]:
    shutil.copyfile(source,licenses/target)
for filename in ['dfi18n-data.LICENSE.md','dfzh-data.LICENSE.md','ECDICT.LICENSE']:
    shutil.copyfile(SRC/'data/upstream/licenses'/filename,licenses/filename)
print(json.dumps({'bytes':out.stat().st_size,**result['counts']},ensure_ascii=False))
