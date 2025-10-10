public class ErrorExample {

    public static void main(String[] args) {
        int number = 10;
        String message = "The number is: " + number; // Line 5: No error here

        // Error 1: Missing semicolon
        System.out.println("Starting calculation")

        // Error 2: Undeclared variable type (int is missing)
        result = number * 2;

        // Error 3: Mismatching variable type (Trying to assign an integer to a boolean)
        boolean isEven = result;

        System.out.println(message);
        System.out.println("Result: " + result);
    }
}