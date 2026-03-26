import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NODE_COLORS = {
  Program:          '#58a6ff',
  ClassDeclaration: '#3fb950',
  MethodDeclaration:'#d2a8ff',
  FieldDeclaration: '#ffa657',
  Block:            '#79c0ff',
  IfStatement:      '#ff7b72',
  WhileStatement:   '#ff7b72',
  ForStatement:     '#ff7b72',
  ReturnStatement:  '#e3b341',
  LocalVarDecl:     '#a5d6ff',
  BinaryExpr:       '#d2a8ff',
  Assignment:       '#d2a8ff',
  MethodCall:       '#ffa657',
  Identifier:       '#e3b341',
  IntLiteral:       '#a5d6ff',
  StringLiteral:    '#a5d6ff',
  BoolLiteral:      '#a5d6ff',
};

function getColor(type) {
  return NODE_COLORS[type] || '#8b949e';
}

export default function ASTViewer({ ast }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!ast || !svgRef.current) return;

    const container = svgRef.current.parentElement;
    const W = container.clientWidth  || 800;
    const H = container.clientHeight || 600;

    // Clear
    d3.select(svgRef.current).selectAll('*').remove();

    const root = d3.hierarchy(ast, d => d.children);
    const treeLayout = d3.tree().nodeSize([120, 180]);
    treeLayout(root);

    // Compute bounds
    let x0 = Infinity, x1 = -Infinity;
    root.each(d => { if (d.x < x0) x0 = d.x; if (d.x > x1) x1 = d.x; });

    const svg = d3.select(svgRef.current)
      .attr('width',  W)
      .attr('height', H);

    const g = svg.append('g');

    // Zoom + pan
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);

    // Initial centering
    const initX = W / 2 - (x0 + x1) / 2;
    const initY = 60;
    g.attr('transform', `translate(${initX},${initY})`);

    // Links
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#30363d')
      .attr('stroke-width', 1.5)
      .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y));

    // Node groups
    const node = g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // Node circles
    node.append('circle')
      .attr('r', 18)
      .attr('fill', d => getColor(d.data.nodeType) + '33')
      .attr('stroke', d => getColor(d.data.nodeType))
      .attr('stroke-width', 1.5);

    // Node type label (inside circle)
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', d => getColor(d.data.nodeType))
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .text(d => {
        const t = d.data.nodeType || '';
        return t.length > 8 ? t.slice(0, 7) + '…' : t;
      });

    // Value label below
    node.filter(d => d.data.value && d.data.value.trim() !== '')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '2.8em')
      .attr('fill', '#8b949e')
      .attr('font-size', '10px')
      .text(d => {
        const v = d.data.value || '';
        return v.length > 12 ? v.slice(0, 11) + '…' : v;
      });

    // Tooltip
    node.append('title')
      .text(d => `${d.data.nodeType}${d.data.value ? ': ' + d.data.value : ''}  (line ${d.data.line})`);

    // Fit to view button behavior: double-click resets
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => {
      svg.transition().duration(400).call(
        zoom.transform,
        d3.zoomIdentity.translate(initX, initY)
      );
    });

  }, [ast]);

  if (!ast) return null;

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#0d1117' }}>
      <div style={hint}>scroll to zoom • drag to pan • double-click to reset</div>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

const hint = {
  position: 'absolute', top: 8, right: 12,
  color: '#484f58', fontSize: '.72rem', pointerEvents: 'none', zIndex: 10,
};