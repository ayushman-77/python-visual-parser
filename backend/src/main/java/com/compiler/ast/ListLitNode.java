package com.compiler.ast;

import java.util.List;

public class ListLitNode extends ExprNode {
    public final List<ExprNode> elements;
    public final int            line;

    public ListLitNode(List<ExprNode> elements, int line) {
        super("ListLit");
        this.elements = List.copyOf(elements);
        this.line     = line;
    }
}