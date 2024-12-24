import * as esbuild from 'esbuild'

import esbuildOptions from './esbuildOptions'

const context = await esbuild.context(esbuildOptions)

await context.watch()
