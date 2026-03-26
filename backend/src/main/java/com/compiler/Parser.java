package com.compiler;

import com.compiler.AST.*;
import com.compiler.Lexer.*;
import com.compiler.SymbolTable.VarType;

import java.util.*;

public class Parser {

    public static class Production {
        public final int          index;
        public final String       lhs;
        public final List<String> rhs;

        public Production(int index, String lhs, List<String> rhs) {
            this.index = index; this.lhs = lhs; this.rhs = List.copyOf(rhs);
        }

        public boolean isEpsilon() { return rhs.size() == 1 && rhs.get(0).equals(Grammar.EPSILON); }

        @Override public String toString() {
            return String.format("P%d: %s → %s", index, lhs, String.join(" ", rhs));
        }
    }

    public static class Grammar {
        public static final String EPSILON = "ε";
        public static final String EOF     = "$";
        public static final String START   = "program";

        public static final List<String> NON_TERMINALS = List.of(
            "program","stmt_list","stmt",
            "assign_stmt","assign_op",
            "print_stmt","for_stmt",
            "expr_list","expr_list_tail",
            "expr","expr_prime",
            "term","term_prime",
            "factor","factor_tail","literal","list_lit","list_contents"
        );

        public static final List<Production> ALL = List.of(
            new Production(0,  "program",        List.of("stmt_list")),
            new Production(1,  "stmt_list",      List.of("stmt","stmt_list")),
            new Production(2,  "stmt_list",      List.of(EPSILON)),
            new Production(3,  "stmt",           List.of("assign_stmt")),
            new Production(4,  "stmt",           List.of("print_stmt")),
            new Production(5,  "stmt",           List.of("for_stmt")),
            new Production(6,  "assign_stmt",    List.of("IDENT","assign_op","expr","NEWLINE")),
            new Production(7,  "assign_op",      List.of("ASSIGN")),
            new Production(8,  "assign_op",      List.of("PLUS_ASSIGN")),
            new Production(9,  "assign_op",      List.of("MINUS_ASSIGN")),
            new Production(10, "print_stmt",     List.of("PRINT","LPAREN","expr_list","RPAREN","NEWLINE")),
            new Production(11, "for_stmt",       List.of("FOR","IDENT","IN","expr","COLON","NEWLINE","INDENT","stmt_list","DEDENT")),
            new Production(12, "expr_list",      List.of("expr","expr_list_tail")),
            new Production(13, "expr_list_tail", List.of("COMMA","expr","expr_list_tail")),
            new Production(14, "expr_list_tail", List.of(EPSILON)),
            new Production(15, "expr",           List.of("term","expr_prime")),
            new Production(16, "expr_prime",     List.of("PLUS","term","expr_prime")),
            new Production(17, "expr_prime",     List.of("MINUS","term","expr_prime")),
            new Production(18, "expr_prime",     List.of(EPSILON)),
            new Production(19, "term",           List.of("factor","term_prime")),
            new Production(20, "term_prime",     List.of("STAR","factor","term_prime")),
            new Production(21, "term_prime",     List.of("SLASH","factor","term_prime")),
            new Production(22, "term_prime",     List.of(EPSILON)),
            new Production(23, "factor",         List.of("LPAREN","expr","RPAREN")),
            new Production(24, "factor", List.of("IDENT","factor_tail")),
            new Production(25, "factor_tail", List.of("LBRACKET","expr","RBRACKET")),
            new Production(26, "factor_tail", List.of(Grammar.EPSILON)),
            new Production(27, "factor",         List.of("literal")),
            new Production(28, "literal",        List.of("INT_LIT")),
            new Production(29, "literal",        List.of("FLOAT_LIT")),
            new Production(30, "literal",        List.of("STRING_LIT")),
            new Production(31, "literal",        List.of("BOOL_LIT")),
            new Production(32, "literal",        List.of("list_lit")),
            new Production(33, "list_lit", List.of("LBRACKET","list_contents")),
            new Production(34, "list_contents", List.of("expr_list","RBRACKET")),
            new Production(35, "list_contents", List.of("RBRACKET"))
        );

        public static boolean isNonTerminal(String s) { return NON_TERMINALS.contains(s); }
    }

