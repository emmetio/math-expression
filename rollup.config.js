import typescript from 'rollup-plugin-typescript2';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
    input: './src/index.ts',
    plugins: [nodeResolve(), typescript({
        tsconfigOverride: {
            compilerOptions: { module: 'esnext' }
        }
    })],
    output: [{
        file: './dist/math.es.js',
        format: 'es',
        sourcemap: true
    }, {
        file: './dist/math.cjs.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
    }]
};
