'use strict';

const assert = require('assert');
require('babel-register');
const evaluate = require('../index').default;

describe('Math expression', () => {
	it('basic math', () => {
		assert.equal(evaluate('1+2'), 3);
		assert.equal(evaluate('1 + 2'), 3);
		assert.equal(evaluate('2 * 3'), 6);
		assert.equal(evaluate('2 * 3 + 1'), 7);
		assert.equal(evaluate('-2 * 3 + 1'), -5);
		assert.equal(evaluate('2 * -3 + 1'), -5);
		assert.equal(evaluate('5 / 2'), 2.5);
		assert.equal(evaluate('5 \\ 2'), 2);
	});

	it('parentheses', () => {
		assert.equal(evaluate('2 * (3 + 1)'), 8);
		assert.equal(evaluate('(3 * (1+2)) * 2'), 18);
	});
});