    public static class FirstFollowResult {
        public final Map<String, Set<String>> first;
        public final Map<String, Set<String>> follow;
        public FirstFollowResult(Map<String, Set<String>> first, Map<String, Set<String>> follow) {
            this.first = first; this.follow = follow;
        }
    }

    public static class FirstFollowComputer {

        public static FirstFollowResult compute() {
            var first  = initMap();
            var follow = initMap();
            follow.get(Grammar.START).add(Grammar.EOF);
            computeFirst(first);
            computeFollow(first, follow);
            return new FirstFollowResult(immutable(first), immutable(follow));
        }

        private static Map<String, Set<String>> initMap() {
            Map<String, Set<String>> m = new LinkedHashMap<>();
            for (String nt : Grammar.NON_TERMINALS) m.put(nt, new LinkedHashSet<>());
            return m;
        }

        private static void computeFirst(Map<String, Set<String>> first) {
            boolean changed = true;
            while (changed) {
                changed = false;
                for (var p : Grammar.ALL)
                    if (first.get(p.lhs).addAll(firstOfSeq(p.rhs, first))) changed = true;
            }
        }

        static Set<String> firstOfSeq(List<String> syms, Map<String, Set<String>> first) {
            Set<String> out = new LinkedHashSet<>();
            boolean allNullable = true;
            for (String s : syms) {
                if (s.equals(Grammar.EPSILON)) { out.add(Grammar.EPSILON); break; }
                Set<String> sf = Grammar.isNonTerminal(s) ? first.getOrDefault(s, Set.of()) : Set.of(s);
                out.addAll(sf);
                out.remove(Grammar.EPSILON);
                if (!sf.contains(Grammar.EPSILON)) { allNullable = false; break; }
            }
            if (allNullable && !syms.isEmpty()) out.add(Grammar.EPSILON);
            return out;
        }

        private static void computeFollow(Map<String, Set<String>> first,
                                           Map<String, Set<String>> follow) {
            boolean changed = true;
            while (changed) {
                changed = false;
                for (var p : Grammar.ALL) {
                    for (int i = 0; i < p.rhs.size(); i++) {
                        String B = p.rhs.get(i);
                        if (!Grammar.isNonTerminal(B)) continue;
                        var beta     = p.rhs.subList(i + 1, p.rhs.size());
                        var firstB   = firstOfSeq(beta, first);
                        var followB  = follow.get(B);
                        for (String t : firstB) if (!t.equals(Grammar.EPSILON) && followB.add(t)) changed = true;
                        if (firstB.contains(Grammar.EPSILON))
                            if (followB.addAll(follow.get(p.lhs))) changed = true;
                    }
                }
            }
        }

        private static Map<String, Set<String>> immutable(Map<String, Set<String>> m) {
            var out = new LinkedHashMap<String, Set<String>>();
            m.forEach((k, v) -> out.put(k, Collections.unmodifiableSet(v)));
            return Collections.unmodifiableMap(out);
        }
    }

    public static class ParsingTable {
        public final Map<String, Map<String, Production>> table;
        public final List<String> conflicts;

        public ParsingTable(FirstFollowResult ff) {
            var t    = new LinkedHashMap<String, Map<String, Production>>();
            var conf = new ArrayList<String>();
            for (String nt : Grammar.NON_TERMINALS) t.put(nt, new LinkedHashMap<>());

            for (var p : Grammar.ALL) {
                var mutableFirst = mutableCopy(ff.first);
                var firstAlpha   = FirstFollowComputer.firstOfSeq(p.rhs, mutableFirst);

                for (String term : firstAlpha) {
                    if (term.equals(Grammar.EPSILON)) continue;
                    put(t, conf, p.lhs, term, p);
                }
                if (firstAlpha.contains(Grammar.EPSILON))
                    for (String b : ff.follow.get(p.lhs))
                        put(t, conf, p.lhs, b, p);
            }
            this.table     = Collections.unmodifiableMap(t);
            this.conflicts = List.copyOf(conf);
        }

        public Production lookup(String nt, String term) {
            var row = table.get(nt);
            return row == null ? null : row.get(term);
        }

        public boolean hasConflicts() { return !conflicts.isEmpty(); }

