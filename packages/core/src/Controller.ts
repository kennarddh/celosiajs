/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
import { Logger } from 'winston'

import { ZodTypeAny, z } from 'zod'

import { CelosiaRequest, CelosiaResponse, Globals } from '.'

const emptyOptionalZodObject = z.object({}).optional()

abstract class Controller<
	T extends Record<string, any> = {},
	Request extends CelosiaRequest<any, any, any, any> = CelosiaRequest<any, any, any, any>,
	Response extends CelosiaResponse<any> = CelosiaResponse<any>,
> {
	protected logger: Logger

	constructor(protected loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}

	public abstract index(data: T, request: Request, response: Response): void

	/**
	 * Request's body validation.
	 */
	public get body(): ZodTypeAny {
		return emptyOptionalZodObject
	}

	/**
	 * Request's query validation.
	 */
	public get query() {
		return emptyOptionalZodObject
	}

	/**
	 * Request's params validation.
	 */
	public get params() {
		return emptyOptionalZodObject
	}

	/**
	 * Request's cookies validation.
	 */
	public get cookies() {
		return emptyOptionalZodObject
	}
}

export default Controller
