import { strictEqual as equal, throws } from 'assert';
import evaluate from '../src/index.js';

describe('Evaluator', () => {
    it('should evaluate basic math', () => {
        equal(evaluate('1+2'), 3);
        equal(evaluate('1 + 2'), 3);
        equal(evaluate('2 * 3'), 6);
        equal(evaluate('2 * 3 + 1'), 7);
        equal(evaluate('-2 * 3 + 1'), -5);
        equal(evaluate('2 * -3 + 1'), -5);
        equal(evaluate('5 / 2'), 2.5);
        equal(evaluate('5 \\ 2'), 2);
    });

    it('should evaluate expressions with parentheses', () => {
        equal(evaluate('2 * (3 + 1)'), 8);
        equal(evaluate('(3 * (1+2)) * 2'), 18);
        equal(evaluate('3 * -(1 + 2)'), -9);
        equal(evaluate('(1 + 2) * 3'), 9);
    });

    it('should throw parsing error for invalid expressions', () => {
        throws(() => evaluate('a+b'), /Unknown character/);
        throws(() => evaluate('1/b'), /Unknown character/);
        throws(() => evaluate('(1 + 3'), /Unmatched/);
    });
});