        private static void put(Map<String, Map<String, Production>> t, List<String> conf,
                                  String nt, String term, Production p) {
            var row = t.get(nt);
            if (row.containsKey(term)) conf.add("CONFLICT M[" + nt + "][" + term + "]: " + row.get(term) + " vs " + p);
            else row.put(term, p);
        }

        private static Map<String, Set<String>> mutableCopy(Map<String, Set<String>> src) {
            var out = new LinkedHashMap<String, Set<String>>();
            src.forEach((k, v) -> out.put(k, new LinkedHashSet<>(v)));
            return out;
        }
    }

    public static class ParserError {
        public final String message;
        public final int    line;
        public final String phase;   // "syntax" | "semantic"
        public ParserError(String message, int line, String phase) {
            this.message = message; this.line = line; this.phase = phase;
        }
    }

    public static class ParserResult {
        public final ProgramNode                    ast;
        public final List<SymbolTable.SymbolEntry>  symbolTable;
        public final List<ParserError>              errors;
        public ParserResult(ProgramNode ast, List<SymbolTable.SymbolEntry> st, List<ParserError> err) {
            this.ast = ast; this.symbolTable = st; this.errors = err;
        }
        public boolean hasErrors() { return !errors.isEmpty(); }
    }
    
    private final List<Token>       tokens;
    private       int               pos = 0;
    private final SymbolTable       sym  = new SymbolTable();
    private final List<ParserError> errs = new ArrayList<>();

    public Parser(List<Token> tokens) {
        this.tokens = tokens.stream().filter(t -> t.type != TokenType.UNKNOWN).toList();
    }

    public ParserResult parse() {
        ProgramNode root = parseProgram();
        return new ParserResult(root, sym.snapshot(), errs);
    }

    private Token peek()          { return tokens.get(Math.min(pos, tokens.size() - 1)); }
    private Token consume()       { Token t = peek(); if (pos < tokens.size() - 1) pos++; return t; }
    private boolean at(TokenType t) { return peek().type == t; }

    private Token expect(TokenType exp) {
        Token t = peek();
        if (t.type == exp) return consume();
        errs.add(new ParserError("Expected " + exp + " but got " + t.type + " (\"" + t.value + "\")", t.line, "syntax"));
        return t;
    }

    private void skipLine() {
        while (peek().type != TokenType.NEWLINE && peek().type != TokenType.EOF) consume();
        if (at(TokenType.NEWLINE)) consume();
    }
    
    private ProgramNode parseProgram() {
        List<StmtNode> stmts = parseStmtList();
        expect(TokenType.EOF);
        return new ProgramNode(stmts);
    }

    private List<StmtNode> parseStmtList() {
        List<StmtNode> list = new ArrayList<>();
        while (isStmtStart()) { StmtNode s = parseStmt(); if (s != null) list.add(s); }
        return list;
    }

    private boolean isStmtStart() {
        return switch (peek().type) { case IDENT, PRINT, FOR -> true; default -> false; };
    }

    private StmtNode parseStmt() {
        return switch (peek().type) {
            case IDENT -> parseAssign();
            case PRINT -> parsePrint();
            case FOR   -> parseFor();
            default    -> { errs.add(new ParserError("Unexpected " + peek().type, peek().line, "syntax")); skipLine(); yield null; }
        };
    }

    private AssignStmtNode parseAssign() {
        Token id = expect(TokenType.IDENT);
        AST.AssignOp op;
        switch (peek().type) {
            case ASSIGN       -> { consume(); op = AST.AssignOp.ASSIGN;       }
            case PLUS_ASSIGN  -> { consume(); op = AST.AssignOp.PLUS_ASSIGN;  }
            case MINUS_ASSIGN -> { consume(); op = AST.AssignOp.MINUS_ASSIGN; }
            default           -> { errs.add(new ParserError("Expected assignment op after '" + id.value + "'", peek().line, "syntax")); skipLine(); return null; }
        }
        ExprNode expr = parseExpr();
        expect(TokenType.NEWLINE);

        VarType type = inferType(expr);
        if (op != AST.AssignOp.ASSIGN && !sym.isDeclared(id.value))
            errs.add(new ParserError("Variable '" + id.value + "' used before assignment", id.line, "semantic"));
        sym.declare(id.value, type, id.line);
        return new AssignStmtNode(id.value, op, expr, id.line);
    }

