package P2;
import P1.Protected;

class Derived2 extends Protected {
    public void show() {
        System.out.println(n_pub);
        System.out.println(n_pro);
       // System.out.println(n);
        //System.out.println(n_priv);
    }
}

class OtherPackageClass {
    public void show() {
        Protected p = new Protected();
        System.out.println(p.n_pub);
       // System.out.println(p.n_pro);
       // System.out.println(p.n);
       // System.out.println(p.n_priv);
    }
}

public class Demo2 {
    public static void main(String[] args) {
        Derived2 d2 = new Derived2();
        OtherPackageClass op = new OtherPackageClass();

        d2.show();  
        op.show(); 
    }
}
