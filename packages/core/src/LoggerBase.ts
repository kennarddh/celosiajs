import { Logger } from 'winston'

import Globals from './Globals'

abstract class LoggerBase {
	public logger: Logger

	constructor(public loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}
}

export default LoggerBase
