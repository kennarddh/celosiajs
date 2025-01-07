import winston from 'winston'

import Globals from 'Globals'

class BaseRepository {
	logger: winston.Logger

	constructor(protected loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}
}

export default BaseRepository
