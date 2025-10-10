
import java.util.*;

public class BFS {
    public static void main(String[] args) {
        Scanner sc=new Scanner(System.in);
        ArrayList<ArrayList<Integer>> list =new ArrayList<>();
        System.out.print("enter no.of nodes/vertices:");
        int n=sc.nextInt();
        System.out.println("enter no.of edges:");
        int e=sc.nextInt();
        for(int i=0;i<=n;i++){
            list.add(new ArrayList<>());
            
        }
        System.out.println("Enter (u-v) elements:");
        for(int i=0;i<e;i++){
            int u=sc.nextInt();
            int v=sc.nextInt();
            list.get(u).add(v);
            list.get(v).add(u);
        }
        

        //BFS Traversal
        Queue<Integer> q=new ArrayDeque<>();
        System.out.println("Enter a starting node to traversal");
        int s=sc.nextInt();
        int []visted=new int[n+1];
        visted[s]=1;
        q.add(s);
        while(!q.isEmpty()){
           int ele= q.poll();
            System.out.print(ele+" ");
            for(int i=0;i<list.get(ele).size();i++){
                int val=list.get(ele).get(i);
                if(visted[val]!=1){
                    q.add(val);
                    visted[val]=1;
                }
            }
        }
    }
}
