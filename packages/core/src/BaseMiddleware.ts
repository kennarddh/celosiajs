/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

/* eslint-disable @typescript-eslint/no-explicit-any */
import winston from 'winston'

import { CelosiaRequest, CelosiaResponse, EmptyObject, Globals, INextFunction } from '.'

abstract class BaseMiddleware<
	Request extends CelosiaRequest<any, any, any, any> = CelosiaRequest<any, any, any, any>,
	Response extends CelosiaResponse<any> = CelosiaResponse<any>,
	Input extends Record<string, any> = EmptyObject,
	Output extends Record<string, any> | EmptyObject = EmptyObject,
> {
	logger: winston.Logger

	constructor(public loggingSource: string) {
		this.logger = Globals.logger.child({ source: loggingSource })
	}

	public abstract index(
		data: Input,
		request: Request,
		response: Response,
		next: INextFunction<Output | undefined>,
	): any | Promise<any>
}

export default BaseMiddleware
