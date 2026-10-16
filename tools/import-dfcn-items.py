#!/usr/bin/env python3
"""Read DFCN item grammar/vocabulary without modifying or building DFCN.

The browser asset contains the existing scoped TOML productions, exact literal
catalog, and the native material/designation metadata used by Legends items.
It is development tooling; the viewer itself needs no Python or server.
"""
from pathlib import Path
import ast
import csv
import json
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
DF = Path(sys.argv[1] if len(sys.argv) > 1 else '~/workspace/dfcn').expanduser()
RULES = DF / 'data/runtime/rulesets/zh-Hans'


def canonical(name, base):
    if name.startswith(('::', '@', '#')):
        return name
    if name.startswith('%'):
        before, after = name.split(':', 1)
        return before + ':' + base + ':' + after
    return '::' + (base + '::' if base else '') + name


def tokens(text, base):
    result, literal, at = [], '', 0
    while at < len(text):
        if text[at:at + 2] in ('{{', '}}'):
            literal += text[at]
            at += 2
        elif text[at] == '{':
            if literal:
                result.append([0, literal])
                literal = ''
            end = text.index('}', at + 1)
            result.append([1, canonical(text[at + 1:end], base)])
            at = end + 1
        else:
            literal += text[at]
            at += 1
    if literal:
        result.append([0, literal])
    return result


graph = {}
sources = {}
for path in sorted(RULES.rglob('*.toml')):
    data = tomllib.loads(path.read_text(encoding='utf-8-sig'))
    base = data.get('base', '')
    for ruleset in data.get('rulesets', []):
        namespace = '::' + base + ('::' if base and ruleset.get('name') else '') + ruleset.get('name', '')
        target = graph.setdefault(namespace, [])
        if ruleset.get('optional'):
            target.append([[], []])
        # toml++ tables iterate lexically; preserve the original tie order.
        for source, translated in sorted(ruleset.get('rules', {}).items()):
            original = tokens(source, base)
            references = [value for is_ref, value in original if is_ref]
            # Native parse_file rejects duplicate source references too. A
            # binding names one capture; repeated references in the output
            # deliberately reuse that one value.
            if len(references) != len(set(references)):
                raise ValueError(f'Duplicate source reference: {path}: {source}')
            target.append([original, tokens(translated, base)])
        sources.setdefault(namespace, []).append(str(path.relative_to(DF)))

roots = ['::items', '::materials', '::materials::adjective',
         '::materials::finished_adjective', '::materials::woven_plant',
         '::materials::state::adjective', '::plants', '::creatures::name']
roots += ['::items::' + family + '::' + form + '::main'
          for family in ('armor', 'helm', 'gloves', 'shoes', 'pants', 'shield', 'weapon', 'ammo', 'trapcomp')
          for form in ('default', 'singular', 'plural')]
roots += ['::items::prefix::equipment_modifier', '::items::wood::raw_names']
roots += ['::creatures::caste::name::purpose', '::color::name']
used = set()


def collect(namespace):
    if namespace in used:
        return
    used.add(namespace)
    if namespace.startswith('%item_designation:'):
        fields = namespace.split(':', 2)
        collect('::' + fields[1] + ('::' + fields[2] if len(fields) > 2 and fields[2] else ''))
    for original, translated in graph.get(namespace, []):
        for is_ref, value in original:
            if is_ref:
                collect(value)


for namespace in roots:
    collect(namespace)
graph = {key: value for key, value in graph.items() if key in used}

literals, magic, written = {}, {}, []
with (DF / 'data/runtime/translations.tsv').open(encoding='utf-8-sig', newline='') as stream:
    for row in csv.reader(stream, delimiter='\t'):
        if len(row) < 3 or row[0].startswith('#'):
            continue
        source, target, flags = row[:3]
        # legends_books.inc only admits these complete historical written-item
        # productions, separately from the global exact literal catalog.
        if 'h' in flags and 'v' in flags and source.endswith(('codex', 'scroll', 'quire', 'slab')):
            captures = re.findall(r'\{([^}]+)\}', source)
            if all(capture == 's' for capture in captures):
                written.append([source, target])
        if '{' in source:
            continue
        if 'm' in flags:
            magic.setdefault(source.lower(), {})['noun'] = target
        if 'M' in flags:
            magic.setdefault(source.lower(), {})['qualifier'] = target
        # rule_catalog_loading.inc keeps historical/help/prose scopes out of
        # exact_literal_translation. Qualifiers are resolved through magic.
        if not any(flag in flags for flag in 'harqjDMHIJ') and target:
            literals.setdefault(source, target)
            if 'i' in flags:
                literals.setdefault(source.lower(), target)
