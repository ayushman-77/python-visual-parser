package com.compiler;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * SymbolTable.java — everything related to tracking declared variables.
 *
 * Contains:
 *   VarType      — enum: INT | FLOAT | STR | BOOL | LIST | UNKNOWN
 *   SymbolEntry  — one row: name, type, scopeLevel, declarationLine
 *   SymbolTable  — scope-stack implementation
 *
 * Input  : declare / lookup / enterScope / exitScope calls from the Parser
 * Output : snapshot() → List<SymbolEntry>  (for JSON / display)
 */
public class SymbolTable {

    // ─── VarType ───────────────────────────────────────────────────────────
    public enum VarType {
        INT, FLOAT, STR, BOOL, LIST, UNKNOWN;

        /** Infer VarType directly from a Lexer token type. */
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

    // ─── SymbolEntry ───────────────────────────────────────────────────────
    public static class SymbolEntry {
        public final String  name;
        public VarType       type;             // mutable — can change on reassignment
        public final int     scopeLevel;
        public final int     declarationLine;

        public SymbolEntry(String name, VarType type, int scopeLevel, int declarationLine) {
            this.name = name; this.type = type;
            this.scopeLevel = scopeLevel; this.declarationLine = declarationLine;
        }

        public void updateType(VarType t) { this.type = t; }
    }

    // ─── SymbolTable logic ─────────────────────────────────────────────────
    /** Stack of scopes. Index 0 = global (bottom). Peek = current innermost. */
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

    /** Immutable flat snapshot of all entries in declaration order. */
    public List<SymbolEntry> snapshot() { return List.copyOf(allEntries); }
}