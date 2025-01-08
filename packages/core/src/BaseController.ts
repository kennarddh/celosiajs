/* eslint-disable @typescript-eslint/no-empty-object-type */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from 'winston'

import { ZodType, z } from 'zod'

import { CelosiaRequest, CelosiaResponse, Globals } from '.'

const emptyZodObject = z.object({})

abstract class BaseController<
	T extends Record<string, any> = {},
	Request extends CelosiaRequest<any, any, any, any> = CelosiaRequest<any, any, any, any>,
	Response extends CelosiaResponse<any> = CelosiaResponse<any>,
> {
	protected logger: Logger

	constructor(protected loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}

	public abstract index(data: T, request: Request, response: Response): void

	public get body(): ZodType<any, any, any> {
		return emptyZodObject
	}

	public get query() {
		return emptyZodObject
	}

	public get params() {
		return emptyZodObject
	}

	public get cookies() {
		return emptyZodObject
	}
}

export default BaseController
