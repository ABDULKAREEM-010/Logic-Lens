
# Intentional Syntax Error (missing colon)
def greet(name)
    print("Hello", name)

# Semantic Error: Using variable before assignment
def calculate():
    total += 10  # ❌ total not defined
    print(total)


calculate()
