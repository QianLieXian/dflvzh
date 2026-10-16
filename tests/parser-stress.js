/* Bounded-memory, lazy multi-gigabyte fixture. No giant string or File is held.
   Run: js140 tests/parser-stress.js 128
        js140 tests/parser-stress.js 3994
   The numeric argument is MiB; this exercises the real parseFilesStream path. */
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
const mib = Number(scriptArgs[0] || 128);
const ascii = text => Uint8Array.from(text, character => character.charCodeAt(0));
const prefix = ascii('<df_world><name>large parser fixture</name><historical_events>');
const recordText = '<historical_event><id>0000000000</id><year>100</year><type>hf travel</type><hfid>1</hfid><site_id>2</site_id><description>' + 'An exported history record. '.repeat(32) + '</description></historical_event>\n';
const template = ascii(recordText);
const suffix = ascii('</historical_events></df_world>');
const numberOffset = recordText.indexOf('0000000000');
const records = Math.floor(mib * 1024 * 1024 / template.length);
const size = prefix.length + records * template.length + suffix.length;
const file = { name: 'large-legends.xml', size, slice(begin, end) {
  end = Math.min(end, size);
  return { async arrayBuffer() {
    const bytes = new Uint8Array(end - begin);
    let at = begin;
    while (at < end) {
      let source, sourceOffset, count;
      if (at < prefix.length) { source = prefix; sourceOffset = at; count = Math.min(end - at, prefix.length - at); }
      else if (at < prefix.length + records * template.length) {
        const relative = at - prefix.length;
        const recordIndex = Math.floor(relative / template.length);
        source = template.slice();
        const digits = String(recordIndex).padStart(10, '0');
        for (let i = 0; i < 10; i++) source[numberOffset + i] = digits.charCodeAt(i);
        sourceOffset = relative % template.length;
        count = Math.min(end - at, template.length - sourceOffset);
      } else { source = suffix; sourceOffset = at - prefix.length - records * template.length; count = Math.min(end - at, suffix.length - sourceOffset); }
      bytes.set(source.subarray(sourceOffset, sourceOffset + count), at - begin);
      at += count;
    }
    return bytes.buffer;
  } };
} };
let seen = 0, largestBatch = 0, progressCalls = 0;
const started = Date.now();
LegendsData.parseFilesStream([file], {
  async onBatch(batch) {
    largestBatch = Math.max(largestBatch, batch.length);
    for (const entry of batch) {
      if (Number(entry.record.id) !== seen || entry.group !== 'events') throw Error('record order/content mismatch');
      seen++;
    }
  },
  progress() { progressCalls++; }
}).then(world => {
  if (seen !== records || world.events.length || world.year !== 100 || largestBatch > 256) throw Error('bounded stream mismatch');
  print(JSON.stringify({ ok: true, bytes: size, records, largestBatch, progressCalls, milliseconds: Date.now() - started }));
}).catch(error => { print(error.stack); quit(1); });
drainJobQueue();
