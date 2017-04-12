/**
 * Expression parser and tokenizer
 */
'use strict';

import StreamReader from '@emmetio/stream-reader';
import { isWhiteSpace } from '@emmetio/stream-reader-utils';
import consumeNumber from './number';
import { isSoF } from './utils';

// token types
export const NUMBER = 'num';
export const OP1    = 'op1';
export const OP2    = 'op2';

// operators
export const PLUS              = 43; // +
export const MINUS             = 45; // -
export const MULTIPLY          = 42; // *
export const DIVIDE            = 47; // /
export const INT_DIVIDE        = 92; // \
export const LEFT_PARENTHESIS  = 40; // (
export const RIGHT_PARENTHESIS = 41; // )

// parser states
const PRIMARY      = 1 << 0;
const OPERATOR     = 1 << 1;
const LPAREN       = 1 << 2;
const RPAREN       = 1 << 3;
const SIGN         = 1 << 4;
const NULLARY_CALL = 1 << 5;

class Token {
	constructor(type, value, priority) {
		this.type = type;
		this.value = value;
		this.priority = priority || 0;
	}
}

export const nullary = new Token(NULLARY_CALL);

export default function parse(expr, backward) {
	return backward ? parseBackward(expr) : parseForward(expr);
}

/**
 * Parses given expression in forward direction
 * @param  {String|StreamReader} expr
 * @return {Token[]}
 */
export function parseForward(expr) {
	const stream = typeof expr === 'object' ? expr : new StreamReader(expr);
	let ch, priority = 0;
	let expected = (PRIMARY | LPAREN | SIGN);
	const tokens = [];

	while (!stream.eof()) {
		stream.eatWhile(isWhiteSpace);
		stream.start = stream.pos;

		if (consumeNumber(stream)) {
			if ((expected & PRIMARY) === 0) {
				error('Unexpected number', stream);
			}

			tokens.push( number(stream.current()) );
			expected = (OPERATOR | RPAREN);
		} else if (isOperator(stream.peek())) {
			ch = stream.next();
			if (isSign(ch) && (expected & SIGN)) {
				if (isNegativeSign(ch)) {
					tokens.push(op1(ch, priority));
				}
				expected = (PRIMARY | LPAREN | SIGN);
			} else {
				if ((expected & OPERATOR) === 0) {
					error('Unexpected operator', stream);
				}
				tokens.push(op2(ch, priority));
				expected = (PRIMARY | LPAREN | SIGN);
			}
		} else if (stream.eat(LEFT_PARENTHESIS)) {
			if ((expected & LPAREN) === 0) {
				error('Unexpected "("', stream);
			}

			priority += 10;
			expected = (PRIMARY | LPAREN | SIGN | NULLARY_CALL);
		} else if (stream.eat(RIGHT_PARENTHESIS)) {
			priority -= 10;

			if (expected & NULLARY_CALL) {
				tokens.push(nullary);
			} else if ((expected & RPAREN) === 0) {
				error('Unexpected ")"', stream);
			}

			expected = (OPERATOR | RPAREN | LPAREN);
		} else {
			error('Unknown character', stream);
		}
	}

	if (priority < 0 || priority >= 10) {
		error('Unmatched "()"', stream);
	}

	const result = orderTokens(tokens);

	if (result === null) {
		error('Parity', stream);
	}

	return result;
}

/**
 * Parses given exprssion in reverse order, e.g. from back to end, and stops when
 * first unknown character was found
 * @param  {String|StreamReader} expr
 * @return {Array}
 */
