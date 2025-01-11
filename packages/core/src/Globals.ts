import { Logger, createLogger } from 'winston'

export interface CelosiaGlobals {
	logger: Logger
}

const Globals: CelosiaGlobals = {
	// Noop silent logger as default.
	logger: createLogger({ silent: true }),
}

export default Globals
