//Overloading with Different Parameter Order
class overloading 
{
    void show(int a, String b) {
        System.out.println("Integer: " + a + ", String: " + b);
    }

    void show(String b, int a) {
        System.out.println("String: " + b + ", Integer: " + a);
    }

    public static void main(String[] args) 
	{
        overloading obj = new overloading();
        obj.show(10, "Hello");   // Outputs: Integer: 10, String: Hello
        obj.show("World", 20);   // Outputs: String: World, Integer: 20
    }
}