    private PrintStmtNode parsePrint() {
        Token t = expect(TokenType.PRINT);
        expect(TokenType.LPAREN);
        List<ExprNode> args = parseExprList();
        expect(TokenType.RPAREN);
        expect(TokenType.NEWLINE);
        return new PrintStmtNode(args, t.line);
    }

    private ForStmtNode parseFor() {
        Token ft  = expect(TokenType.FOR);
        Token lv  = expect(TokenType.IDENT);
        expect(TokenType.IN);
        ExprNode iter = parseExpr();
        expect(TokenType.COLON);
        expect(TokenType.NEWLINE);
        expect(TokenType.INDENT);
        sym.enterScope();
        sym.declare(lv.value, VarType.UNKNOWN, lv.line);
        List<StmtNode> body = parseStmtList();
        expect(TokenType.DEDENT);
        sym.exitScope();
        return new ForStmtNode(lv.value, iter, body, ft.line);
    }

    private List<ExprNode> parseExprList() {
        List<ExprNode> list = new ArrayList<>();
        list.add(parseExpr());
        while (at(TokenType.COMMA)) { consume(); list.add(parseExpr()); }
        return list;
    }

    private ExprNode parseExpr() {
        ExprNode left = parseTerm();
        while (peek().type == TokenType.PLUS || peek().type == TokenType.MINUS) {
            Token op = consume();
            left = new BinOpNode(op.value, left, parseTerm(), op.line);
        }
        return left;
    }

    private ExprNode parseTerm() {
        ExprNode left = parseFactor();
        while (peek().type == TokenType.STAR || peek().type == TokenType.SLASH) {
            Token op = consume();
            left = new BinOpNode(op.value, left, parseFactor(), op.line);
        }
        return left;
    }

    private ExprNode parseFactor() {
        Token t = peek();
        return switch (t.type) {
            case LPAREN -> { consume(); ExprNode e = parseExpr(); expect(TokenType.RPAREN); yield e; }
            case IDENT -> {
                consume();

                if (!sym.isDeclared(t.value))
                    errs.add(new ParserError("Undeclared variable '" + t.value + "'", t.line, "semantic"));

                ExprNode base = new IdentNode(t.value, t.line);

                if (at(TokenType.LBRACKET)) {
                    consume();

                    ExprNode index = parseExpr();

                    expect(TokenType.RBRACKET);

                    base = new IndexNode(base, index, t.line);
                }

                yield base;
            }
            case INT_LIT, FLOAT_LIT, STRING_LIT, BOOL_LIT, LBRACKET -> parseLiteral();
            default -> { errs.add(new ParserError("Unexpected token in expr: " + t.type, t.line, "syntax")); consume(); yield new LiteralNode("?", VarType.UNKNOWN, t.line); }
        };
    }

    private ExprNode parseLiteral() {
        Token t = peek();
        return switch (t.type) {
            case INT_LIT, FLOAT_LIT, STRING_LIT, BOOL_LIT -> { consume(); yield new LiteralNode(t.value, VarType.from(t.type), t.line); }
            case LBRACKET -> { Token b = consume(); List<ExprNode> els = at(TokenType.RBRACKET) ? new ArrayList<>() : parseExprList(); expect(TokenType.RBRACKET); yield new ListLitNode(els, b.line); }
            default -> { errs.add(new ParserError("Expected literal", t.line, "syntax")); yield new LiteralNode("?", VarType.UNKNOWN, t.line); }
        };
    }

    private VarType inferType(ExprNode e) {
        if (e instanceof LiteralNode l)  return l.varType;
        if (e instanceof ListLitNode)    return VarType.LIST;
        if (e instanceof IdentNode id)   { var en = sym.lookup(id.name); return en != null ? en.type : VarType.UNKNOWN; }
        if (e instanceof BinOpNode b) {
            VarType l = inferType(b.left), r = inferType(b.right);
            if (l == VarType.FLOAT || r == VarType.FLOAT) return VarType.FLOAT;
            if (l == VarType.INT   && r == VarType.INT)   return VarType.INT;
            if (l == VarType.STR   && r == VarType.STR && b.op.equals("+")) return VarType.STR;
        }
        return VarType.UNKNOWN;
    }
}