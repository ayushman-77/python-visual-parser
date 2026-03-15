import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Editor      from './components/Editor';
import TokenPanel  from './components/TokenPanel';
import ASTViewer   from './components/ASTViewer';
import CFGViewer   from './components/CFGViewer';
import SymbolTablePanel from './components/SymbolTable';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TABS = ['Tokens', 'AST', 'CFG', 'Symbol Table'];

const DEFAULT_CODE = `public class HelloWorld {
    private int counter = 0;

    public int add(int a, int b) {
        int result = a + b;
        return result;
    }

    public boolean isPositive(int n) {
        if (n > 0) {
            return true;
        } else {
            return false;
        }
    }

    public void countUp(int limit) {
        for (int i = 0; i < limit; i++) {
            counter = counter + 1;
        }
    }

    public int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }
}`;

export default function App() {
  const [code,        setCode]        = useState(DEFAULT_CODE);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('Tokens');

  const compile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API}/compile`, { code });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API}/upload`, formData);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <span style={styles.logo}>⚙ Java Compiler Visualizer</span>
        <div style={styles.actions}>
          <label style={styles.uploadBtn}>
            📂 Upload .java
            <input type="file" accept=".java,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          <button style={styles.compileBtn} onClick={compile} disabled={loading}>
            {loading ? '⏳ Compiling...' : '▶ Compile'}
          </button>
        </div>
      </header>

      {/* Errors */}
      {error && (
        <div style={styles.errorBar}>⚠ {error}</div>
      )}
      {result?.errors?.length > 0 && (
        <div style={styles.warnBar}>
          ⚠ {result.errors.length} warning(s): {result.errors[0]}{result.errors.length > 1 ? ' ...' : ''}
        </div>
      )}

      {/* Body */}
      <div style={styles.body}>
        {/* Left: Editor */}
        <div style={styles.editorPane}>
          <div style={styles.paneHeader}>Source Code</div>
          <Editor code={code} onChange={setCode} />
        </div>

        {/* Right: Results */}
        <div style={styles.resultPane}>
          {/* Tabs */}
          <div style={styles.tabBar}>
            {TABS.map(tab => (
              <button
                key={tab}
                style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {result && tab === 'Tokens' && (
                  <span style={styles.badge}>{result.tokens?.length}</span>
                )}
                {result && tab === 'Symbol Table' && (
                  <span style={styles.badge}>{result.symbolTable?.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={styles.tabContent}>
            {!result ? (
              <div style={styles.placeholder}>
                Press <strong>▶ Compile</strong> to visualize the compilation stages.
              </div>
            ) : (
              <>
                {activeTab === 'Tokens'       && <TokenPanel  tokens={result.tokens} />}
                {activeTab === 'AST'          && <ASTViewer   ast={result.ast} />}
                {activeTab === 'CFG'          && <CFGViewer   cfg={result.cfg} />}
                {activeTab === 'Symbol Table' && <SymbolTablePanel symbols={result.symbolTable} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d1117' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', height: '52px', background: '#161b22',
    borderBottom: '1px solid #30363d', flexShrink: 0,
  },
  logo: { color: '#58a6ff', fontWeight: 700, fontSize: '1rem', letterSpacing: '.5px' },
  actions: { display: 'flex', gap: '10px', alignItems: 'center' },
  uploadBtn: {
    cursor: 'pointer', padding: '6px 14px', background: '#21262d',
    border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9',
    fontSize: '.85rem',
  },
  compileBtn: {
    cursor: 'pointer', padding: '6px 18px', background: '#238636',
    border: '1px solid #2ea043', borderRadius: '6px', color: '#fff',
    fontWeight: 600, fontSize: '.9rem',
  },
  errorBar: {
    background: '#3d1a1a', color: '#ff7b72', padding: '6px 20px',
    fontSize: '.85rem', borderBottom: '1px solid #6e3030', flexShrink: 0,
  },
  warnBar: {
    background: '#2d2208', color: '#e3b341', padding: '6px 20px',
    fontSize: '.85rem', borderBottom: '1px solid #6e4c0a', flexShrink: 0,
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  editorPane: { display: 'flex', flexDirection: 'column', width: '50%', borderRight: '1px solid #30363d' },
  paneHeader: {
    padding: '8px 16px', background: '#161b22', fontSize: '.8rem',
    color: '#8b949e', borderBottom: '1px solid #30363d', flexShrink: 0,
  },
  resultPane: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  tabBar: {
    display: 'flex', background: '#161b22', borderBottom: '1px solid #30363d', flexShrink: 0,
  },
  tab: {
    padding: '10px 18px', background: 'transparent', border: 'none',
    color: '#8b949e', cursor: 'pointer', fontSize: '.85rem',
    borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px',
  },
  tabActive: { color: '#58a6ff', borderBottom: '2px solid #58a6ff' },
  badge: {
    background: '#21262d', color: '#8b949e', borderRadius: '10px',
    padding: '1px 6px', fontSize: '.75rem',
  },
  tabContent: { flex: 1, overflow: 'hidden', display: 'flex' },
  placeholder: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#484f58', fontSize: '1rem',
  },
};