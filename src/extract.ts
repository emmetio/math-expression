import { Operator, isSign, isOperator } from './parser';
import { isSpace, isNumber } from '@emmetio/scanner';

export interface ExtractOptions {
    /**
     * Allow capturing extra expression characters right after start position.
     * Useful for extracting expressions from text editor source which inserts
     * paired characters like `(` and `)` to properly extract expression past
     * caret position
     */
    lookAhead: boolean;

    /**
     * Allow whitespace in extracted expressions
     */
    whitespace: boolean;
}

interface BackwardScanner {
    text: string;
    pos: number;
}

const defaultOptions: ExtractOptions = {
    lookAhead: true,
    whitespace: true
};

export default function extract(text: string, pos = text.length, options?: Partial<ExtractOptions>): [number, number] | null {
    const opt = { ...defaultOptions, ...options };
    const scanner: BackwardScanner = { text, pos };
    let ch: number;

    if (opt.lookAhead && cur(scanner) === Operator.RightParenthesis) {
        // Basically, we should consume right parenthesis only with optional whitespace
        scanner.pos++;
        const len = text.length;
        while (scanner.pos < len) {
            ch = cur(scanner);
            if (ch !== Operator.RightParenthesis && !(opt.whitespace && isSpace(ch))) {
                break;
            }
            scanner.pos++;
        }
    }

    const end = scanner.pos;
    let braces = 0;
    while (scanner.pos >= 0) {
        if (number(scanner)) {
            continue;
        }

        ch = prev(scanner);
        if (ch === Operator.RightParenthesis) {
            braces++;
        } else if (ch === Operator.LeftParenthesis) {
            if (!braces) {
                break;
            }
            braces--;
        } else if (!((opt.whitespace && isSpace(ch)) || isSign(ch) || isOperator(ch))) {
            break;
        }

        scanner.pos--;
    }

    if (scanner.pos !== end && !braces) {
        // Trim whitespace
        while (isSpace(cur(scanner))) {
            scanner.pos++;
        }

        return [scanner.pos, end];
    }

    return null;
}

/**
 * Backward-consumes number from given scanner, if possible
 */
function number(scanner: BackwardScanner): boolean {
    if (isNumber(prev(scanner))) {
        scanner.pos--;
        let dot = false;
        let ch: number;

        while (scanner.pos >= 0) {
            ch = prev(scanner);
            if (ch === 46 /* . */) {
                if (dot) {
                    // Decimal delimiter already consumed, abort
                    break;
                }
                dot = true;
            } else if (!isNumber(ch)) {
                break;
            }
            scanner.pos--;
        }

        return true;
    }

    return false;
}

function prev(scanner: BackwardScanner): number {
    return scanner.text.charCodeAt(scanner.pos - 1);
}

function cur(scanner: BackwardScanner): number {
    return scanner.text.charCodeAt(scanner.pos);
}
