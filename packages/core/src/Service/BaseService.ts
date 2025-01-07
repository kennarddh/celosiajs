import { Logger } from 'winston'

import Globals from '../Globals'

class BaseService {
	logger: Logger

	constructor(public loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}
}

export default BaseService
