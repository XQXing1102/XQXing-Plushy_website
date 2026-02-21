// ========================================
// SCIENTIFIC CALCULATOR PRO
// Comprehensive calculator with graphing
// ========================================

class Calculator {
    constructor() {
        this.expression = '';
        this.result = '0';
        this.history = [];
        this.memory = 0;
        this.angleMode = 'degree'; // degree, radian, grad
        this.displayMode = 'fix'; // fix, sci, eng
        this.decimalPlaces = 10;
        
        this.graphFolders = JSON.parse(localStorage.getItem('graphFolders')) || [];
        this.currentGraphs = new Map();
        this.desmos = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeDesmos();
        this.loadGraphFolders();
    }

    // ===== DESMOS GRAPHING =====
    initializeDesmos() {
        const elt = document.getElementById('calculator');
        const options = {
            expressionsCollapsed: false,
            settingsMenu: true,
            zoomButtons: true,
            expressionsTopbar: true,
            border: false,
        };
        this.desmos = window.Desmos.GraphingCalculator(elt, options);
    }

    addGraphEquation() {
        const input = document.getElementById('graphInput').value.trim();
        const color = document.getElementById('graphColor').value || '#3b82f6';
        
        if (!input) {
            alert('Enter an equation or function');
            return;
        }

        try {
            // Accept y = f(x) or just f(x)
            let equation = input;
            
            // If it doesn't contain '=', assume it's y = f(x)
            if (!equation.includes('=')) {
                equation = 'y = ' + equation;
            }

            // Validate by trying to evaluate at a test point
            const testExpr = equation.split('=')[1].trim();
            this.evaluateFunctionAt(testExpr, 'x', 0);

            // Add to Desmos
            this.desmos.setExpression({
                latex: equation,
                color: color,
            });
            
            this.currentGraphs.set(input, { latex: equation, color: color });
            document.getElementById('graphInput').value = '';
            document.getElementById('graphColor').value = '';
        } catch (e) {
            alert('Invalid function. Make sure to use valid syntax like:\ny = x^2\ny = sin(x)\ny = 1/(x-2)\ny = sqrt(x)');
        }
    }

    clearGraph() {
        this.desmos.setBlank();
        this.currentGraphs.clear();
    }

    // ===== GRAPH FOLDERS =====
    createGraphFolder() {
        document.getElementById('folderModal').style.display = 'flex';
    }

    createGraphFolderConfirm() {
        const name = document.getElementById('folderNameInput').value.trim();
        if (!name) return alert('Enter folder name');

        const folder = {
            id: Date.now(),
            name: name,
            graphs: Array.from(this.currentGraphs.entries()).map(([expr, config]) => ({
                expression: expr,
                ...config
            })),
            createdAt: new Date().toISOString(),
        };

        this.graphFolders.push(folder);
        localStorage.setItem('graphFolders', JSON.stringify(this.graphFolders));
        this.loadGraphFolders();
        this.closeModal();
        alert(`Folder "${name}" saved!`);
    }

    saveGraphFolder() {
        if (this.currentGraphs.size === 0) {
            return alert('Plot equations first');
        }
        this.createGraphFolder();
    }

    loadGraphFolders() {
        const container = document.getElementById('graphManagement');
        if (this.graphFolders.length === 0) {
            container.innerHTML = '<div style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">No folders yet</div>';
            return;
        }

        container.innerHTML = this.graphFolders.map(folder => `
            <div class="folder-item">
                <span>📁 ${folder.name} (${folder.graphs.length} graphs)</span>
                <div class="folder-actions">
                    <button class="folder-btn" onclick="calc.loadGraphFolder(${folder.id})">Load</button>
                    <button class="folder-btn" onclick="calc.deleteGraphFolder(${folder.id})" style="background: rgba(255,100,100,0.3);">Delete</button>
                </div>
            </div>
        `).join('');
    }

    loadGraphFolder(folderId) {
        const folder = this.graphFolders.find(f => f.id === folderId);
        if (!folder) return;

        this.clearGraph();
        folder.graphs.forEach(graph => {
            this.desmos.setExpression({
                latex: graph.latex,
                color: graph.color,
            });
        });
    }

