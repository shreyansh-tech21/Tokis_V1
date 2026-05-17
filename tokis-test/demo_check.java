// Compile: javac -d out demo_check.java src/Calculator.java
// Run:     java -cp out demo_check

public class demo_check {
    public static void main(String[] args) {
        System.out.println("Calculator.java checks:");

        try {
            System.out.println("  divide(10, 2) => " + Calculator.divide(10, 2));
        } catch (Exception e) {
            System.out.println("  divide(10, 2) => " + e);
        }

        try {
            System.out.println("  divide(10, 0) => " + Calculator.divide(10, 0));
        } catch (Exception e) {
            System.out.println("  divide(10, 0) => " + e.getClass().getSimpleName());
        }

        try {
            System.out.println("  greet(\"Ada\") => " + Calculator.greet("Ada"));
        } catch (Exception e) {
            System.out.println("  greet(\"Ada\") => " + e);
        }

        try {
            System.out.println("  greet(null) => " + Calculator.greet(null));
        } catch (Exception e) {
            System.out.println("  greet(null) => " + e.getClass().getSimpleName());
        }
    }
}
