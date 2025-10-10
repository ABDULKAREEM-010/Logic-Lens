//Overloading with Different Parameter Types
class overloading {
    void print(int a) {
        System.out.println("Integer: " + a);
    }

    void print(double a) {
        System.out.println("Double: " + a);
    }

    void print(String a) {
        System.out.println("String: " + a);
    }
    public static void main(String[] args) 
	{
        overloading disp = new overloading();
        disp.print(100);            // Outputs: Integer: 100
        disp.print(99.99);          // Outputs: Double: 99.99
        disp.print("Java");         // Outputs: String: Java
    }
}
