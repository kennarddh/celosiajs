import { BuildOptions } from 'esbuild'

const esbuildOptions = {
	entryPoints: ['./src/index.ts'],
	outdir: './dist/',
	bundle: true,
	sourcemap: true,
	format: 'esm',
	platform: 'node',
	packages: 'external',
} satisfies BuildOptions as BuildOptions

export default esbuildOptions
