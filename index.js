'use strict';

import parse, { NUMBER, OP1, OP2, PLUS, MINUS, MULTIPLY, DIVIDE, INT_DIVIDE } from './lib/parser';

const ops1 = {
	[MINUS]: num => -num
};

const ops2 = {
	[PLUS]:       (a, b) => a + b,
	[MINUS]:      (a, b) => a - b,
	[MULTIPLY]:   (a, b) => a * b,
	[DIVIDE]:     (a, b) => a / b,
	[INT_DIVIDE]: (a, b) => Math.floor(a / b)
};

/**
 * Evaluates given math expression
 * @param  {String|StreamReader|Array} expr Expression to evaluate
 * @param  {Boolean}                   [backward] Parses given expression (string
 *                                                or stream) in backward direction
 * @return {Number}
 */
export default function(expr, backward) {
	if (!Array.isArray(expr)) {
		expr = parse(expr, backward);
	}

	if (!expr || !expr.length) {
		return null;
	}

	const nstack = [];
	let n1, n2, f;
	let item, value;

	for (let i = 0, il = expr.length, token; i < il; i++) {
		token = expr[i];
		if (token.type === NUMBER) {
			nstack.push(token.value);
		} else if (token.type === OP2) {
			n2 = nstack.pop();
			n1 = nstack.pop();
			f = ops2[token.value];
			nstack.push(f(n1, n2));
		} else if (token.type === OP1) {
			n1 = nstack.pop();
			f = ops1[token.value];
			nstack.push(f(n1));
		} else {
			throw new Error('Invalid expression');
		}
	}

	if (nstack.length > 1) {
		throw new Error('Invalid Expression (parity)');
	}

	return nstack[0];
}

export { parse };
