package com.compiler;

import java.util.ArrayList;
import java.util.List;

// import com.compiler.AST.*;
import com.compiler.AST.AssignStmtNode;
import com.compiler.AST.BinOpNode;
import com.compiler.AST.ForStmtNode;
import com.compiler.AST.IdentNode;
import com.compiler.AST.ListLitNode;
import com.compiler.AST.LiteralNode;
import com.compiler.AST.PrintStmtNode;
import com.compiler.AST.ProgramNode;
// import com.compiler.CFG.*;
import com.compiler.CFG.CFGEdge;
import com.compiler.CFG.CFGGraph;
import com.compiler.CFG.CFGNode;
// import com.compiler.Lexer.*;
import com.compiler.Lexer.LexerError;
import com.compiler.Lexer.Token;
// import com.compiler.Parser.*;
import com.compiler.Parser.FirstFollowComputer;
import com.compiler.Parser.FirstFollowResult;
import com.compiler.Parser.ParserError;
import com.compiler.Parser.ParsingTable;
import com.compiler.SymbolTable.SymbolEntry;

/**
 * Main.java — entry point + pipeline orchestration + CLI display.
 *
 * Contains:
 *   CompilerResult — unified output object (becomes JSON for Spring Boot later)
 *   Pipeline       — runs all phases in order, returns a CompilerResult
 *   Display        — the ONLY place System.out is called; reads from CompilerResult
 *
 * To run:  mvn compile exec:java -Dexec.mainClass=com.compiler.Main
 * Change the 'source' variable in main() to try different sample programs.
 */
public class Main {

    // ══════════════════════════════════════════════════════════════════════
    //  CompilerResult  —  unified output, one object for all phases
    // ══════════════════════════════════════════════════════════════════════
    public static class CompilerResult {
        public List<Token>          tokens;
        public List<SymbolEntry>    symbolTable;
        public ProgramNode          ast;
        public CFGGraph             cfg;
        public FirstFollowResult    firstFollow;
        public ParsingTable         parsingTable;
        public List<LexerError>     lexerErrors  = new ArrayList<>();
        public List<ParserError>    parserErrors = new ArrayList<>();

        public boolean hasErrors()  { return !lexerErrors.isEmpty() || !parserErrors.isEmpty(); }
        public boolean isComplete() { return cfg != null; }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Pipeline  —  runs Lexer → FirstFollow → ParsingTable → Parser → CFG
    // ══════════════════════════════════════════════════════════════════════
    public static class Pipeline {

        // Grammar-level data computed once at class load, reused for every compile()
        private static final FirstFollowResult FF_RESULT;
        private static final ParsingTable      PARSE_TABLE;
        static {
            FF_RESULT   = FirstFollowComputer.compute();
            PARSE_TABLE = new ParsingTable(FF_RESULT);
        }

