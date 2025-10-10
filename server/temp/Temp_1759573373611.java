interface shape
{   double area();
    double perimeter();
 }
class Circle implements shape
{   double radius;
    public Circle(double radius)
    {
        this.radius=radius;
   }
public double area(){
        return 3.14*(radius)*radius;
    }
public double perimeter()
    {
        return 2*3.14*radius;
    }
}
class Rectangle implements shape
{
    double length;
    double breadth;
    
    public Rectangle(double length,double breadth)
    {
        this.length=length;
    }
    public double area(){
        return length*breadth;
    }
     public double perimeter(){
        return 2*(length+breadth);
    }
    }
class Square implements shape
{
    double side;
   
    
    public Square(double side)
    {
        this.side=side;
    }
    public double area(){
        return side*side;
    }
     public double perimeter(){
        return 4*side;
    }
    }
public class main
{ public static void main(String[] args)
   { Circle c=new Circle(4);
    Rectangle r=new Rectangle(2,4);
    Square s=new Square(4);
    System.out.println("area of circle "+c.area());
    System.out.println("area of rectangle"+r.area());
    System.out.println("area of square "+s.area());
    System.out.println("perimeter of circle "+c.perimeter());
    System.out.println("perimeter of rectangle"+r.perimeter());
    System.out.println("perimeter of square "+s.perimeter());
   }
    
}