    deleteGraphFolder(folderId) {
        if (confirm('Delete this folder?')) {
            this.graphFolders = this.graphFolders.filter(f => f.id !== folderId);
            localStorage.setItem('graphFolders', JSON.stringify(this.graphFolders));
            this.loadGraphFolders();
        }
    }

    closeModal() {
        document.getElementById('folderModal').style.display = 'none';
        document.getElementById('folderNameInput').value = '';
    }

    // ===== MODE SWITCHING =====
    setAngleMode(mode) {
        this.angleMode = mode;
        document.querySelectorAll('[id$="Mode"]').forEach(btn => btn.classList.remove('active'));
        document.getElementById(mode + 'Mode').classList.add('active');
    }

    setDisplayMode(mode) {
        this.displayMode = mode;
        document.querySelectorAll('[id$="Mode"][data-display]').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-display="${mode}"]`).classList.add('active');
    }

    // ===== ANGLE CONVERSIONS =====
    toRadians(angle) {
        if (this.angleMode === 'degree') return angle * Math.PI / 180;
        if (this.angleMode === 'grad') return angle * Math.PI / 200;
        return angle;
    }

    fromRadians(radians) {
        if (this.angleMode === 'degree') return radians * 180 / Math.PI;
        if (this.angleMode === 'grad') return radians * 200 / Math.PI;
        return radians;
    }

    // ===== TRIGONOMETRIC FUNCTIONS =====
    sin(x) { return Math.sin(this.toRadians(x)); }
    cos(x) { return Math.cos(this.toRadians(x)); }
    tan(x) { return Math.tan(this.toRadians(x)); }
    
    asin(x) { return this.fromRadians(Math.asin(x)); }
    acos(x) { return this.fromRadians(Math.acos(x)); }
    atan(x) { return this.fromRadians(Math.atan(x)); }
    
    sinh(x) { return Math.sinh(x); }
    cosh(x) { return Math.cosh(x); }
    tanh(x) { return Math.tanh(x); }
    
    sec(x) { return 1 / Math.cos(this.toRadians(x)); }
    csc(x) { return 1 / Math.sin(this.toRadians(x)); }
    cot(x) { return 1 / Math.tan(this.toRadians(x)); }

    // ===== LOGARITHMIC & EXPONENTIAL =====
    log10(x) { return Math.log10(x); }
    ln(x) { return Math.log(x); }
    log(x, base = 10) { return Math.log(x) / Math.log(base); }
    exp(x) { return Math.exp(x); }
    pow10(x) { return Math.pow(10, x); }

    // ===== POWERS & ROOTS =====
    sqrt(x) { return Math.sqrt(x); }
    cbrt(x) { return Math.cbrt(x); }
    nthRoot(x, n) { return Math.pow(x, 1 / n); }
    power(x, y) { return Math.pow(x, y); }
    square(x) { return x * x; }
    cube(x) { return x * x * x; }
    reciprocal(x) { return 1 / x; }

    // ===== STATISTICS =====
    factorial(n) {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    }

    permutation(n, r) {
        if (n < r) return 0;
        return this.factorial(n) / this.factorial(n - r);
    }

    combination(n, r) {
        if (n < r) return 0;
        return this.factorial(n) / (this.factorial(r) * this.factorial(n - r));
    }

    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    median(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    stdDev(arr) {
        const avg = this.mean(arr);
        const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
        return Math.sqrt(variance);
    }

    // ===== NUMBER THEORY =====
    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    lcm(a, b) {
        return Math.abs(a * b) / this.gcd(a, b);
    }

    isPrime(n) {
        if (n <= 1) return false;
        if (n <= 3) return true;
        if (n % 2 === 0 || n % 3 === 0) return false;
        for (let i = 5; i * i <= n; i += 6) {
            if (n % i === 0 || n % (i + 2) === 0) return false;
        }
        return true;
    }

    modulo(a, b) {
        return a % b;
    }

    // ===== ALGEBRA & EQUATIONS =====
    solveQuadratic(a, b, c) {
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return { x1: NaN, x2: NaN, discriminant };
        const sqrt = Math.sqrt(discriminant);
        return {
            x1: (-b + sqrt) / (2 * a),
            x2: (-b - sqrt) / (2 * a),
            discriminant
        };
    }

    absolute(x) { return Math.abs(x); }
    floor(x) { return Math.floor(x); }
    ceil(x) { return Math.ceil(x); }
    round(x) { return Math.round(x); }
    trunc(x) { return Math.trunc(x); }

    // ===== UNIT CONVERSIONS =====
    lengthConvert(value, from, to) {
        const toMeters = {
            'm': 1, 'km': 1000, 'cm': 0.01, 'mm': 0.001, 'mi': 1609.34,
            'yd': 0.9144, 'ft': 0.3048, 'in': 0.0254
        };
        return (value * toMeters[from]) / toMeters[to];
    }

    tempConvert(value, from, to) {
        let celsius;
        if (from === 'C') celsius = value;
        else if (from === 'F') celsius = (value - 32) * 5/9;
        else if (from === 'K') celsius = value - 273.15;
        
        if (to === 'C') return celsius;
        if (to === 'F') return celsius * 9/5 + 32;
        if (to === 'K') return celsius + 273.15;
    }

    // ===== CALCULUS: NUMERICAL DIFFERENTIATION =====
    differentiate(expr, variable = 'x', point, h = 0.0001) {
        // Calculate f(x + h)
        const f_plus = this.evaluateFunctionAt(expr, variable, point + h);
        // Calculate f(x - h)
        const f_minus = this.evaluateFunctionAt(expr, variable, point - h);
        // Central difference formula: f'(x) ≈ (f(x+h) - f(x-h)) / (2h)
        return (f_plus - f_minus) / (2 * h);
    }

    // ===== CALCULUS: NUMERICAL INTEGRATION =====
    integrate(expr, variable = 'x', a, b, n = 1000) {
        // Simpson's rule for numerical integration
        const h = (b - a) / n;
        let sum = this.evaluateFunctionAt(expr, variable, a) + this.evaluateFunctionAt(expr, variable, b);
        
        for (let i = 1; i < n; i++) {
            const x = a + i * h;
            const coeff = (i % 2 === 0) ? 2 : 4;
            sum += coeff * this.evaluateFunctionAt(expr, variable, x);
        }
        
        return (h / 3) * sum;
    }

    // Alternative: Trapezoidal rule
    integrateTrapezoid(expr, variable = 'x', a, b, n = 1000) {
        const h = (b - a) / n;
        let sum = 0.5 * (this.evaluateFunctionAt(expr, variable, a) + this.evaluateFunctionAt(expr, variable, b));
        
        for (let i = 1; i < n; i++) {
            const x = a + i * h;
            sum += this.evaluateFunctionAt(expr, variable, x);
        }
        
        return h * sum;
    }

    // ===== CALCULUS: LIMIT CALCULATION =====
    limit(expr, variable = 'x', point, direction = 'both') {
        // Approach from left
        const left = this.evaluateFunctionAt(expr, variable, point - 0.0001);
        // Approach from right
        const right = this.evaluateFunctionAt(expr, variable, point + 0.0001);
        
        if (direction === 'left') return left.toFixed(8);
        if (direction === 'right') return right.toFixed(8);
        
        // Check if limit exists (left ≈ right)
        if (Math.abs(left - right) < 0.001) {
            return (left + right) / 2;
        }
        return 'DNE'; // Does not exist
    }

    // ===== CALCULUS: TAYLOR SERIES =====
    taylorSeries(expr, variable = 'x', center = 0, terms = 6) {
        let result = 0;
        const h = 0.001;
        
        for (let n = 0; n < terms; n++) {
            // Approximate nth derivative using central differences
            let derivative = this.evaluateFunctionAt(expr, variable, center);
            for (let i = 0; i < n; i++) {
                const f_plus = this.evaluateFunctionAt(expr, variable, center + h);
                const f_minus = this.evaluateFunctionAt(expr, variable, center - h);
                derivative = (f_plus - f_minus) / (2 * h);
            }
            
            // Factorial
            const fact = this.factorial(n);
            result += (derivative / fact) * Math.pow(variable - center, n);
        }
        
        return result;
    }

    // ===== CALCULUS: FIND CRITICAL POINTS =====
    findCriticalPoints(expr, variable = 'x', start, end, step = 0.1) {
        const criticalPoints = [];
        const h = 0.0001;
        
        for (let x = start; x < end; x += step) {
            const deriv = this.differentiate(expr, variable, x, h);
            
            // Critical point where derivative ≈ 0
            if (Math.abs(deriv) < 0.01) {
                criticalPoints.push({
                    x: x.toFixed(4),
                    y: this.evaluateFunctionAt(expr, variable, x).toFixed(4),
                    derivative: deriv.toFixed(6)
                });
            }
        }
        
        return criticalPoints;
    }

    // ===== CALCULUS: EXTREMA (MIN/MAX) =====
    findExtrema(expr, variable = 'x', start, end, step = 0.1) {
        let minPoint = { x: start, y: this.evaluateFunctionAt(expr, variable, start) };
        let maxPoint = { x: start, y: this.evaluateFunctionAt(expr, variable, start) };
        
        for (let x = start + step; x < end; x += step) {
            const y = this.evaluateFunctionAt(expr, variable, x);
            
            if (y < minPoint.y) minPoint = { x: x.toFixed(4), y: y.toFixed(4) };
            if (y > maxPoint.y) maxPoint = { x: x.toFixed(4), y: y.toFixed(4) };
        }
        
        return { min: minPoint, max: maxPoint };
    }

    // ===== CALCULUS: INFLECTION POINTS =====
    findInflectionPoints(expr, variable = 'x', start, end, step = 0.1) {
        const inflections = [];
        const h = 0.001;
        
        for (let x = start; x < end; x += step) {
            // Second derivative approximation
            const f_plus = this.evaluateFunctionAt(expr, variable, x + h);
            const f = this.evaluateFunctionAt(expr, variable, x);
            const f_minus = this.evaluateFunctionAt(expr, variable, x - h);
            
            const secondDeriv = (f_plus - 2 * f + f_minus) / (h * h);
            
            // Check if second derivative changes sign
            if (Math.abs(secondDeriv) < 0.01) {
                inflections.push({
                    x: x.toFixed(4),
                    y: f.toFixed(4),
                    secondDeriv: secondDeriv.toFixed(6)
                });
            }
        }
        
        return inflections;
    }

    // ===== EVALUATE FUNCTION AT A POINT =====
    evaluateFunctionAt(expr, variable = 'x', value) {
        try {
            // Replace variable with value
            let evalExpr = expr.replace(new RegExp(variable, 'g'), `(${value})`);
            
            // Replace constants
            evalExpr = evalExpr.replace(/π|pi/g, String(Math.PI));
            evalExpr = evalExpr.replace(/e(?![a-zA-Z])/g, String(Math.E));
            evalExpr = evalExpr.replace(/φ/g, '1.618033988749895');
            
            // Replace functions
            evalExpr = evalExpr.replace(/sin\(/g, '(Math.sin(');
            evalExpr = evalExpr.replace(/cos\(/g, '(Math.cos(');
            evalExpr = evalExpr.replace(/tan\(/g, '(Math.tan(');
            evalExpr = evalExpr.replace(/sqrt\(/g, '(Math.sqrt(');
            evalExpr = evalExpr.replace(/log\(/g, '(Math.log10(');
            evalExpr = evalExpr.replace(/ln\(/g, '(Math.log(');
            evalExpr = evalExpr.replace(/abs\(/g, '(Math.abs(');
            
            // Fix unmatched parentheses
            evalExpr += ')'.repeat((evalExpr.match(/\(/g) || []).length - (evalExpr.match(/\)/g) || []).length);
            
            const result = Function('"use strict"; return (' + evalExpr + ');')();
            return result;
        } catch (e) {
            return NaN;
        }
    }

    // ===== MATRIX OPERATIONS =====
    matrixAdd(A, B) {
        return A.map((row, i) => row.map((val, j) => val + B[i][j]));
    }

    matrixMultiply(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < B[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < B.length; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    matrixDeterminant(A) {
        const n = A.length;
        if (n === 1) return A[0][0];
        if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
        
        let det = 0;
        for (let j = 0; j < n; j++) {
            const minor = A.slice(1).map(row => row.filter((_, col) => col !== j));
            det += A[0][j] * this.matrixDeterminant(minor) * (j % 2 === 0 ? 1 : -1);
        }
        return det;
    }

    matrixTranspose(A) {
        return A[0].map((_, i) => A.map(row => row[i]));
    }

    // ===== CONSTANTS =====
    getConstant(name) {
        const constants = {
            'π': Math.PI,
            'pi': Math.PI,
            'e': Math.E,
            'φ': 1.618033988749895, // Golden ratio
            'c': 299792458, // Speed of light (m/s)
            'G': 6.67430e-11, // Gravitational constant
            'h': 6.62607015e-34, // Planck constant
            'ℏ': 1.054571817e-34, // Reduced Planck constant
            'k': 1.380649e-23, // Boltzmann constant
            'N_A': 6.02214076e23, // Avogadro's number
        };
        return constants[name] || null;
    }

    // ===== EXPRESSION EVALUATION =====
    evaluateExpression(expr) {
        try {
            // Replace constants
            expr = expr.replace(/π|pi/g, String(Math.PI));
            expr = expr.replace(/e(?![a-zA-Z])/g, String(Math.E));
            expr = expr.replace(/φ/g, '1.618033988749895');
            
            // Replace functions
            expr = expr.replace(/sin\(/g, '(this.sin(');
            expr = expr.replace(/cos\(/g, '(this.cos(');
            expr = expr.replace(/tan\(/g, '(this.tan(');
            expr = expr.replace(/sqrt\(/g, '(this.sqrt(');
            expr = expr.replace(/log\(/g, '(this.log10(');
            expr = expr.replace(/ln\(/g, '(this.ln(');
            expr = expr.replace(/abs\(/g, '(this.absolute(');
            expr = expr.replace(/floor\(/g, '(this.floor(');
            expr = expr.replace(/ceil\(/g, '(this.ceil(');
            
            // Fix unmatched parentheses
            expr += ')'.repeat((expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length);
            
            const result = Function('"use strict"; return (' + expr + ');').call(this);
            return this.formatResult(result);
        } catch (e) {
            return 'Error';
        }
    }

    formatResult(value) {
        if (isNaN(value) || !isFinite(value)) return String(value);
        
        if (this.displayMode === 'sci') {
            return value.toExponential(this.decimalPlaces);
        } else if (this.displayMode === 'eng') {
            return this.toEngineeringNotation(value);
        } else {
            // Fix mode
            return Math.round(value * Math.pow(10, this.decimalPlaces)) / Math.pow(10, this.decimalPlaces);
        }
    }

    toEngineeringNotation(value) {
        const abs = Math.abs(value);
        if (abs === 0) return '0';
        
        const exponent = Math.floor(Math.log10(abs) / 3) * 3;
        const mantissa = value / Math.pow(10, exponent);
        return mantissa.toFixed(this.decimalPlaces) + 'e' + exponent;
    }

    // ===== CALCULATOR OPERATIONS =====
    append(value) {
        if (value === '=') {
            this.calculate();
        } else {
            this.expression += value;
            this.updateDisplay();
        }
    }

    calculate() {
        if (!this.expression) return;
        
        try {
            const result = this.evaluateExpression(this.expression);
            this.history.push(`${this.expression} = ${result}`);
            this.expression = '';
            this.result = result;
            this.updateDisplay();
            this.updateHistory();
        } catch (e) {
            this.result = 'Error';
            this.updateDisplay();
        }
    }

    clear() {
        this.expression = '';
        this.result = '0';
        this.updateDisplay();
    }

    backspace() {
        this.expression = this.expression.slice(0, -1);
        this.updateDisplay();
    }

    updateDisplay() {
        document.getElementById('expressionDisplay').textContent = this.expression;
        document.getElementById('resultDisplay').textContent = this.expression ? this.evaluateExpression(this.expression) : this.result;
    }

    updateHistory() {
        const container = document.getElementById('historyContainer');
        container.innerHTML = this.history.slice(-10).reverse().map((item, i) => `
            <div class="history-item" onclick="calc.restoreFromHistory('${item.split(' = ')[0]}')">${item}</div>
        `).join('');
    }

    restoreFromHistory(expr) {
        this.expression = expr;
        this.calculate();
    }

    // ===== MEMORY OPERATIONS =====
    memoryClear() {
        this.memory = 0;
        this.showMemory();
    }

    memoryAdd() {
        this.memory += parseFloat(this.result) || 0;
        this.showMemory();
    }

    memorySubtract() {
        this.memory -= parseFloat(this.result) || 0;
        this.showMemory();
    }

    memoryRecall() {
        this.expression = String(this.memory);
        this.updateDisplay();
    }

    showMemory() {
        const section = document.getElementById('memorySection');
        if (this.memory !== 0) {
            section.style.display = 'block';
            document.getElementById('memoryValue').textContent = this.memory.toFixed(10);
        } else {
            section.style.display = 'none';
        }
    }

    // ===== SETUP EVENT LISTENERS =====
    setupEventListeners() {
        this.populateButtons();
        
        // Mode buttons
        document.querySelectorAll('[id$="Mode"][data-mode]').forEach(btn => {
            btn.addEventListener('click', () => this.setAngleMode(btn.dataset.mode));
        });

        document.querySelectorAll('[id$="Mode"][data-display]').forEach(btn => {
            btn.addEventListener('click', () => this.setDisplayMode(btn.dataset.display));
        });

        // Function tabs
        document.querySelectorAll('.function-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchFunctionTab(tab.dataset.tab));
        });

        // Close modal when clicking outside
        document.getElementById('folderModal').addEventListener('click', (e) => {
            if (e.target.id === 'folderModal') this.closeModal();
        });
    }

    populateButtons() {
        // Basic Calculator Grid
        const buttons = [
            ['C', 'DEL', '(', ')', '%', 'ANS'],
            ['7', '8', '9', '/', 'x²', '√'],
            ['4', '5', '6', '*', 'x³', '∛'],
            ['1', '2', '3', '-', 'xʸ', '1/x'],
            ['0', '.', 'π', 'e', '+', '='],
        ];

        const grid = document.getElementById('calcGrid');
        buttons.forEach(row => {
            row.forEach(label => {
                const btn = document.createElement('button');
                btn.className = 'calc-btn';
                btn.textContent = label;

                if (['C', 'DEL'].includes(label)) btn.classList.add('clear');
                if (['+', '-', '*', '/', '%'].includes(label)) btn.classList.add('operator');
                if (label === '=') btn.classList.add('equals');

                btn.addEventListener('click', () => {
                    if (label === 'C') this.clear();
                    else if (label === 'DEL') this.backspace();
                    else if (label === '=') this.calculate();
                    else if (label === 'ANS') this.memoryRecall();
                    else if (label === 'π') this.append(String(Math.PI));
                    else if (label === 'e') this.append(String(Math.E));
                    else if (label === 'x²') this.append('^2');
                    else if (label === 'x³') this.append('^3');
                    else if (label === '√') this.append('sqrt(');
                    else if (label === '∛') this.append('cbrt(');
                    else if (label === 'xʸ') this.append('^');
                    else if (label === '1/x') this.append('1/');
                    else this.append(label);
                });

                grid.appendChild(btn);
            });
        });

        // Function buttons
        this.populateFunctions();
    }

    populateFunctions() {
        const functions = {
            basic: [
                { label: '|x|', fn: 'abs(' },
                { label: 'Floor', fn: 'floor(' },
                { label: 'Ceil', fn: 'ceil(' },
                { label: 'Round', fn: 'round(' },
                { label: 'RND', fn: 'Math.random()' },
                { label: 'n!', fn: 'this.factorial(' },
            ],
            trig: [
                { label: 'sin', fn: 'this.sin(' },
                { label: 'cos', fn: 'this.cos(' },
                { label: 'tan', fn: 'this.tan(' },
                { label: 'sin⁻¹', fn: 'this.asin(' },
                { label: 'cos⁻¹', fn: 'this.acos(' },
                { label: 'tan⁻¹', fn: 'this.atan(' },
                { label: 'sinh', fn: 'this.sinh(' },
                { label: 'cosh', fn: 'this.cosh(' },
                { label: 'tanh', fn: 'this.tanh(' },
                { label: 'sec', fn: 'this.sec(' },
                { label: 'csc', fn: 'this.csc(' },
                { label: 'cot', fn: 'this.cot(' },
            ],
            log: [
                { label: 'log₁₀', fn: 'this.log10(' },
                { label: 'ln', fn: 'this.ln(' },
                { label: 'eˣ', fn: 'this.exp(' },
                { label: '10ˣ', fn: 'this.pow10(' },
                { label: 'logₘ', fn: 'this.log(' },
            ],
            stats: [
                { label: 'nPr', fn: 'this.permutation(' },
                { label: 'nCr', fn: 'this.combination(' },
                { label: 'GCD', fn: 'this.gcd(' },
                { label: 'LCM', fn: 'this.lcm(' },
                { label: 'Prime?', fn: 'this.isPrime(' },
            ],
            convert: [
                { label: 'M+', action: 'memoryAdd' },
                { label: 'M-', action: 'memorySubtract' },
                { label: 'MC', action: 'memoryClear' },
                { label: '°→Rad', action: 'setAngleMode("radian")' },
                { label: '°→Grad', action: 'setAngleMode("grad")' },
            ],
            algebra: [
                { label: 'x²', fn: '', custom: 'x²=0 solver' },
                { label: '|x|', fn: 'abs(' },
                { label: 'Quadratic', action: 'showQuadraticSolver' },
            ],
            matrix: [
                { label: 'Det', info: 'Determinant' },
                { label: 'Transpose', info: 'Matrix Transpose' },
                { label: 'Inverse', info: 'Matrix Inverse (2x2)' },
            ],
            constants: [
                { label: 'π', fn: String(Math.PI) },
                { label: 'e', fn: String(Math.E) },
                { label: 'φ', fn: '1.618' },
                { label: 'C', fn: '2.998e8' },
                { label: 'G', fn: '6.674e-11' },
            ],
            calculus: [
                { label: 'd/dx', action: 'showDifferentiateUI' },
                { label: 'Integral', action: 'showIntegrateUI' },
                { label: 'Limit', action: 'showLimitUI' },
                { label: 'Taylor', action: 'showTaylorUI' },
                { label: 'Critical Pts', action: 'showCriticalPointsUI' },
                { label: 'Extrema', action: 'showExtremaUI' },
                { label: 'Inflection', action: 'showInflectionUI' },
            ],
        };

        // Store functions for tab switching
        this.functions = functions;
        this.switchFunctionTab('basic');
    }

    switchFunctionTab(tab) {
        document.querySelectorAll('.function-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        const grid = document.getElementById('functionGrid');
        grid.innerHTML = '';

        const funcs = this.functions[tab] || [];
        funcs.forEach(f => {
            const btn = document.createElement('button');
            btn.className = 'function-btn';
            btn.textContent = f.label;

            if (f.action) {
                btn.addEventListener('click', () => {
                    if (f.action === 'memoryAdd') this.memoryAdd();
                    else if (f.action === 'memorySubtract') this.memorySubtract();
                    else if (f.action === 'memoryClear') this.memoryClear();
                    else if (f.action === 'showQuadraticSolver') this.showQuadraticSolver();
                    else if (f.action === 'showDifferentiateUI') this.showDifferentiateUI();
                    else if (f.action === 'showIntegrateUI') this.showIntegrateUI();
                    else if (f.action === 'showLimitUI') this.showLimitUI();
                    else if (f.action === 'showTaylorUI') this.showTaylorUI();
                    else if (f.action === 'showCriticalPointsUI') this.showCriticalPointsUI();
                    else if (f.action === 'showExtremaUI') this.showExtremaUI();
                    else if (f.action === 'showInflectionUI') this.showInflectionUI();
                    else if (f.action.includes('setAngleMode')) eval('this.' + f.action);
                });
            } else if (f.fn) {
                btn.addEventListener('click', () => {
                    if (typeof f.fn === 'number') {
                        this.expression += f.fn;
                    } else {
                        this.append(f.fn);
                    }
                    this.updateDisplay();
                });
            }

            grid.appendChild(btn);
        });
    }

    // ===== CALCULUS UI METHODS =====
    showDifferentiateUI() {
        const expr = prompt('Enter function (use x as variable):\nExample: x^2, sin(x), 1/x');
        if (!expr) return;
        
        const point = parseFloat(prompt('Find derivative at x = '));
        if (isNaN(point)) return;
        
        const result = this.differentiate(expr, 'x', point);
        this.expression = `f'(${point}) ≈ ${result.toFixed(8)}`;
        this.updateDisplay();
    }

    showIntegrateUI() {
        const expr = prompt('Enter function to integrate:\nExample: x^2, sin(x)');
        if (!expr) return;
        
        const a = parseFloat(prompt('Lower limit (a):'));
        if (isNaN(a)) return;
        
        const b = parseFloat(prompt('Upper limit (b):'));
        if (isNaN(b)) return;
        
        const result = this.integrate(expr, 'x', a, b);
        this.expression = `∫(${a} to ${b}) ${expr} dx ≈ ${result.toFixed(8)}`;
        this.updateDisplay();
    }

    showLimitUI() {
        const expr = prompt('Enter function:\nExample: sin(x)/x');
        if (!expr) return;
        
        const point = parseFloat(prompt('Find limit as x approaches:'));
        if (isNaN(point)) return;
        
        const result = this.limit(expr, 'x', point);
        this.expression = `lim(x→${point}) ${expr} ≈ ${result}`;
        this.updateDisplay();
    }

    showTaylorUI() {
        const expr = prompt('Enter function:\nExample: sin(x), e^x');
        if (!expr) return;
        
        const center = parseFloat(prompt('Expand around x = (default 0):', '0'));
        const terms = parseInt(prompt('Number of terms (default 6):', '6'));
        
        const result = this.taylorSeries(expr, 'x', center || 0, terms || 6);
        this.expression = `Taylor(${expr} @ x=${center || 0}, ${terms || 6} terms) ≈ ${result.toFixed(10)}`;
        this.updateDisplay();
    }

    showCriticalPointsUI() {
        const expr = prompt('Enter function:\nExample: x^3 - 3x');
        if (!expr) return;
        
        const start = parseFloat(prompt('Start x:', '-10'));
        const end = parseFloat(prompt('End x:', '10'));
        
        const points = this.findCriticalPoints(expr, 'x', start || -10, end || 10);
        const result = points.length > 0 
            ? points.map(p => `(${p.x}, ${p.y})`).join(', ')
            : 'No critical points found';
        
        this.expression = `Critical Points: ${result}`;
        this.updateDisplay();
    }

    showExtremaUI() {
        const expr = prompt('Enter function:\nExample: x^2 - 4x + 3');
        if (!expr) return;
        
        const start = parseFloat(prompt('Start x:', '-10'));
        const end = parseFloat(prompt('End x:', '10'));
        
        const extrema = this.findExtrema(expr, 'x', start || -10, end || 10);
        this.expression = `Min: (${extrema.min.x}, ${extrema.min.y}), Max: (${extrema.max.x}, ${extrema.max.y})`;
        this.updateDisplay();
    }

    showInflectionUI() {
        const expr = prompt('Enter function:\nExample: x^3 - 6x^2 + 9x');
        if (!expr) return;
        
        const start = parseFloat(prompt('Start x:', '-10'));
        const end = parseFloat(prompt('End x:', '10'));
        
        const points = this.findInflectionPoints(expr, 'x', start || -10, end || 10);
        const result = points.length > 0 
            ? points.map(p => `(${p.x}, ${p.y})`).join(', ')
            : 'No inflection points found';
        
        this.expression = `Inflection Points: ${result}`;
        this.updateDisplay();
    }

    showQuadraticSolver() {
        const a = prompt('Enter coefficient a:');
        const b = prompt('Enter coefficient b:');
        const c = prompt('Enter coefficient c:');
        
        if (a !== null && b !== null && c !== null) {
            const result = this.solveQuadratic(parseFloat(a), parseFloat(b), parseFloat(c));
            this.expression = `x₁ = ${result.x1.toFixed(6)}, x₂ = ${result.x2.toFixed(6)}`;
            this.updateDisplay();
        }
    }
}

// ===== GLOBAL FUNCTIONS FOR HTML =====
let calc;

function addGraphEquation() {
    calc.addGraphEquation();
}

function clearGraph() {
    calc.clearGraph();
}

function saveGraphFolder() {
    calc.saveGraphFolder();
}

function createGraphFolder() {
    calc.createGraphFolder();
}

function createGraphFolderConfirm() {
    calc.createGraphFolderConfirm();
}

function closeModal() {
    calc.closeModal();
}

// Initialize calculator when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    calc = new Calculator();
});
