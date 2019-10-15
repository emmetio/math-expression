import Scanner, { isWhiteSpace } from '@emmetio/scanner';
import consumeNumber from './number';

export const enum TokenType {
    Number = 'num',
    Op1 = 'op1',
    Op2 = 'op2',
    Null = 'null'
}

export const enum Operator {
    Plus = 43, // +
    Minus = 45, // -
    Multiply = 42, // *
    Divide = 47, // /
    IntDivide = 92, // \
    LeftParenthesis = 40, // (
    RightParenthesis = 41, // )
}

const enum ParserState {
    Primary = 1 << 0,
    Operator = 1 << 1,
    LParen = 1 << 2,
    RParen = 1 << 3,
    Sign = 1 << 4,
    NullaryCall = 1 << 5,
}

export interface Token {
    type: TokenType;
    value: number;
    priority: number;
}

export const nullary = token(TokenType.Null, 0);

export default function parse(expr: string | Scanner, backward?: boolean) {
    return backward ? parseBackward(expr) : parseForward(expr);
}

/**
 * Parses given expression in forward direction
 */
export function parseForward(expr: string | Scanner): Token[] | null {
    const scanner = typeof expr === 'string' ? new Scanner(expr) : expr;
    let ch: number;
    let priority = 0;
    let expected: ParserState = (ParserState.Primary | ParserState.LParen | ParserState.Sign);
    const tokens: Token[] = [];

    while (!scanner.eof()) {
        scanner.eatWhile(isWhiteSpace);
        scanner.start = scanner.pos;

        if (consumeNumber(scanner)) {
            if ((expected & ParserState.Primary) === 0) {
                error('Unexpected number', scanner);
            }

            tokens.push(number(scanner.current()));
            expected = (ParserState.Operator | ParserState.RParen);
        } else if (isOperator(scanner.peek())) {
            ch = scanner.next()!;
            if (isSign(ch) && (expected & ParserState.Sign)) {
                if (isNegativeSign(ch)) {
                    tokens.push(op1(ch, priority));
                }
                expected = (ParserState.Primary | ParserState.LParen | ParserState.Sign);
            } else {
                if ((expected & ParserState.Operator) === 0) {
                    error('Unexpected operator', scanner);
                }
                tokens.push(op2(ch, priority));
                expected = (ParserState.Primary | ParserState.LParen | ParserState.Sign);
            }
        } else if (scanner.eat(Operator.LeftParenthesis)) {
            if ((expected & ParserState.LParen) === 0) {
                error('Unexpected "("', scanner);
            }

            priority += 10;
            expected = (ParserState.Primary | ParserState.LParen | ParserState.Sign | ParserState.NullaryCall);
        } else if (scanner.eat(Operator.RightParenthesis)) {
            priority -= 10;

            if (expected & ParserState.NullaryCall) {
                tokens.push(nullary);
            } else if ((expected & ParserState.RParen) === 0) {
                error('Unexpected ")"', scanner);
            }

            expected = (ParserState.Operator | ParserState.RParen | ParserState.LParen);
        } else {
            error('Unknown character', scanner);
        }
    }

    if (priority < 0 || priority >= 10) {
        error('Unmatched "()"', scanner);
    }

    const result = orderTokens(tokens);

    if (result === null) {
        error('Parity', scanner);
    }

    return result;
}

/**
 * Parses given expression in reverse order, e.g. from back to end, and stops when
 * first unknown character was found
 */
