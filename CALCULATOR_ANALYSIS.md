# Scientific Calculator - Feature Analysis & Bug Report

## Analysis Date: 22/03/2026

---

## ✅ IMPLEMENTED FEATURES

### Basic Arithmetic ✓
- [x] Addition, subtraction, multiplication, division
- [x] Parentheses for order of operations
- [x] Percentage calculations
- [x] Fractions (proper, improper, mixed) - `frac()`, `decimalToFrac()`
- [x] Decimal/fraction conversion

### Trigonometry ✓
- [x] sin, cos, tan (and inverse functions: sin⁻¹, cos⁻¹, tan⁻¹)
- [x] Hyperbolic functions: sinh, cosh, tanh (and inverses)
- [x] Degree/radian/grad mode switching
- [x] sec, csc, cot (and inverses)
- [x] DMS (Degrees-Minutes-Seconds) conversion

### Logarithms & Exponents ✓
- [x] log₁₀ (common log)
- [x] ln (natural log)
- [x] eˣ (exponential)
- [x] 10ˣ
- [x] Arbitrary base logarithms

### Powers & Roots ✓
- [x] x², x³, xʸ (power function)
- [x] √ (square root)
- [x] ∛ (cube root)
- [x] ⁿ√ (nth root)
- [x] Reciprocal (1/x)

