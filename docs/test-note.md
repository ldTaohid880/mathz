# Mathz Plugin Test Note

This note contains test cases covering every feature of the Mathz plugin.

## 1. Directives & Explicit Curves

````mathz
@title Explicit Curves Example
@size 400
@view -5 5 -5 5
@grid on

// Explicit functions of x and y
y = x^2 - 2
x = y^2 - 3
````

## 2. Implicit Curves & Comments

````mathz
# Implicit equations
x^2 + y^2 = 16
x * y = 4
````

## 3. Polar & Parametric Curves

````mathz
@title Polar and Parametric
r = 3*sin(2*theta)
x = 4*cos(t), y = 2*sin(t)
````

## 4. Points & Labeled Points

````mathz
@title Labeled Points
(0, 0) "Origin"
(2, 4) "Point A"
(-2, 4) "Point B"
````

## 5. Reusable Function Definitions

````mathz
@title Function Definitions
f(x) = x^2 - 1
g(x, a) = a * f(x)
@slider a = 2 [-3, 5, 0.5]
y = g(x, a)
````

## 6. Inequalities

````mathz
@title Inequalities
y > x^2 - 3
x^2 + y^2 <= 9
````

## 7. Restricted Domains

````mathz
@title Restricted Domains
y = x^2 {0 <= x <= 2}
y = -x + 4 {-1 <= x <= 3}
````

## 8. Sliders & Dynamic Parameters

````mathz
@title Dynamic Wave
@slider freq = 2 [0.5, 5, 0.1]
@slider amp = 1.5 [0.1, 3, 0.1]
y = amp * sin(freq * x)
````

## 9. Intentional Error Line (Graceful Error Handling)

````mathz
y = sin(x
y = 2x + 1
````
