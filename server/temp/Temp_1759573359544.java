interface Flyable
{   void fly();
    void swim();
 }
 interface swimmable
{   void fly();
    void swim();
 }
class Duck implements Flyable,swimmable
{   
 public void fly()
 {
     System.out.println("the duck flew");
     
 }
 public void swim()
 {
     System.out.println(" the duck swam");
 }
    
}


public class main
{
    public static void main(String[] args)
    {
        Duck a=new Duck();
        a.fly();
        a.swim();
    }
}
