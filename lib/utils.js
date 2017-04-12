'use strict';

/**
 * Fixes StreamReader design flaw: check if stream is at the start-of-file
 * @param  {StreamReader}  stream
 * @return {Boolean}
 */
export function isSoF(stream) {
	return stream.sof ? stream.sof() : stream.pos <= 0;
}
