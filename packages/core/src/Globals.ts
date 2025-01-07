import { Logger, createLogger } from 'winston'

export interface IGlobals {
	logger: Logger
}

const Globals: IGlobals = {
	// Noop silent logger as default.
	logger: createLogger({ silent: true }),
}

export default Globals
