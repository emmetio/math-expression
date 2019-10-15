import { strictEqual as equal } from 'assert';
import Scanner from '@emmetio/scanner';
import consume from '../src/number';

const num = (str: string, backward?: boolean) => {
    const stream = new Scanner(str);
    if (backward) {
        stream.pos = str.length;
    }

    return consume(stream, backward) ? parseFloat(stream.current()) : NaN;
};

describe('Number consumer', () => {
    it('should parse forward', () => {
        equal(num('1'), 1);
        equal(num('10'), 10);
        equal(num('123'), 123);
        equal(num('0.1'), 0.1);
        equal(num('.1'), 0.1);
        equal(num('.123'), 0.123);

        // mixed content
        equal(num('123foo'), 123);
        equal(num('.1.2.3'), 0.1);
        equal(num('1.2.3'), 1.2);
    });

    it('should parse backward', () => {
        equal(num('1', true), 1);
        equal(num('10', true), 10);
        equal(num('123', true), 123);
        equal(num('0.1', true), 0.1);
        equal(num('.1', true), 0.1);
        equal(num('.123', true), 0.123);

        // mixed content
        equal(num('foo123', true), 123);
        equal(num('.1.2.3', true), 2.3);
        equal(num('1.2.3', true), 2.3);
    });
});
