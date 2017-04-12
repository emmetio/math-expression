export default {
	entry: './index.js',
	exports: 'named',
	external: [
		'@emmetio/stream-reader',
		'@emmetio/stream-reader-utils'
	],
	targets: [
		{format: 'cjs', dest: 'dist/math.cjs.js'},
		{format: 'es',  dest: 'dist/math.es.js'}
	]
};
