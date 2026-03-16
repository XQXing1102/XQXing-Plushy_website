// ========================================
// SCIENTIFIC CALCULATOR PRO
// Comprehensive calculator with graphing
// ========================================

class Calculator {
    constructor() {
        this.expression = '';
        this.result = '0';
        this.lastAnswer = null;  // ANS
        this.history = [];
        this.memory = 0;
        this.variables = {};  // A-Z, M (separate from memory for M+)
        this.vectorStorage = {};  // Named vector storage
        this.matrixStorage = {};  // Named matrix storage
        this.statsList = [];  // For mean, median, mode, σ, etc.
        this.angleMode = 'degree'; // degree, radian, grad
        this.displayMode = 'fix'; // fix, sci, eng
        this.decimalPlaces = 10;
        
        this.expressionHistory = [];  // Expression replay
        this.historyIndex = -1;
        
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
        const input2 = document.getElementById('graphInput2').value.trim();
        const color = document.getElementById('graphColor').value || '#3b82f6';
        const mode = document.getElementById('graphMode').value;
        
        if (!input) {
            alert('Enter an equation or function');
            return;
        }

        try {
            const graphId = 'graph_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            let latex = '';
            
            if (mode === 'cartesian') {
                let equation = input;
                if (!equation.includes('=')) {
                    equation = 'y = ' + equation;
                }
                const testExpr = equation.split('=')[1].trim();
                this.evaluateFunctionAt(testExpr, 'x', 0);
                latex = equation;
                this.desmos.setExpression({ id: graphId, latex: equation, color: color });
            }
            else if (mode === 'parametric') {
                const xExpr = input || 'x = t';
                const yExpr = input2 || 'y = t';
                if (!xExpr.includes('=')) {
                    this.evaluateFunctionAt(xExpr, 't', 0);
                }
                if (!yExpr.includes('=')) {
                    this.evaluateFunctionAt(yExpr, 't', 0);
                }
                latex = `${xExpr}, ${yExpr}`;
                this.desmos.setExpression({ id: graphId, latex: xExpr.includes('=') ? xExpr : 'x='+xExpr, color: color });
                const graphId2 = graphId + '_y';
                this.desmos.setExpression({ id: graphId2, latex: yExpr.includes('=') ? yExpr : 'y='+yExpr, color: color });
                this.currentGraphs.set(graphId, { latex: latex, color: color, originalInput: input + ',' + input2, type: 'parametric' });
                document.getElementById('graphInput').value = '';
                document.getElementById('graphInput2').value = '';
                document.getElementById('graphColor').value = '';
                return;
            }
            else if (mode === 'polar') {
                let rExpr = input;
                if (!rExpr.includes('=')) {
                    rExpr = 'r = ' + rExpr;
                }
                const testExpr = rExpr.split('=')[1].trim();
                this.evaluateFunctionAt(testExpr, 'theta', 0);
                latex = rExpr;
                this.desmos.setExpression({ id: graphId, latex: rExpr, color: color });
            }
            
            this.currentGraphs.set(graphId, { latex: latex, color: color, originalInput: input, type: mode });
            document.getElementById('graphInput').value = '';
            document.getElementById('graphInput2').value = '';
            document.getElementById('graphColor').value = '';
        } catch (e) {
            alert('Invalid function. Examples:\nCartesian: y = sin(x), y = x^2\nParametric: x = cos(t), y = sin(t)\nPolar: r = 2*cos(theta), r = 1 + sin(theta)');
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
            const graphId = 'graph_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.desmos.setExpression({
                id: graphId,
                latex: graph.latex,
                color: graph.color,
            });
            this.currentGraphs.set(graphId, { latex: graph.latex, color: graph.color, originalInput: graph.expression });
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
    asec(x) { return this.fromRadians(Math.acos(1 / x)); }
    acsc(x) { return this.fromRadians(Math.asin(1 / x)); }
    acot(x) { return this.fromRadians(Math.atan(1 / x)); }
    asinh(x) { return Math.asinh(x); }
    acosh(x) { return Math.acosh(x); }
    atanh(x) { return Math.atanh(x); }

