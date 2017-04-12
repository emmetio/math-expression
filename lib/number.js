'use strict';

import { isNumber } from '@emmetio/stream-reader-utils';
import { isSoF } from './utils';

const DOT = 46; // .

/**
 * Consumes number from given stream, either in forward or backward direction
 * @param {StreamReader} stream
 * @param {Boolean}      backward Consume number in backward direction
 */
export default function(stream, backward) {
	return backward ? consumeBackward(stream) : consumeForward(stream);
}

/**
 * Consumes number in forward stream direction
 * @param  {StreamReader} stream
 * @return {Boolean}        Returns true if number was consumed
 */
function consumeForward(stream) {
	const start = stream.pos;
	if (stream.eat(DOT) && stream.eatWhile(isNumber)) {
		// short decimal notation: .025
		return true;
	}

	if (stream.eatWhile(isNumber) && (!stream.eat(DOT) || stream.eatWhile(isNumber))) {
		// either integer or decimal: 10, 10.25
		return true;
	}

	stream.pos = start;
	return false;
}

/**
 * Consumes number in backward stream direction
 * @param  {StreamReader} stream
 * @return {Boolean}        Returns true if number was consumed
 */
function consumeBackward(stream) {
	const start = stream.pos;
	let ch, hadDot = false, hadNumber = false;
	// NB a StreamReader insance can be editor-specific and contain objects
	// as a position marker. Since we don’t know for sure how to compare editor
	// position markers, use consumed length instead to detect if number was consumed
	let len = 0;

	while (!isSoF(stream)) {
		stream.backUp(1);
		ch = stream.peek();

		if (ch === DOT && !hadDot && hadNumber) {
			hadDot = true;
		} else if (!isNumber(ch)) {
			stream.next();
			break;
		}

		hadNumber = true;
		len++;
	}

	if (len) {
		const pos = stream.pos;
		stream.start = pos;
		stream.pos = start;
		return true;
	}

	stream.pos = start;
	return false;
}
