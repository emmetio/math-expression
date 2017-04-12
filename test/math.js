'use strict';

const assert = require('assert');
require('babel-register');
const evaluate = require('../index').default;

describe('Evaluator', () => {
	it('should evaluate basic math', () => {
		assert.equal(evaluate('1+2'), 3);
		assert.equal(evaluate('1 + 2'), 3);
		assert.equal(evaluate('2 * 3'), 6);
		assert.equal(evaluate('2 * 3 + 1'), 7);
		assert.equal(evaluate('-2 * 3 + 1'), -5);
		assert.equal(evaluate('2 * -3 + 1'), -5);
		assert.equal(evaluate('5 / 2'), 2.5);
		assert.equal(evaluate('5 \\ 2'), 2);
	});

	it('should evaluate expressions with parentheses', () => {
		assert.equal(evaluate('2 * (3 + 1)'), 8);
		assert.equal(evaluate('(3 * (1+2)) * 2'), 18);
		assert.equal(evaluate('3 * -(1 + 2)'), -9);
		assert.equal(evaluate('(1 + 2) * 3'), 9);
	});

	it('should throw parsing error for invalid expressions', () => {
		assert.throws(() => evaluate('a+b'), /Unknown character/);
		assert.throws(() => evaluate('1/b'), /Unknown character/);
		assert.throws(() => evaluate('(1 + 3'), /Unmatched/);
	});

	it('should extract expression from string', () => {
		assert.equal(evaluate('foo2 * (3 + 1)', true), 8);
		assert.equal(evaluate('bar.(2 * (3 + 1))', true), 8);
	});
});
