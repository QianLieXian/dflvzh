/* Run with SpiderMonkey: js140 tests/parser-shell.js (no Node dependency). */
var window = globalThis;
var setTimeout = callback => callback();
class TextDecoder {
  decode(bytes) {
    if (!bytes) return '';
    let output = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) output += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return output;
  }
}
load('js/data.js');
let checks = 0;
function assert(condition, label) { if (!condition) throw Error(label); checks++; }
function equal(actual, expected, label) { assert(JSON.stringify(actual) === JSON.stringify(expected), label + ': ' + JSON.stringify(actual)); }
function fileFromText(text, name = 'test-legends.xml') {
  return { name, size: text.length, slice(start, end) {
    const part = text.slice(start, end);
    return { async arrayBuffer() { return Uint8Array.from(part, character => character.charCodeAt(0)).buffer; } };
  } };
}
async function reject(text, label) {
  let failed = false;
  try { await LegendsData.parseXML(text); } catch (_) { failed = true; }
  assert(failed, label);
}
async function run() {
  const xml = '<df_world><name>the test world</name><historical_figures><historical_figure><id>7</id><name>urist</name><birth_year>2</birth_year><sphere>A&amp;B</sphere><sphere>war</sphere><hf_link><hfid>2</hfid><link_type>spouse</link_type></hf_link></historical_figure></historical_figures><historical_events><historical_event><id>9</id><year>12</year><type>hf_died</type></historical_event></historical_events><sites><site><id>3</id><coords>4,5</coords><structure id="2"><name>Gate</name></structure></site></sites><historical_eras><historical_era><name>age of myth</name><start_year>1</start_year></historical_era></historical_eras></df_world>';
  const world = await LegendsData.parseXML(xml);
  equal([world.name, world.figures[0].name, world.figures[0].id, world.year, world.sites[0].x, world.sites[0].y], ['The Test World', 'Urist', 7, 12, 4, 5], 'normalization');
  equal(world.figures[0].raw.sphere, ['A&B', 'war'], 'repeated fields and entities');
  equal(world.figures[0].raw.id, '7', 'raw scalar preserved');
  equal(world.eras[0].end_year, -1, 'open era end');
  const batches = [], metadata = [];
  const stream = await LegendsData.parseFilesStream([fileFromText(xml)], {
    onBatch: async batch => { batches.push(...batch); }, onMetadata: (key, value) => metadata.push([key, value])
  });
  assert(stream.figures.length === 0 && stream.events.length === 0, 'stream does not retain records');
  equal([stream.name, stream.year, batches.length], ['the test world', 12, 4], 'stream metadata and records');
  equal(batches.find(entry => entry.group === 'figures').record.id, '7', 'stream record remains raw');
  assert(metadata.some(entry => entry[0] === 'name'), 'metadata callback');
  const event = '<historical_event><id>0</id><year>2</year><type>test</type></historical_event>';
  let maximumBatch = 0, count = 0;
  await LegendsData.parseFilesStream([fileFromText('<df_world><historical_events>' + event.repeat(10000) + '</historical_events></df_world>')], {
    onBatch: async batch => { maximumBatch = Math.max(maximumBatch, batch.length); count += batch.length; }
  });
  equal([maximumBatch, count], [256, 10000], 'bounded batch with backpressure');
  const before = { histfig_id: ['1', '2', '3'], structure: [{ id: '1', name: 'gate' }, { id: '2', name: 'tower' }] };
  LegendsData.mergeRecord(before, { histfig_id: ['2', '4'], structure: [{ id: '1', height: '4' }, { id: '3', name: 'hall' }] });
  equal(before.histfig_id, ['1', '2', '3', '4'], 'primitive merge deduplication');
  equal(before.structure, [{ id: '1', name: 'gate', height: '4' }, { id: '2', name: 'tower' }, { id: '3', name: 'hall' }], 'nested ID merge');
  const enums = { type: 'hf died' };
  LegendsData.mergeRecord(enums, { type: 'HfDied' }, true);
  equal(enums, { type: 'hf died', '@plus': { type: 'HfDied' } }, 'base event enums preserved');
  const widths = [262120,262121,262122,262123,262124,262125,262126,262127,262128,262129,262130,262131,262132,262133,262134,262135,262136,262137,262138,262139,262140];
  for (const width of widths) {
    const boundary = '<df_world><!--' + 'x'.repeat(width) + '--><sites><site a="x>y"><id>1</id><name><![CDATA[A&B<]]> &amp; C</name></site></sites></df_world>';
    const parsed = await LegendsData.parseXML(boundary);
    equal(parsed.sites[0].name, 'A&B< & C', 'comment/CDATA/tag chunk boundary ' + width);
  }
  const largeContent = 'x'.repeat(1024 * 1024) + '&tail';
  const cdata = await LegendsData.parseXML('<df_world><sites><site><id>1</id><name><![CDATA[' + largeContent + ']]></name></site></sites></df_world>');
  equal(cdata.sites[0].raw.name, largeContent, 'long CDATA exact preservation');
  const markerPrefix = '<df_world><sites><site><id>1</id><!--';
  for (const token of ['<name><![CDATA[A&B<]]></name>', '<name value="a>b">A&amp;B&lt;</name>', '<?process test?><name>A&amp;B&lt;</name>']) {
    for (let split = 1; split <= 12; split++) {
      const xml = markerPrefix + 'x'.repeat(262144 - split - markerPrefix.length - 3) + '-->' + token + '</site></sites></df_world>';
      const parsed = await LegendsData.parseXML(xml);
      const value = parsed.sites[0].raw.name;
      equal(typeof value === 'object' ? value['#text'] : value, 'A&B<', 'markup prefix at slice boundary ' + split);
    }
  }
  const cp437 = Array.from('ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ');
  const highBytes = Array.from({length:128}, (_, index) => String.fromCharCode(128 + index)).join('');
  const encoded = '<?xml version="1.0" encoding="CP437"?><df_world><sites><site><id>1</id><name>x' + highBytes + 'x</name></site></sites></df_world>';
  const decoded = await LegendsData.parseFiles([fileFromText(encoded)]);
  equal(decoded.sites[0].raw.name, 'x' + cp437.join('') + 'x', 'every CP437 high byte is preserved');
  await reject('<df_world><sites><site></sites></df_world>', 'mismatched tags');
  await reject('<df_world><sites><site><name>&broken;</name></site></sites></df_world>', 'unknown entity');
  await reject('<!DOCTYPE df_world SYSTEM "https://example.org"><df_world/>', 'DTD rejected');
  await reject('<df_world><sites><site/></sites><!--bad--x--></df_world>', 'invalid comment');
  await reject('<df_world><?xml?><sites><site/></sites></df_world>', 'late XML declaration');
  await reject('<df_world><sites><site id="1" id="2"/></sites></df_world>', 'duplicate attributes');
  await reject('<df_world><sites><site>', 'truncated document');
  await reject('<document/>', 'unrelated XML rejected');
  await reject('<df_world/>', 'empty world rejected');
  let cancelled = false;
  try { await LegendsData.parseFilesStream([fileFromText(xml)], {signal:{aborted:true},onBatch(){}}); }
  catch (error) { cancelled = error.name === 'AbortError'; }
  assert(cancelled, 'AbortError contract');
  const signal = {aborted:false}; cancelled = false;
  try { await LegendsData.parseFilesStream([fileFromText(xml)], {signal,onBatch(){ signal.aborted = true; }}); }
  catch (error) { cancelled = error.name === 'AbortError'; }
  assert(cancelled, 'cancellation after asynchronous sink');
  print(JSON.stringify({ ok: true, checks }));
}
run().catch(error => { print(error.message + '\n' + error.stack); quit(1); });
drainJobQueue();
