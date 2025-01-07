import winston from 'winston'

import Globals from 'Globals'

class BaseService {
	logger: winston.Logger

	constructor(protected loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}
}

export default BaseService
