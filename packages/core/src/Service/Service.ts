import { Logger } from 'winston'

import LoggerBase from 'LoggerBase'

abstract class Service extends LoggerBase {
	declare protected logger: Logger

	constructor(loggingSource: string) {
		super(loggingSource)
	}
}

export default Service
