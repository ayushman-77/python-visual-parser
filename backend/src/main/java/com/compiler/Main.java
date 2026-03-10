package com.compiler;

import com.compiler.display.CLIDisplay;
import com.compiler.result.CompilerResult;

public class Main {

    public static void main(String[] args) {
        String source = SAMPLE_ALL_FEATURES;

        System.out.println("Source code:");
        System.out.println("─".repeat(50));
        System.out.println(source);
        System.out.println("─".repeat(50));

        CompilerResult result = CompilerPipeline.compile(source);
        CLIDisplay.display(result);
    }

    static final String SAMPLE_BASIC = """
            x = 5
            y = 3.14
            z = x + 2
            print(z)
            """;

    static final String SAMPLE_LITERALS = """
            name = "Alice"
            flag = True
            print(name)
            print(flag)
            """;

    static final String SAMPLE_FOR_LOOP = """
            items = [1, 2, 3]
            for i in items:
                print(i)
            """;

    static final String SAMPLE_AUGMENTED_ASSIGN = """
            count = 0
            count += 1
            count -= 1
            print(count)
            """;

    static final String SAMPLE_ARITHMETIC = """
            a = 10
            b = 4
            c = a * b + 2
            d = (a + b) / 2
            print(c)
            print(d)
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