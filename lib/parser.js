/**
 * Expression parser and tokenizer
 */
'use strict';

import StreamReader from '@emmetio/stream-reader';
import { isNumber, isWhiteSpace } from '@emmetio/stream-reader-utils';

// operators
const PLUS              = 43; // +
const MINUS             = 45; // -
const MULTIPLY          = 42; // *
const DIVIDE            = 47; // /
const DOT               = 46; // .
const INT_DIVIDE        = 92; // \
const LEFT_PARENTHESIS  = 40; // (
const RIGHT_PARENTHESIS = 41; // )

// token types
const NUMBER   = 1;
const OP1      = 2;
const OP2      = 3;
const FUNCALL  = 4;

// parser states
const PRIMARY      = 1 << 0;
const OPERATOR     = 1 << 1;
const FUNCTION     = 1 << 2;
const LPAREN       = 1 << 3;
const RPAREN       = 1 << 4;
const COMMA        = 1 << 5;
const SIGN         = 1 << 6;
const CALL         = 1 << 7;
const NULLARY_CALL = 1 << 8;

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
	let expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
	const state = {
		stream: stream,
		tokens: [],
		operators: [],
		priority: 0
	};

	while (!stream.eol()) {
		stream.eatWhile(isWhiteSpace);
		stream.start = stream.pos;

		if (eatNumber(stream)) {
			if ((expected & PRIMARY) === 0) {
				token = number(stream.current());

				// check edge case: a negative number
				if (token.value < 0) {
					noperators += 2;
					addFunc(op2(PLUS, 1), state);
				} else {
					error('Unexpected number', stream);
				}
			}

			state.tokens.push(token);
			expected = (OPERATOR | RPAREN);
		} else if (isOperator(stream.peek())) {
			ch = stream.next();
			if (isSign(ch) && (expected & SIGN)) {
				if (isNegativeSign(ch)) {
					noperators++;
					addFunc(op1(MINUS, 2), state);
				}
				expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
			} else {
				if ((expected & OPERATOR) === 0) {
					error('Unexpected operator', stream);
				}
				noperators += 2;
				addFunc(op2(ch), state);
				expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
			}
		} else if (stream.eat(LEFT_PARENTHESIS)) {
			if ((expected & LPAREN) === 0) {
				error('Unexpected "("', stream);
			}

			state.priority += 10;

			if (expected & CALL) {
				noperators += 2;
				addFunc(new Token(FUNCALL, LEFT_PARENTHESIS, -2), state);
			}

			expected = (PRIMARY | LPAREN | FUNCTION | SIGN | NULLARY_CALL);
		} else if (stream.eat(RIGHT_PARENTHESIS)) {
			state.priority -= 10;

			if (expected & NULLARY_CALL) {
				state.tokens.push(nullary);
			} else if ((expected & RPAREN) === 0) {
				error('Unexpected ")"', state);
			}

			expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
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

class Token {
	constructor(type, value, priority) {
		this.type = type;
		this.value = value;
		this.priority = priority || 0;
	}
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
			priority = 2;
		} else if (value === DIVIDE || value === INT_DIVIDE) {
			priority = 3;
		} else {
			priority = 1;
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

function isNegativeSign(token) {
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
		// either intefer or decimal: 10, 10.25
		return true;
	}

	stream.pos = start;
	return false;
}
