import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { DEFAULT_CODE } from "./components/Editor.jsx";
import ResultPanel from "./components/ResultPanel.jsx";

const API = "/api";
const PHASE = { IDLE: "idle", RUNNING: "running", DONE: "done" };

// ── Sample programs ───────────────────────────────────────────────────────
export const SAMPLES = [
  {
    name: "Full example",
    desc: "Loops, conditionals, range & print",
    code: `a = 5\n\nwhile a > 3:\n    print(a)\n    a -= 1\n\nb = 4\nif a < 3:\n    print(b)\nelse:\n    print(b * a)\n\nfor i in range(1, 7, 2):\n    print(i)\n`,
  },
  {
    name: "While loop & counter",
    desc: "While loop with comparison operations",
    code: `count = 5\n\nwhile count > 0:\n    print(count)\n    count -= 1\n`,
  },
  {
    name: "If / elif / else chain",
    desc: "Multi-branch decision logic",
    code: `score = 85\n\nif score >= 90:\n    grade = 1\nelif score >= 75:\n    grade = 2\nelse:\n    grade = 3\n\nprint(grade)\n`,
  },
  {
    name: "For + range( )",
    desc: "Iterating ranges with step argument",
    code: `for i in range(2, 11, 2):\n    print(i * 10)\n`,
  },
  {
    name: "Euclidean GCD",
    desc: "Greatest common divisor using while & %",
    code: `x = 48\ny = 18\n\nwhile y != 0:\n    rem = x % y\n    x = y\n    y = rem\n\nprint(x)\n`,
  },
  {
    name: "Arithmetic & Modulo",
    desc: "Operators: +, -, *, /, % and compound assignments",
    code: `x = 25\ny = 7\n\nsum_val = x + y\nmod_val = x % y\nmult = x * y\n\nprint(sum_val)\nprint(mod_val)\nprint(mult)\n`,
  },
  {
    name: "List + Indexing",
    desc: "List literal creation and element access",
    code: `items = [10, 20, 30, 40]\nfirst = items[0]\nprint(first)\n\nfor item in items:\n    print(item)\n`,
  },
  {
    name: "Syntax Error Demo",
    desc: "Missing colon and unexpected token",
    code: `x = 10\nif x > 5\n    print(x)\n`,
  },
  {
    name: "Semantic Error Demo",
    desc: "Variable used before assignment",
    code: `total += 5\nprint(total)\n`,
  },
];

