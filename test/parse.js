'use strict';

const assert = require('assert');
require('babel-register');
const parser = require('../lib/parser').default;

describe('Backward parse', () => {
	const stringify = tokens => tokens.map(token => {
		const value = token.type === 'num' ? token.value : String.fromCharCode(token.value);
		return `${value} [${token.priority}]`;
	});
	const parse = expr => stringify(parser(expr));
	const reverse = expr => stringify(parser(expr, true));

	it('should equal forward parse', () => {
		const expressions = [
			'1+2',
			'1 + 2',
			'2 * 3',
			'2 * 3 + 1',
			'-2 * 3 + 1',
			'2 * -3 + 1',
			'5 / 2',
			'5 \\ 2',
			'2 * (3 + 1)',
			'(3 * (1+2)) * 2',
			'3 * -(1 + 2)',
			'(1 + 2) * 3'
		];

		expressions.forEach(expr => assert.deepEqual(reverse(expr), parse(expr), expr));
	});

	it('should stop parsing invalid expressions', () => {
		assert.throws(() => reverse('(1 + 3'), /Unmatched/);
		assert.throws(() => reverse('a+b'), /Parity/);
		assert.throws(() => reverse('1/b'), /Parity/);
	});
});
