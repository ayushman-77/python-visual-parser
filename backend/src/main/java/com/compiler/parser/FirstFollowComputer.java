package com.compiler.parser;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class FirstFollowComputer {

    public static FirstFollowResult compute() {
        Map<String, Set<String>> first  = initFirst();
        Map<String, Set<String>> follow = initFollow();
        computeFirst(first);
        computeFollow(first, follow);
        return new FirstFollowResult(makeImmutable(first), makeImmutable(follow));
    }

    private static Map<String, Set<String>> initFirst() {
        Map<String, Set<String>> first = new LinkedHashMap<>();
        for (String nt : Grammar.NON_TERMINALS) first.put(nt, new LinkedHashSet<>());
        return first;
    }

    private static void computeFirst(Map<String, Set<String>> first) {
        boolean changed = true;
        while (changed) {
            changed = false;
            for (Production p : Grammar.ALL) {
                Set<String> toAdd = firstOfSequence(p.rhs, first);
                if (first.get(p.lhs).addAll(toAdd)) changed = true;
            }
        }
    }

    public static Set<String> firstOfSequence(List<String> symbols,
                                               Map<String, Set<String>> first) {
        Set<String> result    = new LinkedHashSet<>();
        boolean     allNullable = true;

        for (String sym : symbols) {
            if (sym.equals(Grammar.EPSILON)) { result.add(Grammar.EPSILON); break; }
            Set<String> symFirst = Grammar.isNonTerminal(sym)
                ? first.getOrDefault(sym, Set.of())
                : Set.of(sym);
            result.addAll(symFirst);
            result.remove(Grammar.EPSILON);
            if (!symFirst.contains(Grammar.EPSILON)) { allNullable = false; break; }
        }
        if (allNullable) result.add(Grammar.EPSILON);
        return result;
    }

    private static Map<String, Set<String>> initFollow() {
        Map<String, Set<String>> follow = new LinkedHashMap<>();
        for (String nt : Grammar.NON_TERMINALS) follow.put(nt, new LinkedHashSet<>());
        follow.get(Grammar.START).add(Grammar.EOF);
        return follow;
    }

    private static void computeFollow(Map<String, Set<String>> first,
                                       Map<String, Set<String>> follow) {
        boolean changed = true;
        while (changed) {
            changed = false;
            for (Production p : Grammar.ALL) {
                List<String> rhs = p.rhs;
                for (int i = 0; i < rhs.size(); i++) {
                    String B = rhs.get(i);
                    if (!Grammar.isNonTerminal(B)) continue;
                    List<String> beta      = rhs.subList(i + 1, rhs.size());
                    Set<String>  firstBeta = firstOfSequence(beta, first);
                    Set<String>  followB   = follow.get(B);
                    for (String t : firstBeta)
                        if (!t.equals(Grammar.EPSILON) && followB.add(t)) changed = true;
                    if (firstBeta.contains(Grammar.EPSILON))
                        if (followB.addAll(follow.get(p.lhs))) changed = true;
                }
            }
        }
    }

    private static Map<String, Set<String>> makeImmutable(Map<String, Set<String>> m) {
        Map<String, Set<String>> result = new LinkedHashMap<>();
        m.forEach((k, v) -> result.put(k, Collections.unmodifiableSet(v)));
        return Collections.unmodifiableMap(result);
    }
}