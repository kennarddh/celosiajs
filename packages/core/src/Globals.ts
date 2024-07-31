import winston from 'winston'

export interface IGlobals {
	logger: winston.Logger
}

const Globals: IGlobals = {
	// Noop logger as default
	logger: new winston.Logger(),
}

export default Globals
