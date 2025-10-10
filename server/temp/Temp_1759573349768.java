//What is Method Overriding?

/*
1.Method overriding allows a subclass to provide a specific implementation of a method that is already defined in its superclass.

2.It is a key aspect of runtime (dynamic) polymorphism in Java.

3.The overridden method in the subclass should have the same name, return type, and parameters as the method in the superclass.
*/
class Animal 
{
    void sound() 
	{
        System.out.println("Animal makes a sound");
    }
}

class Dog extends Animal 
{
    @Override
    void sound() 
	{
        System.out.println("Dog barks");
    }
}

public class OverridingDemo1 
{
    public static void main(String[] args) {
        Dog myDog1 = new Dog();
		myDog1.sound(); // Outputs: Dog barks

		Animal myDog2 = new Dog();
        myDog2.sound(); // Outputs: Dog barks
		
		Animal myAnimal = new Animal();
		myAnimal.sound(); // Outputs: Animal makes a sound
		
		myDog2 = new Animal();
		myDog2.sound(); // Outputs: Animal makes a sound
    }
}
