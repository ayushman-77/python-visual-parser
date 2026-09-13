package com.compiler.cfg;

public class CFGEdge {
    public final int    from;
    public final int    to;
    public final String label;

    public CFGEdge(int from, int to, String label) {
        this.from  = from;
        this.to    = to;
        this.label = label;
    }

    public CFGEdge(int from, int to) { this(from, to, ""); }
}