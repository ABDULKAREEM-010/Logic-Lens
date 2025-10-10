import java.util.*;
class Arrayop
{           
    public static void main(String[] args)
    {
        Scanner sc=new Scanner(System.in);
        int i,j,n;
        n=sc.nextInt();
        ArrayList<Character>clist=new ArrayList<Character>();
        for(j=0;j<n;j++)
        {
            char q=sc.next().charAt(0);
            char ch=sc.next().charAt(0);
        if(q=='i')
        {
            clist.add(ch);
        }   
        else
        {
            if(clist.contains(ch))
            {
                System.out.println(Collections.frequency(clist,ch));
            }
            else
                System.out.println("not present");
        }  
       }

    }
}