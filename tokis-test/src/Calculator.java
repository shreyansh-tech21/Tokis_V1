public class Calculator {
    public static int divide(int a, int b) {
        // Bug: no guard for b == 0 → ArithmeticException at runtime
        return a / b;
    }

    public static String greet(String name) {
        // Bug: NullPointerException when name is null
        return "Hello, " + name.trim();
    }
}