### Constants ✓
- [x] π (pi)
- [x] e (Euler's number)
- [x] φ (Golden ratio)
- [x] Physical constants (c, G, h, k, Nₐ)

### Statistics ✓
- [x] Mean, median, mode
- [x] Standard deviation (σ, s)
- [x] Variance
- [x] Summation (Σ) - sumSquares
- [x] Permutations (nPr) & combinations (nCr)
- [x] Factorial (n!)
- [x] Random number generation
- [x] Random integer generation
- [x] Weighted mean
- [x] Normal distribution (PDF/CDF)

### Complex Numbers ✓
- [x] Rectangular ↔ polar conversion
- [x] Complex arithmetic (a + bi)
- [x] Complex conjugate
- [x] Modulus/argument

### Calculus ✓
- [x] Numerical integration (∫)
- [x] Numerical differentiation (d/dx)
- [x] Limits
- [x] Taylor series expansion
- [x] Critical points finder
- [x] Min/Max finder
- [x] Inflection points

### Programming/Logic ✓
- [x] Variables storage (A-Z, custom names)
- [x] Equation solver (quadratic, linear 2x2, 3x3, non-linear)
- [x] Base conversions (binary, octal, hex)
- [x] Boolean logic (AND, OR, NOT, XOR)
- [x] Unit conversions (length, mass, time, temp)

### Display Features ✓
- [x] Multi-line display
- [x] Expression history
- [x] Scientific notation (×10ⁿ)
- [x] Engineering notation
- [x] Degree/radian/grad indicator
- [x] Last answer recall (ANS)
- [x] Multiple memories (A-Z + custom variables)
- [x] Expression history / replay (Arrow Up/Down)
- [x] Parentheses check / error alerts
- [x] Fix / Sci / Eng mode switching

### Algebra & Equations ✓
- [x] Quadratic solver (ax²+bx+c=0)
- [x] Simultaneous linear equations (2×2, 3×3)
- [x] Polynomial evaluation
- [x] Absolute value |x|
- [x] Floor, Ceiling, Round, Integer part
- [x] Non-linear simultaneous equation solver

### Number Theory ✓
- [x] GCD / LCM
- [x] Prime check
- [x] Modulo operation
- [x] Integer division

### Angle & Trig Extensions ✓
- [x] Degrees ↔ Degrees-Minutes-Seconds (DMS) conversion
- [x] Cosecant, Secant, Cotangent (full set)
- [x] Angle between two vectors

### Vector & Coordinate ✓
- [x] 2D / 3D vector operations: +, −, dot product
- [x] Magnitude of a vector
- [x] Polar ↔ Rectangular (with vector storage)
- [x] Vector storage (named vectors)

### Probability & Stats Extra ✓
- [x] Normal distribution: pdf / cdf
- [x] Random integer
- [x] Weighted mean
- [x] Sum of squares

### Matrix ✓
- [x] Matrix addition, subtraction, multiplication
- [x] Matrix determinant
- [x] Matrix inverse
- [x] Transpose
- [x] Matrix storage (named matrices)

### Graphing ✓
- [x] Desmos integration
- [x] Cartesian plotting (y = f(x))
- [x] Parametric plotting (x(t), y(t))
- [x] Polar plotting (r(θ))
- [x] Graph folders (save/load)
- [x] Multiple graphs with colors

### Additional Features ✓
- [x] Finance calculators (compound interest, loan payments)
- [x] Health calculators (BMI, BMR, TDEE)
- [x] Date calculators (days between, add days, day of week, week number)
- [x] Data storage converter (B, KB, MB, GB, TB, PB)

---

## 🐛 BUGS & ERRORS FOUND

### Critical Bugs

#### 1. **Angle Mode Not Applied to Trigonometric Functions in Expression Evaluation**
**Location:** `evaluateExpression()` method
**Issue:** When using trig functions in expressions (e.g., `sin(45)`), the angle mode conversion is not applied. The functions `sin()`, `cos()`, `tan()` are replaced with `this.sin()` which correctly applies angle conversion, but when the expression is evaluated using `Function()`, the context is lost.

**Fix Required:** The function replacements need to properly bind to the calculator instance.

```javascript
// Current (BROKEN):
e = e.replace(/\bsin\s*\(/g, 'this.sin(');

// Should be:
// Need to ensure 'this' context is preserved in Function() call
```

#### 2. **Factorial Regex Replacement Bug**
**Location:** `evaluateExpression()` method, line with factorial replacement
**Issue:** The regex `(\d+(?:\.\d+)?)\s*!` doesn't handle expressions like `(5+3)!` or variables like `n!`.

**Current:**
```javascript
e = e.replace(/(\d+(?:\.\d+)?)\s*!/g, (_, n) => 'this.factorial(Math.floor(parseFloat("' + n + '")))');
```

**Problem:** Only matches numeric literals, not expressions.

#### 3. **Graph Mode Input Placeholder Not Updated on Page Load**
**Location:** `setupEventListeners()` method
**Issue:** The graph input placeholders are only updated when the mode changes, not on initial load. Default mode is "cartesian" but placeholder might not match.

#### 4. **Matrix/Vector Parsing Edge Cases**
**Location:** `parseMatrix2D()` and `parseVector()` methods
**Issue:** 
- Empty strings return `[]` which causes issues in matrix operations
- No validation for consistent row lengths in matrices
- `parseVector()` returns `[]` for invalid input, but operations don't check for this

**Example Bug:**
```javascript
const A = this.parseMatrix2D("1 2; 3"); // Returns [[1,2], [3]] - inconsistent!
const det = this.matrixDeterminant(A); // Will fail or give wrong result
```

#### 5. **Division by Zero Not Handled in Complex Division**
**Location:** `complexDiv()` method
**Issue:** Returns `{re: NaN, im: NaN}` but doesn't alert user or show meaningful error.

#### 6. **Non-Linear Solver Variable Replacement Bug**
**Location:** `solveNonLinear()` and `evaluateFunctionAt()` methods
**Issue:** The `evaluateFunctionAt()` uses regex `/\bx\b/g` which might not work correctly for all cases. Also, the non-linear solver assumes equations are in the form `f(x,y,z) = 0` but doesn't validate this.

#### 7. **Memory Display Not Shown on Page Load**
**Location:** `showMemory()` method
**Issue:** If memory is loaded from localStorage (not implemented), it won't display until a memory operation is performed.

#### 8. **Graph Folder Loading Race Condition**
**Location:** `loadGraphFolder()` method
**Issue:** Multiple graphs are added with `Date.now()` in a loop, potentially creating duplicate IDs if the loop executes faster than 1ms.

**Fix:**
```javascript
// Current:
const graphId = 'graph_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// Better:
let counter = 0;
folder.graphs.forEach((graph, index) => {
    const graphId = 'graph_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substr(2, 9);
    // ...
});
```

### Medium Priority Bugs

#### 9. **Expression History Keyboard Navigation Doesn't Clear on New Input**
**Location:** Keyboard event listener in `setupEventListeners()`
**Issue:** If user navigates history with arrow keys, then types a new character, the history index isn't reset, causing unexpected behavior.

#### 10. **Parentheses Check Doesn't Account for Brackets/Braces**
**Location:** `checkParentheses()` method
**Issue:** Only checks `()` but not `[]` or `{}` which might be used in some contexts.

#### 11. **Display Mode Indicator References Non-Existent Buttons**
**Location:** `setDisplayMode()` method
**Issue:** The method tries to find buttons with `[data-display]` attribute, but these buttons are not created in the HTML or `populateButtons()`.

**Current Code:**
```javascript
setDisplayMode(mode) {
    this.displayMode = mode;
    document.querySelectorAll('[id$="Mode"][data-display]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-display="${mode}"]`).classList.add('active');
}
```

**Problem:** No buttons with `data-display` attribute exist, so this will throw an error when trying to add class to `null`.

#### 12. **Taylor Series Implementation is Incorrect**
**Location:** `taylorSeries()` method
**Issue:** The implementation doesn't correctly calculate higher-order derivatives. It recalculates the derivative in each iteration but doesn't accumulate properly.

**Current (BROKEN):**
```javascript
for (let n = 0; n < terms; n++) {
    let derivative = this.evaluateFunctionAt(expr, variable, center);
    for (let i = 0; i < n; i++) {
        const f_plus = this.evaluateFunctionAt(expr, variable, center + h);
        const f_minus = this.evaluateFunctionAt(expr, variable, center - h);
        derivative = (f_plus - f_minus) / (2 * h);
    }
    // This doesn't correctly compute nth derivative
}
```

#### 13. **Weighted Mean Doesn't Validate Array Lengths**
**Location:** `showWeightedMeanUI()` method
**Issue:** Checks `v.length !== w.length` but doesn't handle the case where they're both empty.

#### 14. **Base Conversion Functions Don't Handle Negative Numbers**
**Location:** `dec2bin()`, `dec2oct()`, `dec2hex()` methods
**Issue:** Using `>>> 0` converts to unsigned 32-bit integer, which gives unexpected results for negative numbers.

**Example:**
```javascript
calc.dec2bin(-5); // Returns "11111111111111111111111111111011" (32-bit unsigned)
```

#### 15. **Graph Input Not Cleared After Parametric Plot**
**Location:** `addGraphEquation()` method
**Issue:** For parametric mode, inputs are cleared with early return, but for other modes, inputs are cleared after the if-else block. This is inconsistent and the parametric case has a duplicate clear.

### Low Priority Issues

#### 16. **No Input Validation for Date Functions**
**Location:** Date calculator methods
**Issue:** Invalid date strings will cause `new Date()` to return Invalid Date, but this isn't checked.

#### 17. **Polynomial Evaluation Doesn't Handle Empty Input**
**Location:** `showPolyEvalUI()` method
**Issue:** If user enters invalid coefficients, the filter might result in empty array, but this isn't checked before evaluation.

#### 18. **No Persistence for Variables, Vectors, Matrices**
**Location:** Constructor
**Issue:** Graph folders are saved to localStorage, but variables, vectors, and matrices are not persisted across page reloads.

#### 19. **Error Messages Not User-Friendly**
**Location:** Various `alert()` calls
**Issue:** Technical error messages like "Matrix dimensions incompatible for multiplication" could be more helpful with examples.

#### 20. **No Undo/Redo Functionality**
**Issue:** Expression history exists but no way to undo calculations or restore previous states.

---

## 🔧 RECOMMENDED FIXES

### Priority 1 (Critical - Breaks Functionality)

1. **Fix Angle Mode in Expression Evaluation**
   - Bind calculator instance properly in `evaluateExpression()`
   - Test: `sin(90)` in degree mode should return `1`, not `0.8939...`

2. **Fix Display Mode Buttons**
   - Add display mode buttons to HTML or remove the `setDisplayMode()` functionality
   - Update `updateDisplay()` to not reference non-existent elements

3. **Fix Matrix/Vector Validation**
   - Add validation in `parseMatrix2D()` to ensure consistent row lengths
   - Check for empty arrays before operations
   - Return `null` instead of `[]` for invalid input

### Priority 2 (Important - Affects User Experience)

4. **Fix Taylor Series Implementation**
   - Implement proper numerical nth derivative calculation
   - Or use symbolic differentiation library

5. **Add Input Validation**
   - Validate all user inputs in UI methods
   - Show helpful error messages

6. **Fix Graph ID Generation**
   - Use counter or index to prevent duplicate IDs

### Priority 3 (Nice to Have)

7. **Add Persistence**
   - Save variables, vectors, matrices to localStorage
   - Load on initialization

8. **Improve Error Messages**
   - Make all error messages user-friendly
   - Add examples in prompts

9. **Add Undo/Redo**
   - Implement state management
   - Add undo/redo buttons

---

## 📊 FEATURE COVERAGE SUMMARY

**Total Requested Features:** ~80+
**Implemented:** ~75+ (94%)
**Bugs Found:** 20
**Critical Bugs:** 8
**Medium Priority:** 7
**Low Priority:** 5

---

## ✨ ADDITIONAL FEATURES IMPLEMENTED (Not Requested)

1. Desmos graphing integration
2. Graph folders with save/load
3. Parametric and polar plotting
4. Finance calculators
5. Health calculators (BMI, BMR, TDEE)
6. Date calculators
7. Data storage converter
8. Non-linear equation solver (Newton-Raphson)
9. Named variable storage (beyond A-Z)
10. Named vector/matrix storage
11. Expression history replay with arrow keys
12. Parentheses validation
13. Multiple graph colors
14. Critical points, extrema, inflection points finders

---

## 🎯 CONCLUSION

The calculator is **highly feature-complete** with 94%+ of requested features implemented, plus many additional advanced features. However, there are several critical bugs that need to be fixed for proper functionality, particularly:

1. Angle mode not working in expressions
2. Display mode buttons missing
3. Matrix/vector validation issues
4. Taylor series incorrect implementation

Once these critical bugs are fixed, the calculator will be production-ready and exceed the original requirements.
