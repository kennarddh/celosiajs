import express, { NextFunction, Request, Response } from 'express'

import { Server } from 'http'

import cookieParser, { CookieParseOptions } from 'cookie-parser'

import { OptionsJson, OptionsUrlencoded } from 'body-parser'
import qs from 'qs'

import {
	CelosiaRequest,
	CelosiaRouter,
	CelosiaRouterOptions,
	ExtensionsRegistry,
	InvalidExtensionError,
	JSON,
	ListenOptions,
	Middleware,
	NoInputMiddleware,
} from '..'
import LoggerBase from '../LoggerBase'
import InjectDefaultCookie from './Middlewares/InjectDefaultCookie'
import InjectProperties from './Middlewares/InjectProperties'
import ParseJson from './Middlewares/ParseJson'
import ParseUrlencoded from './Middlewares/ParseUrlencoded'

export enum QueryParserMode {
	/**
	 * Use node's `querystring` module.
	 */
	Simple,

	/**
	 * Use `qs` module.
	 */
	Extended,
}

export interface JSONBodyParserOptions extends OptionsJson {
	/**
	 * Whether this parser is enabled.
	 */
	enabled?: boolean
}

export interface UrlencodedBodyParserOptions extends OptionsUrlencoded {
	/**
	 * Whether this parser is enabled.
	 */
	enabled?: boolean
}

export interface CookieParserOptions extends CookieParseOptions {
	/**
	 * Whether this parser is enabled.
	 */
	enabled?: boolean

	/**
	 * Cookie signing secret(s).
	 */
	secret?: string | string[]
}

export interface QueryParserOptions {
	/**
	 * Whether this parser is enabled.
	 */
	enabled?: boolean

	/**
	 * Mode to use when parsing query.
	 */
	mode?: QueryParserMode

	/**
	 * Options passed to `qs` package for extended mode.
	 */
	extendedOptions?: qs.IParseOptions<qs.BooleanOptional>
}

export interface ResponseOptions {
	/**
	 * Customize `CelosiaResponse.sendInternalServerError` response.
	 */
	internalServerError?: JSON
}

export interface CelosiaInstanceConstructorOptions<Strict extends boolean = true> {
	strict: Strict

	/**
	 * A generator function to generate a unique id for each request. Defaults to `crypto.randomUUID`.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	generateRequestId?: (request: CelosiaRequest<any, any, any, any>) => string

	/**
	 * Options for query parser.
	 */
	queryParser?: QueryParserOptions

	/**
	 * Options supplied for `cookieParser`.
	 */
	cookieParser?: CookieParserOptions

	/**
	 * Options supplied for `bodyParser.json`.
	 */
	jsonBodyParser?: JSONBodyParserOptions

	/**
	 * Options supplied for `bodyParser.urlencoded`.
	 */
	urlencodedBodyParser?: UrlencodedBodyParserOptions

	/**
	 * Options supplied for the root router.
	 */
	rootRouter?: Omit<CelosiaRouterOptions, 'mergeParams'>

	/**
	 * Options for trust proxy.
	 *
	 * When setting to `true`, make sure the last reverse proxy trusted is removing/overwriting all of the following HTTP headers: `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto`, otherwise it may be possible for the client to provide any value.
	 * A string can be a single ip address, subnet, or comma separated subnets.
	 * Pre-configured subnet names:
	 *   `loopback` - 127.0.0.1/8, ::1/128
	 *   `linklocal` - 169.254.0.0/16, fe80::/10
	 *   `uniquelocal` - 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
	 *
	 * An array can be passed instead of comma separated subnets.
	 * When a number is used, this will use the address that is at most `n` number of hops away from the application.
	 * `request.socket.remoteAddress` is the first hop, and the rest are looked for in the `X-Forwarded-For` header from right to left. A value of `0` means that the first untrusted address would be `request.socket.remoteAddress`, i.e. there is no reverse proxy.
	 *
	 * A custom function which receive ip as parameter and returns boolean can be passed.
	 */
	trustProxy?: boolean | string | string[] | ((ip: string) => boolean) | number

	/**
	 * Options for response.
	 */
	response?: ResponseOptions
}

class CelosiaInstance<Strict extends boolean> extends LoggerBase {
	protected _cachedExtensionsProxy: CelosiaJS.CelosiaInstance<Strict> | null = null

	protected readonly _express: ReturnType<typeof express>
	protected _server: Server | null = null
	protected _options: CelosiaInstanceConstructorOptions<Strict>
	protected hasErrorHandlerAdded = false

	constructor(options: CelosiaInstanceConstructorOptions<Strict>) {
		super('CelosiaJS')

		this._options = options

		this._express = express()

		this._express.celosiaInstance = this

		// Settings
		this._express.disable('x-powered-by')

		if (this.options.trustProxy !== undefined) {
			this._express.set('trust proxy', this.options.trustProxy)
		}

		if (this.options.rootRouter?.caseSensitive !== undefined) {
			this._express.set('case sensitive routing', this.options.rootRouter.caseSensitive)
		}

		if (this.options.rootRouter?.strictTrailingSlashes !== undefined) {
			this._express.set('strict routing', this.options.rootRouter.strictTrailingSlashes)
		}

		if (this.options.queryParser?.enabled ?? true) {
			if (
				(this.options.queryParser?.mode ?? QueryParserMode.Simple) == QueryParserMode.Simple
			) {
				this._express.set('query parser', 'simple')
			} else {
				this._express.set('query parser fn', (str: string) => {
					return qs.parse(str, this.options.queryParser?.extendedOptions)
				})
			}
		} else {
			this._express.set('query parser', false)
		}

		this._express.use(InjectProperties)

		if (this.options.urlencodedBodyParser?.enabled ?? true) {
			const { enabled: _, ...restOptions } = this.options.urlencodedBodyParser ?? {}

			this._express.use(ParseUrlencoded(restOptions))
		}

		if (this.options.jsonBodyParser?.enabled ?? true) {
			const { enabled: _, ...restOptions } = this.options.jsonBodyParser ?? {}

			this._express.use(ParseJson(restOptions))
		}

		if (this.options.cookieParser?.enabled ?? true) {
			const { enabled: _, secret, ...restOptions } = this.options.cookieParser ?? {}

			this._express.use(cookieParser(secret, restOptions))
		} else {
			this._express.use(InjectDefaultCookie)
		}
	}

