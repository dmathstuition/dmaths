/* D-Maths Python notebook — kernel worker.
 *
 * A Jupyter/Colab-style kernel: one persistent Pyodide instance whose namespace
 * lives across cell runs (define a variable in one cell, use it in the next).
 * Each run streams stdout/stderr tagged with the cell id, auto-displays the
 * value of a trailing expression (like Jupyter's Out[n]), renders rich objects
 * via _repr_html_ (e.g. pandas DataFrames), and captures matplotlib figures as
 * PNG images. Everything runs in the browser — nothing touches the server.
 */
const PYODIDE_VERSION = "v0.26.4";
const BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

importScripts(`${BASE}pyodide.js`);

let readyPromise = null;
let currentCell = null;

// Installed once per kernel. Splits a cell so a trailing expression is displayed
// (Jupyter-style), renders _repr_html_ when available, and grabs any matplotlib
// figures as base64 PNGs. Runs against the module globals, so state persists.
const KERNEL_SETUP = `
import ast as _ast, io as _io, base64 as _b64, sys as _sys, os as _os
_os.environ.setdefault("MPLBACKEND", "AGG")

def _dmaths_input(prompt=""):
    raise RuntimeError("input() isn't available in the notebook — use the simple Python tab for input()-based programs.")
import builtins as _bi
_bi.input = _dmaths_input

def _dmaths_run(src):
    images = []
    result_repr = None
    result_html = None
    mod = _ast.parse(src)
    body = list(mod.body)
    last = None
    if body and isinstance(body[-1], _ast.Expr):
        last = body.pop()
    if body:
        exec(compile(_ast.Module(body, type_ignores=[]), "<cell>", "exec"), globals())
    if last is not None:
        val = eval(compile(_ast.Expression(last.value), "<cell>", "eval"), globals())
        if val is not None:
            rh = getattr(val, "_repr_html_", None)
            if callable(rh):
                try: result_html = rh()
                except Exception: result_html = None
            result_repr = repr(val)
    if "matplotlib" in _sys.modules:
        try:
            import matplotlib.pyplot as _plt
            for _n in _plt.get_fignums():
                _fig = _plt.figure(_n)
                _buf = _io.BytesIO()
                _fig.savefig(_buf, format="png", bbox_inches="tight", dpi=110)
                images.append(_b64.b64encode(_buf.getvalue()).decode())
            _plt.close("all")
        except Exception:
            pass
    return {"repr": result_repr, "html": result_html, "images": images}
`;

async function makeKernel() {
  const py = await loadPyodide({ indexURL: BASE });
  py.setStdout({ batched: (s) => postMessage({ type: "stream", name: "stdout", cell: currentCell, text: s }) });
  py.setStderr({ batched: (s) => postMessage({ type: "stream", name: "stderr", cell: currentCell, text: s }) });
  await py.runPythonAsync(KERNEL_SETUP);
  return py;
}

function getKernel() {
  if (!readyPromise) readyPromise = makeKernel();
  return readyPromise;
}

self.onmessage = async (e) => {
  const msg = e.data || {};

  if (msg.type === "init") {
    postMessage({ type: "status", text: "loading" });
    try { await getKernel(); postMessage({ type: "ready" }); }
    catch (err) { postMessage({ type: "fatal", text: "Could not load Python: " + (err && err.message ? err.message : err) }); }
    return;
  }

  if (msg.type === "restart") {
    readyPromise = null;
    postMessage({ type: "status", text: "loading" });
    try { await getKernel(); postMessage({ type: "restarted" }); }
    catch (err) { postMessage({ type: "fatal", text: String(err) }); }
    return;
  }

  if (msg.type === "run") {
    currentCell = msg.cell;
    let py;
    try { py = await getKernel(); }
    catch (err) { postMessage({ type: "error", cell: msg.cell, text: String(err) }); postMessage({ type: "done", cell: msg.cell }); return; }

    postMessage({ type: "running", cell: msg.cell });
    try {
      try { await py.loadPackagesFromImports(msg.code); } catch (_) { /* offline / unknown pkg */ }
      py.globals.set("_dmaths_src", msg.code);
      const res = await py.runPythonAsync("_dmaths_run(_dmaths_src)");
      const obj = res.toJs({ dict_converter: Object.fromEntries });
      res.destroy();
      const images = obj.images || [];
      for (const b64 of images) postMessage({ type: "image", cell: msg.cell, b64 });
      if (obj.html) postMessage({ type: "html", cell: msg.cell, html: obj.html });
      else if (obj.repr != null) postMessage({ type: "result", cell: msg.cell, text: obj.repr });
    } catch (err) {
      postMessage({ type: "error", cell: msg.cell, text: (err && err.message ? err.message : String(err)) });
    }
    postMessage({ type: "done", cell: msg.cell });
  }
};
