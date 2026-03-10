package com.compiler.display;

import java.util.List;

import com.compiler.ast.ASTNode;
import com.compiler.ast.AssignStmtNode;
import com.compiler.ast.BinOpNode;
import com.compiler.ast.ForStmtNode;
import com.compiler.ast.IdentNode;
import com.compiler.ast.ListLitNode;
import com.compiler.ast.LiteralNode;
import com.compiler.ast.PrintStmtNode;
import com.compiler.ast.ProgramNode;
import com.compiler.cfg.CFGEdge;
import com.compiler.cfg.CFGGraph;
import com.compiler.cfg.CFGNode;
import com.compiler.lexer.Token;
import com.compiler.parser.FirstFollowResult;
import com.compiler.parser.ParsingTable;
import com.compiler.result.CompilerResult;
import com.compiler.symboltable.SymbolEntry;

public class CLIDisplay {

    private static final String RESET  = "\u001B[0m";
    private static final String BOLD   = "\u001B[1m";
    private static final String CYAN   = "\u001B[36m";
    private static final String YELLOW = "\u001B[33m";
    private static final String GREEN  = "\u001B[32m";
    private static final String RED    = "\u001B[31m";
    private static final String BLUE   = "\u001B[34m";
    private static final String DIM    = "\u001B[2m";

    public static void display(CompilerResult result) {
        header("COMPILER OUTPUT");
        if (result.tokens      != null) displayTokens(result.tokens);
        if (result.firstFollow != null) displayFirstFollow(result.firstFollow);
        if (result.parsingTable!= null) displayParsingTable(result.parsingTable);
        if (result.symbolTable != null) displaySymbolTable(result.symbolTable);
        if (result.ast         != null) displayAST(result.ast);
        if (result.cfg         != null) displayCFG(result.cfg);
        displayErrors(result);
    }

    private static void displayTokens(List<Token> tokens) {
        section("TOKENS");
        String fmt = "%-5s %-20s %-20s %s%n";
        System.out.printf(BOLD + fmt + RESET, "#", "TYPE", "VALUE", "LINE");
        separator(52);
        int i = 1;
        for (Token t : tokens) {
            String colour = switch (t.type) {
                case IDENT                                     -> CYAN;
                case INT_LIT, FLOAT_LIT, BOOL_LIT, STRING_LIT -> YELLOW;
                case FOR, IN, PRINT                            -> BLUE;
                case INDENT, DEDENT, NEWLINE, EOF              -> DIM;
                default                                        -> RESET;
            };
            System.out.printf(colour + fmt + RESET, i++, t.type, "\"" + t.value + "\"", t.line);
        }
    }

    private static void displayFirstFollow(FirstFollowResult ff) {
        section("FIRST SETS");
        ff.first.forEach((nt, set) ->
            System.out.printf("  FIRST(%-20s) = { %s }%n", nt, String.join(", ", set)));
        section("FOLLOW SETS");
        ff.follow.forEach((nt, set) ->
            System.out.printf("  FOLLOW(%-20s) = { %s }%n", nt, String.join(", ", set)));
    }

    private static void displayParsingTable(ParsingTable table) {
        section("LL(1) PARSING TABLE");
        if (table.hasConflicts()) {
            System.out.println(RED + "  CONFLICTS DETECTED:" + RESET);
            table.conflicts.forEach(c -> System.out.println("  " + RED + c + RESET));
        }
        table.table.forEach((nt, row) -> {
            if (row.isEmpty()) return;
            System.out.println("  " + CYAN + nt + RESET);
            row.forEach((terminal, prod) ->
                System.out.printf("      [%-20s] → %s%n", terminal, prod));
        });
    }

    private static void displaySymbolTable(List<SymbolEntry> entries) {
        section("SYMBOL TABLE");
        String fmt = "%-20s %-10s %-8s %s%n";
        System.out.printf(BOLD + fmt + RESET, "NAME", "TYPE", "SCOPE", "DECL LINE");
        separator(50);
        for (SymbolEntry e : entries)
            System.out.printf(GREEN + fmt + RESET, e.name, e.type, e.scopeLevel, e.declarationLine);
    }

    private static void displayAST(ASTNode node) {
        section("ABSTRACT SYNTAX TREE");
        printASTNode(node, "", true);
    }