	/**
	 * Returns express instance.
	 */
	public get express() {
		return this._express
	}

	/**
	 * Returns the options used to initialize this instance.
	 */
	public get options() {
		return this._options
	}

	/**
	 * User-defined extensions method.
	 * Register by using `ExtensionsRegistry.registerCelosiaInstanceExtension`.
	 */
	public get extensions(): CelosiaJS.CelosiaInstance<Strict> {
		this._cachedExtensionsProxy ??= new Proxy(
			{},
			{
				get: (_, property, __) => {
					const extensionHandler =
						ExtensionsRegistry.getCelosiaInstanceExtension(property)

					if (extensionHandler === undefined)
						throw new InvalidExtensionError(
							`Use of unregistered extension "${property.toString()}".`,
						)

					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
					return (...args: any[]) => extensionHandler(this, ...args)
				},
			},
		) as CelosiaJS.CelosiaInstance<Strict>

		return this._cachedExtensionsProxy
	}

	public get server() {
		return this._server
	}

	public get isListening(): boolean {
		return this._server?.listening ?? false
	}

	/**
	 * Add a catch all error handler.
	 * Must be called last after all router is registered.
	 */
	public addErrorHandler() {
		if (this.hasErrorHandlerAdded) return

		this.hasErrorHandlerAdded = true

		this._express.use(
			(error: Error, request: Request, response: Response, __: NextFunction): void => {
				this.logger.error(
					'Global error handler',
					{ requestId: request.celosiaRequest.id },
					error,
				)

				response
					.status(500)
					.json({ errors: { others: ['Internal Server Error'] }, data: {} })
			},
		)
	}

	/**
	 * Listen for connections.
	 */
	public listen(options: ListenOptions): Promise<void> {
		if (this._server !== null) throw new Error('Server already running')

		return new Promise((resolve, reject) => {
			// https://stackoverflow.com/a/69324331/14813577
			this._server = this._express.listen(
				options.port ?? 0,
				options.host ?? '127.0.0.1',
				options.backlog ?? 511,
				// TODO: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/71488
				// https://expressjs.com/en/guide/migrating-5.html#app.listen
				// Wait for the express' typing package to be update to reflect the latest changes in listen's callback in v5
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				((error?: Error) => {
					if (error) return reject(error)

					resolve()
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				}) as any,
			)
		})
	}

	/**
	 * Stops the server from accepting new connections and keeps existing connections.
	 */
	public close(): Promise<void> {
		if (this._server === null) throw new Error('Server is not running')

		return new Promise((resolve, reject) => {
			this._server?.close(error => {
				if (error) reject(error)
				else resolve()
			})
		})
	}

	/**
	 * Use a router with a path.
	 */
	public useRouters(
		path: string,
		...routers: [CelosiaRouter<Strict>, ...CelosiaRouter<Strict>[]]
	): this

	/**
	 * Use a router on base url.
	 */
	public useRouters(...routers: [CelosiaRouter<Strict>, ...CelosiaRouter<Strict>[]]): this

	public useRouters(
		...routersAndPath: [string | CelosiaRouter<Strict>, ...(string | CelosiaRouter<Strict>)[]]
	): this {
		const possiblyPath = routersAndPath[0]
		const path = typeof possiblyPath === 'string' ? possiblyPath : null

		const routers = (
			path === null ? routersAndPath : routersAndPath.filter((_, index) => index !== 0)
		) as CelosiaRouter[]

		routers.forEach(router => {
			if (path === null) this._express.use(router.expressRouter)
			else this._express.use(path, router.expressRouter)
		})

		return this
	}

	/**
	 * For middlewares without any input or output
	 */
	public useMiddlewares(
		path: string,
		...middlewares: [NoInputMiddleware, ...NoInputMiddleware[]]
	): this

	/**
	 * For middlewares without any input or output
	 */
	public useMiddlewares(...middlewares: [NoInputMiddleware, ...NoInputMiddleware[]]): this

	public useMiddlewares(
		...middlewaresAndPath: [string | NoInputMiddleware, ...(string | NoInputMiddleware)[]]
	): this {
		const possiblyPath = middlewaresAndPath[0]
		const path = typeof possiblyPath === 'string' ? possiblyPath : null

		const middlewares = (
			path === null
				? middlewaresAndPath
				: middlewaresAndPath.filter((_, index) => index !== 0)
		) as Middleware[]

		middlewares.forEach(middleware => {
			const handler = (request: Request, response: Response, next: NextFunction) => {
				try {
					middleware.index({}, request.celosiaRequest, response.celosiaResponse, () => {
						next()
					})
				} catch (error) {
					this.logger.error(
						'Unknown middleware error occured',
						{ requestId: request.celosiaRequest.id },
						error,
					)
				}
			}

			if (path === null) this._express.use(handler)
			else this._express.use(path, handler)
		})

		return this
	}

	/**
	 * Generate a request id for every new request. If supplied this will use `options.generateRequestId` else it will use `crypto.randomUUID`.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public generateRequestId(request: CelosiaRequest<any, any, any, any>): string {
		return this.options.generateRequestId?.(request) ?? crypto.randomUUID()
	}
}

export default CelosiaInstance
