import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const TYPE_COLORS = {
  // Keywords
  IF: '#ff7b72', ELSE: '#ff7b72', WHILE: '#ff7b72', FOR: '#ff7b72',
  RETURN: '#ff7b72', CLASS: '#ff7b72', PUBLIC: '#ff7b72', PRIVATE: '#ff7b72',
  PROTECTED: '#ff7b72', STATIC: '#ff7b72', FINAL: '#ff7b72', NEW: '#ff7b72',
  INT: '#79c0ff', LONG: '#79c0ff', FLOAT: '#79c0ff', DOUBLE: '#79c0ff',
  BOOLEAN: '#79c0ff', VOID: '#79c0ff', CHAR: '#79c0ff', STRING_TYPE: '#79c0ff',
  // Literals
  INTEGER_LITERAL: '#a5d6ff', FLOAT_LITERAL: '#a5d6ff', DOUBLE_LITERAL: '#a5d6ff',
  STRING_LITERAL: '#a5d6ff', CHAR_LITERAL: '#a5d6ff', LONG_LITERAL: '#a5d6ff',
  TRUE: '#a5d6ff', FALSE: '#a5d6ff', NULL: '#a5d6ff',
  // Identifier
  IDENTIFIER: '#e3b341',
  // Operators
  PLUS: '#d2a8ff', MINUS: '#d2a8ff', MULTIPLY: '#d2a8ff', DIVIDE: '#d2a8ff',
  ASSIGN: '#d2a8ff', EQUALS: '#d2a8ff', NOT_EQUALS: '#d2a8ff',
  LESS_THAN: '#d2a8ff', GREATER_THAN: '#d2a8ff',
  AND: '#d2a8ff', OR: '#d2a8ff', NOT: '#d2a8ff',
  INCREMENT: '#d2a8ff', DECREMENT: '#d2a8ff',
};

function TypeCell({ value }) {
  const color = TYPE_COLORS[value] || '#8b949e';
  return (
    <span style={{
      background: color + '22', color, padding: '2px 8px',
      borderRadius: '4px', fontSize: '.75rem', fontWeight: 600,
    }}>
      {value}
    </span>
  );
}

export default function TokenPanel({ tokens = [] }) {
  const columnDefs = useMemo(() => [
    { field: 'line',   headerName: '#Line', width: 80,  cellStyle: { color: '#8b949e' } },
    { field: 'column', headerName: 'Col',   width: 70,  cellStyle: { color: '#8b949e' } },
    { field: 'type',   headerName: 'Type',  width: 200, cellRenderer: TypeCell },
    { field: 'value',  headerName: 'Value', flex: 1,    cellStyle: { fontFamily: 'monospace', color: '#c9d1d9' } },
  ], []);

  const filtered = useMemo(() => tokens.filter(t => t.type !== 'EOF'), [tokens]);

  return (
    <div className="ag-theme-alpine-dark" style={{ flex: 1, width: '100%' }}>
      <AgGridReact
        rowData={filtered}
        columnDefs={columnDefs}
        defaultColDef={{ resizable: true, sortable: true, filter: true }}
        rowHeight={32}
        headerHeight={36}
        suppressCellFocus
        animateRows
      />
    </div>
  );
}