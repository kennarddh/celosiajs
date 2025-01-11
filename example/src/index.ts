import {
	BaseController,
	BaseMiddleware,
	BaseRepository,
	BaseService,
	CelosiaInstance,
	CelosiaRequest,
	CelosiaResponse,
	CelosiaRouter,
	ControllerRequest,
	DependencyInjection,
	EmptyObject,
	Globals,
	Injectable,
	NextFunction,
	SendRequestId,
} from '@celosiajs/core'
import { FileUpload } from '@celosiajs/file-upload'
import { CelosiaFormat } from '@celosiajs/logging'

import * as winston from 'winston'

import { z } from 'zod'

import FileUploadController from './Controllers/FileUploadController'

const logger = winston.createLogger({
	transports: [new winston.transports.Console()],
	format: winston.format.combine(
		winston.format.ms(),
		CelosiaFormat({ inspectOptions: { depth: Infinity } }),
	),
})

Globals.logger = logger

const port = 9999

class Middleware1 extends BaseMiddleware {
	constructor() {
		super('Middleware1')
	}

	override index(
		_: EmptyObject,
		__: CelosiaRequest,
		___: CelosiaResponse,
		next: NextFunction,
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
		____: NextFunction,
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
		request: ControllerRequest<TestController>,
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
		__: ControllerRequest<GetController>,
		response: CelosiaResponse,
	) {
		this.logger.info('Get request')
		response.status(200).json({ hi: true })
	}
}

@Injectable()
class UserRepository extends BaseRepository {
	public getById(id: string) {
		return { id, name: 'X' }
	}
}

@Injectable()
class UserService extends BaseService {
	constructor(private userRepository = DependencyInjection.get(UserRepository)) {
		super('UserService')
	}

	public getNameLowercase() {
		return this.userRepository.getById('1').name.toLowerCase()
	}
}

class UserController extends BaseController {
	constructor(private userService = DependencyInjection.get(UserService)) {
		super('UserController')
	}

	public async index(
		_: EmptyObject,
		request: ControllerRequest<UserController>,
		response: CelosiaResponse,
	) {
		this.logger.info('User request', { query: request.query, requestId: request.id })
		const name = this.userService.getNameLowercase()
		response.status(200).json({ name })
	}

	public override get query() {
		return z.object({
			a: z.string(),
		})
	}
}

const instance = new CelosiaInstance({
	strict: true,
	// jsonBodyParserOptions: { enabled: false },
	// urlencodedBodyParserOptions: { enabled: false },
	// queryParserOptions: { enabled: false },
	// cookieParserOptions: { enabled: false },
})

instance.useMiddlewares(new SendRequestId())

const router = new CelosiaRouter({ strict: true })

router.post('/file-upload', [new FileUpload()], [new Middleware1()], new FileUploadController())
router.post('/test', [], new TestController())
router.get('/', [], new GetController())
router.post('/middleware-error', [new MiddlewareErrorController()], new TestController())
router.get('/user', [], new UserController())

router.group(
	'/caseSensitive',
	{ strict: true, caseSensitive: true, strictTrailingSlashes: true },
	router => {
		router.get('/user', [], new UserController())
	},
)

instance.useRouters(router)

instance.addErrorHandler()

await instance.listen({ port: port })

console.log(`Server up on port ${port}.`)