magic = {key: value for key, value in magic.items() if value.keys() >= {'noun', 'qualifier'}}

cpp = (DF / 'src/dfcn.cpp').read_text(encoding='utf-8-sig')


def native_pairs(name, fields=2):
    start = cpp.index('static constexpr auto ' + name + ' =')
    body = cpp[start:cpp.index('});', start)]
    pattern = r'\{\s*' + r'\s*,\s*'.join([r'("(?:\\.|[^"\\])*")'] * fields) + r'\s*\}'
    return [[ast.literal_eval(value) for value in row] for row in re.findall(pattern, body)]


tables = {key: native_pairs(name) for key, name in [
    ('crafts', 'embark_craft_item_nouns'), ('tools', 'embark_tool_item_nouns'),
    ('weapons', 'embark_weapon_item_nouns'), ('woolItems', 'wool_item_nouns')]}
tables['ores'] = native_pairs('arena_metal_ore_materials', 3)
wood_start = cpp.index('static const auto &arena_wood_material_sources()')
wood = cpp[wood_start:cpp.index('});', wood_start)]
tables['woods'] = re.findall(r'"([a-z -]+)"', re.sub(r'//[^\n]*', '', wood))
designation = (DF / 'src/item_designation.h').read_text(encoding='utf-8-sig')
designation = designation[designation.index('item_designation_markers[]'):]
designation = designation[:designation.index('};')]
markers = [[ast.literal_eval(value) for value in row] for row in re.findall(
    r'\{\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*\}', designation)]

# The scoped native descriptor includes generated demon/angel/night-creature
# species. Keep its reviewed tables separate from unrelated UI literals.
creatures = {}
vocabulary = (DF / 'src/creature_vocabulary.inc').read_text(encoding='utf-8-sig')
for scope, body in re.findall(r'creature_name_(\w+)\s*=\s*\{(.*?)\n\};', vocabulary, re.S):
    creatures[scope] = {ast.literal_eval(source): ast.literal_eval(target)
                        for source, target in re.findall(
                            r'\{\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*\}', body)}

# DFCN dfcn.cpp:6636 loads exactly these four native language roots. The
# masks prove an owner's shared language before the existing name translator
# is allowed to handle a creature descriptor's explicit possessive/of field.
game = Path(sys.argv[2] if len(sys.argv) > 2 else
            '~/.local/share/Steam/steamapps/common/Dwarf Fortress').expanduser()
language_root = game / 'data/vanilla/vanilla_languages/objects'
language_masks = {}
for language, name in enumerate(('DWARF', 'ELF', 'GOBLIN', 'HUMAN')):
    text = (language_root / f'language_{name}.txt').read_text(encoding='cp437')
    for word in re.findall(r'\[T_WORD:[^:\]]+:([^\]]+)\]', text):
        word = word.strip().lower()
        if word and ' ' not in word:
            language_masks[word] = language_masks.get(word, 0) | (1 << language)

result = {'version': 1, 'grammar': graph, 'literals': literals, 'magicalMaterials': magic, 'written': written,
          'markers': markers, 'native': tables, 'creatures': creatures, 'nativeLanguageMasks': language_masks,
          'counts': {'namespaces': len(graph), 'productions': sum(map(len, graph.values())),
                     'literals': len(literals), 'magicalMaterials': len(magic), 'writtenProductions': len(written),
                     'creatureTerms': sum(map(len, creatures.values())), 'nativeLanguageWords': len(language_masks)},
          'sources': ['src/legends_detail.inc:820', 'src/dfcn.cpp:30917',
                      'src/rulesets_manager.cpp', 'src/item_designation.h',
                      'data/runtime/translations.tsv', 'data/runtime/rulesets/zh-Hans',
                      'src/creature_descriptors.inc', 'src/creature_vocabulary.inc',
                      'data/vanilla/vanilla_languages/objects/language_{DWARF,ELF,GOBLIN,HUMAN}.txt']}
(ROOT / 'js/translation-item-data.js').write_text(
    '/* Generated read-only from DFCN by tools/import-dfcn-items.py. */\n'
    + 'window.DFCN_ITEMS=' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(json.dumps(result['counts']))
