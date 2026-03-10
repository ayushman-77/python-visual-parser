package com.compiler.ast;

public abstract class ExprNode extends ASTNode {
    protected ExprNode(String nodeType) {
        super(nodeType);
    }
}