/* eslint-disable @typescript-eslint/no-empty-object-type */

/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod'

import { CelosiaRequest, CelosiaResponse } from '.'

const emptyZodObject = z.object({})

abstract class BaseController<
	T extends Record<string, any> = {},
	Request extends CelosiaRequest<any, any, any, any> = CelosiaRequest<any, any, any, any>,
	Response extends CelosiaResponse<any> = CelosiaResponse<any>,
> {
	public abstract index(data: T, request: Request, response: Response): void

	public get body() {
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
