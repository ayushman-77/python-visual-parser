import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const KIND_COLORS = {
  CLASS:     '#3fb950',
  METHOD:    '#d2a8ff',
  FIELD:     '#ffa657',
  VARIABLE:  '#58a6ff',
  PARAMETER: '#e3b341',
};

function KindCell({ value }) {
  const color = KIND_COLORS[value] || '#8b949e';
  return (
    <span style={{
      background: color + '22', color, padding: '2px 8px',
      borderRadius: 4, fontSize: '.75rem', fontWeight: 600,
    }}>
      {value}
    </span>
  );
}

export default function SymbolTablePanel({ symbols = [] }) {
  const [filter, setFilter] = useState('');

  const columnDefs = useMemo(() => [
    { field: 'name',  headerName: 'Name',  flex: 1,    cellStyle: { fontFamily: 'monospace', color: '#e3b341' } },
    { field: 'type',  headerName: 'Type',  width: 120, cellStyle: { fontFamily: 'monospace', color: '#79c0ff' } },
    { field: 'kind',  headerName: 'Kind',  width: 130, cellRenderer: KindCell },
    { field: 'scope', headerName: 'Scope', flex: 1,    cellStyle: { color: '#8b949e' } },
    { field: 'line',  headerName: 'Line',  width: 80,  cellStyle: { color: '#8b949e' } },
  ], []);

  const filtered = useMemo(() => {
    if (!filter) return symbols;
    const q = filter.toLowerCase();
    return symbols.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.type?.toLowerCase().includes(q) ||
      s.kind?.toLowerCase().includes(q) ||
      s.scope?.toLowerCase().includes(q)
    );
  }, [symbols, filter]);

  const stats = useMemo(() => {
    const counts = {};
    symbols.forEach(s => { counts[s.kind] = (counts[s.kind] || 0) + 1; });
    return counts;
  }, [symbols]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Stats bar */}
      <div style={styles.statsBar}>
        {Object.entries(stats).map(([kind, count]) => (
          <span key={kind} style={{ ...styles.stat, color: KIND_COLORS[kind] || '#8b949e' }}>
            {kind}: {count}
          </span>
        ))}
        <input
          style={styles.search}
          placeholder="Search symbols…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="ag-theme-alpine-dark" style={{ flex: 1 }}>
        <AgGridReact
          rowData={filtered}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, sortable: true }}
          rowHeight={32}
          headerHeight={36}
          suppressCellFocus
          animateRows
        />
      </div>
    </div>
  );
}

const styles = {
  statsBar: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '8px 16px', background: '#161b22',
    borderBottom: '1px solid #30363d', flexShrink: 0, flexWrap: 'wrap',
  },
  stat: { fontSize: '.78rem', fontWeight: 600 },
  search: {
    marginLeft: 'auto', padding: '4px 10px', background: '#21262d',
    border: '1px solid #30363d', borderRadius: 6, color: '#c9d1d9',
    fontSize: '.82rem', outline: 'none',
  },
};