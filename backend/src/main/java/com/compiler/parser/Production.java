package com.compiler.parser;

import java.util.List;

public class Production {
    public final String       lhs;
    public final List<String> rhs;
    public final int          index;

    public Production(int index, String lhs, List<String> rhs) {
        this.index = index;
        this.lhs   = lhs;
        this.rhs   = List.copyOf(rhs);
    }

    public boolean isEpsilon() {
        return rhs.size() == 1 && rhs.get(0).equals(Grammar.EPSILON);
    }

    @Override
    public String toString() {
        return String.format("P%d: %s → %s", index, lhs, String.join(" ", rhs));
    }
}