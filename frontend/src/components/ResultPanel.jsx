import { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
cytoscape.use(cytoscapeDagre);

const TABS = [
  { id:"tokens",      label:"Tokens",       icon:"🔤" },
  { id:"symtable",    label:"Sym Table",    icon:"📋" },
  { id:"ast",         label:"AST",          icon:"🌲" },
  { id:"cfg",         label:"CFG",          icon:"⬡"  },
  { id:"firstfollow", label:"First/Follow", icon:"∑"  },
  { id:"parsetable",  label:"Parse Table",  icon:"📊" },
  { id:"errors",      label:"Errors",       icon:"⚠"  },
];

export default function ResultPanel({ result, loading, defaultTab = "tokens" }) {
  const [active, setActive] = useState(defaultTab);
  useEffect(() => { setActive(defaultTab); }, [defaultTab]);

  const errCount = result
    ? (result.lexerErrors?.length ?? 0) + (result.parserErrors?.length ?? 0)
    : 0;

  // Before any compile — show the ready state
  if (!loading && !result) {
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
        <div className="pane-head">
          <strong style={{ fontSize:12.5 }}>Output</strong>
        </div>
        <div className="ready-state">
          <div className="ready-icon">⚙</div>
          <div className="ready-title">Ready to compile</div>
          <div className="ready-sub">
            Write or upload your code in the editor, then press <strong>▶ Run</strong> to see the results here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab ${active === t.id ? "on" : ""}`} onClick={() => setActive(t.id)}>
            <span>{t.icon}</span>{t.label}
            {t.id === "errors"  && errCount > 0               && <span className="badge err">{errCount}</span>}
            {t.id === "tokens"  && result?.tokens?.length > 0 && <span className="badge">{result.tokens.length}</span>}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {loading && <div className="spinner-wrap"><div className="spinner" />Compiling…</div>}
        {!loading && result && (
          <div className="anim-in" style={{ height:"100%" }}>
            {active === "tokens"      && <TokensTab      r={result} />}
            {active === "symtable"    && <SymTab         r={result} />}
            {active === "ast"         && <ASTTab         r={result} />}
            {active === "cfg"         && <CFGTab         r={result} />}
            {active === "firstfollow" && <FFTab          r={result} />}
            {active === "parsetable"  && <ParseTab       r={result} />}
            {active === "errors"      && <ErrorsTab      r={result} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared ─────────────────────────────────────────────────────────────────
function Empty({ icon="⬜", msg }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <p>{msg}</p>
    </div>
  );
}

function ttCls(type) {
  if (!type) return "tt-def";
  if (type === "IDENT") return "tt-ident";
  if (["INT_LIT","FLOAT_LIT","STRING_LIT","BOOL_LIT"].includes(type)) return "tt-lit";
  if (["FOR","IN","PRINT"].includes(type)) return "tt-kw";
  if (["PLUS","MINUS","STAR","SLASH","ASSIGN","PLUS_ASSIGN","MINUS_ASSIGN"].includes(type)) return "tt-op";
  if (["NEWLINE","INDENT","DEDENT","EOF","LPAREN","RPAREN","LBRACKET","RBRACKET","COMMA","COLON"].includes(type)) return "tt-struct";
  return "tt-def";
}

// ══════════════════════════════════════════════════════════════════════
//  TOKENS
// ══════════════════════════════════════════════════════════════════════
function TokensTab({ r }) {
  const tokens = r.tokens ?? [];
  if (!tokens.length) return <Empty icon="🔤" msg="No tokens produced." />;
  return (
    <table className="dtable">
      <thead><tr><th>#</th><th>Type</th><th>Value</th><th>Line</th></tr></thead>
      <tbody>
        {tokens.map((t, i) => (
          <tr key={i}>
            <td className="lnum">{i+1}</td>
            <td><span className={`tt ${ttCls(t.type)}`}>{t.type}</span></td>
            <td><code className="tval">{t.value === "\\n" ? "↵" : t.value || "—"}</code></td>
            <td className="lnum">{t.line}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  SYMBOL TABLE
// ══════════════════════════════════════════════════════════════════════
function SymTab({ r }) {
  const e = r.symbolTable ?? [];
  if (!e.length) return <Empty icon="📋" msg="No variables declared." />;
  return (
    <table className="dtable">
      <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Scope</th><th>Line</th></tr></thead>
      <tbody>
        {e.map((s, i) => (
          <tr key={i}>
            <td className="lnum">{i+1}</td>
            <td><code className="sname">{s.name}</code></td>
            <td><span className={`tbadge tb-${s.type}`}>{s.type}</span></td>
            <td><span className={`scbadge sc${Math.min(s.scopeLevel,2)}`}>{s.scopeLevel===0?"global":`loop · ${s.scopeLevel}`}</span></td>
            <td className="lnum">{s.declarationLine}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  AST  —  vertical pen-and-paper tree
// ══════════════════════════════════════════════════════════════════════
function ASTTab({ r }) {
  if (!r.ast) return <Empty icon="🌲" msg="No AST. Check the Errors tab." />;
  return (
    <div className="ast-wrap">
      <div className="ast-legend">
        {[
          ["Program",    "vn-Program"],
          ["Assign",     "vn-AssignStmt"],
          ["Print",      "vn-PrintStmt"],
          ["For",        "vn-ForStmt"],
          ["BinOp",      "vn-BinOp"],
          ["Ident",      "vn-Ident"],
          ["Literal",    "vn-Literal"],
        ].map(([lbl,cls]) => (
          <span key={lbl} className={`ast-legend-item vtree-node ${cls}`}>{lbl}</span>
        ))}
      </div>
      <VNode node={r.ast} />
    </div>
  );
}

function VNode({ node }) {
  const [open, setOpen] = useState(true);
  if (!node) return null;

  const kids    = astKids(node);
  const hasKids = kids.length > 0;

  return (
    <div className="vtree-group">
      {/* Node box */}
      <div
        className={`vtree-node ${vnCls(node.nodeType)}`}
        onClick={() => hasKids && setOpen(o => !o)}
        style={{ cursor: hasKids ? "pointer" : "default" }}
        title={hasKids ? (open ? "Collapse" : "Expand") : undefined}
      >
        {hasKids && (
          <span style={{ fontSize:9, opacity:.6, marginRight:4 }}>{open?"▾":"▸"}</span>
        )}
        {astLabel(node)}
        {astMeta(node) && <span className="vtree-meta">{astMeta(node)}</span>}
      </div>

      {/* Children with connecting lines */}
      {hasKids && open && (
        <>
          <div className="vtree-vline" />
          <div className="vtree-children">
            {kids.map((kid, i) => (
              <div key={i} className="vtree-child">
                <VNode node={kid} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function vnCls(t) {
  return ({
    Program:"vn-Program", AssignStmt:"vn-AssignStmt", PrintStmt:"vn-PrintStmt",
    ForStmt:"vn-ForStmt", BinOp:"vn-BinOp", Ident:"vn-Ident",
    Literal:"vn-Literal", ListLit:"vn-ListLit",
  })[t] ?? "vn-default";
}

function astLabel(n) {
  const op = o => ({ASSIGN:"=",PLUS_ASSIGN:"+=",MINUS_ASSIGN:"-="}[o]??o);
  switch (n.nodeType) {
    case "Program":    return "Program";
    case "AssignStmt": return `${n.ident}  ${op(n.op)}`;
    case "PrintStmt":  return "print( )";
    case "ForStmt":    return `for ${n.loopVar} in`;
    case "BinOp":      return n.op;
    case "Ident":      return n.name;
    case "Literal":    return n.rawValue;
    case "ListLit":    return "[ list ]";
    default:           return n.nodeType ?? "?";
  }
}

function astMeta(n) {
  const p = [];
  if (n.varType && n.varType !== "UNKNOWN") p.push(n.varType);
  if (n.line) p.push(`ln ${n.line}`);
  return p.join(" · ");
}

function astKids(n) {
  switch (n.nodeType) {
    case "Program":    return n.statements ?? [];
    case "AssignStmt": return [n.expr].filter(Boolean);
    case "PrintStmt":  return n.args ?? [];
    case "ForStmt":    return [n.iterable, ...(n.body??[])].filter(Boolean);
    case "BinOp":      return [n.left, n.right].filter(Boolean);
    case "ListLit":    return n.elements ?? [];
    default:           return [];
  }
}

// ══════════════════════════════════════════════════════════════════════
//  CFG  —  Cytoscape with text-inside-node fix
// ══════════════════════════════════════════════════════════════════════
function CFGTab({ r }) {
  const ref  = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!r.cfg || !ref.current) return;
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }

    const { nodes, edges } = r.cfg;
    const elements = [
      ...nodes.map(n => ({ data: { id: String(n.id), label: cfgLabel(n), kind: n.kind } })),
      ...edges.map((e,i) => ({ data: { id:`e${i}`, source:String(e.from), target:String(e.to), label:e.label??""} })),
    ];

    cyRef.current = cytoscape({
      container: ref.current,
      elements,
      style: cfgStyle(),
      layout: {
        name: "dagre",
        rankDir: "TB",
        nodeSep: 60,
        rankSep: 60,
        padding: 32,
        animate: false,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // 🔥 FIX: Force resize + re-layout after render
    cyRef.current.ready(() => {
      const cy = cyRef.current;

      cy.nodes().forEach(n => {
        n.style({
          width: "label",
          height: "label"
        });
      });

      cy.layout({
        name: "dagre",
        rankDir: "TB",
        nodeSep: 60,
        rankSep: 60,
        padding: 32,
        animate: false,
      }).run();

      cy.fit(cy.elements(), 36);
    });

    return () => { if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; } };
  }, [r.cfg]);

  if (!r.cfg) return <Empty icon="⬡" msg="No CFG. Check the Errors tab." />;

  return (
    <div className="cfg-wrap">
      <div className="cfg-legend">
        <span className="cfg-ld cfg-ld-entry" />ENTRY
        <span className="cfg-ld cfg-ld-block" />BLOCK
        <span className="cfg-ld cfg-ld-for"   />FOR
        <span className="cfg-ld cfg-ld-exit"  />EXIT
        <span style={{ marginLeft:"auto", fontSize:11, color:"var(--dim)" }}>
          {r.cfg.nodes.length}N · {r.cfg.edges.length}E · scroll=zoom · drag=pan
        </span>
      </div>
      <div className="cfg-container" ref={ref} />
    </div>
  );
}

function cfgLabel(n) {
  if (n.kind === "ENTRY") return "ENTRY";
  if (n.kind === "EXIT")  return "EXIT";
  if (n.kind === "FOR_CONDITION") return (n.statements?.[0] ?? "for …").replace(/^for /, "⟳ for ");

  const stmts = n.statements ?? [];

  return stmts
    .map(s => s.length > 22 ? s.slice(0, 20) + "…" : s)
    .join("\n\n"); // better spacing
}

function cfgStyle() {
  return [
    {
      selector: "node",
      style: {
        "width": "label",        // ✅ FIX
        "height": "label",       // ✅ FIX
        "padding": "16px 18px",

        "label": "data(label)",
        "text-valign": "center",
        "text-halign": "center",

        "text-wrap": "wrap",
        "text-overflow-wrap": "anywhere",
        "text-max-width": "140px",

        "font-family": "JetBrains Mono,Consolas,monospace",
        "font-size": "11px",
        "line-height": 1.4,

        "shape": "roundrectangle",
        "background-color": "#131220",
        "border-color": "#302e50",
        "border-width": 1.5,
        "color": "#c8c8e0",
      },
    },
    {
      selector: "node[kind='ENTRY']",
      style: {
        "background-color": "#0c0c22",
        "border-color":     "#818cf8",
        "border-width":     2,
        "color":            "#a5b4fc",
        "font-weight":      "bold",
        "font-size":        "12px",
      },
    },
    {
      selector: "node[kind='EXIT']",
      style: {
        "background-color": "#071a0f",
        "border-color":     "#4ade80",
        "border-width":     2,
        "color":            "#86efac",
        "font-weight":      "bold",
        "font-size":        "12px",
      },
    },
    {
      selector: "node[kind='FOR_CONDITION']",
      style: {
        "shape":            "diamond",
        "background-color": "#1a1500",
        "border-color":     "#fbbf24",
        "border-width":     2,
        "color":            "#fcd34d",
        "padding":          "22px 20px",
        "text-max-width":   "140px",
      },
    },
    {
      selector: "node[kind='BLOCK']",
      style: {
        "text-halign":    "center",   // ✅ FIX
        "text-valign":    "center",
        "padding":        "14px 16px",
        "text-max-width": "140px",
      },
    },
    {
      selector: "edge",
      style: {
        "width":              1.5,
        "line-color":         "#302e50",
        "target-arrow-color": "#302e50",
        "target-arrow-shape": "triangle",
        "curve-style":        "bezier",
        "font-size":          "10px",
        "font-family":        "JetBrains Mono,monospace",
        "color":              "#64748b",
        "label":              "data(label)",
        "text-background-color":   "#070710",
        "text-background-opacity": 0.9,
        "text-background-padding": "3px",
        "text-rotation":      "autorotate",
      },
    },
    {
      selector: "edge[label='loop']",
      style: {
        "line-color":         "#fbbf24",
        "target-arrow-color": "#fbbf24",
        "line-style":         "dashed",
        "line-dash-pattern":  [6,3],
        "color":              "#fbbf24",
      },
    },
    {
      selector: "edge[label='exit']",
      style: {
        "line-color":         "#4ade80",
        "target-arrow-color": "#4ade80",
      },
    },
  ];
}
// ══════════════════════════════════════════════════════════════════════
//  FIRST / FOLLOW
// ══════════════════════════════════════════════════════════════════════
function FFTab({ r }) {
  if (!r.firstFollow) return <Empty icon="∑" msg="Not available." />;
  const { first, follow } = r.firstFollow;
  return (
    <>
      <FFSection title="FIRST Sets"  sets={first}  />
      <FFSection title="FOLLOW Sets" sets={follow} />
    </>
  );
}

function FFSection({ title, sets }) {
  return (
    <div className="ff-section">
      <h3>{title}</h3>
      {Object.entries(sets ?? {}).map(([nt, toks]) => (
        <div key={nt} className="ff-row">
          <span className="ff-nt">{nt}</span>
          <span className="ff-arr">→</span>
          <div className="ff-set">
            {[...toks].map(tok => (
              <span key={tok} className={`fftok ${tok==="ε"?"eps":tok==="$"?"eof":""}`}>{tok}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  PARSE TABLE
// ══════════════════════════════════════════════════════════════════════
const GRAMMAR = [
  [0,"program",["stmt_list"]],
  [1,"stmt_list",["stmt","stmt_list"]],
  [2,"stmt_list",["ε"]],
  [3,"stmt",["assign_stmt"]],
  [4,"stmt",["print_stmt"]],
  [5,"stmt",["for_stmt"]],
  [6,"assign_stmt",["IDENT","assign_op","expr","NEWLINE"]],
  [7,"assign_op",["="]],
  [8,"assign_op",["+="]],
  [9,"assign_op",["-="]],
  [10,"print_stmt",["PRINT","(","expr_list",")","NEWLINE"]],
  [11,"for_stmt",["FOR","IDENT","IN","expr",":","NEWLINE","INDENT","stmt_list","DEDENT"]],
  [12,"expr_list",["expr","expr_list_tail"]],
  [13,"expr_list_tail",["COMMA","expr","expr_list_tail"]],
  [14,"expr_list_tail",["ε"]],
  [15,"expr",["term","expr_prime"]],
  [16,"expr_prime",["+","term","expr_prime"]],
  [17,"expr_prime",["-","term","expr_prime"]],
  [18,"expr_prime",["ε"]],
  [19,"term",["factor","term_prime"]],
  [20,"term_prime",["*","factor","term_prime"]],
  [21,"term_prime",["/","factor","term_prime"]],
  [22,"term_prime",["ε"]],
  [23,"factor",["(","expr",")"]],
  [24,"factor",["IDENT"]],
  [25,"factor",["literal"]],
  [26,"literal",["INT_LIT"]],
  [27,"literal",["FLOAT_LIT"]],
  [28,"literal",["STRING_LIT"]],
  [29,"literal",["BOOL_LIT"]],
  [30,"literal",["list_lit"]],
  [31,"list_lit",["[","expr_list","]"]],
  [32,"list_lit",["[","]"]],
];

const NT_SET = new Set([
  "program","stmt_list","stmt","assign_stmt","assign_op","print_stmt",
  "for_stmt","expr_list","expr_list_tail","expr","expr_prime",
  "term","term_prime","factor","literal","list_lit",
]);

function ParseTab({ r }) {
  if (!r.parsingTable) return <Empty icon="📊" msg="Not available." />;
  const { table, conflicts } = r.parsingTable;
  const nts   = Object.keys(table);
  const tSet  = new Set();
  Object.values(table).forEach(row => Object.keys(row).forEach(t => tSet.add(t)));
  const terms = [...tSet].sort();

  return (
    <>
      {conflicts?.length > 0 && (
        <div className="conflict-box">⚠ {conflicts.length} LL(1) conflict(s): {conflicts.join(" | ")}</div>
      )}

      <p className="sec-label">Grammar Productions</p>
      <div className="glist">
        {GRAMMAR.map(([idx, lhs, rhs]) => (
          <div key={idx} className="grule">
            <span className="gnum">P{idx}</span>
            <span className="glhs">{lhs}</span>
            <span className="garr">→</span>
            <span>
              {rhs.map((s,i) => (
                <span key={i} style={{
                  color: NT_SET.has(s) ? "var(--cyan)" : s==="ε" ? "var(--yellow)" : "var(--orange)",
                  marginRight:6, fontFamily:"var(--mono)", fontSize:12,
                }}>{s}</span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <p className="sec-label" style={{ marginTop:22 }}>LL(1) Parsing Table</p>
      <div className="ptable-wrap">
        <table className="ptable">
          <thead>
            <tr>
              <th>NT \ T</th>
              {terms.map(t => <th key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {nts.map(nt => (
              <tr key={nt}>
                <td>{nt}</td>
                {terms.map(t => {
                  const p = table[nt]?.[t];
                  return <td key={t} className={p?"hit":""}>{p?`P${p.index}`:""}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  ERRORS
// ══════════════════════════════════════════════════════════════════════
function ErrorsTab({ r }) {
  const lex    = r.lexerErrors  ?? [];
  const parser = r.parserErrors ?? [];
  if (!lex.length && !parser.length) {
    return (
      <div className="ok-banner">
        <span style={{ fontSize:20 }}>✅</span>
        <div>
          <strong>No errors found</strong>
          <div style={{ fontSize:12, marginTop:3, opacity:.75 }}>Compilation completed successfully.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="elist">
      {lex.map((e,i) => (
        <div key={`l${i}`} className="eitem lexer">
          <span className="ephase">Lexer</span>
          <div className="ebody">
            <div className="emsg">{e.message}</div>
            <div className="eline">Line {e.line}</div>
          </div>
        </div>
      ))}
      {parser.map((e,i) => (
        <div key={`p${i}`} className={`eitem ${e.phase??"syntax"}`}>
          <span className="ephase">{e.phase??"syntax"}</span>
          <div className="ebody">
            <div className="emsg">{e.message}</div>
            <div className="eline">Line {e.line}</div>
          </div>
        </div>
      ))}
    </div>
  );
}