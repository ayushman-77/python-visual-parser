package com.compiler.cfg;

import java.util.List;

public class CFGNode {
    public enum NodeKind { ENTRY, EXIT, BLOCK, FOR_CONDITION }

    public final int         id;
    public final NodeKind    kind;
    public final List<String> statements;
    public final int         startLine;

    public CFGNode(int id, NodeKind kind, List<String> statements, int startLine) {
        this.id         = id;
        this.kind       = kind;
        this.statements = List.copyOf(statements);
        this.startLine  = startLine;
    }

    public static CFGNode sentinel(int id, NodeKind kind) {
        return new CFGNode(id, kind, List.of(), 0);
    }
}