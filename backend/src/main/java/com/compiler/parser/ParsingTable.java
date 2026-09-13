package com.compiler.parser;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ParsingTable {

    public final Map<String, Map<String, Production>> table;
    public final List<String> conflicts;

    public ParsingTable(FirstFollowResult ffResult) {
        Map<String, Map<String, Production>> t    = new LinkedHashMap<>();
        List<String>                          conf = new ArrayList<>();

        for (String nt : Grammar.NON_TERMINALS) t.put(nt, new LinkedHashMap<>());

        for (Production p : Grammar.ALL) {
            Set<String> firstAlpha =
                FirstFollowComputer.firstOfSequence(p.rhs, mutableCopy(ffResult.first));

            for (String terminal : firstAlpha) {
                if (terminal.equals(Grammar.EPSILON)) continue;
                insertOrConflict(t, conf, p.lhs, terminal, p);
            }
            if (firstAlpha.contains(Grammar.EPSILON))
                for (String b : ffResult.follow.get(p.lhs))
                    insertOrConflict(t, conf, p.lhs, b, p);
        }

        this.table     = Collections.unmodifiableMap(t);
        this.conflicts = List.copyOf(conf);
    }

    public Production lookup(String nonTerminal, String terminal) {
        Map<String, Production> row = table.get(nonTerminal);
        return row == null ? null : row.get(terminal);
    }

    public boolean hasConflicts() { return !conflicts.isEmpty(); }

    private static void insertOrConflict(Map<String, Map<String, Production>> t,
                                          List<String> conf, String nt,
                                          String terminal, Production p) {
        Map<String, Production> row = t.get(nt);
        if (row.containsKey(terminal))
            conf.add(String.format("CONFLICT at M[%s][%s]: %s vs %s",
                nt, terminal, row.get(terminal), p));
        else
            row.put(terminal, p);
    }

    private static Map<String, Set<String>> mutableCopy(Map<String, Set<String>> src) {
        Map<String, Set<String>> copy = new LinkedHashMap<>();
        src.forEach((k, v) -> copy.put(k, new LinkedHashSet<>(v)));
        return copy;
    }
}