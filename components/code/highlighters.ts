// Lightweight, dependency-free single-pass syntax highlighters. Each takes source
// code and returns HTML-escaped markup with <span class="tok-*"> tokens, matching
// the .tok-* colours in globals.css. Used by the CodeArea overlay editor.

export type Highlighter = (src: string) => string;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const TAIL = "\n"; // keeps the final line visible/scrollable under the textarea

// ── Python ────────────────────────────────────────────────────────────
const PY_KW = "and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|True|False|None";
const PY_BI = "print|len|range|int|str|float|list|dict|set|tuple|input|abs|sum|min|max|type|bool|enumerate|zip|map|filter|open|round|sorted|reversed|repr|format|isinstance";
const PY_RE = new RegExp(
  `(#[^\\n]*)|('''[\\s\\S]*?'''|"""[\\s\\S]*?"""|'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*")|\\b(\\d+\\.?\\d*)\\b|\\b(${PY_KW})\\b|\\b(${PY_BI})\\b`,
  "g",
);
export const python: Highlighter = (src) =>
  esc(src).replace(PY_RE, (m, c, s, n, k, b) =>
    c ? `<span class="tok-c">${c}</span>`
      : s ? `<span class="tok-s">${s}</span>`
      : n ? `<span class="tok-n">${n}</span>`
      : k ? `<span class="tok-k">${k}</span>`
      : b ? `<span class="tok-b">${b}</span>` : m) + TAIL;

// ── JavaScript ────────────────────────────────────────────────────────
const JS_KW = "var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|typeof|instanceof|in|of|delete|void|yield|async|await|try|catch|finally|throw|import|from|export|default|null|undefined|true|false";
const JS_BI = "console|document|window|Math|JSON|Object|Array|String|Number|Boolean|parseInt|parseFloat|isNaN|setTimeout|setInterval|clearInterval|alert|prompt|fetch|localStorage";
const JS_RE = new RegExp(
  `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|(\`(?:\\\\.|[^\`\\\\])*\`|'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*")|\\b(\\d+\\.?\\d*)\\b|\\b(${JS_KW})\\b|\\b(${JS_BI})\\b`,
  "g",
);
export const javascript: Highlighter = (src) =>
  esc(src).replace(JS_RE, (m, c, s, n, k, b) =>
    c ? `<span class="tok-c">${c}</span>`
      : s ? `<span class="tok-s">${s}</span>`
      : n ? `<span class="tok-n">${n}</span>`
      : k ? `<span class="tok-k">${k}</span>`
      : b ? `<span class="tok-b">${b}</span>` : m) + TAIL;

// ── CSS ───────────────────────────────────────────────────────────────
const CSS_RE = new RegExp(
  `(\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"]*)"|'(?:[^']*)')|(@[\\w-]+)|(#[0-9a-fA-F]{3,8}\\b)|(\\b\\d+\\.?\\d*(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr)?\\b)|([\\w-]+)(?=\\s*:)`,
  "g",
);
export const css: Highlighter = (src) =>
  esc(src).replace(CSS_RE, (m, c, s, at, hex, num, prop) =>
    c ? `<span class="tok-c">${c}</span>`
      : s ? `<span class="tok-s">${s}</span>`
      : at ? `<span class="tok-a">${at}</span>`
      : hex ? `<span class="tok-n">${hex}</span>`
      : num ? `<span class="tok-n">${num}</span>`
      : prop ? `<span class="tok-k">${prop}</span>` : m) + TAIL;

// ── HTML ──────────────────────────────────────────────────────────────
// Runs on the escaped string, so tags look like &lt;tag&gt;.
const HTML_RE = /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g;
const ATTR_RE = /([\w:-]+)(=)("(?:[^"]*)"|'(?:[^']*)')/g;
export const html: Highlighter = (src) =>
  esc(src).replace(HTML_RE, (m, comment, open, name, attrs, close) => {
    if (comment) return `<span class="tok-c">${comment}</span>`;
    const a = attrs.replace(ATTR_RE, (mm: string, an: string, eq: string, val: string) =>
      `<span class="tok-a">${an}</span>${eq}<span class="tok-s">${val}</span>`);
    return `<span class="tok-p">${open}</span><span class="tok-k">${name}</span>${a}<span class="tok-p">${close}</span>`;
  }) + TAIL;

export const forLang: Record<string, Highlighter> = { html, css, js: javascript, python };