export function parseBackward(expr) {
	let stream;
	if (typeof expr === 'object') {
		stream = expr;
	} else {
		stream = new StreamReader(expr);
		stream.start = stream.pos = expr.length;
	}

	let ch, priority = 0;
	let expected = (PRIMARY | RPAREN);
	const tokens = [];

	while (!isSoF(stream)) {
		if (consumeNumber(stream, true)) {
			if ((expected & PRIMARY) === 0) {
				error('Unexpected number', stream);
			}

			tokens.push( number(stream.current()) );
			expected = (OPERATOR | SIGN | LPAREN);

			// NB should explicitly update stream position for backward direction
			stream.pos = stream.start;
		} else {
			stream.backUp(1);
			ch = stream.peek();

			if (isOperator(ch)) {
				if (isSign(ch) && (expected & SIGN) && isReverseSignContext(stream)) {
					if (isNegativeSign(ch)) {
						tokens.push(op1(ch, priority));
					}
					expected = (LPAREN | RPAREN | OPERATOR | PRIMARY);
				} else {
					if ((expected & OPERATOR) === 0) {
						stream.next();
						break;
					}
					tokens.push(op2(ch, priority));
					expected = (PRIMARY | RPAREN);
				}
			} else if (ch === RIGHT_PARENTHESIS) {
				if ((expected & RPAREN) === 0) {
					stream.next();
					break;
				}

				priority += 10;
				expected = (PRIMARY | RPAREN | LPAREN);
			} else if (ch === LEFT_PARENTHESIS) {
				priority -= 10;

				if (expected & NULLARY_CALL) {
					tokens.push(nullary);
				} else if ((expected & LPAREN) === 0) {
					stream.next();
					break;
				}

				expected = (OPERATOR | SIGN | LPAREN | NULLARY_CALL);
			} else if (!isWhiteSpace(ch)) {
				stream.next();
				break;
			}
		}
	}

	if (priority < 0 || priority >= 10) {
		error('Unmatched "()"', stream);
	}

	const result = orderTokens(tokens.reverse());
	if (result === null) {
		error('Parity', stream);
	}

	return result;
}

/**
 * Orders parsed tokens (operands and operators) in given array so that they are
 * laid off in order of execution
 * @param  {Token[]} tokens
 * @return {Token[]}
 */
function orderTokens(tokens) {
	const operators = [], operands = [];
	let noperators = 0;

	for (let i = 0, token; i < tokens.length; i++) {
		token = tokens[i];

		if (token.type === NUMBER) {
			operands.push(token);
		} else {
			noperators += token.type === OP1 ? 1 : 2;

			while (operators.length) {
				if (token.priority <= operators[operators.length - 1].priority) {
					operands.push(operators.pop());
				} else {
					break;
				}
			}

			operators.push(token);
		}
	}

	return noperators + 1 === operands.length + operators.length
		? operands.concat(operators.reverse())
		: null /* parity */;
}

/**
 * Check if current stream state is in sign (e.g. positive or negative) context
 * for reverse parsing
 * @param  {StreamReader} stream
 * @return {Boolean}
 */
function isReverseSignContext(stream) {
	const start = stream.pos;
	let ch, inCtx = true;

	while (!isSoF(stream)) {
		stream.backUp(1);
		ch = stream.peek();

		if (isWhiteSpace(ch)) {
			continue;
		}

		inCtx = ch === LEFT_PARENTHESIS || isOperator(ch);
		break;
	}

	stream.pos = start;
	return inCtx;
}

/**
 * Number token factory
 * @param  {String} value
 * @param  {Number} [priority ]
 * @return {Token}
 */
function number(value, priority) {
	return new Token(NUMBER, parseFloat(value), priority);
}

/**
 * Unary operator factory
 * @param  {Number} value    Operator  character code
 * @param  {Number} priority Operator execution priority
 * @return {Token[]}
 */
function op1(value, priority) {
	if (value === MINUS) {
		priority += 2;
	}
	return new Token(OP1, value, priority);
}

/**
 * Binary operator factory
 * @param  {Number} value    Operator  character code
 * @param  {Number} priority Operator execution priority
 * @return {Token[]}
 */
function op2(value, priority) {
	if (value === MULTIPLY) {
		priority += 1;
	} else if (value === DIVIDE || value === INT_DIVIDE) {
		priority += 2;
	}

	return new Token(OP2, value, priority);
}

function error(name, stream) {
	if (stream) {
		name += ` at column ${stream.start} of expression`;
	}
	throw new Error(name);
}

function isSign(ch) {
	return isPositiveSign(ch) || isNegativeSign(ch);
}

function isPositiveSign(ch) {
	return ch === PLUS;
}

function isNegativeSign(ch) {
	return ch === MINUS;
}

function isOperator(ch) {
	return ch === PLUS || ch === MINUS || ch === MULTIPLY
		|| ch === DIVIDE || ch === INT_DIVIDE;
}