export function parseBackward(expr: string | Scanner): Token[] | null {
    let scanner: Scanner;
    if (typeof expr === 'string') {
        scanner = new Scanner(expr);
        scanner.start = scanner.pos = expr.length;
    } else {
        scanner = expr;
    }

    let ch: number;
    let priority = 0;
    let expected = (ParserState.Primary | ParserState.RParen);
    const tokens: Token[] = [];

    while (scanner.pos > 0) {
        if (consumeNumber(scanner, true)) {
            if ((expected & ParserState.Primary) === 0) {
                error('Unexpected number', scanner);
            }

            tokens.push(number(scanner.current()!));
            expected = (ParserState.Operator | ParserState.Sign | ParserState.LParen);

            // NB should explicitly update stream position for backward direction
            scanner.pos = scanner.start;
        } else {
            scanner.pos--;
            ch = scanner.peek();

            if (isOperator(ch)) {
                if (isSign(ch) && (expected & ParserState.Sign) && isReverseSignContext(scanner)) {
                    if (isNegativeSign(ch)) {
                        tokens.push(op1(ch, priority));
                    }
                    expected = (ParserState.LParen | ParserState.RParen | ParserState.Operator | ParserState.Primary);
                } else {
                    if ((expected & ParserState.Operator) === 0) {
                        scanner.pos++;
                        break;
                    }
                    tokens.push(op2(ch, priority));
                    expected = (ParserState.Primary | ParserState.RParen);
                }
            } else if (ch === Operator.RightParenthesis) {
                if ((expected & ParserState.RParen) === 0) {
                    scanner.pos++;
                    break;
                }

                priority += 10;
                expected = (ParserState.Primary | ParserState.RParen | ParserState.LParen);
            } else if (ch === Operator.LeftParenthesis) {
                priority -= 10;

                if (expected & ParserState.NullaryCall) {
                    tokens.push(nullary);
                } else if ((expected & ParserState.LParen) === 0) {
                    scanner.next();
                    break;
                }

                expected = (ParserState.Operator | ParserState.Sign | ParserState.LParen | ParserState.NullaryCall);
            } else if (!isWhiteSpace(ch)) {
                scanner.next();
                break;
            }
        }
    }

    if (priority < 0 || priority >= 10) {
        error('Unmatched "()"', scanner);
    }

    const result = orderTokens(tokens.reverse());
    if (result === null) {
        error('Parity', scanner);
    }

    // edge case: expression is preceded by white-space;
    // move stream position back to expression start
    scanner.eatWhile(isWhiteSpace);

    return result;
}

/**
 * Orders parsed tokens (operands and operators) in given array so that they are
 * laid off in order of execution
 */
function orderTokens(tokens: Token[]): Token[] | null {
    const operators: Token[] = [];
    const operands: Token[] = [];
    let nOperators = 0;

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        if (t.type === TokenType.Number) {
            operands.push(t);
        } else {
            nOperators += t.type === TokenType.Op1 ? 1 : 2;

            while (operators.length) {
                if (t.priority <= operators[operators.length - 1].priority) {
                    operands.push(operators.pop()!);
                } else {
                    break;
                }
            }

            operators.push(t);
        }
    }

    return nOperators + 1 === operands.length + operators.length
        ? operands.concat(operators.reverse())
        : null /* parity */;
}

/**
 * Check if current stream state is in sign (e.g. positive or negative) context
 * for reverse parsing
 */
function isReverseSignContext(scanner: Scanner): boolean {
    const start = scanner.pos;
    let ch: number;
    let inCtx = true;

    while (scanner.pos > 0) {
        scanner.pos--;
        ch = scanner.peek();

        if (isWhiteSpace(ch)) {
            continue;
        }

        inCtx = ch === Operator.LeftParenthesis || isOperator(ch);
        break;
    }

    scanner.pos = start;
    return inCtx;
}

/**
 * Number token factory
 */
function number(value: string, priority?: number): Token {
    return token(TokenType.Number, parseFloat(value), priority);
}

/**
 * Unary operator factory
 * @param value    Operator  character code
 * @param priority Operator execution priority
 */
function op1(value: number, priority = 0) {
    if (value === Operator.Minus) {
        priority += 2;
    }
    return token(TokenType.Op1, value, priority);
}

/**
 * Binary operator factory
 * @param value Operator  character code
 * @param priority Operator execution priority
 */
function op2(value: number, priority = 0): Token {
    if (value === Operator.Multiply) {
        priority += 1;
    } else if (value === Operator.Divide || value === Operator.IntDivide) {
        priority += 2;
    }

    return token(TokenType.Op2, value, priority);
}

function error(name: string, scanner?: Scanner) {
    if (scanner) {
        name += ` at column ${scanner.start} of expression`;
    }
    throw new Error(name);
}

function isSign(ch: number): boolean {
    return isPositiveSign(ch) || isNegativeSign(ch);
}

function isPositiveSign(ch: number) {
    return ch === Operator.Plus;
}

function isNegativeSign(ch: number) {
    return ch === Operator.Minus;
}

function isOperator(ch: number): ch is Operator {
    return ch === Operator.Plus || ch === Operator.Minus || ch === Operator.Multiply
        || ch === Operator.Divide || ch === Operator.IntDivide;
}

export function token(type: TokenType, value: number, priority: number = 0): Token {
    return { type, value, priority };
}
