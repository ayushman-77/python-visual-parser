package com.compiler.ast;

import com.compiler.symboltable.VarType;

public class LiteralNode extends ExprNode {
    public final String  rawValue;
    public final VarType varType;
    public final int     line;

    public LiteralNode(String rawValue, VarType varType, int line) {
        super("Literal");
        this.rawValue = rawValue;
        this.varType  = varType;
        this.line     = line;
    }
}