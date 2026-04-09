import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { DEFAULT_CODE } from "./components/Editor.jsx";
import ResultPanel from "./components/ResultPanel.jsx";

const API = "/api";
const PHASE = { IDLE: "idle", RUNNING: "running", DONE: "done" };

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [apiStatus, setApiStatus] = useState("unknown");
  const [leftWidth, setLeftWidth] = useState(42);

  useEffect(() => {
    setApiStatus("loading");
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(d => setApiStatus(d.node === "ok" && d.java === "ok" ? "ok" : "warn"))
      .catch(() => setApiStatus("error"));
  }, []);

  const compile = useCallback(async () => {
    if (!code.trim() || phase === PHASE.RUNNING) return;
    setPhase(PHASE.RUNNING);
    setResult(null);
    try {
      const res = await fetch(`${API}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Compile failed");
      setResult(data);
    } catch (err) {
      setResult({
        tokens: [], symbolTable: [], ast: null, cfg: null,
        firstFollow: null, parsingTable: null,
        lexerErrors: [],
        parserErrors: [{ message: err.message, line: 0, phase: "network" }],
      });
    } finally {
      setPhase(PHASE.DONE);
    }
  }, [code, phase]);

  const dragging = useRef(false);
  const wrapRef = useRef(null);

  const onDragStart = useCallback(e => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const move = e => {
      if (!dragging.current || !wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(65, Math.max(25, pct)));
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const errCount = result
    ? (result.lexerErrors?.length ?? 0) + (result.parserErrors?.length ?? 0)
    : 0;

  const statusLabel = {
    ok: "All services online", warn: "Java unreachable",
    error: "Middleware down", loading: "Checking…", unknown: "",
  }[apiStatus] ?? "";

  return (
    <div className="app">

      { }
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon">⚙</div>
          <span className="header-logo-text">Compiler IDE</span>
        </div>
        <div className="header-sep" />
        <span className="header-sub">Python-like Language</span>

        <div className="header-spacer" />

        <div className="header-status">
          <div className={`hdot ${apiStatus === "ok" ? "ok" : apiStatus === "loading" ? "loading" : apiStatus !== "unknown" ? "error" : ""}`} />
          <span>{statusLabel}</span>
        </div>

        <button
          className="btn btn-run"
          onClick={compile}
          disabled={phase === PHASE.RUNNING || !code.trim()}
          style={{ marginLeft: 8 }}
        >
          {phase === PHASE.RUNNING
            ? <><span className="bspin" /> Running…</>
            : <>▶ Run</>
          }
        </button>
      </header>

      { }
      <div className="workspace" ref={wrapRef}>

        { }
        <div className="left-pane" style={{ width: `${leftWidth}%` }}>
          <ResultPanel
            result={result}
            loading={phase === PHASE.RUNNING}
            defaultTab={errCount > 0 ? "errors" : "tokens"}
          />
        </div>

        <div className="divider" onMouseDown={onDragStart} />

        { }
        <div className="right-pane">
          <Editor
            code={code}
            onChange={setCode}
            onCompile={compile}
            loading={phase === PHASE.RUNNING}
          />

          { }
          {phase === PHASE.DONE && result && (
            <div className={`sbar ${errCount > 0 ? "sbar-err" : "sbar-ok"}`}>
              <div className="sbar-icon">{errCount > 0 ? "✕" : "✓"}</div>
              <div className="sbar-body">
                <div className="sbar-title">
                  {errCount > 0
                    ? `Compilation failed — ${errCount} error${errCount > 1 ? "s" : ""} found`
                    : "Compilation successful — no errors"}
                </div>
                <div className="sbar-sub">
                  {result.tokens?.length ?? 0} tokens
                  &nbsp;·&nbsp;
                  {result.symbolTable?.length ?? 0} symbols
                  {errCount > 0 && (
                    <span className="warn">&nbsp;·&nbsp;See Errors tab →</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}