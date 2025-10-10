//Graph creation

import java.util.ArrayList;
import java.util.Scanner;
public class test{
                                        
    public static void main(String[] args){
        Scanner sc=new Scanner(System.in);
        int n=sc.nextInt();
        int e=sc.nextInt();
        ArrayList<ArrayList<Integer>> list;
        list=new ArrayList<>();
        for(int i=1;i<=n;i++){
            list.add(new ArrayList<>());
        }
        System.out.println("Enter edges: (u-v)");
        for(int i=0;i<e;i++){
            int u=sc.nextInt();
            int v=sc.nextInt();
            list.get(u).add(v);
            list.get(v).add(u);
        }

        System.out.println("Graph");
        for(int i=0;i<=n;i++){
            System.out.println(i+"-> ");
            for(int j=0;j<list.get(i).size();j++){
                System.out.print(list.get(i).get(j)+" ");
            }
            System.out.println();
        }

        
    }
}