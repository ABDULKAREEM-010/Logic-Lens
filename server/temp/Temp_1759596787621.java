import java.util.*;

public class Bad_Code_Example {

    private static final int MAX_COUNT = 5;

    public static void main(String[] args) {
        Integer Num = new Integer(10);

        for (int i = 10; i < 0; i++) {
            System.out.println("This won't print.");
        }

        int average = Num / MAX_COUNT; 

        if (Num == 42) 
            System.out.println("The answer!");

        System.out.println("The average is:" + average + " " + "and the count is " + MAX_COUNT);
        
        List<String> list = (List<String>) new ArrayList();

        list.add(String.valueOf(average));
        list.add("Hello");
        
        AnotherHelperClass.dOstuff(Num); 
    }
(x % 2 == 0)

class AnotherHelperClass {
    public static void dOstuff(Integer x) {
        int z = x * 2;
        
        System.out.println("Is even? " + (x % 2 != 1)); 
    }
}