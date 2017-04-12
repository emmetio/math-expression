'use strict';

const assert = require('assert');
const StreamReader = require('@emmetio/stream-reader');
require('babel-register');
const consume = require('../lib/number').default;

const number = (str, backward) => {
	const stream = new StreamReader(str);
	if (backward) {
		stream.pos = str.length;
	}

	return consume(stream, backward) ? parseFloat(stream.current()) : NaN;
};

describe('Number consumer', () => {
	it('should parse forward', () => {
		assert.equal(number('1'), 1);
		assert.equal(number('10'), 10);
		assert.equal(number('123'), 123);
		assert.equal(number('0.1'), 0.1);
		assert.equal(number('.1'), 0.1);
		assert.equal(number('.123'), 0.123);

		// mixed content
		assert.equal(number('123foo'), 123);
		assert.equal(number('.1.2.3'), 0.1);
		assert.equal(number('1.2.3'), 1.2);
	});

	it('should parse backward', () => {
		assert.equal(number('1', true), 1);
		assert.equal(number('10', true), 10);
		assert.equal(number('123', true), 123);
		assert.equal(number('0.1', true), 0.1);
		assert.equal(number('.1', true), 0.1);
		assert.equal(number('.123', true), 0.123);

		// mixed content
		assert.equal(number('foo123', true), 123);
		assert.equal(number('.1.2.3', true), 2.3);
		assert.equal(number('1.2.3', true), 2.3);
	});
});
