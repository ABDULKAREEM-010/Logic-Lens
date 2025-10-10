 import java.util.*;
public class ytMiniProj {
    
    public static void guess(int c)
    {   Scanner sc = new Scanner(System.in);
        int a=(int)(Math.random() * 100);
        if(c>0)
            {
                if(c==a)
            {
                System.out.println("you got it right");
            }
                else{
                    System.err.print("No match Enter other value: ");
                    int b=sc.nextInt();
                    guess(b);   
                    }
        
            }
            sc.close();
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter a value: ");
        int b=sc.nextInt();
        
        if(b>0)
        {
            guess(b);
        }
     sc.close();   
    }
}
