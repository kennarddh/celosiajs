/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-parameters */
import z, { ZodType } from 'zod/v4'

import { CelosiaRequest, CelosiaResponse, LoggerBase } from '.'

const emptyZodObject = z.object({})

abstract class Controller<
	T extends Record<string, any> = {},
	Request extends CelosiaRequest<any, any, any, any> = CelosiaRequest<any, any, any, any>,
	Response extends CelosiaResponse<any> = CelosiaResponse<any>,
> extends LoggerBase {
	constructor(loggingSource: string) {
		super(loggingSource)
	}

	public abstract index(data: T, request: Request, response: Response): void

	/**
	 * Request's body validation.
	 */
	public get body(): ZodType {
		return z.object({}).optional()
	}

	/**
	 * Request's query validation.
	 */
	public get query() {
		return emptyZodObject
	}

	/**
	 * Request's params validation.
	 */
	public get params() {
		return emptyZodObject
	}

	/**
	 * Request's cookies validation.
	 */
	public get cookies() {
		return emptyZodObject
	}
}

export default Controller
