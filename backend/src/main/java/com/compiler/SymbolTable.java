package com.compiler;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;

public class SymbolTable {

    public enum VarType {
        INT, FLOAT, STR, BOOL, LIST, UNKNOWN;

        public static VarType from(Lexer.TokenType tt) {
            return switch (tt) {
                case INT_LIT    -> INT;
                case FLOAT_LIT  -> FLOAT;
                case STRING_LIT -> STR;
                case BOOL_LIT   -> BOOL;
                default         -> UNKNOWN;
            };
        }
    }

    public static class SymbolEntry {
        public final String  name;
        public VarType       type;
        public final int     scopeLevel;
        public final int     declarationLine;

        public SymbolEntry(String name, VarType type, int scopeLevel, int declarationLine) {
            this.name = name; this.type = type;
            this.scopeLevel = scopeLevel; this.declarationLine = declarationLine;
        }

        public void updateType(VarType t) { this.type = t; }
    }

    private final Deque<LinkedHashMap<String, SymbolEntry>> scopes = new ArrayDeque<>();
    private int level = 0;
    private final List<SymbolEntry> allEntries = new ArrayList<>();

    public SymbolTable() { scopes.push(new LinkedHashMap<>()); }

    public void enterScope() { level++; scopes.push(new LinkedHashMap<>()); }

    public void exitScope()  { if (scopes.size() > 1) { scopes.pop(); level--; } }

    public void declare(String name, VarType type, int line) {
        LinkedHashMap<String, SymbolEntry> cur = scopes.peek();
        if (cur.containsKey(name)) {
            cur.get(name).updateType(type);
        } else {
            SymbolEntry e = new SymbolEntry(name, type, level, line);
            cur.put(name, e);
            allEntries.add(e);
        }
    }

    public SymbolEntry lookup(String name) {
        for (var scope : scopes) if (scope.containsKey(name)) return scope.get(name);
        return null;
    }

    public boolean isDeclared(String name) { return lookup(name) != null; }

    public List<SymbolEntry> snapshot() { return List.copyOf(allEntries); }
}