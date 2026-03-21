import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { DEFAULT_CODE } from "./components/Editor.jsx";
import ResultPanel from "./components/ResultPanel.jsx";

const API = "/api";
const STATE = { IDLE: "idle", COMPILING: "compiling", DONE: "done", VIEWING: "viewing" };

export default function App() {
  const [code,        setCode]       = useState(DEFAULT_CODE);
  const [result,      setResult]     = useState(null);
  const [phase,       setPhase]      = useState(STATE.IDLE);
  const [apiStatus,   setApiStatus]  = useState("unknown");
  const [editorWidth, setEditorWidth]= useState(50);

  useEffect(() => {
    setApiStatus("loading");
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(d => setApiStatus(d.node === "ok" && d.java === "ok" ? "ok" : "warn"))
      .catch(() => setApiStatus("error"));
  }, []);

  const compile = useCallback(async () => {
    if (!code.trim() || phase === STATE.COMPILING) return;
    setPhase(STATE.COMPILING);
    setResult(null);

    try {
      const res  = await fetch(`${API}/compile`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Compile failed");
      setResult(data);
    } catch (err) {
      setResult({
        tokens: [], symbolTable: [], ast: null, cfg: null,
        firstFollow: null, parsingTable: null,
        lexerErrors:  [],
        parserErrors: [{ message: err.message, line: 0, phase: "network" }],
      });
    } finally {
      setPhase(STATE.DONE);
    }
  }, [code, phase]);

  const viewResults  = useCallback(() => setPhase(STATE.VIEWING), []);
  const backToEditor = useCallback(() => setPhase(STATE.DONE),    []);

  const dragging     = useRef(false);
  const workspaceRef = useRef(null);

  const onDividerMouseDown = useCallback(e => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current || !workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const pct  = ((e.clientX - rect.left) / rect.width) * 100;
      setEditorWidth(Math.min(70, Math.max(30, pct)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  const errorCount = result
    ? (result.lexerErrors?.length ?? 0) + (result.parserErrors?.length ?? 0)
    : 0;
  const isViewing = phase === STATE.VIEWING;
  const hasDone   = phase === STATE.DONE || phase === STATE.VIEWING;

  const statusLabel = {
    ok:      "All services online",
    warn:    "Java unreachable",
    error:   "Middleware unreachable",
    loading: "Checking services…",
    unknown: "",
  }[apiStatus] ?? "";

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-logo">
          <div className="logo-icon">⚙</div>
          <span>Compiler IDE</span>
        </div>
        <span className="topbar-sub">A3-5  ·  Python-like Language</span>
        <div className="topbar-spacer" />
        <div className="topbar-status">
          <div className={`status-dot ${
            apiStatus === "ok"      ? "ok"      :
            apiStatus === "loading" ? "loading" :
            apiStatus !== "unknown" ? "error"   : ""
          }`} />
          <span>{statusLabel}</span>
        </div>
      </header>

      <div className="workspace" ref={workspaceRef}>
        <div
          className="editor-col"
          style={{ width: isViewing ? `${editorWidth}%` : "100%" }}
        >
          <Editor
            code={code}
            onChange={setCode}
            onCompile={compile}
            loading={phase === STATE.COMPILING}
          />

          {hasDone && result && (
            <div className={`status-bar ${errorCount > 0 ? "status-bar--error" : "status-bar--ok"}`}>
              <div className="status-bar-left">
                <span className="status-bar-icon">
                  {errorCount > 0 ? "✕" : "✓"}
                </span>
                <div>
                  <div className="status-bar-title">
                    {errorCount > 0
                      ? `Compilation failed — ${errorCount} error${errorCount > 1 ? "s" : ""} found`
                      : "Compilation successful — no errors found"}
                  </div>
                  <div className="status-bar-sub">
                    {result.tokens?.length ?? 0} tokens
                    &nbsp;·&nbsp;
                    {result.symbolTable?.length ?? 0} symbols
                    {errorCount > 0 && (
                      <span className="status-bar-err-hint">
                        &nbsp;·&nbsp;Check the Errors tab for details
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="status-bar-right">
                {isViewing ? (
                  <button className="btn btn-secondary" onClick={backToEditor}>
                    ← Back to editor
                  </button>
                ) : (
                  <button className="btn btn-accent" onClick={viewResults}>
                    View Results →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {isViewing && (
          <div className="divider" onMouseDown={onDividerMouseDown} />
        )}

        {isViewing && (
          <div className="results-col">
            <ResultPanel
              result={result}
              loading={false}
              defaultTab={errorCount > 0 ? "errors" : "tokens"}
            />
          </div>
        )}
      </div>
    </div>
  );
}