class Calculator {
    int add(int a, int b) {
        return a + b;
    }

    int sub(int a, int b) {
        return a - b;
    }

    int div(int a, int b) {
        return a / b;
    }

    int mult(int a, int b) {
        return a * b;
    }

    int fact(int num) {
        int factorial = 1; 
        for (int i = 1; i <= num; ++i) {
            factorial *= i; 
        }
        return factorial; 
    }
    }