    // ===== ANGLE DMS (Degrees-Minutes-Seconds) =====
    toDMS(deg) {
        const d = Math.floor(deg);
        const m = Math.floor((deg - d) * 60);
        const s = ((deg - d) * 60 - m) * 60;
        return { d, m, s };
    }
    fromDMS(d, m, s) {
        return d + m / 60 + s / 3600;
    }

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
    variance(arr) {
        const avg = this.mean(arr);
        return arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
    }
    mode(arr) {
        const freq = {};
        arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
        let maxF = 0, modes = [];
        for (const k in freq) {
            if (freq[k] > maxF) { maxF = freq[k]; modes = [parseFloat(k)]; }
            else if (freq[k] === maxF) modes.push(parseFloat(k));
        }
        return modes.length === arr.length ? [] : modes;
    }
    sumSquares(arr) {
        return arr.reduce((sum, val) => sum + val * val, 0);
    }
    weightedMean(values, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        return values.reduce((sum, v, i) => sum + v * (weights[i] || 0), 0) / total;
    }
    normalPdf(x, mu = 0, sigma = 1) {
        return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
    }
    normalCdf(x, mu = 0, sigma = 1) {
        const z = (x - mu) / sigma;
        return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
    }
    erf(x) {
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
        const p = 0.3275911;
        const t = 1.0 / (1.0 + p * Math.abs(x));
        const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return x >= 0 ? y : -y;
    }
    randInt(a, b) {
        const lo = Math.min(a, b), hi = Math.max(a, b);
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
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
    intDiv(a, b) {
        return Math.trunc(a / b);
    }

    // ===== FRACTIONS =====
    frac(num, denom) { return denom !== 0 ? num / denom : NaN; }
    decimalToFrac(x, maxDenom = 10000) {
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        let n = 1, d = 1, bestN = 1, bestD = 1, bestErr = Infinity;
        for (d = 1; d <= maxDenom; d++) {
            n = Math.round(x * d);
            const err = Math.abs(x - n / d);
            if (err < bestErr) { bestErr = err; bestN = n; bestD = d; }
        }
        const g = this.gcd(bestN, bestD);
        bestN /= g; bestD /= g;
        return (sign * bestN) + '/' + bestD;
    }

    // ===== BASE CONVERSION & BOOLEAN =====
    dec2bin(n) { return (n >>> 0).toString(2); }
    dec2oct(n) { return (n >>> 0).toString(8); }
    dec2hex(n) { return (n >>> 0).toString(16).toUpperCase(); }
    bin2dec(s) { return parseInt(String(s).replace(/^0b/, ''), 2); }
    oct2dec(s) { return parseInt(String(s).replace(/^0o/, ''), 8); }
    hex2dec(s) { return parseInt(String(s).replace(/^0x/, ''), 16); }
    boolAnd(a, b) { return (a && b) ? 1 : 0; }
    boolOr(a, b) { return (a || b) ? 1 : 0; }
    boolNot(a) { return a ? 0 : 1; }
    boolXor(a, b) { return (a !== b) ? 1 : 0; }

    // ===== COMPLEX NUMBERS =====
    complexAdd(a, b) {
        return { re: a.re + b.re, im: a.im + b.im };
    }
    complexSub(a, b) {
        return { re: a.re - b.re, im: a.im - b.im };
    }
    complexMul(a, b) {
        return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
    }
    complexDiv(a, b) {
        const denom = b.re * b.re + b.im * b.im;
        if (denom === 0) return { re: NaN, im: NaN };
        return {
            re: (a.re * b.re + a.im * b.im) / denom,
            im: (a.im * b.re - a.re * b.im) / denom
        };
    }
    complexConj(a) {
        return { re: a.re, im: -a.im };
    }
    complexMag(a) {
        return Math.sqrt(a.re * a.re + a.im * a.im);
    }
    complexArg(a) {
        return this.fromRadians(Math.atan2(a.im, a.re));
    }
    complexToPolar(a) {
        return { r: this.complexMag(a), theta: this.complexArg(a) };
    }
    polarToComplex(r, theta) {
        const rad = this.toRadians(theta);
        return { re: r * Math.cos(rad), im: r * Math.sin(rad) };
    }

    // ===== DATE CALCULATOR =====
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diff = Math.abs(d2 - d1);
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result.toISOString().split('T')[0];
    }
    dayOfWeek(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(date).getDay()];
    }
    weekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // ===== FINANCE =====
    compoundInterest(principal, rate, n, t) {
        return principal * Math.pow(1 + rate / n, n * t);
    }
    loanPayment(principal, annualRate, years, paymentsPerYear) {
        const r = annualRate / paymentsPerYear;
        const n = years * paymentsPerYear;
        if (r === 0) return principal / n;
        return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    totalLoanPayment(principal, annualRate, years, paymentsPerYear) {
        return this.loanPayment(principal, annualRate, years, paymentsPerYear) * years * paymentsPerYear;
    }
    totalInterest(principal, annualRate, years, paymentsPerYear) {
        return this.totalLoanPayment(principal, annualRate, years, paymentsPerYear) - principal;
    }

    // ===== HEALTH =====
    calculateBMI(weight, heightCm) {
        const heightM = heightCm / 100;
        return weight / (heightM * heightM);
    }
    bmiCategory(bmi) {
        if (bmi < 18.5) return 'Underweight';
        if (bmi < 25) return 'Normal';
        if (bmi < 30) return 'Overweight';
        return 'Obese';
    }
    calculateBMR(weight, heightCm, age, isMale) {
        if (isMale) {
            return 10 * weight + 6.25 * heightCm - 5 * age + 5;
        }
        return 10 * weight + 6.25 * heightCm - 5 * age - 161;
    }
    tdee(bmr, activityLevel) {
        const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
        return bmr * (multipliers[activityLevel] || 1.2);
    }

    // ===== DATA STORAGE CONVERTER =====
    dataConvert(value, from, to) {
        const toBytes = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, PB: 1024 ** 5 };
        return (value * (toBytes[from] || 1)) / (toBytes[to] || 1);
    }

    // ===== NON-LINEAR SOLVER (Newton-Raphson) =====
    solveEquation(expr, variable = 'x', guess = 0, tolerance = 1e-10, maxIter = 100) {
        let x = guess;
        for (let i = 0; i < maxIter; i++) {
            const f = this.evaluateFunctionAt(expr, variable, x);
            const h = 0.0001;
            const fPrime = (this.evaluateFunctionAt(expr, variable, x + h) - f) / h;
            if (Math.abs(fPrime) < 1e-15) break;
            const xNew = x - f / fPrime;
            if (Math.abs(xNew - x) < tolerance) return xNew;
            x = xNew;
        }
        return x;
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
    massConvert(value, from, to) {
        const toKg = { kg: 1, g: 0.001, mg: 1e-6, lb: 0.453592, oz: 0.0283495 };
        return (value * (toKg[from] || 1)) / (toKg[to] || 1);
    }
    timeConvert(value, from, to) {
        const toSec = { s: 1, min: 60, h: 3600, d: 86400, ms: 0.001 };
        return (value * (toSec[from] || 1)) / (toSec[to] || 1);
    }

    // ===== LINEAR EQUATIONS =====
    solveLinear2x2(a1, b1, c1, a2, b2, c2) {
        const det = a1 * b2 - a2 * b1;
        if (Math.abs(det) < 1e-10) return null;
        return { x: (c1 * b2 - c2 * b1) / det, y: (a1 * c2 - a2 * c1) / det };
    }
    solveLinear3x3(A, b) {
        const det = this.matrixDeterminant(A);
        if (Math.abs(det) < 1e-10) return null;
        const inv = this.matrixInverse(A);
        return inv[0].map((_, i) => inv.reduce((sum, row, j) => sum + row[i] * b[j], 0));
    }

    // ===== VECTORS =====
    vectorAdd(a, b) { 
        if (!a || !b || a.length === 0 || b.length === 0) return [];
        return a.map((v, i) => v + (b[i] || 0)); 
    }
    vectorSub(a, b) { 
        if (!a || !b || a.length === 0 || b.length === 0) return [];
        return a.map((v, i) => v - (b[i] || 0)); 
    }
    vectorDot(a, b) { 
        if (!a || !b || a.length === 0 || b.length === 0) return 0;
        return a.reduce((s, v, i) => s + v * (b[i] || 0), 0); 
    }
    vectorMag(v) { 
        if (!v || v.length === 0) return 0;
        return Math.sqrt(v.reduce((s, x) => s + x * x, 0)); 
    }
    vectorScale(v, k) { 
        if (!v || v.length === 0) return [];
        return v.map(x => x * k); 
    }
    angleBetweenVectors(a, b) {
        if (!a || !b || a.length === 0 || b.length === 0) return NaN;
        const dot = this.vectorDot(a, b), ma = this.vectorMag(a), mb = this.vectorMag(b);
        if (ma < 1e-10 || mb < 1e-10) return NaN;
        return this.fromRadians(Math.acos(Math.max(-1, Math.min(1, dot / (ma * mb)))));
    }
    polarToRect(r, theta) {
        const rad = this.toRadians(theta);
        return [r * Math.cos(rad), r * Math.sin(rad)];
    }
    rectToPolar(x, y) {
        const r = this.vectorMag([x, y]);
        return [r, this.fromRadians(Math.atan2(y, x))];
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
    evaluateFunctionAt(expr, variable = 'x', value, yVal = null, zVal = null) {
        try {
            let evalExpr = expr;
            
            if (typeof value === 'object') {
                evalExpr = evalExpr.replace(/\bx\b/g, `(${value[0]})`);
                evalExpr = evalExpr.replace(/\by\b/g, `(${value[1]})`);
                evalExpr = evalExpr.replace(/\bz\b/g, `(${value[2]})`);
            } else {
                evalExpr = evalExpr.replace(/\bx\b/g, `(${value})`);
                if (yVal !== null) evalExpr = evalExpr.replace(/\by\b/g, `(${yVal})`);
                if (zVal !== null) evalExpr = evalExpr.replace(/\bz\b/g, `(${zVal})`);
            }
            
            evalExpr = evalExpr.replace(/π|pi/g, String(Math.PI));
            evalExpr = evalExpr.replace(/e(?![a-zA-Z])/g, String(Math.E));
            evalExpr = evalExpr.replace(/φ/g, '1.618033988749895');
            
            const funcs = [
                ['sin', 'Math.sin'], ['cos', 'Math.cos'], ['tan', 'Math.tan'],
                ['asin', 'Math.asin'], ['acos', 'Math.acos'], ['atan', 'Math.atan'],
                ['sinh', 'Math.sinh'], ['cosh', 'Math.cosh'], ['tanh', 'Math.tanh'],
                ['asinh', 'Math.asinh'], ['acosh', 'Math.acosh'], ['atanh', 'Math.atanh'],
                ['sqrt', 'Math.sqrt'], ['cbrt', 'Math.cbrt'], ['log', 'Math.log10'],
                ['ln', 'Math.log'], ['abs', 'Math.abs'], ['exp', 'Math.exp'],
                ['floor', 'Math.floor'], ['ceil', 'Math.ceil'], ['round', 'Math.round'],
                ['pow', 'Math.pow']
            ];
            funcs.forEach(([name, impl]) => {
                evalExpr = evalExpr.replace(new RegExp(name + '\\(', 'g'), impl + '(');
            });
            
            let open = (evalExpr.match(/\(/g) || []).length;
            let close = (evalExpr.match(/\)/g) || []).length;
            evalExpr += ')'.repeat(open - close);
            
            return Function('"use strict"; return (' + evalExpr + ');')();
        } catch (e) {
            return NaN;
        }
    }

    // ===== MATRIX OPERATIONS =====
    matrixAdd(A, B) {
        if (!A || !B || A.length === 0 || B.length === 0) return [];
        if (A.length !== B.length || A[0].length !== B[0].length) {
            alert('Matrices must have the same dimensions');
            return [];
        }
        return A.map((row, i) => row.map((val, j) => val + (B[i] ? B[i][j] : 0)));
    }

    matrixMultiply(A, B) {
        if (!A || !B || A.length === 0 || B.length === 0) return [];
        if (A[0].length !== B.length) {
            alert('Matrix dimensions incompatible for multiplication');
            return [];
        }
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
        if (!A || A.length === 0 || A[0].length === 0) return 0;
        const n = A.length;
        if (!A[0] || A[0].length !== n) {
            alert('Matrix must be square');
            return 0;
        }
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
        if (!A || A.length === 0 || A[0].length === 0) return [];
        return A[0].map((_, i) => A.map(row => row[i] || 0));
    }

    matrixInverse(A) {
        if (!A || A.length === 0) return null;
        const n = A.length;
        if (n !== A[0].length) {
            alert('Matrix must be square');
            return null;
        }
        const det = this.matrixDeterminant(A);
        if (Math.abs(det) < 1e-10) {
            alert('Matrix is singular (determinant is 0)');
            return null;
        }
        const adj = [];
        for (let i = 0; i < n; i++) {
            adj[i] = [];
            for (let j = 0; j < n; j++) {
                const minor = A.map((row, ri) => row.filter((_, cj) => cj !== j)).filter((_, ri) => ri !== i);
                adj[i][j] = ((i + j) % 2 ? -1 : 1) * this.matrixDeterminant(minor);
            }
        }
        const inv = this.matrixTranspose(adj);
        return inv.map(row => row.map(v => v / det));
    }

    matrixSubtract(A, B) {
        if (!A || !B || A.length === 0 || B.length === 0) return [];
        if (A.length !== B.length || A[0].length !== B[0].length) {
            alert('Matrices must have the same dimensions');
            return [];
        }
        return A.map((row, i) => row.map((val, j) => val - (B[i] ? B[i][j] : 0)));
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

    // ===== PARENTHESES CHECK =====
    checkParentheses(expr) {
        let depth = 0;
        for (const c of expr) {
            if (c === '(') depth++;
            else if (c === ')') { depth--; if (depth < 0) return { ok: false, msg: 'Extra closing parenthesis' }; }
        }
        if (depth > 0) return { ok: false, msg: 'Missing closing parenthesis' };
        return { ok: true };
    }

    // ===== EXPRESSION EVALUATION =====
    evaluateExpression(expr) {
        try {
            // Remove semicolons and trim to prevent inline JS syntax errors
            let e = String(expr).trim().replace(/;/g, '');
            const parenCheck = this.checkParentheses(e);
            if (!parenCheck.ok) return parenCheck.msg;

            // ANS
            e = e.replace(/\bANS\b/gi, this.lastAnswer != null ? String(this.lastAnswer) : '0');

            // Variables A-Z (single letter, not part of a word)
            for (const key of Object.keys(this.variables)) {
                const re = new RegExp('\\b' + key + '\\b', 'g');
                e = e.replace(re, String(this.variables[key]));
            }

            // Percent: 50% -> 0.5
            e = e.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, n) => String(parseFloat(n) / 100));

            // Constants
            e = e.replace(/π|pi/g, String(Math.PI));
            e = e.replace(/\be\b(?!\d)/g, String(Math.E));
            e = e.replace(/φ/g, '1.618033988749895');

            // Power: ^ -> **
            e = e.replace(/\^/g, '**');
            // Factorial: n! -> factorial(n)
            e = e.replace(/(\d+(?:\.\d+)?)\s*!/g, (_, n) => 'this.factorial(Math.floor(parseFloat("' + n + '")))');

            // Functions (order matters: longer names first)
            const funcs = [
                'asin', 'acos', 'atan', 'asec', 'acsc', 'acot', 'asinh', 'acosh', 'atanh',
                'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
                'sqrt', 'cbrt', 'log10', 'ln', 'exp', 'pow10', 'abs', 'floor', 'ceil', 'round', 'trunc',
                'log', 'nthRoot', 'reciprocal', 'factorial', 'permutation', 'combination',
                'gcd', 'lcm', 'modulo', 'intDiv', 'frac', 'decimalToFrac'
            ];
            funcs.forEach(fn => {
                const re = new RegExp('\\b' + fn + '\\s*\\(', 'g');
                e = e.replace(re, 'this.' + fn + '(');
            });

            const result = Function('"use strict"; return (' + e + ');').call(this);
            return this.formatResult(result);
        } catch (err) {
            return err.message && err.message.length < 60 ? err.message : 'Error';
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
            if (typeof result === 'string' && (result === 'Error' || result.startsWith('Missing') || result.startsWith('Extra'))) {
                this.result = result;
                this.updateDisplay();
                return;
            }
            const num = parseFloat(result);
            if (!isNaN(num) && isFinite(num)) this.lastAnswer = num;
            this.history.push(`${this.expression} = ${result}`);
            this.expressionHistory.push(this.expression);
            this.historyIndex = -1;
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
        const exprEl = document.getElementById('expressionDisplay');
        const resEl = document.getElementById('resultDisplay');
        const modeEl = document.getElementById('displayModeIndicator');
        if (exprEl) exprEl.textContent = this.expression || '';
        if (resEl) resEl.textContent = this.expression ? this.evaluateExpression(this.expression) : this.result;
        if (modeEl) modeEl.textContent = this.displayMode.toUpperCase() + ' | ' + this.angleMode.substring(0, 3).toUpperCase();
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

        // Keyboard support for expression history replay
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' && this.expressionHistory.length > 0) {
                e.preventDefault();
                if (this.historyIndex < this.expressionHistory.length - 1) {
                    this.historyIndex++;
                    this.expression = this.expressionHistory[this.expressionHistory.length - 1 - this.historyIndex];
                    this.updateDisplay();
                }
            } else if (e.key === 'ArrowDown' && this.expressionHistory.length > 0) {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.expression = this.expressionHistory[this.expressionHistory.length - 1 - this.historyIndex];
                    this.updateDisplay();
                } else if (this.historyIndex === 0) {
                    this.historyIndex = -1;
                    this.expression = '';
                    this.updateDisplay();
                }
            }
        });

        // Graph mode change
        document.getElementById('graphMode').addEventListener('change', (e) => {
            const input2 = document.getElementById('graphInput2');
            const input1 = document.getElementById('graphInput');
            if (e.target.value === 'parametric') {
                input2.style.display = 'block';
                input1.placeholder = 'x = f(t), e.g., cos(t)';
                input2.placeholder = 'y = f(t), e.g., sin(t)';
            } else if (e.target.value === 'polar') {
                input2.style.display = 'none';
                input1.placeholder = 'r = f(θ), e.g., 2*cos(θ)';
            } else {
                input2.style.display = 'none';
                input1.placeholder = 'y = f(x), e.g., sin(x)';
            }
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
                    else if (label === 'ANS') { if (this.lastAnswer != null) this.append(String(this.lastAnswer)); this.updateDisplay(); }
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
                { label: 'frac', fn: 'this.frac(' },
                { label: '→Frac', action: 'showDecimalToFracUI' },
            ],
            trig: [
                { label: 'sin', fn: 'this.sin(' },
                { label: 'cos', fn: 'this.cos(' },
                { label: 'tan', fn: 'this.tan(' },
                { label: 'sin⁻¹', fn: 'this.asin(' },
                { label: 'cos⁻¹', fn: 'this.acos(' },
                { label: 'tan⁻¹', fn: 'this.atan(' },
                { label: 'sec', fn: 'this.sec(' },
                { label: 'csc', fn: 'this.csc(' },
                { label: 'cot', fn: 'this.cot(' },
                { label: 'sec⁻¹', fn: 'this.asec(' },
                { label: 'csc⁻¹', fn: 'this.acsc(' },
                { label: 'cot⁻¹', fn: 'this.acot(' },
                { label: 'sinh', fn: 'this.sinh(' },
                { label: 'cosh', fn: 'this.cosh(' },
                { label: 'tanh', fn: 'this.tanh(' },
                { label: 'sinh⁻¹', fn: 'this.asinh(' },
                { label: 'cosh⁻¹', fn: 'this.acosh(' },
                { label: 'tanh⁻¹', fn: 'this.atanh(' },
            ],
            log: [
                { label: 'log₁₀', fn: 'this.log10(' },
                { label: 'ln', fn: 'this.ln(' },
                { label: 'eˣ', fn: 'this.exp(' },
                { label: '10ˣ', fn: 'this.pow10(' },
                { label: 'logₘ', fn: 'this.log(' },
                { label: 'ⁿ√', fn: 'this.nthRoot(' },
            ],
            stats: [
                { label: 'nPr', fn: 'this.permutation(' },
                { label: 'nCr', fn: 'this.combination(' },
                { label: 'n!', fn: 'this.factorial(' },
                { label: 'Mean', action: 'showStatsUI("mean")' },
                { label: 'Median', action: 'showStatsUI("median")' },
                { label: 'Mode', action: 'showStatsUI("mode")' },
                { label: 'Weighted Mean', action: 'showWeightedMeanUI' },
                { label: 'σ', action: 'showStatsUI("std")' },
                { label: 'Variance', action: 'showStatsUI("variance")' },
                { label: 'Σx²', action: 'showStatsUI("sumSq")' },
                { label: 'RND', fn: 'Math.random()' },
                { label: 'RandInt', action: 'showRandIntUI' },
                { label: 'Normal PDF', action: 'showNormalPDFUI' },
                { label: 'Normal CDF', action: 'showNormalCDFUI' },
                { label: 'GCD', fn: 'this.gcd(' },
                { label: 'LCM', fn: 'this.lcm(' },
                { label: 'Prime?', fn: 'this.isPrime(' },
                { label: 'mod', fn: 'this.modulo(' },
                { label: 'int÷', fn: 'this.intDiv(' },
            ],
            convert: [
                { label: 'M+', action: 'memoryAdd' },
                { label: 'M-', action: 'memorySubtract' },
                { label: 'MC', action: 'memoryClear' },
                { label: 'MR', action: 'memoryRecall' },
                { label: 'STO→Var', action: 'showStoreVarUI' },
                { label: 'Recall Var', action: 'showRecallVarUI' },
                { label: 'A', action: 'recallVar("A")' },
                { label: 'B', action: 'recallVar("B")' },
                { label: 'C', action: 'recallVar("C")' },
                { label: '°→Rad', action: 'setAngleMode("radian")' },
                { label: '°→Grad', action: 'setAngleMode("grad")' },
                { label: '°→DMS', action: 'showToDMSUI' },
                { label: 'DMS→°', action: 'showFromDMSUI' },
            ],
            algebra: [
                { label: '|x|', fn: 'abs(' },
                { label: 'floor', fn: 'floor(' },
                { label: 'ceil', fn: 'ceil(' },
                { label: 'round', fn: 'round(' },
                { label: 'Poly Eval', action: 'showPolyEvalUI' },
                { label: 'Quadratic', action: 'showQuadraticSolver' },
                { label: '2×2 Linear', action: 'showLinear2x2UI' },
                { label: '3×3 Linear', action: 'showLinear3x3UI' },
                { label: 'Non-Linear', action: 'showNonLinearSolverUI' },
            ],
            matrix: [
                { label: 'Det', action: 'showMatrixDetUI' },
                { label: 'Transpose', action: 'showMatrixTransposeUI' },
                { label: 'Inverse', action: 'showMatrixInverseUI' },
                { label: 'A+B', action: 'showMatrixAddUI' },
                { label: 'A−B', action: 'showMatrixSubUI' },
                { label: 'A×B', action: 'showMatrixMulUI' },
                { label: 'Save Mat', action: 'showSaveMatrixUI' },
                { label: 'Load Mat', action: 'showLoadMatrixUI' },
            ],
            constants: [
                { label: 'π', fn: String(Math.PI) },
                { label: 'e', fn: String(Math.E) },
                { label: 'φ', fn: '1.618033988749895' },
                { label: 'c', fn: '299792458' },
                { label: 'G', fn: '6.674e-11' },
                { label: 'h', fn: '6.626e-34' },
                { label: 'k', fn: '1.381e-23' },
                { label: 'Nₐ', fn: '6.022e23' },
            ],
            calculus: [
                { label: 'd/dx', action: 'showDifferentiateUI' },
                { label: '∫ab', action: 'showIntegrateUI' },
                { label: 'Limit', action: 'showLimitUI' },
                { label: 'Taylor', action: 'showTaylorUI' },
                { label: 'Critical Pts', action: 'showCriticalPointsUI' },
                { label: 'Min/Max', action: 'showExtremaUI' },
                { label: 'Inflection', action: 'showInflectionUI' },
            ],
            vectors: [
                { label: 'Vector +', action: 'showVectorAddUI' },
                { label: 'Vector −', action: 'showVectorSubUI' },
                { label: 'Dot', action: 'showVectorDotUI' },
                { label: '|v|', action: 'showVectorMagUI' },
                { label: 'Angle', action: 'showVectorAngleUI' },
                { label: 'Polar→Rect', action: 'showPolarToRectUI' },
                { label: 'Rect→Polar', action: 'showRectToPolarUI' },
                { label: 'Save Vec', action: 'showSaveVectorUI' },
                { label: 'Load Vec', action: 'showLoadVectorUI' },
            ],
            units: [
                { label: 'Length', action: 'showUnitConvertUI("length")' },
                { label: 'Mass', action: 'showUnitConvertUI("mass")' },
                { label: 'Time', action: 'showUnitConvertUI("time")' },
                { label: 'Temp', action: 'showUnitConvertUI("temp")' },
            ],
            logic: [
                { label: 'AND', fn: 'this.boolAnd(' },
                { label: 'OR', fn: 'this.boolOr(' },
                { label: 'NOT', fn: 'this.boolNot(' },
                { label: 'XOR', fn: 'this.boolXor(' },
                { label: 'Dec→Bin', action: 'showBaseConvertUI("dec2bin")' },
                { label: 'Bin→Dec', action: 'showBaseConvertUI("bin2dec")' },
                { label: 'Dec→Hex', action: 'showBaseConvertUI("dec2hex")' },
                { label: 'Hex→Dec', action: 'showBaseConvertUI("hex2dec")' },
            ],
            complex: [
                { label: 'a+bi Add', action: 'showComplexAddUI' },
                { label: 'a+bi Sub', action: 'showComplexSubUI' },
                { label: 'a+bi ×', action: 'showComplexMulUI' },
                { label: 'a+bi ÷', action: 'showComplexDivUI' },
                { label: 'Conjugate', action: 'showComplexConjUI' },
                { label: '|a+bi|', action: 'showComplexMagUI' },
                { label: 'arg(a+bi)', action: 'showComplexArgUI' },
                { label: '→Polar', action: 'showComplexToPolarUI' },
                { label: 'Polar→', action: 'showPolarToComplexUI' },
            ],
            finance: [
                { label: 'Compound', action: 'showCompoundInterestUI' },
                { label: 'Loan Pmt', action: 'showLoanPaymentUI' },
                { label: 'Total Pmt', action: 'showTotalLoanUI' },
                { label: 'Total Int', action: 'showTotalInterestUI' },
            ],
            health: [
                { label: 'BMI', action: 'showBMIUI' },
                { label: 'BMR', action: 'showBMRUI' },
                { label: 'TDEE', action: 'showTDEEUI' },
            ],
            date: [
                { label: 'Days Between', action: 'showDaysBetweenUI' },
                { label: 'Add Days', action: 'showAddDaysUI' },
                { label: 'Day of Week', action: 'showDayOfWeekUI' },
                { label: 'Week #', action: 'showWeekNumberUI' },
            ],
            data: [
                { label: 'Data Conv', action: 'showDataConvertUI' },
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
                    else if (f.action === 'memoryRecall') this.memoryRecall();
                    else if (f.action === 'showStoreVarUI') this.showStoreVarUI();
                    else if (f.action === 'showRecallVarUI') this.showRecallVarUI();
                    else if (f.action.startsWith('storeVar')) this.storeVar(f.action.slice(9, -2));
                    else if (f.action.startsWith('recallVar')) this.recallVar(f.action.slice(10, -2));
                    else if (f.action.startsWith('showStatsUI')) this.showStatsUI(f.action.slice(12, -2));
                    else if (f.action === 'showWeightedMeanUI') this.showWeightedMeanUI();
                    else if (f.action === 'showRandIntUI') this.showRandIntUI();
                    else if (f.action === 'showNormalPDFUI') this.showNormalPDFUI();
                    else if (f.action === 'showNormalCDFUI') this.showNormalCDFUI();
                    else if (f.action === 'showPolyEvalUI') this.showPolyEvalUI();
                    else if (f.action === 'showQuadraticSolver') this.showQuadraticSolver();
                    else if (f.action === 'showLinear2x2UI') this.showLinear2x2UI();
                    else if (f.action === 'showLinear3x3UI') this.showLinear3x3UI();
                    else if (f.action === 'showNonLinearSolverUI') this.showNonLinearSolverUI();
                    else if (f.action === 'showMatrixDetUI') this.showMatrixDetUI();
                    else if (f.action === 'showMatrixTransposeUI') this.showMatrixTransposeUI();
                    else if (f.action === 'showMatrixInverseUI') this.showMatrixInverseUI();
                    else if (f.action === 'showMatrixAddUI') this.showMatrixAddUI();
                    else if (f.action === 'showMatrixSubUI') this.showMatrixSubUI();
                    else if (f.action === 'showMatrixMulUI') this.showMatrixMulUI();
                    else if (f.action === 'showSaveMatrixUI') this.showSaveMatrixUI();
                    else if (f.action === 'showLoadMatrixUI') this.showLoadMatrixUI();
                    else if (f.action === 'showPolarToRectUI') this.showPolarToRectUI();
                    else if (f.action === 'showRectToPolarUI') this.showRectToPolarUI();
                    else if (f.action === 'showVectorAddUI') this.showVectorAddUI();
                    else if (f.action === 'showVectorSubUI') this.showVectorSubUI();
                    else if (f.action === 'showVectorDotUI') this.showVectorDotUI();
                    else if (f.action === 'showVectorMagUI') this.showVectorMagUI();
                    else if (f.action === 'showVectorAngleUI') this.showVectorAngleUI();
                    else if (f.action === 'showSaveVectorUI') this.showSaveVectorUI();
                    else if (f.action === 'showLoadVectorUI') this.showLoadVectorUI();
                    else if (f.action === 'showToDMSUI') this.showToDMSUI();
                    else if (f.action === 'showFromDMSUI') this.showFromDMSUI();
                    else if (f.action === 'showDecimalToFracUI') this.showDecimalToFracUI();
                    else if (f.action.startsWith('showUnitConvertUI')) this.showUnitConvertUI(f.action.slice(17, -2));
                    else if (f.action.startsWith('showBaseConvertUI')) this.showBaseConvertUI(f.action.slice(17, -2));
                    else if (f.action === 'showDifferentiateUI') this.showDifferentiateUI();
                    else if (f.action === 'showIntegrateUI') this.showIntegrateUI();
                    else if (f.action === 'showLimitUI') this.showLimitUI();
                    else if (f.action === 'showTaylorUI') this.showTaylorUI();
                    else if (f.action === 'showCriticalPointsUI') this.showCriticalPointsUI();
                    else if (f.action === 'showExtremaUI') this.showExtremaUI();
                    else if (f.action === 'showInflectionUI') this.showInflectionUI();
                    // Complex
                    else if (f.action === 'showComplexAddUI') this.showComplexAddUI();
                    else if (f.action === 'showComplexSubUI') this.showComplexSubUI();
                    else if (f.action === 'showComplexMulUI') this.showComplexMulUI();
                    else if (f.action === 'showComplexDivUI') this.showComplexDivUI();
                    else if (f.action === 'showComplexConjUI') this.showComplexConjUI();
                    else if (f.action === 'showComplexMagUI') this.showComplexMagUI();
                    else if (f.action === 'showComplexArgUI') this.showComplexArgUI();
                    else if (f.action === 'showComplexToPolarUI') this.showComplexToPolarUI();
                    else if (f.action === 'showPolarToComplexUI') this.showPolarToComplexUI();
                    // Finance
                    else if (f.action === 'showCompoundInterestUI') this.showCompoundInterestUI();
                    else if (f.action === 'showLoanPaymentUI') this.showLoanPaymentUI();
                    else if (f.action === 'showTotalLoanUI') this.showTotalLoanUI();
                    else if (f.action === 'showTotalInterestUI') this.showTotalInterestUI();
                    // Health
                    else if (f.action === 'showBMIUI') this.showBMIUI();
                    else if (f.action === 'showBMRUI') this.showBMRUI();
                    else if (f.action === 'showTDEEUI') this.showTDEEUI();
                    // Date
                    else if (f.action === 'showDaysBetweenUI') this.showDaysBetweenUI();
                    else if (f.action === 'showAddDaysUI') this.showAddDaysUI();
                    else if (f.action === 'showDayOfWeekUI') this.showDayOfWeekUI();
                    else if (f.action === 'showWeekNumberUI') this.showWeekNumberUI();
                    // Data
                    else if (f.action === 'showDataConvertUI') this.showDataConvertUI();
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
    
    showPolyEvalUI() {
        const coeffsRaw = prompt('Enter polynomial coefficients from highest degree to lowest (e.g. 1, -4, 3 for x^2-4x+3):');
        if (!coeffsRaw) return;
        const coeffs = coeffsRaw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (coeffs.length === 0) return;
        
        const x = parseFloat(prompt('Evaluate at x = '));
        if (isNaN(x)) return;
        
        // Horner's method
        let result = coeffs[0];
        for (let i = 1; i < coeffs.length; i++) {
            result = result * x + coeffs[i];
        }
        
        this.expression = `P(${x}) = ${this.formatResult(result)}`;
        this.updateDisplay();
    }

    storeVar(name) {
        const val = parseFloat(this.result) || this.lastAnswer;
        if (val == null || isNaN(val)) { alert('Calculate a result first'); return; }
        this.variables[name] = val;
        this.expression = `${name}=${val}`;
        this.updateDisplay();
    }
    recallVar(name) {
        if (this.variables[name] != null) this.append(String(this.variables[name]));
        else this.append('0');
        this.updateDisplay();
    }
    showStoreVarUI() {
        const name = prompt('Enter variable name (e.g. D, X, TEMP):');
        if (name) {
            // validate valid identifier
            if (/^[a-zA-Z_]\w*$/.test(name)) {
                this.storeVar(name);
            } else {
                alert('Invalid variable name. Use letters without spaces.');
            }
        }
    }
    showRecallVarUI() {
        const name = prompt('Enter variable name to recall:');
        if (name) {
            this.recallVar(name);
        }
    }
    showStatsUI(op) {
        const raw = prompt('Enter numbers separated by commas:');
        if (!raw) return;
        const arr = raw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (arr.length === 0) { alert('Invalid numbers'); return; }
        let r;
        if (op === 'mean') r = this.mean(arr);
        else if (op === 'median') r = this.median(arr);
        else if (op === 'mode') r = this.mode(arr);
        else if (op === 'std') r = this.stdDev(arr);
        else if (op === 'variance') r = this.variance(arr);
        else if (op === 'sumSq') r = this.sumSquares(arr);
        this.expression = op + '(' + arr.join(',') + ') = ' + (Array.isArray(r) ? r.join(', ') : this.formatResult(r));
        this.updateDisplay();
    }
    showRandIntUI() {
        const a = parseInt(prompt('Min (integer):'), 10);
        const b = parseInt(prompt('Max (integer):'), 10);
        if (isNaN(a) || isNaN(b)) return;
        const r = this.randInt(a, b);
        this.expression = 'RandInt(' + a + ',' + b + ') = ' + r;
        this.updateDisplay();
    }
    showNormalCDFUI() {
        const x = parseFloat(prompt('x value:'));
        const mu = parseFloat(prompt('Mean μ (default 0):', '0')) || 0;
        const sigma = parseFloat(prompt('Std σ (default 1):', '1')) || 1;
        if (isNaN(x)) return;
        const r = this.normalCdf(x, mu, sigma);
        this.expression = 'Φ(' + x + ') ≈ ' + r.toFixed(6);
        this.updateDisplay();
    }
    showNormalPDFUI() {
        const x = parseFloat(prompt('x value:'));
        const mu = parseFloat(prompt('Mean μ (default 0):', '0')) || 0;
        const sigma = parseFloat(prompt('Std σ (default 1):', '1')) || 1;
        if (isNaN(x)) return;
        const r = this.normalPdf(x, mu, sigma);
        this.expression = 'N(x) ≈ ' + r.toFixed(6);
        this.updateDisplay();
    }
    showWeightedMeanUI() {
        const vRaw = prompt('Enter values separated by commas:');
        if (!vRaw) return;
        const v = vRaw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        const wRaw = prompt('Enter weights separated by commas:');
        if (!wRaw) return;
        const w = wRaw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (v.length === 0 || w.length === 0 || v.length !== w.length) {
            alert('Values and weights must have the same length and be valid numbers.');
            return;
        }
        const r = this.weightedMean(v, w);
        this.expression = 'Weighted Mean = ' + this.formatResult(r);
        this.updateDisplay();
    }
    showLinear2x2UI() {
        const s = prompt('Enter a1 b1 c1 a2 b2 c2 (space-separated):\nEq1: a1*x+b1*y=c1, Eq2: a2*x+b2*y=c2');
        if (!s) return;
        const n = s.trim().split(/\s+/).map(Number);
        if (n.length < 6) { alert('Need 6 numbers'); return; }
        const r = this.solveLinear2x2(n[0], n[1], n[2], n[3], n[4], n[5]);
        if (!r) this.expression = 'No unique solution';
        else this.expression = 'x = ' + r.x.toFixed(6) + ', y = ' + r.y.toFixed(6);
        this.updateDisplay();
    }
    showLinear3x3UI() {
        alert('Enter 3×3 matrix A (9 numbers, row by row) and 3 values b (space-separated). Example: 1 0 0 0 1 0 0 0 1 5 6 7');
        const s = prompt('A row1 row2 row3 then b1 b2 b3:');
        if (!s) return;
        const n = s.trim().split(/\s+/).map(Number);
        if (n.length < 12) { alert('Need 12 numbers'); return; }
        const A = [n.slice(0, 3), n.slice(3, 6), n.slice(6, 9)];
        const b = n.slice(9, 12);
        const r = this.solveLinear3x3(A, b);
        if (!r) this.expression = 'No unique solution';
        else this.expression = 'x = ' + r.map(v => v.toFixed(6)).join(', ');
        this.updateDisplay();
    }
    solveNonLinear(equations, guesses, tolerance = 1e-10, maxIter = 100) {
        const n = equations.length;
        let x = [...guesses];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const f = equations.map(eq => {
                return this.evaluateFunctionAt(eq, 'x', x[0], x[1], x[2]);
            });
            
            let maxError = Math.max(...f.map(Math.abs));
            if (maxError < tolerance) {
                return { solution: x, converged: true, iterations: iter };
            }
            
            const jacobian = [];
            const h = 0.0001;
            for (let i = 0; i < n; i++) {
                const row = [];
                for (let j = 0; j < n; j++) {
                    const xPlus = [...x];
                    xPlus[j] += h;
                    const f1 = this.evaluateFunctionAt(equations[i], 'x', xPlus[0], xPlus[1], xPlus[2]);
                    const f0 = this.evaluateFunctionAt(equations[i], 'x', x[0], x[1], x[2]);
                    row.push((f1 - f0) / h);
                }
                jacobian.push(row);
            }
            
            try {
                const invJ = this.matrixInverse(jacobian);
                if (!invJ) return { solution: x, converged: false, iterations: iter };
                
                for (let i = 0; i < n; i++) {
                    let delta = 0;
                    for (let j = 0; j < n; j++) {
                        delta += invJ[i][j] * f[j];
                    }
                    x[i] -= delta;
                }
            } catch (e) {
                return { solution: x, converged: false, iterations: iter };
            }
        }
        return { solution: x, converged: false, iterations: maxIter };
    }
    showNonLinearSolverUI() {
        const numVars = parseInt(prompt('Number of equations (2 or 3):', '2'), 10);
        if (numVars !== 2 && numVars !== 3) { alert('Only 2 or 3 equations supported'); return; }
        
        const equations = [];
        for (let i = 0; i < numVars; i++) {
            const eq = prompt(`Equation ${i + 1} (use x, y, z; leave =0 implicit):\nExample: x^2 + y^2 - 4`);
            if (!eq) return;
            equations.push(eq.replace(/=.*$/, '').trim());
        }
        
        const guesses = [];
        if (numVars >= 2) guesses.push(parseFloat(prompt('Initial guess for x:', '1')) || 1);
        if (numVars >= 2) guesses.push(parseFloat(prompt('Initial guess for y:', '1')) || 1);
        if (numVars === 3) guesses.push(parseFloat(prompt('Initial guess for z:', '1')) || 1);
        
        const result = this.solveNonLinear(equations, guesses);
        const vars = numVars === 2 ? ['x', 'y'] : ['x', 'y', 'z'];
        const sol = result.solution.map((v, i) => `${vars[i]} = ${v.toFixed(8)}`).join(', ');
        this.expression = `Non-linear: ${result.converged ? 'Converged' : 'Did not converge'} (${result.iterations} iter): ${sol}`;
        this.updateDisplay();
    }
    parseMatrix2D(str) {
        if (!str || typeof str !== 'string') return [];
        const rows = str.trim().split(/[;\n]+/);
        return rows.map(row => {
            const vals = row.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            return vals.length > 0 ? vals : [0];
        }).filter(row => row.length > 0);
    }
    showMatrixDetUI() {
        const s = prompt('Enter matrix (rows separated by ; or newline)\nExample: 1 2 ; 3 4');
        if (!s) return;
        const A = this.parseMatrix2D(s);
        const r = this.matrixDeterminant(A);
        this.expression = 'det = ' + this.formatResult(r);
        this.updateDisplay();
    }
    showMatrixTransposeUI() {
        const s = prompt('Enter matrix (rows ; separated)\nExample: 1 2 ; 3 4');
        if (!s) return;
        const A = this.parseMatrix2D(s);
        const T = this.matrixTranspose(A);
        this.expression = 'Transpose = ' + JSON.stringify(T);
        this.updateDisplay();
    }
    showMatrixInverseUI() {
        const s = prompt('Enter square matrix (rows ; separated)');
        if (!s) return;
        const A = this.parseMatrix2D(s);
        const inv = this.matrixInverse(A);
        if (!inv) this.expression = 'No inverse';
        else this.expression = 'Inverse = ' + JSON.stringify(inv);
        this.updateDisplay();
    }
    showMatrixAddUI() {
        const s = prompt('Matrix A (rows ; sep):');
        if (!s) return;
        const A = this.parseMatrix2D(s);
        const t = prompt('Matrix B (same size):');
        if (!t) return;
        const B = this.parseMatrix2D(t);
        const r = this.matrixAdd(A, B);
        this.expression = 'A+B = ' + JSON.stringify(r);
        this.updateDisplay();
    }
    showMatrixSubUI() {
        const s = prompt('Matrix A:');
        if (!s) return;
        const A = this.parseMatrix2D(s);
        const t = prompt('Matrix B:');
        if (!t) return;
        const B = this.parseMatrix2D(t);
        const r = this.matrixSubtract(A, B);
        this.expression = 'A−B = ' + JSON.stringify(r);
        this.updateDisplay();
    }
    showMatrixMulUI() {
        const s = prompt('Matrix A:');
        if (!s) return;
        const A = this.parseMatrix2D(s);
        const t = prompt('Matrix B (cols A = rows B):');
        if (!t) return;
        const B = this.parseMatrix2D(t);
        const r = this.matrixMultiply(A, B);
        this.expression = 'A×B = ' + JSON.stringify(r);
        this.updateDisplay();
    }
    showSaveMatrixUI() {
        const name = prompt('Enter name for this matrix:');
        if (!name) return;
        const s = prompt('Enter matrix (rows separated by ; or newline)\nExample: 1 2 ; 3 4');
        if (!s) return;
        const A = this.parseMatrix2D(s);
        this.matrixStorage[name] = A;
        this.expression = `Saved matrix ${name} = ${JSON.stringify(A)}`;
        this.updateDisplay();
    }
    showLoadMatrixUI() {
        const name = prompt('Enter matrix name to load:');
        if (!name || !this.matrixStorage[name]) {
            if (name) alert(`Matrix "${name}" not found`);
            return;
        }
        const A = this.matrixStorage[name];
        this.expression = `${name} = ${JSON.stringify(A)}`;
        this.updateDisplay();
    }
    parseVector(str) {
        if (!str || typeof str !== 'string') return [];
        const v = str.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        return v.length > 0 ? v : [];
    }
    showVectorDotUI() {
        const a = this.parseVector(prompt('Vector A (e.g. 1 2 or 1,2,3):'));
        const b = this.parseVector(prompt('Vector B:'));
        if (a.length === 0 || b.length === 0) return;
        const r = this.vectorDot(a, b);
        this.expression = 'A·B = ' + this.formatResult(r);
        this.updateDisplay();
    }
    showVectorMagUI() {
        const v = this.parseVector(prompt('Vector (e.g. 3 4):'));
        if (v.length === 0) return;
        const r = this.vectorMag(v);
        this.expression = '|v| = ' + this.formatResult(r);
        this.updateDisplay();
    }
    showVectorAngleUI() {
        const a = this.parseVector(prompt('Vector A:'));
        const b = this.parseVector(prompt('Vector B:'));
        if (a.length === 0 || b.length === 0) return;
        const r = this.angleBetweenVectors(a, b);
        this.expression = 'angle = ' + this.formatResult(r) + '°';
        this.updateDisplay();
    }
    showPolarToRectUI() {
        const r = parseFloat(prompt('r:'));
        const th = parseFloat(prompt('θ (degrees):'));
        if (isNaN(r) || isNaN(th)) return;
        const [x, y] = this.polarToRect(r, th);
        this.expression = 'x = ' + x.toFixed(6) + ', y = ' + y.toFixed(6);
        this.updateDisplay();
    }
    showRectToPolarUI() {
        const x = parseFloat(prompt('x:'));
        const y = parseFloat(prompt('y:'));
        if (isNaN(x) || isNaN(y)) return;
        const [r, theta] = this.rectToPolar(x, y);
        this.expression = 'r = ' + r.toFixed(6) + ', θ = ' + theta.toFixed(6) + '°';
        this.updateDisplay();
    }
    showSaveVectorUI() {
        const name = prompt('Enter name for this vector:');
        if (!name) return;
        const v = this.parseVector(prompt('Enter vector components (e.g. 1 2 or 1,2,3):'));
        if (v.length === 0) return;
        this.vectorStorage[name] = v;
        this.expression = `Saved vector ${name} = [${v.join(', ')}]`;
        this.updateDisplay();
    }
    showLoadVectorUI() {
        const name = prompt('Enter vector name to load:');
        if (!name || !this.vectorStorage[name]) {
            if (name) alert(`Vector "${name}" not found`);
            return;
        }
        const v = this.vectorStorage[name];
        this.expression = `${name} = [${v.join(', ')}]`;
        this.updateDisplay();
    }
    showVectorAddUI() {
        const a = this.parseVector(prompt('Vector A (e.g. 1 2 or 1,2,3):'));
        if (a.length === 0) return;
        const b = this.parseVector(prompt('Vector B (same size):'));
        if (b.length === 0) return;
        const r = this.vectorAdd(a, b);
        this.expression = 'A+B = [' + r.map(x => this.formatResult(x)).join(', ') + ']';
        this.updateDisplay();
    }
    showVectorSubUI() {
        const a = this.parseVector(prompt('Vector A (e.g. 1 2 or 1,2,3):'));
        if (a.length === 0) return;
        const b = this.parseVector(prompt('Vector B (same size):'));
        if (b.length === 0) return;
        const r = this.vectorSub(a, b);
        this.expression = 'A-B = [' + r.map(x => this.formatResult(x)).join(', ') + ']';
        this.updateDisplay();
    }
    showDecimalToFracUI() {
        const val = parseFloat(this.result) || this.lastAnswer;
        if (val == null || isNaN(val)) { alert('Enter or calculate a decimal first'); return; }
        const r = this.decimalToFrac(val);
        this.expression = val + ' = ' + r;
        this.updateDisplay();
    }
    showToDMSUI() {
        const deg = parseFloat(prompt('Degrees (decimal):'));
        if (isNaN(deg)) return;
        const { d, m, s } = this.toDMS(deg);
        this.expression = deg + '° = ' + d + '° ' + m + "' " + s.toFixed(2) + '"';
        this.updateDisplay();
    }
    showFromDMSUI() {
        const d = parseFloat(prompt('Degrees (int):'));
        const m = parseFloat(prompt('Minutes:'));
        const s = parseFloat(prompt('Seconds:'));
        if (isNaN(d)) return;
        const r = this.fromDMS(d, m || 0, s || 0);
        this.expression = d + '° ' + (m || 0) + "' " + (s || 0) + '" = ' + r.toFixed(6) + '°';
        this.updateDisplay();
    }
    showUnitConvertUI(kind) {
        const val = parseFloat(prompt('Value:'));
        if (isNaN(val)) return;
        const from = prompt('From unit (e.g. m, km, ft):').toLowerCase();
        const to = prompt('To unit:').toLowerCase();
        let r;
        if (kind === 'length') r = this.lengthConvert(val, from, to);
        else if (kind === 'mass') r = this.massConvert(val, from, to);
        else if (kind === 'time') r = this.timeConvert(val, from, to);
        else if (kind === 'temp') r = this.tempConvert(val, from.toUpperCase(), to.toUpperCase());
        else return;
        this.expression = val + ' ' + from + ' = ' + this.formatResult(r) + ' ' + to;
        this.updateDisplay();
    }
    showBaseConvertUI(kind) {
        const s = prompt('Enter number or string:');
        if (s === null) return;
        let r;
        if (kind === 'dec2bin') r = this.dec2bin(parseInt(s, 10));
        else if (kind === 'bin2dec') r = this.bin2dec(s);
        else if (kind === 'dec2hex') r = this.dec2hex(parseInt(s, 10));
        else if (kind === 'hex2dec') r = this.hex2dec(s);
        else return;
        this.expression = kind + '(' + s + ') = ' + r;
        this.updateDisplay();
    }

    // ===== COMPLEX NUMBERS UI =====
    showComplexAddUI() {
        const a = { re: parseFloat(prompt('a (real):')), im: parseFloat(prompt('a (imag):')) };
        const b = { re: parseFloat(prompt('b (real):')), im: parseFloat(prompt('b (imag):')) };
        const r = this.complexAdd(a, b);
        this.expression = `(${a.re}${a.im>=0?'+':''}${a.im}i) + (${b.re}${b.im>=0?'+':''}${b.im}i) = ${r.re.toFixed(4)}${r.im>=0?'+':''}${r.im.toFixed(4)}i`;
        this.updateDisplay();
    }
    showComplexSubUI() {
        const a = { re: parseFloat(prompt('a (real):')), im: parseFloat(prompt('a (imag):')) };
        const b = { re: parseFloat(prompt('b (real):')), im: parseFloat(prompt('b (imag):')) };
        const r = this.complexSub(a, b);
        this.expression = `(${a.re}${a.im>=0?'+':''}${a.im}i) - (${b.re}${b.im>=0?'+':''}${b.im}i) = ${r.re.toFixed(4)}${r.im>=0?'+':''}${r.im.toFixed(4)}i`;
        this.updateDisplay();
    }
    showComplexMulUI() {
        const a = { re: parseFloat(prompt('a (real):')), im: parseFloat(prompt('a (imag):')) };
        const b = { re: parseFloat(prompt('b (real):')), im: parseFloat(prompt('b (imag):')) };
        const r = this.complexMul(a, b);
        this.expression = `(${a.re}${a.im>=0?'+':''}${a.im}i) × (${b.re}${b.im>=0?'+':''}${b.im}i) = ${r.re.toFixed(4)}${r.im>=0?'+':''}${r.im.toFixed(4)}i`;
        this.updateDisplay();
    }
    showComplexDivUI() {
        const a = { re: parseFloat(prompt('a (real):')), im: parseFloat(prompt('a (imag):')) };
        const b = { re: parseFloat(prompt('b (real):')), im: parseFloat(prompt('b (imag):')) };
        const r = this.complexDiv(a, b);
        this.expression = `(${a.re}${a.im>=0?'+':''}${a.im}i) ÷ (${b.re}${b.im>=0?'+':''}${b.im}i) = ${r.re.toFixed(4)}${r.im>=0?'+':''}${r.im.toFixed(4)}i`;
        this.updateDisplay();
    }
    showComplexConjUI() {
        const a = { re: parseFloat(prompt('a (real):')), im: parseFloat(prompt('a (imag):')) };
        const r = this.complexConj(a);
        this.expression = `conj(${a.re}${a.im>=0?'+':''}${a.im}i) = ${r.re.toFixed(4)}${r.im>=0?'+':''}${r.im.toFixed(4)}i`;
        this.updateDisplay();
    }
    showComplexMagUI() {
        const a = { re: parseFloat(prompt('a (real):')), im: parseFloat(prompt('a (imag):')) };
        const r = this.complexMag(a);
        this.expression = `|${a.re}${a.im>=0?'+':''}${a.im}i| = ${r.toFixed(4)}`;
        this.updateDisplay();
    }
    showComplexArgUI() {
        const a = { re: parseFloat(prompt('a (real):')), im: parseFloat(prompt('a (imag):')) };
        const r = this.complexArg(a);
        this.expression = `arg(${a.re}${a.im>=0?'+':''}${a.im}i) = ${r.toFixed(4)}°`;
        this.updateDisplay();
    }
    showComplexToPolarUI() {
        const a = { re: parseFloat(prompt('a (real):')), im: parseFloat(prompt('a (imag):')) };
        const r = this.complexToPolar(a);
        this.expression = `${a.re}${a.im>=0?'+':''}${a.im}i → (${r.r.toFixed(4)}, ${r.theta.toFixed(4)}°)`;
        this.updateDisplay();
    }
    showPolarToComplexUI() {
        const r = parseFloat(prompt('r (magnitude):'));
        const theta = parseFloat(prompt('θ (degrees):'));
        const a = this.polarToComplex(r, theta);
        this.expression = `(${r}, ${theta}°) → ${a.re.toFixed(4)}${a.im>=0?'+':''}${a.im.toFixed(4)}i`;
        this.updateDisplay();
    }

    // ===== FINANCE UI =====
    showCompoundInterestUI() {
        const p = parseFloat(prompt('Principal:'));
        const r = parseFloat(prompt('Annual rate (as decimal, e.g. 0.05 for 5%):'));
        const n = parseFloat(prompt('Compounds per year:'));
        const t = parseFloat(prompt('Years:'));
        const result = this.compoundInterest(p, r, n, t);
        this.expression = `Compound Interest: P=${p}, r=${r}, n=${n}, t=${t} → A=${result.toFixed(2)}`;
        this.updateDisplay();
    }
    showLoanPaymentUI() {
        const p = parseFloat(prompt('Loan amount:'));
        const r = parseFloat(prompt('Annual interest rate (decimal):'));
        const y = parseFloat(prompt('Years:'));
        const n = parseFloat(prompt('Payments per year (12=monthly):'));
        const result = this.loanPayment(p, r, y, n);
        this.expression = `Monthly payment: $${result.toFixed(2)}`;
        this.updateDisplay();
    }
    showTotalLoanUI() {
        const p = parseFloat(prompt('Loan amount:'));
        const r = parseFloat(prompt('Annual interest rate (decimal):'));
        const y = parseFloat(prompt('Years:'));
        const n = parseFloat(prompt('Payments per year:'));
        const result = this.totalLoanPayment(p, r, y, n);
        this.expression = `Total payment: $${result.toFixed(2)}`;
        this.updateDisplay();
    }
    showTotalInterestUI() {
        const p = parseFloat(prompt('Loan amount:'));
        const r = parseFloat(prompt('Annual interest rate (decimal):'));
        const y = parseFloat(prompt('Years:'));
        const n = parseFloat(prompt('Payments per year:'));
        const result = this.totalInterest(p, r, y, n);
        this.expression = `Total interest: $${result.toFixed(2)}`;
        this.updateDisplay();
    }

    // ===== HEALTH UI =====
    showBMIUI() {
        const w = parseFloat(prompt('Weight (kg):'));
        const h = parseFloat(prompt('Height (cm):'));
        const bmi = this.calculateBMI(w, h);
        const cat = this.bmiCategory(bmi);
        this.expression = `BMI = ${bmi.toFixed(1)} (${cat})`;
        this.updateDisplay();
    }
    showBMRUI() {
        const w = parseFloat(prompt('Weight (kg):'));
        const h = parseFloat(prompt('Height (cm):'));
        const age = parseFloat(prompt('Age:'));
        const isMale = confirm('Male? OK for male, Cancel for female');
        const bmr = this.calculateBMR(w, h, age, isMale);
        this.expression = `BMR = ${bmr.toFixed(0)} kcal/day`;
        this.updateDisplay();
    }
    showTDEEUI() {
        const w = parseFloat(prompt('Weight (kg):'));
        const h = parseFloat(prompt('Height (cm):'));
        const age = parseFloat(prompt('Age:'));
        const isMale = confirm('Male? OK for male, Cancel for female');
        const act = prompt('Activity (sedentary/light/moderate/active/veryActive):');
        const bmr = this.calculateBMR(w, h, age, isMale);
        const tdee = this.tdee(bmr, act);
        this.expression = `TDEE = ${tdee.toFixed(0)} kcal/day`;
        this.updateDisplay();
    }

    // ===== DATE UI =====
    showDaysBetweenUI() {
        const d1 = prompt('Start date (YYYY-MM-DD):');
        const d2 = prompt('End date (YYYY-MM-DD):');
        const result = this.daysBetween(d1, d2);
        this.expression = `Days between: ${result}`;
        this.updateDisplay();
    }
    showAddDaysUI() {
        const d = prompt('Start date (YYYY-MM-DD):');
        const days = parseFloat(prompt('Days to add:'));
        const result = this.addDays(d, days);
        this.expression = `${d} + ${days} days = ${result}`;
        this.updateDisplay();
    }
    showDayOfWeekUI() {
        const d = prompt('Date (YYYY-MM-DD):');
        const result = this.dayOfWeek(d);
        this.expression = `${d} is ${result}`;
        this.updateDisplay();
    }
    showWeekNumberUI() {
        const d = prompt('Date (YYYY-MM-DD):');
        const result = this.weekNumber(d);
        this.expression = `Week number: ${result}`;
        this.updateDisplay();
    }

    // ===== DATA CONVERTER UI =====
    showDataConvertUI() {
        const val = parseFloat(prompt('Value:'));
        const from = prompt('From unit (B, KB, MB, GB, TB, PB):').toUpperCase();
        const to = prompt('To unit:').toUpperCase();
        const result = this.dataConvert(val, from, to);
        this.expression = val + ' ' + from + ' = ' + result.toFixed(6) + ' ' + to;
        this.updateDisplay();
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
