/* Local, dependency-free Dwarf Fortress Legends reader. */
(function legendsDataRuntime(global) {
  'use strict';

  const SECTION_KEYS = {
    historical_figures: 'figures', sites: 'sites', entities: 'entities',
    artifacts: 'artifacts', historical_events: 'events', historical_eras: 'eras',
    regions: 'regions', historical_event_collections: 'collections'
  };
  const GROUPS = Object.values(SECTION_KEYS);
  const CHUNK_SIZE = 256 * 1024;
  const REPEATED_FIELDS = new Set(['entity_link', 'hf_link', 'hfhf_link', 'hf_skill', 'site_link', 'child', 'histfig_id', 'entity_position', 'entity_position_assignment', 'occasion', 'weapon', 'writing', 'style', 'bodies', 'inhabitant', 'copied_artifact_id', 'structure', 'sphere', 'event', 'eventcol', 'collection']);
  const CP437 = Array.from('ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ');
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const scalar = value => Array.isArray(value) ? scalar(value[0]) : value;

  function checkAbort(signal) {
    if (signal && signal.aborted) {
      const error = new Error('导入已取消。');
      error.name = 'AbortError';
      throw error;
    }
  }

  function blankWorld() {
    const world = { id: '', name: '', altname: '', year: 0, sourceFiles: [], extra: Object.create(null) };
    GROUPS.forEach(key => { world[key] = []; });
    return world;
  }

  function xmlError(message) {
    return new Error('XML 解析失败：' + message);
  }

  function decodeEntities(text) {
    if (!text.includes('&')) return text;
    return text.replace(/&([^;\s<&]*);|&/g, (match, entity) => {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (own(named, entity)) return named[entity];
      if (entity && /^#(?:[0-9]+|x[0-9a-f]+)$/i.test(entity)) {
        const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        if (number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)) return String.fromCodePoint(number);
      }
      throw xmlError('存在无效或未声明的字符实体 ' + match + '。');
    });
  }

  function addProperty(object, key, value) {
    if (!own(object, key)) {
      if (key === '__proto__') Object.defineProperty(object, key, { value, writable: true, enumerable: true, configurable: true });
      else object[key] = value;
    }
    else if (Array.isArray(object[key])) object[key].push(value);
    else object[key] = [object[key], value];
  }

  // Text and markup are consumed once, including comments/CDATA spanning many
  // file slices. Only the current record and one bounded input slice are held.
  class LegendsXMLReader {
    constructor(onRecord, onMetadata) {
      this.onRecord = onRecord;
      this.onMetadata = onMetadata;
      this.buffer = '';
      this.pending = null;
      this.stack = [];
      this.rootSeen = false;
      this.rootClosed = false;
      this.records = 0;
    }

    text(value, cdata) {
      if (!this.stack.length) {
        if (value.replace(/^\uFEFF/, '').trim()) throw xmlError('根元素之外含有文本。');
        return;
      }
      const frame = this.stack[this.stack.length - 1];
      if (!cdata && !value.trim() && (this.stack.length === 1 || this.stack.length === 2 && frame.children > 0)) return;
      if (value) {
        const part = cdata ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;') : value;
        if (frame.parts) frame.parts.push(part);
        else frame.parts = [part];
      }
    }

    open(token) {
      const selfClosing = /\/\s*$/.test(token);
      const source = selfClosing ? token.replace(/\/\s*$/, '') : token;
      const head = source.match(/^([A-Za-z_][\w.:-]*)([\s\S]*)$/);
      if (!head) throw xmlError('无效的元素标签。');
      const tag = head[1];
      if (!this.stack.length) {
        if (this.rootSeen) throw xmlError('文档包含多个根元素。');
        if (tag !== 'df_world' && tag !== 'df_world_plus') throw xmlError('这不是 Dwarf Fortress Legends XML（需要 df_world 根元素）。');
        this.rootSeen = true;
      }
      if (this.stack.length >= 80) throw xmlError('元素嵌套层级过深。');
      let object = null;
      let rest = head[2];
      if (rest.trim()) {
        const attributes = Object.create(null);
        while (rest.trim()) {
          const attribute = rest.match(/^\s+([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/);
          if (!attribute || own(attributes, attribute[1])) throw xmlError('属性格式无效或重复。');
          attributes[attribute[1]] = decodeEntities(attribute[2] === undefined ? attribute[3] : attribute[2]);
          rest = rest.slice(attribute[0].length);
        }
        object = { '@attributes': attributes };
      }
      const frame = { tag, object, parts: null, children: 0 };
      if (this.stack.length) this.stack[this.stack.length - 1].children++;
      this.stack.push(frame);
      if (selfClosing) this.close(tag);
    }

    close(tag) {
      const depth = this.stack.length;
      const frame = this.stack.pop();
      if (!frame || frame.tag !== tag) throw xmlError('元素未正确闭合：' + tag + '。');
      const text = frame.parts ? decodeEntities(frame.parts.length === 1 ? frame.parts[0] : frame.parts.join('')).trim() : '';
      let value = frame.object || (frame.children ? {} : text);
      if (typeof value === 'object' && text) value['#text'] = text;
      if (depth === 3) {
        const record = value && typeof value === 'object' ? value : { value };
        this.onRecord(this.stack[1].tag, frame.tag, record);
        this.records++;
      } else if (depth === 2) {
        if (!frame.children) this.onMetadata(frame.tag, value);
      } else if (depth === 1) {
        this.rootClosed = true;
      } else if (this.stack.length) {
        const parent = this.stack[this.stack.length - 1];
        if (!parent.object) parent.object = {};
        addProperty(parent.object, frame.tag, value);
      }
    }

    // Return true only when the record budget, rather than incomplete input,
    // stopped this feed. The caller can flush a batch and resume with ''.
    feed(chunk, final, recordLimit) {
      const source = this.buffer + chunk;
      this.buffer = '';
      const firstRecord = this.records;
      let position = 0, yielded = false;
      while (position < source.length) {
        if (this.records - firstRecord >= (recordLimit || Infinity)) { yielded = true; break; }
        if (this.pending) {
          const pending = this.pending;
          if (pending.kind === 'tag') {
            const begin = position;
            for (; position < source.length; position++) {
              const character = source[position];
              if (pending.quote) { if (character === pending.quote) pending.quote = ''; }
              else if (character === '"' || character === "'") pending.quote = character;
              else if (character === '>') break;
            }
            pending.parts.push(source.slice(begin, position));
            if (position === source.length) break;
            const token = pending.parts.length === 1 ? pending.parts[0] : pending.parts.join('');
            this.pending = null;
            position++;
            if (token.startsWith('/')) {
              if (!/^\/[A-Za-z_][\w.:-]*\s*$/.test(token)) throw xmlError('结束标签格式无效。');
              this.close(token.slice(1).trim());
            } else this.open(token);
          } else {
            const combined = pending.tail + source.slice(position);
            const terminator = pending.kind === 'comment' ? '-->' : pending.kind === 'cdata' ? ']]>' : '?>';
            const end = combined.indexOf(terminator);
            if (pending.kind === 'pi' && pending.prefix.length < 4) {
              pending.prefix = (pending.prefix + source.slice(position)).slice(0, 4);
              if (/^xml(?:\s|\?)/i.test(pending.prefix) && this.rootSeen) throw xmlError('XML 声明必须位于文档开头。');
            }
            if (end >= 0) {
              if (pending.kind === 'comment' && combined.slice(0, end).includes('--')) throw xmlError('注释中含有非法的连续连字符。');
              if (pending.kind === 'cdata') this.text(combined.slice(0, end), true);
              position += end + terminator.length - pending.tail.length;
              this.pending = null;
            } else {
              const keep = terminator.length - 1;
              if (pending.kind === 'comment') {
                const double = combined.indexOf('--');
                if (double >= 0 && double < combined.length - 2) throw xmlError('注释中含有非法的连续连字符。');
              }
              if (pending.kind === 'cdata' && combined.length > keep) this.text(combined.slice(0, -keep), true);
              pending.tail = combined.slice(-keep);
              position = source.length;
            }
          }
          continue;
        }
        const start = source.indexOf('<', position);
        if (start === -1) { this.text(source.slice(position)); position = source.length; break; }
        if (start > position) this.text(source.slice(position, start));
        position = start;
        const available = source.length - start;
        // Prefix carry is at most eight characters, never a growing token.
        if (available < 2 || source[start + 1] === '!' && ['<!--', '<![CDATA['].some(prefix => available < prefix.length && prefix.startsWith(source.slice(start)))) break;
        if (source.startsWith('<!--', start)) {
          this.pending = { kind: 'comment', tail: '' }; position += 4;
        } else if (source.startsWith('<![CDATA[', start)) {
          if (!this.stack.length) throw xmlError('CDATA 必须位于根元素内。');
          this.pending = { kind: 'cdata', tail: '' }; position += 9;
        } else if (source.startsWith('<?', start)) {
          this.pending = { kind: 'pi', tail: '', prefix: '' }; position += 2;
        } else if (source.startsWith('<!', start)) {
          throw xmlError('不支持 DTD 或外部实体；请使用原始 Legends 导出。');
        } else {
          this.pending = { kind: 'tag', parts: [], quote: '' }; position++;
        }
      }
      this.buffer = source.slice(position);
      if (final && !yielded && (this.buffer.trim() || this.pending || this.stack.length || !this.rootSeen || !this.rootClosed)) throw xmlError('文档不完整，可能被截断。');
      return yielded;
    }
  }

  function sameValue(a, b) {
    return a === b || (a && b && typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));
  }

  function mergeValues(values, items) {
    const byId = new Map(), primitives = new Set(), objectCounts = new Map();
    const objectKey = value => JSON.stringify(value);
    const indexValue = value => {
      if (value && typeof value === 'object') {
        const id = scalar(value.id === undefined ? value.local_id : value.id);
        if (id !== undefined && !byId.has(id)) byId.set(id, value);
        const key = objectKey(value);
        objectCounts.set(key, (objectCounts.get(key) || 0) + 1);
      } else primitives.add(value);
    };
    values.forEach(indexValue);
    for (const item of items) {
      const isObject = item && typeof item === 'object';
      const id = isObject ? scalar(item.id === undefined ? item.local_id : item.id) : undefined;
      const match = id === undefined ? undefined : byId.get(id);
      if (match) {
        const before = objectKey(match);
        mergeRecord(match, item, false);
        objectCounts.set(before, objectCounts.get(before) - 1);
        const after = objectKey(match);
        objectCounts.set(after, (objectCounts.get(after) || 0) + 1);
      } else if (isObject ? !objectCounts.get(objectKey(item)) : !primitives.has(item)) {
        values.push(item);
        indexValue(item);
      }
    }
    return values;
  }

  function mergeRecord(base, addition, isEvent) {
    Object.keys(addition).forEach(key => {
      const next = addition[key];
      if (!own(base, key) || base[key] === '') {
        if (key === '__proto__') Object.defineProperty(base, key, { value: next, writable: true, enumerable: true, configurable: true });
        else base[key] = next;
        return;
      }
      if (sameValue(base[key], next)) return;
      // The base export has readable event enums; DFHack spells these differently.
      if (isEvent && ['type', 'state', 'slayer_race', 'circumstance', 'reason'].includes(key)) {
        if (!base['@plus']) base['@plus'] = Object.create(null);
        base['@plus'][key] = next;
        return;
      }
      const previousId = base[key] && typeof base[key] === 'object' ? scalar(base[key].id === undefined ? base[key].local_id : base[key].id) : undefined;
      const nextId = next && typeof next === 'object' ? scalar(next.id === undefined ? next.local_id : next.id) : undefined;
      const distinctRecords = previousId !== undefined && nextId !== undefined && previousId !== nextId;
      if (base[key] && next && !Array.isArray(base[key]) && !Array.isArray(next) && typeof base[key] === 'object' && typeof next === 'object' && !distinctRecords && !REPEATED_FIELDS.has(key)) {
        mergeRecord(base[key], next, false);
      } else if (Array.isArray(base[key]) || Array.isArray(next) || distinctRecords || REPEATED_FIELDS.has(key)) {
        const values = Array.isArray(base[key]) ? base[key] : [base[key]];
        const items = Array.isArray(next) ? next : [next];
        base[key] = mergeValues(values, items);
      } else if (typeof next === 'object') {
        // Retain the earlier value if one export adds structure to a scalar.
        if (!base['@base']) base['@base'] = Object.create(null);
        base['@base'][key] = base[key];
        base[key] = next;
      } else {
        if (!base['@base']) base['@base'] = Object.create(null);
        base['@base'][key] = base[key];
        base[key] = next;
      }
    });
    return base;
  }

  function collector(world) {
    const indexes = Object.create(null);
    return {
      record(section, tag, record) {
        if (!Object.keys(record).length || (Object.keys(record).length === 1 && record.value === '')) return;
        const group = own(SECTION_KEYS, section) ? SECTION_KEYS[section] : undefined;
        const destination = group ? world[group] : (world.extra[section] || (world.extra[section] = []));
        const lookup = indexes[section] || (indexes[section] = new Map());
        const id = scalar(record.id);
        const key = id === undefined || id === '' ? (record.name ? 'name:' + scalar(record.name) : null) : 'id:' + id;
        if (key !== null && lookup.has(key)) mergeRecord(lookup.get(key), record, group === 'events');
        else {
          if (!group) record['@tag'] = tag;
          destination.push(record);
          if (key !== null) lookup.set(key, record);
        }
      },
      metadata(key, value) {
        if (value !== '' && value !== undefined) {
          if (key === 'name' || key === 'altname') {
            if (!world[key]) world[key] = value;
          } else world[key] = value;
        }
      }
    };
  }

  function titleName(value) {
    if (value === undefined || value === null || typeof value === 'object') return '';
    const name = String(value).replace(/\s+/g, ' ').trim();
    return name && name === name.toLowerCase() ? name.replace(/(^|[\s(])([a-z])/g, (match, before, character) => before + character.toUpperCase()) : name;
  }

  function numberValue(value) {
    const text = scalar(value);
    return typeof text === 'number' ? text : (typeof text === 'string' && /^-?\d+(?:\.\d+)?$/.test(text) ? Number(text) : undefined);
  }

  function readableValue(value) {
    if (Array.isArray(value)) return readableValue(value[0]);
    if (value && typeof value === 'object') return readableValue(value.name || value.name_string || value['#text'] || '');
    return value;
  }

  // ArtForm.cs derives absent names from the first " is a " in Description.
  // Keep the export's raw fields intact when applying this display metadata.
  function normalizeArtForm(record, group) {
    const type=({dance_forms:'Dance',danceforms:'Dance',musical_forms:'Musical',musicalforms:'Musical',poetic_forms:'Poetic',poeticforms:'Poetic'})[group];
    if(!type)return record;
    const source=record.raw||record,given=readableValue(source.name||source.translated_name||source.name_string||source.title),description=String(readableValue(source.description??record.description)||''),index=description.indexOf(' is a ');
    let name='';if(given){let word=true;const text=String(given);for(let at=0;at<text.length;at++){const char=text[at],lowerArticle=char==='t'&&/^the(?:[ -]|$)/i.test(text.slice(at))||char==='o'&&/^of(?:[ -]|$)/i.test(text.slice(at));const next=at===0?char.toUpperCase():word?(lowerArticle?char:char.toUpperCase()):char==='_'?' ':char.toLowerCase();name+=next;word=next===' '||next==='-';}}
    record.name=name||(index!==-1?description.slice(0,index):'Untitled');record.type=type;return record;
  }

  // Landmass.cs, River.cs and MountainPeak.cs derive these display types.
  // Test the original XML fields so repeated normalization and translated names
  // do not change the result. A present is_volcano tag means true in the source.
  function normalizeGeography(record, group) {
    if(!['landmasses','rivers','mountain_peaks','mountainpeaks'].includes(group))return record;
    const source=record.raw||record;
    if(!record.raw)record.raw={...record};
    if(group==='landmasses'){
      const name=String(readableValue(source.name)||'').toLowerCase();
      record.type=name.includes('continent')?'Continent':name.includes('island')?'Island':name.includes('land')?'Land':'Unknown';
    }else if(group==='rivers')record.type='River';
    else record.type=own(source,'is_volcano')?'Volcano':'Mountain Peak';
    return record;
  }

  function normalizeRecord(record, group, index) {
    if (!record || typeof record !== 'object') record = { value: record };
    if (!record.raw) {
      const raw = { ...record };
      Object.keys(record).forEach(key => {
        if (/^(?:id|year|start_year|end_year|birth_year|death_year|appeared|seconds72|start_seconds72|end_seconds72|birth_seconds72|death_seconds72|hfid|hf|histfig|histfig_id|slayer_hf|slayer|civ|entity|site|artifact|holder_hfid|creator_hfid|population|depth|sex|.+_id)$/.test(key)) {
          if (Array.isArray(record[key])) record[key] = record[key].map(value => numberValue(value) === undefined ? value : numberValue(value));
          else if (numberValue(record[key]) !== undefined) record[key] = numberValue(record[key]);
        }
      });
      record.raw = raw;
    }
    if (!Number.isFinite(record.id)) record.id = index;
    const givenName = readableValue(record.name || record.translated_name || record.name_string || (record.item && record.item.name_string));
    const fallbacks = { figures: 'Historical figure', sites: 'Site', entities: 'Entity', artifacts: 'Artifact', events: 'Event', eras: 'Era', regions: 'Region', collections: 'Collection' };
    record.name = titleName(givenName) || (group === 'events' ? titleName(String(record.type || 'Historical event').replace(/_/g, ' ')) : fallbacks[group] + ' #' + record.id);
    if (record.type) record.type = String(scalar(record.type)).replace(/_/g, ' ');
    if (group === 'sites') {
      const coords = String(scalar(record.coords) || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (coords && Number(coords[1]) >= 0 && Number(coords[2]) >= 0) { record.x = Number(coords[1]); record.y = Number(coords[2]); }
    }
    if (group === 'eras' || group === 'collections') {
      if (!Number.isFinite(record.year) && Number.isFinite(record.start_year)) record.year = record.start_year;
    }
    return normalizeGeography(normalizeArtForm(record,group),group);
  }

  function finishWorld(world) {
    for(const [group,kind]of [['landmasses','landmasses'],['rivers','rivers'],['mountain_peaks','mountainpeaks']])for(const rows of new Set([world.extra?.[group],world[kind]]))for(const record of rows||[])normalizeGeography(record,group);
    world.name = titleName(readableValue(world.name)) || titleName((world.sourceFiles[0] || 'Unnamed World').replace(/-legends(?:_plus)?\.xml$/i, '').replace(/[-_]\d{5}[-_]\d{2}[-_]\d{2}$/, '').replace(/_/g, ' '));
    world.altname = titleName(readableValue(world.altname)) || '';
    world.id = String(world.id || world.name).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'local-world';
    let latest = Number(world.year) || 0;
    for (const group of ['events', 'eras', 'collections']) for (const record of world[group]) {
      for (const key of ['year', 'start_year', 'end_year']) if (Number.isFinite(record[key])) latest = Math.max(latest, record[key]);
    }
    world.year = latest;
    const erasByDate = world.eras.slice().sort((a, b) => a.start_year - b.start_year);
    erasByDate.forEach((era, index) => {
      if (!Number.isFinite(era.end_year)) era.end_year = index + 1 < erasByDate.length ? erasByDate[index + 1].start_year - 1 : -1;
    });
    if (world.width !== undefined || world.world_width !== undefined) world.width = Number(world.width || world.world_width);
    if (world.height !== undefined || world.world_height !== undefined) world.height = Number(world.height || world.world_height);
    // Unlike site extents, full region coverage reaches the world edges.
    // DFHack's region coords therefore provide exact grid dimensions.
    if (!(world.width > 0 && world.height > 0)) {
      let maximumX = -1, maximumY = -1;
      world.regions.forEach(region => {
        const coords = String(scalar(region.coords) || '');
        const pattern = /(?:^|\|)\s*(\d+)\s*,\s*(\d+)\s*(?=\||$)/g;
        let match;
        while ((match = pattern.exec(coords))) {
          maximumX = Math.max(maximumX, Number(match[1]));
          maximumY = Math.max(maximumY, Number(match[2]));
        }
      });
      if (maximumX >= 0 && maximumY >= 0) {
        if (!(world.width > 0)) world.width = maximumX + 1;
        if (!(world.height > 0)) world.height = maximumY + 1;
      }
    }
    return world;
  }

  function normalizeWorld(world) {
    if (!world || typeof world !== 'object') throw new Error('世界数据格式无效。');
    if (!Array.isArray(world.sourceFiles)) world.sourceFiles = [];
    if (!world.extra) world.extra = Object.create(null);
    GROUPS.forEach(group => {
      if (!Array.isArray(world[group])) world[group] = [];
      world[group] = world[group].map((record, index) => normalizeRecord(record, group, index));
    });
    return finishWorld(world);
  }

  async function normalizeAsync(world, progress, signal) {
    checkAbort(signal);
    let completed = 0;
    const total = GROUPS.reduce((sum, group) => sum + world[group].length, 0);
    for (const group of GROUPS) {
      for (let i = 0; i < world[group].length; i++) {
        world[group][i] = normalizeRecord(world[group][i], group, i);
        if (++completed % 4000 === 0) { checkAbort(signal); progress(92 + Math.round(completed / Math.max(total, 1) * 7), '整理人物、地点和历史记录…'); await pause(); checkAbort(signal); }
      }
    }
    checkAbort(signal);
    return finishWorld(world);
  }

  async function parseXML(text, onProgress, options) {
    const signal = options && options.signal;
    checkAbort(signal);
    if (typeof text !== 'string') throw new Error('请提供 XML 文本。');
    const world = blankWorld();
    const sink = collector(world);
    const reader = new LegendsXMLReader(sink.record, sink.metadata);
    const progress = (percent, message) => { if (onProgress) onProgress({ percent, message }); };
    for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
      checkAbort(signal);
      reader.feed(text.slice(offset, offset + CHUNK_SIZE), false);
      progress(Math.round(Math.min(offset + CHUNK_SIZE, text.length) / Math.max(1, text.length) * 90), '读取 Legends XML…');
      await pause();
    }
    reader.feed('', true);
    if (!GROUPS.some(group => world[group].length)) throw new Error('XML 中没有可浏览的 Legends 数据。');
    await normalizeAsync(world, progress, signal);
    progress(100, '读取完成');
    return world;
  }

  async function parseRecord(text, section, options) {
    if (typeof text !== 'string' || !/^[A-Za-z_][\w.:-]*$/.test(section || '')) throw new Error('记录切片或 XML 区段名称无效。');
    const signal = options && options.signal;
    let record = null;
    const reader = new LegendsXMLReader((group, tag, value) => {
      if (record) throw xmlError('记录切片包含多个元素。');
      record = value;
    }, () => {});
    reader.feed('<df_world><' + section + '>', false);
    for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
      checkAbort(signal);
      reader.feed(text.slice(offset, offset + CHUNK_SIZE), false);
      if (offset + CHUNK_SIZE < text.length) await pause();
    }
    checkAbort(signal);
    reader.feed('</' + section + '></df_world>', true);
    if (!record) throw xmlError('记录切片中没有元素。');
    return record;
  }

  function decodeCP437(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      const part = bytes.subarray(i, i + 8192);
      result += Array.from(part, byte => byte < 128 ? String.fromCharCode(byte) : CP437[byte - 128]).join('');
    }
    return result;
  }

  async function fileDecoder(file) {
    const prefix = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const ascii = Array.from(prefix, byte => String.fromCharCode(byte)).join('');
    const declaration = ascii.match(/<\?xml[^>]*encoding\s*=\s*['"]([^'"]+)/i);
    const encoding = declaration ? declaration[1].toLowerCase() : 'utf-8';
    if (prefix[0] === 0xff && prefix[1] === 0xfe) return new TextDecoder('utf-16le', { fatal: true });
    if (prefix[0] === 0xfe && prefix[1] === 0xff) return new TextDecoder('utf-16be', { fatal: true });
    if (/^(?:cp|ibm|windows-?)?437$/.test(encoding)) {
      // Native single-byte decoding handles the overwhelmingly ASCII XML tags.
      // Replace only high bytes using their original positions, including byte
      // values that a Windows decoder may otherwise replace with U+FFFD.
      let singleByteDecoder;
      try { singleByteDecoder = new TextDecoder('windows-1252'); } catch (_) { /* use the portable decoder */ }
      return { decode(bytes) {
        if (!bytes) return '';
        if (!singleByteDecoder) return decodeCP437(bytes);
        const text = singleByteDecoder.decode(bytes);
        if (text.length !== bytes.length) return decodeCP437(bytes);
        return text.replace(/[\u0080-\uffff]/g, (character, index) => CP437[bytes[index] - 128]);
      } };
    }
    try { return new TextDecoder(encoding, { fatal: true }); }
    catch (_) { throw new Error('不支持 XML 声明的字符编码：' + encoding + '。请导出 UTF-8 XML。'); }
  }

  // A disk-backed consumer supplies the batch sink. No IDs, records, or merge
  // indexes are retained here after its promise resolves. Supplementary exports
  // follow the base export so the consumer can merge by (section, id).
  async function parseFilesStream(input, options) {
    options = options || {};
    const signal = options.signal;
    checkAbort(signal);
    if (typeof options.onBatch !== 'function') throw new Error('流式导入需要提供 onBatch 记录接收器。');
    const files = Array.from(input || []);
    const xmlFiles = files.filter(file => /\.xml$/i.test(file.name));
    const imageFiles = files.filter(file => /^image\/(?:png|jpeg|gif|webp|bmp)$/i.test(file.type) || /\.(?:png|jpe?g|gif|webp|bmp)$/i.test(file.name));
    if (!xmlFiles.length) throw new Error('请选择 Legends XML 文件；可同时选择 legends_plus.xml 和地图图片。');
    if (imageFiles.length > 1) throw new Error('一次只能导入一张地图底图，请选择需要显示的那张地图。');
    const exportNames = new Set(xmlFiles.filter(file => /-legends(?:_plus)?\.xml$/i.test(file.name)).map(file => file.name.replace(/-legends(?:_plus)?\.xml$/i, '').toLowerCase()));
    if (exportNames.size > 1) throw new Error('请选择同一个世界、同一次导出的 legends.xml 与 legends_plus.xml。');
    xmlFiles.sort((a, b) => Number(/legends_plus\.xml$/i.test(a.name)) - Number(/legends_plus\.xml$/i.test(b.name)));
    const world = blankWorld();
    world.importCounts = Object.fromEntries(GROUPS.map(group => [group, 0]));
    const totalBytes = xmlFiles.reduce((sum, file) => sum + file.size, 0);
    let bytesRead = 0, recordCount = 0, batch = [], metadata = [], fileName = '', reader = null;
    let maximumX = -1, maximumY = -1, lastYield = Date.now();
    const progress = (percent, message) => {
      if (options.progress) options.progress({ percent, message, bytesRead, totalBytes, records: recordCount,
        section: reader && reader.stack[1] ? reader.stack[1].tag : '' });
    };
    const flush = async () => {
      checkAbort(signal);
      if (metadata.length) {
        const pending = metadata; metadata = [];
        if (options.onMetadata) for (const entry of pending) await options.onMetadata(entry.key, entry.value);
      }
      if (batch.length) {
        const pending = batch; batch = [];
        await options.onBatch(pending, { sourceFile: fileName, bytesRead, totalBytes, records: recordCount });
        checkAbort(signal);
      }
    };
    for (const file of xmlFiles) {
      checkAbort(signal);
      if (!file.size) throw new Error(file.name + ' 是空文件。');
      fileName = file.name;
      const decoder = await fileDecoder(file);
      let documentName = '';
      reader = new LegendsXMLReader((section, tag, record) => {
        const keys = Object.keys(record);
        if (!keys.length || keys.length === 1 && record.value === '') return;
        const group = own(SECTION_KEYS, section) ? SECTION_KEYS[section] : null;
        if (group) {
          world.importCounts[group]++;
          if (group === 'events' || group === 'eras' || group === 'collections') {
            for (const key of ['year', 'start_year', 'end_year']) {
              const value = numberValue(record[key]);
              if (value !== undefined && value > world.year) world.year = value;
            }
          }
          if (group === 'regions') {
            const pattern = /(?:^|\|)\s*(\d+)\s*,\s*(\d+)\s*(?=\||$)/g;
            const coords = String(scalar(record.coords) || '');
            let match;
            while ((match = pattern.exec(coords))) { maximumX = Math.max(maximumX, Number(match[1])); maximumY = Math.max(maximumY, Number(match[2])); }
          }
        }
        batch.push({ section, group, tag, record });
        recordCount++;
      }, (key, value) => {
        if (key === 'name') documentName = value;
        if (value !== '' && value !== undefined) {
          if (key === 'name' || key === 'altname') { if (!world[key]) world[key] = value; }
          else if (key === 'year') world.year = Math.max(world.year, numberValue(value) || 0);
          else Object.defineProperty(world, key, { value, writable: true, enumerable: true, configurable: true });
          metadata.push({ key, value });
        }
      });
      try {
        for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
          checkAbort(signal);
          const bytes = new Uint8Array(await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer());
          const text = decoder.decode(bytes, { stream: true });
          bytesRead += bytes.byteLength;
          let more = reader.feed(text, false, 256);
          await flush();
          while (more) { more = reader.feed('', false, 256); await flush(); }
          progress(Math.min(98, Math.round(bytesRead / Math.max(totalBytes, 1) * 98)), '正在读取 ' + file.name + '…');
          if (typeof global.document !== 'undefined' && Date.now() - lastYield > 20) { await pause(); lastYield = Date.now(); }
        }
        let more = reader.feed(decoder.decode(), true, 256);
        await flush();
        while (more) { more = reader.feed('', true, 256); await flush(); }
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error(file.name + '：' + (error.message || '无法读取 XML。'));
      }
      if (documentName && world.name && String(documentName).toLowerCase() !== String(world.name).toLowerCase()) throw new Error('所选 XML 的世界名称不同，请分别导入。');
      world.sourceFiles.push(file.name);
    }
    if (!GROUPS.some(group => world.importCounts[group])) throw new Error('XML 中没有可浏览的 Legends 数据。');
    checkAbort(signal);
    // Counts are emitted records, including updates from legends_plus. The
    // persistent consumer calculates unique counts while merging its ID keys.
    world.counts = { ...world.importCounts };
    if (!(Number(world.width || world.world_width) > 0) && maximumX >= 0) world.width = maximumX + 1;
    if (!(Number(world.height || world.world_height) > 0) && maximumY >= 0) world.height = maximumY + 1;
    if (imageFiles.length) await readMapImage(world, imageFiles[0], signal);
    checkAbort(signal);
    progress(100, '已读取 ' + world.name);
    return world;
  }

  async function readMapImage(world, file, signal) {
    checkAbort(signal);
    const mapImage = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      const abort = () => reader.abort();
      const cleanup = () => { if (signal) signal.removeEventListener('abort', abort); };
      reader.onload = () => { cleanup(); resolve(reader.result); };
      reader.onerror = () => { cleanup(); reject(new Error('无法读取地图图片。')); };
      reader.onabort = () => { cleanup(); const error = new Error('导入已取消。'); error.name = 'AbortError'; reject(error); };
      if (signal) signal.addEventListener('abort', abort, { once: true });
      reader.readAsDataURL(file);
    });
    checkAbort(signal);
    const dimensions = typeof global.createImageBitmap === 'function' ? await global.createImageBitmap(file).then(picture => {
      const size = { width: picture.width, height: picture.height };
      picture.close();
      return size;
    }).catch(() => { throw new Error('地图图片无法解码，请选择有效的 PNG、JPEG、BMP、GIF 或 WebP 图片。'); }) : await new Promise((resolve, reject) => {
      const picture = new Image();
      picture.onload = () => resolve({ width: picture.naturalWidth, height: picture.naturalHeight });
      picture.onerror = () => reject(new Error('地图图片无法解码，请选择有效的 PNG、JPEG、BMP、GIF 或 WebP 图片。'));
      picture.src = mapImage;
    });
    checkAbort(signal);
    world.mapImage = mapImage;
    world.mapImageWidth = dimensions.width;
    world.mapImageHeight = dimensions.height;
    world.mapFileName = file.name;
    if (!world.sourceFiles) world.sourceFiles = [];
    if (!world.sourceFiles.includes(file.name)) world.sourceFiles.push(file.name);
  }

  async function parseFiles(input, onProgress, options) {
    const signal = options && options.signal;
    checkAbort(signal);
    const files = Array.from(input || []);
    const xmlFiles = files.filter(file => /\.xml$/i.test(file.name));
    const imageFiles = files.filter(file => /^image\/(?:png|jpeg|gif|webp|bmp)$/i.test(file.type) || /\.(?:png|jpe?g|gif|webp|bmp)$/i.test(file.name));
    if (!xmlFiles.length) throw new Error('请选择 Legends XML 文件；可同时选择 legends_plus.xml 和地图图片。');
    if (imageFiles.length > 1) throw new Error('一次只能导入一张地图底图，请选择需要显示的那张地图。');
    const exportNames = new Set(xmlFiles.filter(file => /-legends(?:_plus)?\.xml$/i.test(file.name)).map(file => file.name.replace(/-legends(?:_plus)?\.xml$/i, '').toLowerCase()));
    if (exportNames.size > 1) throw new Error('请选择同一个世界、同一次导出的 legends.xml 与 legends_plus.xml。');
    // Always merge supplementary data after the main export, independent of selection order.
    xmlFiles.sort((a, b) => Number(/legends_plus\.xml$/i.test(a.name)) - Number(/legends_plus\.xml$/i.test(b.name)));
    const world = blankWorld();
    const sink = collector(world);
    let consumed = 0;
    const totalSize = xmlFiles.reduce((sum, file) => sum + file.size, 0);
    let currentReader = null, records = 0;
    const progress = (percent, message) => {
      if (onProgress) onProgress({ percent, message, bytesRead: consumed, totalBytes: totalSize,
        records: records + (currentReader ? currentReader.records : 0),
        section: currentReader && currentReader.stack[1] ? currentReader.stack[1].tag : '' });
    };
    for (const file of xmlFiles) {
      if (!file.size) throw new Error(file.name + ' 是空文件。');
      const decoder = await fileDecoder(file);
      const reader = new LegendsXMLReader(sink.record, sink.metadata);
      currentReader = reader;
      let fileName = '';
      const originalMetadata = reader.onMetadata;
      reader.onMetadata = (key, value) => { if (key === 'name') fileName = value; originalMetadata(key, value); };
      try {
        for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
          checkAbort(signal);
          const bytes = new Uint8Array(await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer());
          reader.feed(decoder.decode(bytes, { stream: true }), false);
          consumed += bytes.byteLength;
          progress(Math.min(91, Math.round(consumed / Math.max(totalSize, 1) * 91)), '正在读取 ' + file.name + '…');
          await pause();
        }
        reader.feed(decoder.decode(), true);
      } catch (error) { if (error.name === 'AbortError') throw error; throw new Error(file.name + '：' + (error.message || '无法读取 XML。')); }
      if (fileName && world.name && String(fileName).toLowerCase() !== String(world.name).toLowerCase()) throw new Error('所选 XML 的世界名称不同，请分别导入。');
      world.sourceFiles.push(file.name);
      records += reader.records;
      currentReader = null;
    }
    if (!GROUPS.some(group => world[group].length)) throw new Error('XML 中没有可浏览的 Legends 数据。');
    checkAbort(signal);
    await normalizeAsync(world, progress, signal);
    if (imageFiles.length) {
      progress(99, '读取地图图片…');
      await readMapImage(world, imageFiles[0], signal);
    }
    checkAbort(signal);
    progress(100, '已载入 ' + world.name);
    return world;
  }

  global.LegendsData = Object.freeze({ parseFiles, parseFilesStream, parseXML, parseRecord, normalizeWorld, normalizeRecord, normalizeArtForm, normalizeGeography, mergeRecord, readMapImage,
    workerSource: '(' + legendsDataRuntime.toString() + ')(self);' });
})(typeof globalThis !== 'undefined' ? globalThis : window);
