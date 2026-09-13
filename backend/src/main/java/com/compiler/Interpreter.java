package com.compiler;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.compiler.AST.*;
import com.compiler.Parser.ParserError;

public class Interpreter {
    private final List<String> output = new ArrayList<>();
    private final List<ParserError> semanticErrors = new ArrayList<>();
    private final Map<String, Object> environment = new HashMap<>();

    public static class ReturnException extends RuntimeException {
        public final Object value;
        public ReturnException(Object value) { this.value = value; }
    }

    public Interpreter() {
        environment.put("str", new BuiltinFunction("str"));
        environment.put("int", new BuiltinFunction("int"));
    }

    private static class BuiltinFunction {
        public final String name;
        public BuiltinFunction(String name) { this.name = name; }
    }

    public void execute(ProgramNode program) {
        if (program == null) return;
        for (StmtNode stmt : program.statements) {
            try {
                executeStmt(stmt);
            } catch (ReturnException e) {
                break;
            } catch (RuntimeException e) {
                break;
            }
        }
    }

    public List<String> getOutput() {
        return output;
    }

    public List<ParserError> getSemanticErrors() {
        return semanticErrors;
    }

    private void reportError(String msg, int line) {
        semanticErrors.add(new ParserError(msg, line, "semantic"));
        throw new RuntimeException(msg); // Abort current execution path
    }

    private void executeStmt(StmtNode stmt) {
        if (stmt instanceof AssignStmtNode a) {
            Object val = evaluate(a.expr);
            if (a.op == AST.AssignOp.ASSIGN) {
                environment.put(a.ident, val);
            } else {
                if (!environment.containsKey(a.ident)) {
                    reportError("Variable '" + a.ident + "' is not defined", a.line);
                }
                Object current = environment.get(a.ident);
                if (current instanceof Double d1 && val instanceof Double d2) {
                    if (a.op == AST.AssignOp.PLUS_ASSIGN) environment.put(a.ident, d1 + d2);
                    else if (a.op == AST.AssignOp.MINUS_ASSIGN) environment.put(a.ident, d1 - d2);
                } else if (a.op == AST.AssignOp.PLUS_ASSIGN) {
                    environment.put(a.ident, current.toString() + val.toString());
                } else {
                    reportError("Unsupported operand types for " + a.op, a.line);
                }
            }
        } else if (stmt instanceof FunctionDefNode f) {
            environment.put(f.name, f);
        } else if (stmt instanceof ReturnStmtNode r) {
            Object val = r.value != null ? evaluate(r.value) : null;
            throw new ReturnException(val);
        } else if (stmt instanceof ImportStmtNode) {
            // import statements are parsed but not executed (no stdlib support)

        } else if (stmt instanceof PrintStmtNode p) {
            List<String> parts = new ArrayList<>();
            for (ExprNode arg : p.args) {
                Object val = evaluate(arg);
                parts.add(formatValue(val));
            }
            output.add(String.join(" ", parts));
        } else if (stmt instanceof IfStmtNode i) {
            if (isTruthy(evaluate(i.condition))) {
                for (StmtNode s : i.body) executeStmt(s);
            } else {
                boolean matched = false;
                for (ElifStmtNode elif : i.elifs) {
                    if (isTruthy(evaluate(elif.condition))) {
                        for (StmtNode s : elif.body) executeStmt(s);
                        matched = true;
                        break;
                    }
                }
                if (!matched && i.elseStmt != null) {
                    for (StmtNode s : i.elseStmt.body) executeStmt(s);
                }
            }
        } else if (stmt instanceof WhileStmtNode w) {
            int maxIters = 10000;
            int iters = 0;
            while (isTruthy(evaluate(w.condition))) {
                if (++iters > maxIters) {
                    reportError("Infinite loop detected", w.line);
                }
                for (StmtNode s : w.body) executeStmt(s);
            }
        } else if (stmt instanceof ForStmtNode f) {
            Object iter = evaluate(f.iterable);
            if (iter instanceof List<?> list) {
                for (Object item : list) {
                    environment.put(f.loopVar, item);
                    for (StmtNode s : f.body) executeStmt(s);
                }
            } else {
                reportError("Object is not iterable", f.line);
            }
        } else if (stmt instanceof ExprStmtNode e) {
            evaluate(e.expr);
        }
    }

