import java.util.*;
class overloading
{
    void m1(x)
    {
        System.out.println("INT");
    }
    void m1(long x)
    {
        System.out.println("Long");
    
    }
    void m1(double x)
    {
        System.out.println("double");
    
    }
    public static void main(String arg[])
    {
        short s=12;
        byte b=127;
        float f=3.5f;
        long l=2222222222L;
        overloading obj=new overloading();
        obj.m1(s);
         obj.m1(b);
          obj.m1(l);
           obj.m1(f);
        
    }
}