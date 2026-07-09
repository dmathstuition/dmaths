// Pretty-print a submitted coding-assignment answer for read-back. Web answers
// are stored as a {html,css,js} JSON; split them into labelled blocks. Python
// (and anything else) is shown as-is.
export function codeDisplay(code: string, lang?: string | null): string {
  if (lang === "web") {
    try {
      const d = JSON.parse(code);
      return `<!-- HTML -->\n${d.html || ""}\n\n/* CSS */\n${d.css || ""}\n\n// JS\n${d.js || ""}`;
    } catch { return code; }
  }
  return code;
}
