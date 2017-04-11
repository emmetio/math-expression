'use strict';

const assert = require('assert');
require('babel-register');
const parser = require('../lib/parser');

describe('Reverse parse', () => {
	const stringify = tokens => tokens.map(token => {
		const value = token.type === 1 ? token.value : String.fromCharCode(token.value);
		return `${value} [${token.priority}]`;
	});
	const parse = expr => stringify(parser.default(expr));
	const reverse = expr => stringify(parser.reverseParse(expr));

	it('should equal forward parse', () => {
		assert.deepEqual(reverse('1 + 2'), parse('1 + 2'));
		assert.deepEqual(reverse('1 + 2 * 3'), parse('1 + 2 * 3'));
		assert.deepEqual(reverse('(1 + 2) * 3'), parse('(1 + 2) * 3'));
	});
});