        public static CompilerResult compile(String source) {
            CompilerResult out = new CompilerResult();

            // Phase 1: Lexer
            Lexer.Result lr   = new Lexer(source).tokenize();
            out.tokens        = lr.tokens;
            out.lexerErrors   = lr.errors;

            // Grammar tables (always attached — useful for display/API)
            out.firstFollow   = FF_RESULT;
            out.parsingTable  = PARSE_TABLE;

            // Phase 2: Parser (runs even if lexer had errors — partial recovery)
            Parser.ParserResult pr = new Parser(lr.tokens).parse();
            out.ast           = pr.ast;
            out.symbolTable   = pr.symbolTable;
            out.parserErrors  = pr.errors;

            // Phase 3: CFG (only if AST was produced)
            if (pr.ast != null) out.cfg = CFG.Builder.build(pr.ast);

            return out;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Display  —  the ONLY class that calls System.out.println
    // ══════════════════════════════════════════════════════════════════════
    private static class Display {
        private static final String R = "\u001B[0m", BOLD = "\u001B[1m";
        private static final String CY = "\u001B[36m", YL = "\u001B[33m";
        private static final String GN = "\u001B[32m", RD = "\u001B[31m";
        private static final String BL = "\u001B[34m", DM = "\u001B[2m";

        static void show(CompilerResult r) {
            header("COMPILER OUTPUT");
            if (r.tokens      != null) tokens(r.tokens);
            if (r.firstFollow != null) firstFollow(r.firstFollow);
            if (r.parsingTable!= null) parsingTable(r.parsingTable);
            if (r.symbolTable != null) symbolTable(r.symbolTable);
            if (r.ast         != null) ast(r.ast);
            if (r.cfg         != null) cfg(r.cfg);
            errors(r);
        }

        static void tokens(List<Token> tokens) {
            section("TOKENS");
            String f = "%-5s %-20s %-22s %s%n";
            System.out.printf(BOLD + f + R, "#", "TYPE", "VALUE", "LINE");
            sep(55);
            int i = 1;
            for (Token t : tokens) {
                String c = switch (t.type) {
                    case IDENT                                     -> CY;
                    case INT_LIT, FLOAT_LIT, BOOL_LIT, STRING_LIT -> YL;
                    case FOR, IN, PRINT                            -> BL;
                    case INDENT, DEDENT, NEWLINE, EOF              -> DM;
                    default                                        -> R;
                };
                System.out.printf(c + f + R, i++, t.type, "\"" + t.value + "\"", t.line);
            }
        }

        static void firstFollow(FirstFollowResult ff) {
            section("FIRST SETS");
            ff.first.forEach((nt, s) -> System.out.printf("  FIRST(%-20s) = { %s }%n", nt, String.join(", ", s)));
            section("FOLLOW SETS");
            ff.follow.forEach((nt, s) -> System.out.printf("  FOLLOW(%-20s) = { %s }%n", nt, String.join(", ", s)));
        }

        static void parsingTable(ParsingTable pt) {
            section("LL(1) PARSING TABLE");
            if (pt.hasConflicts()) {
                System.out.println(RD + "  CONFLICTS:" + R);
                pt.conflicts.forEach(c -> System.out.println("  " + RD + c + R));
            }
            pt.table.forEach((nt, row) -> {
                if (row.isEmpty()) return;
                System.out.println("  " + CY + nt + R);
                row.forEach((term, p) -> System.out.printf("    [%-20s] → %s%n", term, p));
            });
        }

        static void symbolTable(List<SymbolEntry> entries) {
            section("SYMBOL TABLE");
            String f = "%-20s %-10s %-8s %s%n";
            System.out.printf(BOLD + f + R, "NAME", "TYPE", "SCOPE", "LINE");
            sep(50);
            for (SymbolEntry e : entries)
                System.out.printf(GN + f + R, e.name, e.type, e.scopeLevel, e.declarationLine);
        }

        static void ast(AST.Node node) {
            section("ABSTRACT SYNTAX TREE");
            astNode(node, "", true);
        }

        static void astNode(AST.Node node, String pre, boolean last) {
            String conn  = last ? "└── " : "├── ";
            String child = pre + (last ? "    " : "│   ");

            if (node instanceof ProgramNode p) {
                System.out.println(pre + conn + BOLD + "Program" + R);
                for (int i = 0; i < p.statements.size(); i++)
                    astNode(p.statements.get(i), child, i == p.statements.size() - 1);
            } else if (node instanceof AssignStmtNode a) {
                System.out.println(pre + conn + CY + "Assign" + R + "  " + DM + a.ident + " " + a.op + R + " [line " + a.line + "]");
                astNode(a.expr, child, true);
            } else if (node instanceof PrintStmtNode p) {
                System.out.println(pre + conn + CY + "Print" + R + " [line " + p.line + "]");
                for (int i = 0; i < p.args.size(); i++) astNode(p.args.get(i), child, i == p.args.size() - 1);
            } else if (node instanceof ForStmtNode f) {
                System.out.println(pre + conn + BL + "For" + R + "  " + DM + f.loopVar + " in ..." + R + " [line " + f.line + "]");
                astNode(f.iterable, child, false);
                for (int i = 0; i < f.body.size(); i++) astNode(f.body.get(i), child, i == f.body.size() - 1);
            } else if (node instanceof BinOpNode b) {
                System.out.println(pre + conn + YL + "BinOp(" + b.op + ")" + R + " [line " + b.line + "]");
                astNode(b.left, child, false);
                astNode(b.right, child, true);
            } else if (node instanceof IdentNode i) {
                System.out.println(pre + conn + GN + "Ident: " + i.name + R);
            } else if (node instanceof LiteralNode l) {
                System.out.println(pre + conn + YL + "Literal(" + l.varType + "): " + l.rawValue + R);
            } else if (node instanceof ListLitNode l) {
                System.out.println(pre + conn + YL + "ListLit" + R);
                for (int i = 0; i < l.elements.size(); i++) astNode(l.elements.get(i), child, i == l.elements.size() - 1);
            } else {
                System.out.println(pre + conn + node.nodeType);
            }
        }

        static void cfg(CFGGraph g) {
            section("CONTROL FLOW GRAPH");
            System.out.println("  Nodes:");
            for (CFGNode n : g.nodes) {
                String stmts = n.statements.isEmpty() ? "" : "  —  " + String.join(" | ", n.statements);
                System.out.printf("    [%2d] %-16s%s%n", n.id, n.kind, stmts);
            }
            System.out.println("\n  Edges:");
            for (CFGEdge e : g.edges)
                System.out.printf("    %2d → %2d%s%n", e.from, e.to, e.label.isEmpty() ? "" : " (" + e.label + ")");
        }

        static void errors(CompilerResult r) {
            if (!r.hasErrors()) { System.out.println("\n" + GN + "  ✓ No errors." + R); return; }
            section("ERRORS");
            r.lexerErrors.forEach(e  -> System.out.printf(RD + "  [LEXER    line %3d] %s%n" + R, e.line, e.message));
            r.parserErrors.forEach(e -> System.out.printf(RD + "  [%-8s line %3d] %s%n" + R, e.phase.toUpperCase(), e.line, e.message));
        }

        static void header(String t) {
            System.out.println("\n" + BOLD + "═".repeat(62));
            System.out.printf("  %s%n", t);
            System.out.println("═".repeat(62) + R + "\n");
        }

        static void section(String t) {
            System.out.println("\n" + BOLD + CY + "── " + t + " " + "─".repeat(Math.max(0, 57 - t.length())) + R);
        }

        static void sep(int w) { System.out.println(DM + "─".repeat(w) + R); }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  main()  —  change source to any SAMPLE_* string to test
    // ══════════════════════════════════════════════════════════════════════
    public static void main(String[] args) {
        String source = SAMPLE_ALL_FEATURES;
        System.out.println("Source:\n" + "─".repeat(50) + "\n" + source + "─".repeat(50));
        Display.show(Pipeline.compile(source));
    }

    // ─── Sample programs ───────────────────────────────────────────────────
    static final String SAMPLE_BASIC = """
            x = 5
            y = 3.14
            z = x + 2
            print(z)
            """;

    static final String SAMPLE_FOR_LOOP = """
            items = [1, 2, 3]
            for i in items:
                print(i)
            """;

    static final String SAMPLE_AUGMENTED = """
            count = 0
            count += 1
            count -= 1
            print(count)
            """;

    static final String SAMPLE_ALL_FEATURES = """
            x = 42
            name = "hello"
            result = x + 10
            items = [1, 2, 3]
            total = 0
            for i in items:
                total += 1
                print(i)
            print(total)
            print(result)
            """;

    static final String SAMPLE_SEMANTIC_ERROR = """
            x = 5
            print(y)
            """;
}