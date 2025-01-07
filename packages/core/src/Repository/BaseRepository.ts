import { Logger } from 'winston'

import Globals from '../Globals'

class BaseRepository {
	logger: Logger

	constructor(public loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}
}

export default BaseRepository
