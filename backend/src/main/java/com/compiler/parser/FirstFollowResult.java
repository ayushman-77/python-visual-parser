package com.compiler.parser;

import java.util.Map;
import java.util.Set;

public class FirstFollowResult {
    public final Map<String, Set<String>> first;
    public final Map<String, Set<String>> follow;

    public FirstFollowResult(Map<String, Set<String>> first,
                              Map<String, Set<String>> follow) {
        this.first  = first;
        this.follow = follow;
    }
}