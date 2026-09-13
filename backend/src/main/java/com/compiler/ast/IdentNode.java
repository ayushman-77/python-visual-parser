package com.compiler.ast;

public class IdentNode extends ExprNode {
    public final String name;
    public final int    line;

    public IdentNode(String name, int line) {
        super("Ident");
        this.name = name;
        this.line = line;
    }
}