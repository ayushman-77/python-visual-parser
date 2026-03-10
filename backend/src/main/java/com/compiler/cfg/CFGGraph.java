package com.compiler.cfg;

import java.util.List;

public class CFGGraph {
    public final List<CFGNode> nodes;
    public final List<CFGEdge> edges;

    public CFGGraph(List<CFGNode> nodes, List<CFGEdge> edges) {
        this.nodes = List.copyOf(nodes);
        this.edges = List.copyOf(edges);
    }
}