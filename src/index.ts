import type Scanner from '@emmetio/scanner';
import parse, { TokenType, Operator, Token } from './parser.js';

export { default as extract, type ExtractOptions } from './extract.js';

type UnaryAction = { [op in Operator]?: (n: number) => number };
type BinaryAction = { [op in Operator]?: (n1: number, n2: number) => number };

const ops1: UnaryAction = {
    [Operator.Minus]: num => -num
};

const ops2: BinaryAction = {
    [Operator.Plus]: (a, b) => a + b,
    [Operator.Minus]: (a, b) => a - b,
    [Operator.Multiply]: (a, b) => a * b,
    [Operator.Divide]: (a, b) => a / b,
    [Operator.IntDivide]: (a, b) => Math.floor(a / b)
};

/**
 * Evaluates given math expression
 * @param expr Expression to evaluate
 */
export default function evaluate(expr: string | Scanner | Token[]): number | null {
    if (!Array.isArray(expr)) {
        expr = parse(expr)!;
    }

    if (!expr || !expr.length) {
        return null;
    }

    const nStack: number[] = [];
    let n1: number;
    let n2: number;
    let f: (n1: number, n2?: number) => number;

    for (let i = 0, il = expr.length; i < il; i++) {
        const token = expr[i];
        if (token.type === TokenType.Number) {
            nStack.push(token.value);
        } else if (token.type === TokenType.Op2) {
            n2 = nStack.pop()!;
            n1 = nStack.pop()!;
            f = ops2[token.value];
            nStack.push(f(n1, n2));
        } else if (token.type === TokenType.Op1) {
            n1 = nStack.pop()!;
            f = ops1[token.value];
            nStack.push(f(n1));
        } else {
            throw new Error('Invalid expression');
        }
    }

    if (nStack.length > 1) {
        throw new Error('Invalid Expression (parity)');
    }

    return nStack[0];
}

export { parse, type Token };
