import Scanner, { isNumber } from '@emmetio/scanner';

const DOT = 46; // .

/**
 * Consumes number from given stream, either in forward or backward direction
 * @param scanner
 * @param backward Consume number in backward direction
 */
export default function number(scanner: Scanner, backward?: boolean) {
    return backward ? consumeBackward(scanner) : consumeForward(scanner);
}

/**
 * Consumes number in forward stream direction
 * @return Returns `true` if number was consumed
 */
function consumeForward(scanner: Scanner): boolean {
    const start = scanner.pos;
    if (scanner.eat(DOT) && scanner.eatWhile(isNumber)) {
        // short decimal notation: .025
        return true;
    }

    if (scanner.eatWhile(isNumber) && (!scanner.eat(DOT) || scanner.eatWhile(isNumber))) {
        // either integer or decimal: 10, 10.25
        return true;
    }

    scanner.pos = start;
    return false;
}

/**
 * Consumes number in backward stream direction
 * @return Returns `true` if number was consumed
 */
function consumeBackward(scanner: Scanner): boolean {
    const start = scanner.pos;
    let ch: number;
    let hadDot = false;
    let hadNumber = false;
    let len = 0;

    while (scanner.pos > 0) {
        scanner.pos--;
        ch = scanner.peek();

        if (ch === DOT && !hadDot && hadNumber) {
            hadDot = true;
        } else if (!isNumber(ch)) {
            scanner.next();
            break;
        }

        hadNumber = true;
        len++;
    }

    if (len) {
        const pos = scanner.pos;
        scanner.start = pos;
        scanner.pos = start;
        return true;
    }

    scanner.pos = start;
    return false;
}
