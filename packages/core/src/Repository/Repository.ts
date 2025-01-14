import { Logger } from 'winston'

import Globals from '../Globals'

class Repository {
	protected logger: Logger

	constructor(protected loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}
}

export default Repository
