package P1;

class Protected {
    public int n_pub = 1;
    protected int n_pro = 2;
    int n = 3;
    private int n_priv = 4;

    public void display1() {
        System.out.println( n_pub);
        System.out.println(n_pro);
        System.out.println(n);
        System.out.println(n_priv);
    }
}
 class Derived1 extends Protected {
    public void display2() {
        System.out.println(n_pub);
        System.out.println(n_pro);
        System.out.println(n);
        //System.out.println(n_priv);
    }
}
class SamePackageClass {
    public void display3() {
        Protected p = new Protected();
        System.out.println(p.n_pub);
        System.out.println(p.n_pro);
        System.out.println(p.n);
        //System.out.println(p.n_priv);
    }
}
class Demo1 {
    public static void main(String[] args) {
        Protected obj1 = new Protected();
        Derived1 d1 = new Derived1();
        SamePackageClass sp = new SamePackageClass();

        obj1.display1();
        d1.display2();
        sp.display3();
    }
}


