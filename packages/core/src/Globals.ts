import winston from 'winston'

export interface IGlobals {
	logger: winston.Logger
}

const Globals: IGlobals = {
	// Noop silent logger as default.
	logger: winston.createLogger({ silent: true }),
}

export default Globals
