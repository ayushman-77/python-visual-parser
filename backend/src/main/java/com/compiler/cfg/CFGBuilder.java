package com.compiler.cfg;

import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

import com.compiler.ast.AssignOp;
import com.compiler.ast.AssignStmtNode;
import com.compiler.ast.BinOpNode;
import com.compiler.ast.ExprNode;
import com.compiler.ast.ForStmtNode;
import com.compiler.ast.IdentNode;
import com.compiler.ast.ListLitNode;
import com.compiler.ast.LiteralNode;
import com.compiler.ast.PrintStmtNode;
import com.compiler.ast.ProgramNode;
import com.compiler.ast.StmtNode;

public class CFGBuilder {

    private final List<CFGNode> nodes = new ArrayList<>();
    private final List<CFGEdge> edges = new ArrayList<>();
    private int nextId = 0;

    public static CFGGraph build(ProgramNode program) {
        CFGBuilder b = new CFGBuilder();
        b.buildProgram(program);
        return new CFGGraph(List.copyOf(b.nodes), List.copyOf(b.edges));
    }

    private void buildProgram(ProgramNode program) {
        CFGNode entry = addNode(CFGNode.sentinel(nextId(), CFGNode.NodeKind.ENTRY));
        CFGNode exit  = CFGNode.sentinel(nextId(), CFGNode.NodeKind.EXIT);
        int lastId    = buildStmtList(program.statements, entry.id);
        nodes.add(exit);
        edges.add(new CFGEdge(lastId, exit.id));
    }

    private int buildStmtList(List<StmtNode> stmts, int predecessorId) {
        List<String> currentBlock    = new ArrayList<>();
        int          currentBlockLine = 0;
        int          prevId          = predecessorId;

        for (StmtNode stmt : stmts) {
            if (stmt instanceof ForStmtNode forStmt) {
                if (!currentBlock.isEmpty()) {
                    CFGNode block = addNode(new CFGNode(nextId(), CFGNode.NodeKind.BLOCK,
                                                        currentBlock, currentBlockLine));
                    edges.add(new CFGEdge(prevId, block.id));
                    prevId = block.id;
                    currentBlock = new ArrayList<>();
                }
                prevId = buildForStmt(forStmt, prevId);
            } else {
                if (currentBlock.isEmpty()) currentBlockLine = lineOf(stmt);
                currentBlock.add(stmtToString(stmt));
            }
        }

        if (!currentBlock.isEmpty()) {
            CFGNode block = addNode(new CFGNode(nextId(), CFGNode.NodeKind.BLOCK,
                                                currentBlock, currentBlockLine));
            edges.add(new CFGEdge(prevId, block.id));
            prevId = block.id;
        }
        return prevId;
    }

    private int buildForStmt(ForStmtNode stmt, int predecessorId) {
        String condLabel = "for " + stmt.loopVar + " in " + exprToString(stmt.iterable);
        CFGNode condNode = addNode(new CFGNode(nextId(), CFGNode.NodeKind.FOR_CONDITION,
                                               List.of(condLabel), stmt.line));
        edges.add(new CFGEdge(predecessorId, condNode.id));
        int bodyEnd = buildStmtList(stmt.body, condNode.id);
        edges.add(new CFGEdge(bodyEnd, condNode.id, "loop"));
        return condNode.id;
    }

    private CFGNode addNode(CFGNode n) { nodes.add(n); return n; }
    private int     nextId()           { return nextId++; }

    private int lineOf(StmtNode stmt) {
        if (stmt instanceof AssignStmtNode a) return a.line;
        if (stmt instanceof PrintStmtNode  p) return p.line;
        if (stmt instanceof ForStmtNode    f) return f.line;
        return 0;
    }

    private String stmtToString(StmtNode stmt) {
        if (stmt instanceof AssignStmtNode a)
            return a.ident + " " + opStr(a.op) + " " + exprToString(a.expr);
        if (stmt instanceof PrintStmtNode p) {
            StringJoiner sj = new StringJoiner(", ");
            p.args.forEach(e -> sj.add(exprToString(e)));
            return "print(" + sj + ")";
        }
        return stmt.nodeType;
    }

    private String opStr(AssignOp op) {
        return switch (op) {
            case ASSIGN -> "="; case PLUS_ASSIGN -> "+="; case MINUS_ASSIGN -> "-=";
        };
    }

    private String exprToString(ExprNode expr) {
        if (expr instanceof LiteralNode l) return l.rawValue;
        if (expr instanceof IdentNode   i) return i.name;
        if (expr instanceof BinOpNode   b)
            return exprToString(b.left) + " " + b.op + " " + exprToString(b.right);
        if (expr instanceof ListLitNode lst) {
            StringJoiner sj = new StringJoiner(", ");
            lst.elements.forEach(e -> sj.add(exprToString(e)));
            return "[" + sj + "]";
        }
        return "?";
    }
}