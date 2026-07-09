/* D-Maths Python playground — execution worker.
 *
 * Runs learner Python entirely in the browser via Pyodide (CPython → WebAssembly).
 * Nothing touches the server. The worker loads the engine once, then executes
 * code on demand and streams stdout/stderr back to the page. Because it runs in
 * a Worker, the page can terminate it to stop an infinite loop.
 */
const PYODIDE_VERSION = "v0.26.4";
const BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

importScripts(`${BASE}pyodide.js`);

let readyPromise = null;

// A browser worker has no blocking stdin, so input() reads from a per-run list
// of lines the learner types into the Input box (fed via the _dmaths_inputs
// global before each run). Prompts are echoed; running out of lines is a clear
// EOFError rather than a hang.
const INPUT_SETUP = `
import builtins as _b
_dmaths_it = iter(list(globals().get("_dmaths_inputs", [])))
def _dmaths_input(prompt=""):
    if prompt:
        print(prompt, end="")
    try:
        return next(_dmaths_it)
    except StopIteration:
        raise EOFError("input() ran out of values — add more lines in the Input box below.")
_b.input = _dmaths_input
`;

async function getPyodide() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const py = await loadPyodide({ indexURL: BASE });
      py.setStdout({ batched: (s) => postMessage({ type: "out", text: s }) });
      py.setStderr({ batched: (s) => postMessage({ type: "err", text: s }) });
      return py;
    })();
  }
  return readyPromise;
}

self.onmessage = async (e) => {
  const msg = e.data || {};

  if (msg.type === "init") {
    postMessage({ type: "status", text: "loading" });
    try { await getPyodide(); postMessage({ type: "ready" }); }
    catch (err) { postMessage({ type: "fatal", text: "Could not load Python: " + (err && err.message ? err.message : err) }); }
    return;
  }

  if (msg.type === "run") {
    let py;
    try { py = await getPyodide(); }
    catch (err) { postMessage({ type: "err", text: String(err) }); postMessage({ type: "done" }); return; }

    postMessage({ type: "running" });
    try {
      // Feed this run's input() values, then (re)install input() fresh.
      const lines = msg.stdin ? String(msg.stdin).replace(/\n$/, "").split("\n") : [];
      py.globals.set("_dmaths_inputs", lines);
      await py.runPythonAsync(INPUT_SETUP);
      // Auto-load packages the code imports (numpy, pandas, …) when available.
      try { await py.loadPackagesFromImports(msg.code); } catch (_) { /* offline / unknown pkg */ }
      await py.runPythonAsync(msg.code);
    } catch (err) {
      // Python tracebacks arrive as the error message.
      postMessage({ type: "err", text: (err && err.message ? err.message : String(err)) });
    }
    postMessage({ type: "done" });
  }
};
