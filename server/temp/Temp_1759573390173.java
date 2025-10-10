//Example of Method Overloading
class overloading 
{
    void display(int a) 
	{
        System.out.println("Integer: " + a);
    }

    void display(double a) 
	{
        System.out.println("Double: " + a);
    }

    void display(int a, double b) 
	{
        System.out.println("Integer: " + a + " and Double: " + b);
    }

    public static void main(String[] args) 
	{
        overloading ex = new overloading();
        ex.display(10);        // Calls the method with an integer parameter
        ex.display(5.5);       // Calls the method with a double parameter
        ex.display(10, 5.5);   // Calls the method with both an integer and a double parameter
    }
}
