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

// input() can't block in a browser worker — give a friendly error instead of a hang.
const SHIM = `
import builtins as _b
def _dmaths_input(prompt=""):
    raise RuntimeError("input() isn't available in the browser playground yet — set values with variables instead.")
_b.input = _dmaths_input
`;

async function getPyodide() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const py = await loadPyodide({ indexURL: BASE });
      py.setStdout({ batched: (s) => postMessage({ type: "out", text: s }) });
      py.setStderr({ batched: (s) => postMessage({ type: "err", text: s }) });
      await py.runPythonAsync(SHIM);
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
