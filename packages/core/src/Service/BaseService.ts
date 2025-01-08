import { Logger } from 'winston'

import Globals from '../Globals'

class BaseService {
	protected logger: Logger

	constructor(protected loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}
}

export default BaseService