    private static void printASTNode(ASTNode node, String prefix, boolean isLast) {
        String connector   = isLast ? "└── " : "├── ";
        String childPrefix = prefix + (isLast ? "    " : "│   ");

        if (node instanceof ProgramNode prog) {
            System.out.println(prefix + connector + BOLD + "Program" + RESET);
            for (int i = 0; i < prog.statements.size(); i++)
                printASTNode(prog.statements.get(i), childPrefix, i == prog.statements.size() - 1);
        } else if (node instanceof AssignStmtNode a) {
            System.out.println(prefix + connector + CYAN + "Assign" + RESET
                + "  " + DIM + a.ident + " " + a.op + RESET + "  [line " + a.line + "]");
            printASTNode(a.expr, childPrefix, true);
        } else if (node instanceof PrintStmtNode p) {
            System.out.println(prefix + connector + CYAN + "Print" + RESET + "  [line " + p.line + "]");
            for (int i = 0; i < p.args.size(); i++)
                printASTNode(p.args.get(i), childPrefix, i == p.args.size() - 1);
        } else if (node instanceof ForStmtNode f) {
            System.out.println(prefix + connector + BLUE + "For" + RESET
                + "  " + DIM + f.loopVar + " in ..." + RESET + "  [line " + f.line + "]");
            printASTNode(f.iterable, childPrefix, false);
            for (int i = 0; i < f.body.size(); i++)
                printASTNode(f.body.get(i), childPrefix, i == f.body.size() - 1);
        } else if (node instanceof BinOpNode b) {
            System.out.println(prefix + connector + YELLOW + "BinOp(" + b.op + ")" + RESET
                + "  [line " + b.line + "]");
            printASTNode(b.left,  childPrefix, false);
            printASTNode(b.right, childPrefix, true);
        } else if (node instanceof IdentNode i) {
            System.out.println(prefix + connector + GREEN + "Ident: " + i.name + RESET);
        } else if (node instanceof LiteralNode l) {
            System.out.println(prefix + connector + YELLOW
                + "Literal(" + l.varType + "): " + l.rawValue + RESET);
        } else if (node instanceof ListLitNode lst) {
            System.out.println(prefix + connector + YELLOW + "ListLit" + RESET);
            for (int i = 0; i < lst.elements.size(); i++)
                printASTNode(lst.elements.get(i), childPrefix, i == lst.elements.size() - 1);
        } else {
            System.out.println(prefix + connector + node.nodeType);
        }
    }

    private static void displayCFG(CFGGraph cfg) {
        section("CONTROL FLOW GRAPH");
        System.out.println("  Nodes:");
        for (CFGNode n : cfg.nodes) {
            String stmts = n.statements.isEmpty() ? "" : " — " + String.join(" | ", n.statements);
            System.out.printf("    [%2d] %-16s%s%n", n.id, n.kind, stmts);
        }
        System.out.println("\n  Edges:");
        for (CFGEdge e : cfg.edges) {
            String label = e.label.isEmpty() ? "" : " (" + e.label + ")";
            System.out.printf("    %2d  →  %2d%s%n", e.from, e.to, label);
        }
    }

    private static void displayErrors(CompilerResult result) {
        if (!result.hasAnyErrors()) {
            System.out.println("\n" + GREEN + "  ✓ No errors." + RESET);
            return;
        }
        section("ERRORS");
        result.lexerErrors.forEach(e ->
            System.out.printf(RED + "  [LEXER   line %3d] %s%n" + RESET, e.line, e.message));
        result.parserErrors.forEach(e ->
            System.out.printf(RED + "  [%-7s line %3d] %s%n" + RESET,
                e.phase.toUpperCase(), e.line, e.message));
    }

    private static void header(String title) {
        System.out.println("\n" + BOLD + "═".repeat(60));
        System.out.printf("  %s%n", title);
        System.out.println("═".repeat(60) + RESET + "\n");
    }

    private static void section(String title) {
        System.out.println("\n" + BOLD + CYAN + "── " + title + " "
            + "─".repeat(Math.max(0, 55 - title.length())) + RESET);
    }

    private static void separator(int width) {
        System.out.println(DIM + "─".repeat(width) + RESET);
    }
}