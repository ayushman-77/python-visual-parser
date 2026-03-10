package com.compiler.symboltable;

public class SymbolEntry {
    public final String name;
    public VarType      type;
    public final int    scopeLevel;
    public final int    declarationLine;

    public SymbolEntry(String name, VarType type, int scopeLevel, int declarationLine) {
        this.name            = name;
        this.type            = type;
        this.scopeLevel      = scopeLevel;
        this.declarationLine = declarationLine;
    }

    public void updateType(VarType newType) {
        this.type = newType;
    }
}