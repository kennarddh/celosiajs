import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	splitting: false,
	sourcemap: false,
	watch: true,
	experimentalDts: true,
	format: 'esm',
})