    private Object evaluate(ExprNode expr) {
        if (expr instanceof LiteralNode lit) {
            switch (lit.varType) {
                case INT: return Double.valueOf(lit.rawValue);
                case FLOAT: return Double.valueOf(lit.rawValue);
                case STR: return lit.rawValue.substring(1, lit.rawValue.length() - 1);
                case BOOL: return Boolean.valueOf(lit.rawValue);
                default: return lit.rawValue;
            }
        } else if (expr instanceof IdentNode id) {
            if (!environment.containsKey(id.name)) {
                reportError("Variable '" + id.name + "' is not defined", id.line);
            }
            return environment.get(id.name);
        } else if (expr instanceof BinOpNode b) {
            Object left = evaluate(b.left);
            Object right = evaluate(b.right);
            
            if (left instanceof Double d1 && right instanceof Double d2) {
                switch (b.op) {
                    case "+": return d1 + d2;
                    case "-": return d1 - d2;
                    case "*": return d1 * d2;
                    case "/": return d2 == 0 ? reportDivByZero(b.line) : d1 / d2;
                    case "%": return d2 == 0 ? reportDivByZero(b.line) : d1 % d2;
                    case "==": return d1.equals(d2);
                    case "!=": return !d1.equals(d2);
                    case "<": return d1 < d2;
                    case "<=": return d1 <= d2;
                    case ">": return d1 > d2;
                    case ">=": return d1 >= d2;
                }
            } else if (left instanceof String s1 && right instanceof String s2) {
                switch (b.op) {
                    case "+": return s1 + s2;
                    case "==": return s1.equals(s2);
                    case "!=": return !s1.equals(s2);
                }
            } else if (b.op.equals("+")) {
                String s1 = left instanceof String ? (String)left : formatValue(left);
                String s2 = right instanceof String ? (String)right : formatValue(right);
                return s1 + s2;
            }
            
            reportError("Unsupported operand types for operator " + b.op, b.line);
            return null;
        } else if (expr instanceof CallExprNode c) {
            Object func = environment.get(c.functionName);
            if (func == null) {
                reportError("Function '" + c.functionName + "' is not defined", c.line);
            }
            
            List<Object> args = new ArrayList<>();
            for (ExprNode arg : c.args) {
                args.add(evaluate(arg));
            }
            
            if (func instanceof BuiltinFunction b) {
                if (b.name.equals("str")) {
                    return args.isEmpty() ? "" : formatValue(args.get(0));
                } else if (b.name.equals("int")) {
                    if (args.isEmpty()) return 0.0;
                    try {
                        return Double.parseDouble(args.get(0).toString());
                    } catch (NumberFormatException e) {
                        reportError("Invalid literal for int()", c.line);
                    }
                }
                return null;
            }
            
            if (func instanceof FunctionDefNode f) {
                if (args.size() != f.params.size()) {
                    reportError("Function '" + f.name + "' expects " + f.params.size() + " arguments", c.line);
                }
                Map<String, Object> oldEnv = new HashMap<>(environment);
                for (int i = 0; i < args.size(); i++) {
                    environment.put(f.params.get(i), args.get(i));
                }
                Object ret = null;
                try {
                    for (StmtNode s : f.body) {
                        executeStmt(s);
                    }
                } catch (ReturnException e) {
                    ret = e.value;
                } catch (RuntimeException e) {
                    // Propagate other errors
                    environment.putAll(oldEnv);
                    throw e;
                }
                
                // Restore environment (simple dynamic scoping for simplicity)
                environment.putAll(oldEnv);
                return ret;
            }
            
            reportError("'" + c.functionName + "' is not callable", c.line);
            return null;
        } else if (expr instanceof RangeExprNode r) {
            double start = 0;
            double stop = 0;
            double step = 1;
            
            if (r.args.size() == 1) {
                stop = asDouble(evaluate(r.args.get(0)), r.line);
            } else if (r.args.size() >= 2) {
                start = asDouble(evaluate(r.args.get(0)), r.line);
                stop = asDouble(evaluate(r.args.get(1)), r.line);
                if (r.args.size() == 3) {
                    step = asDouble(evaluate(r.args.get(2)), r.line);
                }
            }
            
            List<Double> list = new ArrayList<>();
            if (step > 0) {
                for (double i = start; i < stop; i += step) list.add(i);
            } else if (step < 0) {
                for (double i = start; i > stop; i += step) list.add(i);
            }
            return list;
        } else if (expr instanceof ListLitNode l) {
            List<Object> list = new ArrayList<>();
            for (ExprNode e : l.elements) list.add(evaluate(e));
            return list;
        } else if (expr instanceof IndexNode i) {
            Object base = evaluate(i.base);
            Object idx = evaluate(i.index);
            if (base instanceof List<?> list && idx instanceof Double d) {
                int index = d.intValue();
                if (index < 0 || index >= list.size()) {
                    reportError("List index out of range", i.line);
                }
                return list.get(index);
            }
            reportError("Type is not subscriptable", i.line);
            return null;
        }
        return null;
    }

    private double asDouble(Object obj, int line) {
        if (obj instanceof Double d) return d;
        reportError("Expected number", line);
        return 0;
    }

    private Object reportDivByZero(int line) {
        reportError("Division by zero", line);
        return 0;
    }

    private boolean isTruthy(Object val) {
        if (val instanceof Boolean b) return b;
        if (val instanceof Double d) return d != 0.0;
        if (val instanceof String s) return !s.isEmpty();
        if (val instanceof List<?> l) return !l.isEmpty();
        return val != null;
    }

    private String formatValue(Object val) {
        if (val instanceof Double d) {
            if (d == d.intValue()) return String.valueOf(d.intValue());
            return String.valueOf(d);
        }
        if (val instanceof List<?> list) {
            List<String> items = new ArrayList<>();
            for (Object item : list) items.add(formatValue(item));
            return "[" + String.join(", ", items) + "]";
        }
        return String.valueOf(val);
    }
}
