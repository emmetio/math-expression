/**
 * Expression parser and tokenizer
 */
'use strict';

import StreamReader from '@emmetio/stream-reader';
import { isNumber, isWhiteSpace } from '@emmetio/stream-reader-utils';

// token types
export const NUMBER   = 1;
export const OP1      = 2;
export const OP2      = 3;

// operators
export const PLUS              = 43; // +
export const MINUS             = 45; // -
export const MULTIPLY          = 42; // *
export const DIVIDE            = 47; // /
export const DOT               = 46; // .
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

const nullary = new Token(NULLARY_CALL);

/**
 * Parses given exprssion into tokens
 * @param  {String} expr
 * @return {Array}
 */
export default function(expr) {
	const stream = typeof expr === 'object' ? expr : new StreamReader(expr);
	let token, ch;
	let noperators = 0;
	let expected = (PRIMARY | LPAREN | SIGN);
	const state = {
		tokens: [],
		operators: [],
		priority: 0
	};

	while (!stream.eof()) {
		stream.eatWhile(isWhiteSpace);
		stream.start = stream.pos;

		if (eatNumber(stream)) {
			if ((expected & PRIMARY) === 0) {
				error('Unexpected number', stream);
			}

			token = number(stream.current());
			state.tokens.push(token);
			expected = (OPERATOR | RPAREN);
		} else if (isOperator(stream.peek())) {
			ch = stream.next();
			if (isSign(ch) && (expected & SIGN)) {
				if (isNegativeSign(ch)) {
					noperators++;
					addFunc(op1(MINUS, 2), state);
				}
				expected = (PRIMARY | LPAREN | SIGN);
			} else {
				if ((expected & OPERATOR) === 0) {
					error('Unexpected operator', stream);
				}
				noperators += 2;
				addFunc(op2(ch), state);
				expected = (PRIMARY | LPAREN | SIGN);
			}
		} else if (stream.eat(LEFT_PARENTHESIS)) {
			if ((expected & LPAREN) === 0) {
				error('Unexpected "("', stream);
			}

			state.priority += 10;
			expected = (PRIMARY | LPAREN | SIGN | NULLARY_CALL);
		} else if (stream.eat(RIGHT_PARENTHESIS)) {
			state.priority -= 10;

			if (expected & NULLARY_CALL) {
				state.tokens.push(nullary);
			} else if ((expected & RPAREN) === 0) {
				error('Unexpected ")"', state);
			}

			expected = (OPERATOR | RPAREN | LPAREN);
		} else {
			error('Unknown character', stream);
		}
	}

	if (state.priority < 0 || state.priority >= 10) {
		error('Unmatched "()"', stream);
	}

	state.tokens = state.tokens.concat(state.operators.reverse());

	if (noperators + 1 !== state.tokens.length) {
		error('Parity', stream);
	}

	return state.tokens;
}

/**
 * Parses given exprssion in reverse order, e.g. from back to end, and stops when
 * first unknown character was found
 * @param  {String} expr
 * @return {Array}
 */
export function reverseParse(expr) {
	let stream;
	if (typeof expr === 'object') {
		stream = expr;
	} else {
		stream = new StreamReader(expr);
		stream.start = stream.pos = expr.length;
	}

	let token, ch;
	let noperators = 0;
	let expected = (PRIMARY | RPAREN);
	const state = {
		tokens: [],
		operators: [],
		priority: 0
	};

	while (stream.pos > 0) {
		if (eatNumberReverse(stream)) {
			if ((expected & PRIMARY) === 0) {
				error('Unexpected number', stream);
			}

			token = number(stream.current());
			state.tokens.unshift(token);
			expected = (OPERATOR | LPAREN);

			// NB should explicitly update stream position for backward direction
			stream.pos = stream.start;
		} else {
			stream.backUp(1);
			ch = stream.peek();

			if (isWhiteSpace(ch)) {
				continue;
			} else if (isOperator(ch)) {
				if (isSign(ch) && (expected & SIGN)) {
					if (isNegativeSign(ch)) {
						noperators++;
						addFunc(op1(MINUS, 2), state);
					}
					expected = (LPAREN | OPERATOR | PRIMARY);
				} else {
					if ((expected & OPERATOR) === 0) {
						break;
					}
					noperators += 2;
					addFunc(op2(ch), state);
					expected = (PRIMARY | RPAREN);
				}
			} else if (stream.eat(RIGHT_PARENTHESIS)) {
				if ((expected & RPAREN) === 0) {
					break;
				}

				state.priority += 10;
				expected = (OPERATOR | RPAREN | LPAREN);
			} else if (stream.eat(LEFT_PARENTHESIS)) {
				state.priority -= 10;

				if (expected & NULLARY_CALL) {
					state.tokens.unshift(nullary);
				} else if ((expected & LPAREN) === 0) {
					break
				}

				expected = (PRIMARY | LPAREN | SIGN | NULLARY_CALL);
			} else {
				break;
			}
		}
	}

	if (state.priority < 0 || state.priority >= 10) {
		error('Unmatched "()"', stream);
	}

	state.tokens = state.tokens.concat(state.operators.reverse());

	if (noperators + 1 !== state.tokens.length) {
		error('Parity', stream);
	}

	return state.tokens;
}

function number(value, priority) {
	return new Token(NUMBER, parseFloat(value), priority);
}

function op1(value, priority) {
	return new Token(OP1, value, priority);
}

function op2(value, priority) {
	if (priority == null) {
		if (value === MULTIPLY) {
			priority = 1;
		} else if (value === DIVIDE || value === INT_DIVIDE) {
			priority = 2;
		}
	}
	return new Token(OP2, value, priority);
}

function addFunc(operator, state) {
	var ops = state.operators;
	operator.priority += state.priority;
	while (ops.length > 0) {
		if (operator.priority <= ops[ops.length - 1].priority) {
			state.tokens.push(ops.pop());
		} else {
			break;
		}
	}
	ops.push(operator);
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

function eatNumber(stream) {
	const start = stream.pos;
	if (stream.eat(DOT) && stream.eatWhile(isNumber)) {
		// short decimal notation: .025
		return true;
	}

	if (stream.eatWhile(isNumber) && (!stream.eat(DOT) || stream.eatWhile(isNumber))) {
		// either integer or decimal: 10, 10.25
		return true;
	}

	stream.pos = start;
	return false;
}

function eatNumberReverse(stream) {
	const start = stream.pos;
	let ch, hadDot = false;
	// NB a StreamReader insance can be editor-specific and contain objects
	// as a position marker. Since we don’t know for sure how to compare editor
	// position markers, use consumed length instead to detect if number was consumed
	let len = 0;

	while (stream.pos > 0) {
		stream.backUp(1);
		ch = stream.peek();

		if (ch === DOT && !hadDot) {
			hadDot = true;
		} else if (!isNumber(ch)) {
			stream.next();
			break;
		}

		len++;
	}

	if (len) {
		const pos = stream.pos;
		stream.start = pos;
		stream.pos = start;
		return true;
	}

	stream.pos = start;
	return false;
}
