const KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'for', 'function',
  'if', 'in', 'local', 'not', 'or', 'repeat', 'return', 'then',
  'until', 'while',
]);

const BUILTINS = new Set([
  'true', 'false', 'nil', 'table', 'print', 'Controls',
  'CurrentPage', 'PageNames', 'ipairs',
]);

// Tokenize a line into spans. Order matters — earlier rules take priority.
const TOKEN_RULES = [
  { type: 'comment',  regex: /--.*$/ },
  { type: 'string',   regex: /"(?:[^"\\]|\\.)*"/ },
  { type: 'number',   regex: /\b\d+(?:\.\d+)?\b/ },
  { type: 'ident',    regex: /\b[A-Za-z_]\w*\b/ },
];

function tokenizeLine(line) {
  const tokens = [];
  let pos = 0;

  while (pos < line.length) {
    let best = null;
    let bestIndex = line.length;

    for (const rule of TOKEN_RULES) {
      rule.regex.lastIndex = 0;
      const re = new RegExp(rule.regex.source, 'g');
      re.lastIndex = pos;
      const m = re.exec(line);
      if (m && m.index < bestIndex) {
        bestIndex = m.index;
        best = { type: rule.type, text: m[0], index: m.index };
      }
    }

    if (!best || bestIndex > pos) {
      const plainEnd = best ? bestIndex : line.length;
      tokens.push({ type: 'plain', text: line.slice(pos, plainEnd) });
      pos = plainEnd;
    }

    if (best) {
      // Classify identifiers as keyword/builtin/ident
      let type = best.type;
      if (type === 'ident') {
        if (KEYWORDS.has(best.text)) type = 'keyword';
        else if (BUILTINS.has(best.text)) type = 'builtin';
      }
      tokens.push({ type, text: best.text });
      pos = best.index + best.text.length;
    }
  }

  return tokens;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightLua(code) {
  const lines = code.split('\n');
  const htmlLines = lines.map(line => {
    const tokens = tokenizeLine(line);
    return tokens.map(t => {
      const escaped = escapeHtml(t.text);
      if (t.type === 'plain') return escaped;
      return `<span class="lua-${t.type}">${escaped}</span>`;
    }).join('');
  });
  return htmlLines.join('\n');
}
