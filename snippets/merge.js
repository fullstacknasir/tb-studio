// tb-to-ace-suggestions.js
// Node 14+
// Reads tb.json and ace_auto_completion_suggestion.json and writes a merged suggestion file.

const fs = require('fs');
const path = require('path');

const TB_PATH = path.resolve(__dirname, 'tb.json');
const ACE_PATH = path.resolve(__dirname, 'ace_auto_completion_suggestion.json');
const OUT_PATH = path.resolve(__dirname, 'ace_auto_completion_suggestion.merged.json');

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('Failed to read JSON:', p, e.message);
    process.exit(1);
  }
}

const tb = loadJson(TB_PATH);
const ace = loadJson(ACE_PATH);

// helper: make a snippet with parameter placeholders for functions
function fnSnippetFromName(fullName, args=[]) {
  if (!args || !args.length) return `${fullName}()`;
  // create placeholders ${1:argName}
  const params = args.map((a,i) => `\${${i+1}:${a.name||('arg'+(i+1))}}`).join(', ');
  return `${fullName}(${params})`;
}

// recursive walker to convert nested tb objects into flat suggestions
function walk(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const key of Object.keys(obj)) {
    const node = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    // If node has meta and children or is simple entry
    const meta = node && node.meta ? node.meta : null;
    if (meta === 'function') {
      // build snippet with arg placeholders if args present
      const args = node.args || [];
      const snippet = fnSnippetFromName(fullKey, args);
      out.push({
        caption: fullKey,
        snippet: snippet,
        meta: 'function',
        docHTML: node.description || ''
      });
    } else if (meta === 'property' || meta === 'object' || meta === 'service' || !meta) {
      // property or object: suggest both the path and if has children, continue to walk
      out.push({
        caption: fullKey,
        snippet: fullKey,
        meta: meta || 'property',
        docHTML: node && node.description || ''
      });
    }

    // descend into children if present
    if (node && node.children && typeof node.children === 'object') {
      out.push(...walk(node.children, fullKey));
    }
  }
  return out;
}

// The tb.json top-level may have an object like "self" or "ctx" etc. Walk entire file.
const tbSuggestions = walk(tb);

// Now merge: keep existing ACE entries, append the tb-derived entries, but dedupe by caption
const mapByCaption = new Map();
(ace || []).forEach(e => { if (e && e.caption) mapByCaption.set(e.caption, e); });

// Add / overwrite with tb suggestions if not existing
tbSuggestions.forEach(s => {
  if (!mapByCaption.has(s.caption)) {
    mapByCaption.set(s.caption, s);
  } else {
    // optionally merge docHTML
    const existing = mapByCaption.get(s.caption);
    if (!existing.docHTML && s.docHTML) existing.docHTML = s.docHTML;
  }
});

const merged = Array.from(mapByCaption.values());
fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2), 'utf8');
console.log('Wrote', OUT_PATH, 'with', merged.length, 'suggestions');
