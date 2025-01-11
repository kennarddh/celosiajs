import { Logger, createLogger } from 'winston'

export interface CelosiaGlobals {
	/**
	 * Logger for this framework to use and assign.
	 *
	 * Noop silent logger as default.
	 */
	logger: Logger
}

const Globals: CelosiaGlobals = {
	logger: createLogger({ silent: true }),
}

export default Globals
