import java.util.Scanner;

public class GreetUser {
    public static void main(String[] args) {
        // Create a Scanner object to read input
        Scanner scanner = new Scanner(System.in);

        // Ask for the user's name
        System.out.print("What is your name? ");
        String name = scanner.nextLine();

        // Print a greeting message
        System.out.println("Hello, " + name + "! Nice to meet you.");

        // Close the scanner
        scanner.close();
    }
}
