import {
	BaseController,
	BaseMiddleware,
	CelosiaInstance,
	CelosiaRequest,
	CelosiaResponse,
	CelosiaRouter,
	EmptyObject,
	Globals,
	IControllerRequest,
	INextFunction,
} from '@celosiajs/core'
import { FileUpload } from '@celosiajs/file-upload'

import winston from 'winston'

import FileUploadController from 'Controllers/FileUploadController'
import { z } from 'zod'

import { CelosiaFormat } from '../../packages/logging/dist'

const logger = winston.createLogger({
	transports: [new winston.transports.Console()],
	format: winston.format.combine(
		winston.format.ms(),
		CelosiaFormat({ inspectOptions: { depth: Infinity } }),
	),
})

Globals.logger = logger

const port = 9999

const instance = new CelosiaInstance({ strict: true })

const router = new CelosiaRouter({ strict: true })

class Middleware1 extends BaseMiddleware {
	constructor() {
		super('Middleware1')
	}

	override index(
		_: EmptyObject,
		__: CelosiaRequest,
		___: CelosiaResponse,
		next: INextFunction,
	): void {
		console.log('middleware')
		next()
	}
}

class MiddlewareErrorController extends BaseMiddleware {
	constructor() {
		super('MiddlewareErrorController')
	}

	override index(
		_: EmptyObject,
		__: CelosiaRequest,
		___: CelosiaResponse,
		____: INextFunction,
	): void {
		throw new Error('x')
	}
}

class TestController extends BaseController {
	constructor() {
		super('TestController')
	}

	public async index(
		_: EmptyObject,
		request: IControllerRequest<TestController>,
		response: CelosiaResponse,
	) {
		console.log('controller body', request.body)
		response.status(200).json({ hi: true })
	}

	public override get body() {
		return z.object({
			str: z.string(),
		})
	}
}

class GetController extends BaseController {
	constructor() {
		super('GetController')
	}

	public async index(
		_: EmptyObject,
		__: IControllerRequest<TestController>,
		response: CelosiaResponse,
	) {
		this.logger.info('Get request')
		response.status(200).json({ hi: true })
	}
}

router.post('/file-upload', [new FileUpload()], [new Middleware1()], new FileUploadController())
router.post('/test', [], new TestController())
router.get('/', [], new GetController())
router.post('/middleware-error', [new MiddlewareErrorController()], new TestController())

instance.useRouters(router)

instance.addErrorHandler()

await instance.listen({ port: port })

console.log(`Server up on port ${port}.`)