// ── SamplePicker component ─────────────────────────────────────────────────
function SamplePicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`sample-picker${open ? " open" : ""}`} ref={ref}>
      <button
        className="sample-btn"
        onClick={() => setOpen(v => !v)}
        title="Load a sample program"
      >
        📄 Examples
        <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="sample-dropdown">
          <div className="sample-group-label">Sample Programs</div>
          {SAMPLES.map(s => (
            <button
              key={s.name}
              className="sample-item"
              onClick={() => { onSelect(s.code); setOpen(false); }}
            >
              <span className="sample-item-name">{s.name}</span>
              <span className="sample-item-desc">{s.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shortcuts Modal ────────────────────────────────────────────────────────
function ShortcutsModal({ onClose }) {
  const shortcuts = [
    { desc: "Run compiler & update AST/CFG", keys: ["Ctrl", "Enter"] },

    { desc: "Copy editor code to clipboard", keys: ["⎘ Copy button"] },
    { desc: "Toggle keyboard shortcuts help", keys: ["?"] },
    { desc: "Close open dialog or dropdown", keys: ["Esc"] },
  ];

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <span>⌨</span> Keyboard Shortcuts
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {shortcuts.map((s, i) => (
            <div key={i} className="shortcut-row">
              <span className="shortcut-desc">{s.desc}</span>
              <div className="shortcut-keys">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="shortcut-key">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TerminalDrawer Component ───────────────────────────────────────────────
function TerminalDrawer({ result, phase, onRun, onClose }) {
  const [history, setHistory] = useState([]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!result) return;
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
      id: Date.now(),
      time: timestamp,
      hasErrors: (result.lexerErrors?.length || 0) + (result.parserErrors?.length || 0) > 0,
      output: result.output ?? [],
      lexerErrors: result.lexerErrors ?? [],
      parserErrors: result.parserErrors ?? [],
    };
    setHistory(prev => [...prev, entry]);
  }, [result]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="terminal-drawer">
      <div className="terminal-head">
        <div className="terminal-title">
          <span className="terminal-dot green" />
          <span>🖥️ IDE Terminal — Python Interpreter</span>
        </div>
        <div className="terminal-actions">
          <button className="btn btn-ghost term-btn" onClick={onRun} disabled={phase === PHASE.RUNNING}>
            ▶ Run
          </button>
          <button className="btn btn-ghost term-btn" onClick={() => setHistory([])}>
            🗑 Clear
          </button>
          <button className="btn btn-ghost term-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>
      </div>
      <div className="terminal-body" ref={bodyRef}>
        <div className="term-line prompt">
          <span className="term-user">user@python-visual-parser</span>:<span className="term-dir">~/workspace</span>$ python main.py
        </div>
        {history.length === 0 && (
          <div className="term-line dim">Terminal initialized. Click ▶ Run or press Ctrl+Enter to execute program.</div>
        )}
        {history.map(h => (
          <div key={h.id} style={{ marginBottom: 10 }}>
            <div className="term-line timestamp">[{h.time}] Executing main.py...</div>
            {h.hasErrors ? (
              <div className="term-line err">
                <div>[Compilation/Execution Failed]</div>
                {h.lexerErrors.map((e, idx) => (
                  <div key={`l-${idx}`} className="term-err-line">  LexerError (Line {e.line}): {e.message}</div>
                ))}
                {h.parserErrors.map((e, idx) => (
                  <div key={`p-${idx}`} className="term-err-line">  {e.phase ? e.phase.toUpperCase() : "SyntaxError"} (Line {e.line}): {e.message}</div>
                ))}
              </div>
            ) : (
              <>
                {h.output.map((outLine, idx) => (
                  <div key={idx} className="term-line stdout">{outLine}</div>
                ))}
                <div className="term-line success">✓ Program finished with exit code 0.</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
// Load initial code always from DEFAULT_CODE, ignoring previous stored code
  const [code, setCode] = useState(() => DEFAULT_CODE);

  const [result, setResult]       = useState(null);
  const [phase, setPhase]         = useState(PHASE.IDLE);
  const [apiStatus, setApiStatus] = useState("unknown");
  const [leftWidth, setLeftWidth] = useState(44);
  const [compileMs, setCompileMs] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTerminal, setShowTerminal]   = useState(true);
  const [toasts, setToasts] = useState([]);

  // Monaco editor ref
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const addToast = (msg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  };

// Removed localStorage sync to avoid persisting code between sessions
  // useEffect(() => {
  //   try {
  //     localStorage.setItem("pylite_code", code);
  //   } catch (_) {}
  // }, [code]);

  // Health check on mount
  useEffect(() => {
    setApiStatus("loading");
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(d => setApiStatus(d.node === "ok" && d.java === "ok" ? "ok" : "warn"))
      .catch(() => setApiStatus("error"));
  }, []);

  // Global key listener for '?' to toggle shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setShowShortcuts(v => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Push Monaco error markers whenever result changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    const model  = editorRef.current.getModel();
    if (!model) return;

    if (!result) {
      monaco.editor.setModelMarkers(model, "compiler", []);
      return;
    }

    const markers = [];

    (result.lexerErrors ?? []).forEach(e => {
      markers.push({
        severity:  monaco.MarkerSeverity.Error,
        message:   e.message,
        startLineNumber: e.line, startColumn: 1,
        endLineNumber:   e.line, endColumn:   9999,
      });
    });

    (result.parserErrors ?? []).forEach(e => {
      if (!e.line) return;
      markers.push({
        severity:  e.phase === "semantic"
          ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Error,
        message:   e.message,
        startLineNumber: e.line, startColumn: 1,
        endLineNumber:   e.line, endColumn:   9999,
      });
    });

    monaco.editor.setModelMarkers(model, "compiler", markers);
  }, [result]);

  const compile = useCallback(async (codeToCompile = code) => {
    const src = typeof codeToCompile === "string" ? codeToCompile : code;
    if (!src.trim() || phase === PHASE.RUNNING) return;
    setPhase(PHASE.RUNNING);
    setResult(null);
    const t0 = performance.now();
    try {
      const res  = await fetch(`${API}/compile`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: src }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Compile failed");
      setResult(data);
      setCompileMs(Math.round(performance.now() - t0));
    } catch (err) {
      setResult({
        tokens: [], symbolTable: [], ast: null, cfg: null,
        firstFollow: null, parsingTable: null,
        lexerErrors: [],
        parserErrors: [{ message: err.message, line: 0, phase: "network" }],
      });
      setCompileMs(null);
    } finally {
      setPhase(PHASE.DONE);
    }
  }, [code, phase]);

  // Automatically compile initial code on first render once API is ready
  const autoCompiled = useRef(false);
  useEffect(() => {
    if (!autoCompiled.current && code.trim()) {
      autoCompiled.current = true;
      compile(code);
    }
  }, [code, compile]);

  // Share button handler: encode URL and copy to clipboard
  const handleShare = () => {
    try {
      const encoded = btoa(encodeURIComponent(code));
      const shareUrl = `${window.location.origin}${window.location.pathname}#code=${encoded}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        addToast("🔗 Shareable URL copied to clipboard!");
      });
    } catch (err) {
      addToast("Failed to generate share link");
    }
  };

  // Divider drag logic
  const dragging = useRef(false);
  const wrapRef  = useRef(null);

  const onDragStart = useCallback(e => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
    e.currentTarget.classList.add("dragging");
    const div = e.currentTarget;
    const stopDrag = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      div.classList.remove("dragging");
      window.removeEventListener("mouseup", stopDrag);
    };
    window.addEventListener("mouseup", stopDrag);
  }, []);

  useEffect(() => {
    const move = e => {
      if (!dragging.current || !wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const pct  = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(65, Math.max(25, pct)));
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const errCount = result
    ? (result.lexerErrors?.length ?? 0) + (result.parserErrors?.length ?? 0)
    : 0;



  // Jump to line in Monaco
  const jumpToLine = useCallback(line => {
    if (!editorRef.current || !line) return;
    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: 1 });
    editorRef.current.focus();
  }, []);

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon">⚙</div>
          <span className="header-logo-text">Compiler IDE</span>
        </div>
        <div className="header-sep" />
        <span className="header-sub">Python Visual Parser & Visualizer</span>

        <div className="header-spacer" />

        <div className="header-right">
          <SamplePicker onSelect={(c) => { setCode(c); compile(c); }} />

          {/* Share button */}
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "5px 11px" }}
            onClick={handleShare}
            title="Copy shareable link"
          >
            🔗 Share
          </button>

          {/* Terminal button */}
          <button
            className={`btn btn-ghost${showTerminal ? " active" : ""}`}
            style={{ fontSize: 12, padding: "5px 11px" }}
            onClick={() => setShowTerminal(v => !v)}
            title="Toggle IDE Terminal"
          >
            🖥️ Terminal
          </button>

          {/* Shortcuts button */}
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "5px 11px" }}
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
          >
            ⌨ Shortcuts
          </button>



          <button
            className={`btn btn-run${phase === PHASE.RUNNING ? " running" : ""}`}
            onClick={() => compile()}
            disabled={phase === PHASE.RUNNING || !code.trim()}
            id="btn-run"
          >
            {phase === PHASE.RUNNING
              ? <><span className="bspin" /> Running…</>
              : <>▶ Run</>
            }
          </button>
        </div>
      </header>

      {/* ── Workspace ────────────────────────────────────────────── */}
      <div className="workspace" ref={wrapRef}>

        {/* Left: Result Panel */}
        <div className="left-pane" style={{ width: `${leftWidth}%` }}>
          <ResultPanel
            result={result}
            loading={phase === PHASE.RUNNING}
            defaultTab={errCount > 0 ? "errors" : "overview"}
            onJumpToLine={jumpToLine}
          />
        </div>

        <div className="divider" onMouseDown={onDragStart} />

        {/* Right: Editor */}
        <div className="right-pane">
          <Editor
            code={code}
            onChange={setCode}
            onCompile={() => compile()}
            loading={phase === PHASE.RUNNING}
            onEditorMount={(editor, monaco) => {
              editorRef.current = editor;
              monacoRef.current = monaco;
            }}
          />

          {/* Compilation Status Bar */}
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
              {compileMs !== null && (
                <span className="sbar-time">{compileMs} ms</span>
              )}
            </div>
          )}

          {/* IDE Bottom Terminal */}
          {showTerminal && (
            <TerminalDrawer
              result={result}
              phase={phase}
              onRun={() => compile()}
              onClose={() => setShowTerminal(false)}
            />
          )}
        </div>
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}