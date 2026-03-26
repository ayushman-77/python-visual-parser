package com.compiler.symboltable;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;

public class SymbolTable {

    private final Deque<LinkedHashMap<String, SymbolEntry>> scopes = new ArrayDeque<>();
    private int currentScopeLevel = 0;
    private final List<SymbolEntry> allEntries = new ArrayList<>();

    public SymbolTable() {
        scopes.push(new LinkedHashMap<>());
    }

    public void enterScope() {
        currentScopeLevel++;
        scopes.push(new LinkedHashMap<>());
    }

    public void exitScope() {
        if (scopes.size() > 1) {
            scopes.pop();
            currentScopeLevel--;
        }
    }

    public void declare(String name, VarType type, int line) {
        LinkedHashMap<String, SymbolEntry> current = scopes.peek();
        if (current.containsKey(name)) {
            current.get(name).updateType(type);
        } else {
            SymbolEntry entry = new SymbolEntry(name, type, currentScopeLevel, line);
            current.put(name, entry);
            allEntries.add(entry);
        }
    }

    public SymbolEntry lookup(String name) {
        for (LinkedHashMap<String, SymbolEntry> scope : scopes) {
            if (scope.containsKey(name)) return scope.get(name);
        }
        return null;
    }

    public boolean isDeclared(String name) {
        return lookup(name) != null;
    }

    public List<SymbolEntry> snapshot() {
        return List.copyOf(allEntries);
    }

    public int getCurrentScopeLevel() {
        return currentScopeLevel;
    }
}