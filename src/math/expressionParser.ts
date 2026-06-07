import { FunctionFamily } from '../types';

export interface ParseResult {
  valid: boolean;
  normalized?: string;
  family?: FunctionFamily;
  error?: string;
  evalFn?: (x: number) => number;
}

// Safe whitelist-based expression parser — no eval
// Supports: constants, linear, quadratic, cubic, exponential, reciprocal, abs

function normalizeInput(raw: string): string {
  let s = raw.trim();
  // Strip leading "y=" or "y ="
  s = s.replace(/^y\s*=\s*/i, '');
  // Normalize whitespace
  s = s.replace(/\s+/g, '');
  // Normalize abs notations
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)');
  // Implied multiplication: 2x → 2*x, 2(... → 2*(
  s = s.replace(/(\d)(x)/g, '$1*$2');
  s = s.replace(/(\d)\(/g, '$1*(');
  s = s.replace(/\)(\()/g, ')*(');
  // ^ → ** for JS eval (we handle in our parser)
  return s;
}

// Simple recursive descent parser
type Token = { type: string; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }
    if (/\d/.test(expr[i]) || (expr[i] === '.' && /\d/.test(expr[i + 1] || ''))) {
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i++];
      }
      tokens.push({ type: 'NUM', value: num });
    } else if (expr[i] === 'x') {
      tokens.push({ type: 'VAR', value: 'x' });
      i++;
    } else if (expr.slice(i, i + 3) === 'abs') {
      tokens.push({ type: 'FUNC', value: 'abs' });
      i += 3;
    } else if (['+', '-', '*', '/', '^', '(', ')'].includes(expr[i])) {
      tokens.push({ type: expr[i], value: expr[i] });
      i++;
    } else {
      // Unknown token — flag it
      tokens.push({ type: 'UNKNOWN', value: expr[i] });
      i++;
    }
  }
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: string): Token {
    const t = this.peek();
    if (!t || t.type !== type) throw new Error(`Expected ${type}, got ${t?.type ?? 'EOF'}`);
    return this.consume();
  }

  parse(): (x: number) => number {
    const fn = this.parseExpr();
    if (this.peek()) throw new Error('Unexpected token after expression');
    return fn;
  }

  private parseExpr(): (x: number) => number {
    let left = this.parseTerm();
    while (this.peek()?.type === '+' || this.peek()?.type === '-') {
      const op = this.consume().type;
      const right = this.parseTerm();
      if (op === '+') { const l = left, r = right; left = (x) => l(x) + r(x); }
      else { const l = left, r = right; left = (x) => l(x) - r(x); }
    }
    return left;
  }

  private parseTerm(): (x: number) => number {
    let left = this.parseUnary();
    while (this.peek()?.type === '*' || this.peek()?.type === '/') {
      const op = this.consume().type;
      const right = this.parseUnary();
      if (op === '*') { const l = left, r = right; left = (x) => l(x) * r(x); }
      else { const l = left, r = right; left = (x) => { const d = r(x); if (Math.abs(d) < 1e-10) return NaN; return l(x) / d; }; }
    }
    return left;
  }

  private parseUnary(): (x: number) => number {
    if (this.peek()?.type === '-') {
      this.consume();
      const inner = this.parsePower();
      return (x) => -inner(x);
    }
    if (this.peek()?.type === '+') {
      this.consume();
      return this.parsePower();
    }
    return this.parsePower();
  }

  private parsePower(): (x: number) => number {
    const base = this.parseAtom();
    if (this.peek()?.type === '^') {
      this.consume();
      const exp = this.parseUnary();
      return (x) => {
        const b = base(x);
        const e = exp(x);
        if (b < 0 && !Number.isInteger(e)) return NaN;
        return Math.pow(b, e);
      };
    }
    return base;
  }

  private parseAtom(): (x: number) => number {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'NUM') {
      this.consume();
      const val = parseFloat(t.value);
      return () => val;
    }

    if (t.type === 'VAR') {
      this.consume();
      return (x) => x;
    }

    if (t.type === 'FUNC' && t.value === 'abs') {
      this.consume();
      this.expect('(');
      const inner = this.parseExpr();
      this.expect(')');
      return (x) => Math.abs(inner(x));
    }

    if (t.type === '(') {
      this.consume();
      const inner = this.parseExpr();
      this.expect(')');
      return inner;
    }

    if (t.type === 'UNKNOWN') {
      throw new Error(`Unsupported character: "${t.value}"`);
    }

    throw new Error(`Unexpected token: ${t.type} "${t.value}"`);
  }
}

// Detect function family from expression structure
function detectFamily(expr: string, fn: (x: number) => number): FunctionFamily {
  const norm = expr.toLowerCase();

  // abs check first
  if (norm.includes('abs(')) return 'absoluteValue';

  // Exponential: digit^x or digit^( (constant base, x in exponent)
  if (/\d[\.\d]*\^[x(]/.test(norm)) return 'exponential';

  // Cubic: anything with ^3 (x^3 or (x-h)^3)
  if (/\^3/.test(norm)) return 'cubic';

  // Quadratic: anything with ^2 (x^2 or (x-h)^2)
  if (/\^2/.test(norm)) return 'quadratic';

  // Reciprocal: division that produces a discontinuity
  if (norm.includes('/')) {
    let hasNaN = false;
    for (let x = -5; x <= 5; x += 0.05) {
      try { const y = fn(x); if (!isFinite(y)) { hasNaN = true; break; } } catch { hasNaN = true; break; }
    }
    if (hasNaN) return 'reciprocal';
  }

  // Linear: contains x
  if (norm.includes('x')) return 'linear';

  return 'constant';
}

export function parseExpression(raw: string): ParseResult {
  try {
    const normalized = normalizeInput(raw);

    if (!normalized) {
      return { valid: false, error: 'Please enter an equation.' };
    }

    // Block unsupported functions
    const blocked = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'floor', 'ceil', 'round'];
    for (const b of blocked) {
      if (normalized.toLowerCase().includes(b)) {
        return { valid: false, error: `"${b}" is not supported. Try constant, linear, quadratic, cubic, exponential, reciprocal, or absolute value functions.` };
      }
    }

    // Block y on right side
    if (/y/i.test(normalized)) {
      return { valid: false, error: 'The right side cannot contain "y".' };
    }

    const tokens = tokenize(normalized);

    // Check for unknown tokens
    const unknown = tokens.find(t => t.type === 'UNKNOWN');
    if (unknown) {
      return { valid: false, error: `Unsupported character: "${unknown.value}". Use x, numbers, +, -, *, /, ^, abs().` };
    }

    const parser = new Parser(tokens);
    const evalFn = parser.parse();

    // Test evaluation
    const testY = evalFn(1);
    if (testY !== undefined) { /* ok */ }

    const family = detectFamily(normalized, evalFn);

    return { valid: true, normalized, family, evalFn };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, error: `Invalid equation: ${msg}` };
  }
}
