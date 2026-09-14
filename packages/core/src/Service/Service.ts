import LoggerBase from '../LoggerBase'

abstract class Service extends LoggerBase {
	// eslint-disable-next-line @typescript-eslint/no-useless-constructor
	constructor(loggingSource: string) {
		super(loggingSource)
	}
}

export default Service
