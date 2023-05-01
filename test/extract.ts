import { deepStrictEqual as deepEqual } from 'assert';
import extract from '../src/extract.js';

describe('Extract expression', () => {
    it('basic', () => {
        deepEqual(extract('1'), [0, 1]);
        deepEqual(extract('10'), [0, 2]);
        deepEqual(extract('123'), [0, 3]);
        deepEqual(extract('0.1'), [0, 3]);
        deepEqual(extract('.1'), [0, 2]);
        deepEqual(extract('.123'), [0, 4]);

        // mixed content
        deepEqual(extract('foo123'), [3, 6]);
        deepEqual(extract('.1.2.3'), [3, 6]);
        deepEqual(extract('1.2.3'), [2, 5]);
        deepEqual(extract('foo2 * (3 + 1)'), [3, 14]);
        deepEqual(extract('bar.(2 * (3 + 1))'), [4, 17]);
        deepEqual(extract('test: 1+2'), [6, 9]);
    });

    it('look-ahead', () => {
        deepEqual(extract('foo2 * (3 + 1)', 13), [3, 14]);
        deepEqual(extract('bar.(2 * (3 + 1))', 15), [4, 17]);
        deepEqual(extract('bar.(2 * (3 + 1) )', 15), [4, 18]);
    });
});
