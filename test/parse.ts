import { deepStrictEqual as deepEqual, throws } from 'assert';
import parser, { Token } from '../src/parser';

const stringify = (tokens: Token[]) => tokens.map(token => {
    const value = token.type === 'num' ? token.value : String.fromCharCode(token.value);
    return `${value} [${token.priority}]`;
});
const parse = (expr: string) => stringify(parser(expr)!);
const reverse = (expr: string) => stringify(parser(expr, true)!);

describe('Backward parse', () => {
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

        expressions.forEach(expr => deepEqual(reverse(expr), parse(expr), expr));
    });

    it('should stop parsing invalid expressions', () => {
        throws(() => reverse('(1 + 3'), /Unmatched/);
        throws(() => reverse('a+b'), /Parity/);
        throws(() => reverse('1/b'), /Parity/);
    });
});
