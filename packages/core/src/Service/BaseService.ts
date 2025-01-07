import winston from 'winston'

import Globals from 'Globals'

class BaseService {
	logger: winston.Logger

	constructor(public loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}
}

export default BaseService
