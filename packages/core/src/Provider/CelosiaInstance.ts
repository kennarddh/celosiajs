import express, { NextFunction, Request, Response } from 'express'

import { Server } from 'http'

import cookieParser from 'cookie-parser'

import { OptionsJson, OptionsUrlencoded } from 'body-parser'

import {
	BaseMiddleware,
	CelosiaRequest,
	CelosiaRouter,
	CelosiaRouterOptions,
	ExtensionsRegistry,
	Globals,
	IListenOptions,
	InvalidExtensionError,
	NoInputMiddleware,
} from '..'
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

export interface IJSONBodyParserOptions extends OptionsJson {
	/**
	 * Whether this parser is enabled.
	 */
	enabled?: boolean
}

export interface IUrlencodedBodyParserOptions extends OptionsUrlencoded {
	/**
	 * Whether this parser is enabled.
	 */
	enabled?: boolean
}

export interface ICookieParserOptions {
	/**
	 * Whether this parser is enabled.
	 */
	enabled?: boolean
}

export interface IQueryParserOptions {
	/**
	 * Whether this parser is enabled.
	 */
	enabled?: boolean

	/**
	 * Mode to use when parsing query.
	 */
	mode?: QueryParserMode
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
	queryParserOptions?: IQueryParserOptions

	/**
	 * Options supplied for `cookieParser`.
	 */
	cookieParserOptions?: ICookieParserOptions

	/**
	 * Options supplied for `bodyParser.json`.
	 */
	jsonBodyParserOptions?: IJSONBodyParserOptions

	/**
	 * Options supplied for `bodyParser.urlencoded`.
	 */
	urlencodedBodyParserOptions?: IUrlencodedBodyParserOptions

	/**
	 * Options supplied for the root router.
	 */
	rootRouterOptions?: Omit<CelosiaRouterOptions, 'mergeParams'>
}

class CelosiaInstance<Strict extends boolean> {
	protected _cachedExtensionsProxy: CelosiaJS.CelosiaInstance<Strict> | null = null

	protected readonly express: ReturnType<typeof express>
	protected _server: Server | null = null
	protected logger = Globals.logger.child({ source: 'CelosiaJS' })
	protected _options: CelosiaInstanceConstructorOptions<Strict>
	protected hasErrorHandlerAdded = false

	constructor(options: CelosiaInstanceConstructorOptions<Strict>) {
		this._options = options

		this.express = express()

		this.express.celosiaInstance = this

		// Settings
		this.express.disable('x-powered-by')

		if (this.options.rootRouterOptions?.caseSensitive !== undefined) {
			this.express.set('case sensitive routing', this.options.rootRouterOptions.caseSensitive)
		}

		if (this.options.rootRouterOptions?.strictTrailingSlashes !== undefined) {
			this.express.set('strict routing', this.options.rootRouterOptions.strictTrailingSlashes)
		}

		if (this.options.queryParserOptions?.enabled ?? true) {
			this.express.set(
				'query parser',
				(this.options.queryParserOptions?.mode ?? QueryParserMode.Simple) ==
					QueryParserMode.Simple
					? 'simple'
					: 'extended',
			)
		} else {
			this.express.set('query parser', false)
		}

		this.express.use(InjectProperties)

		if (this.options.urlencodedBodyParserOptions?.enabled ?? true) {
			const { enabled: _, ...restOptions } = this.options.urlencodedBodyParserOptions ?? {}

			this.express.use(ParseUrlencoded(restOptions))
		}

		if (this.options.jsonBodyParserOptions?.enabled ?? true) {
			const { enabled: _, ...restOptions } = this.options.jsonBodyParserOptions ?? {}

			this.express.use(ParseJson(restOptions))
		}

		if (this.options.cookieParserOptions?.enabled ?? true) {
			this.express.use(cookieParser())
		} else {
			this.express.use(InjectDefaultCookie)
		}
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
		if (this._cachedExtensionsProxy === null)
			this._cachedExtensionsProxy = new Proxy(
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

		this.express.use(
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
	public listen(options: IListenOptions): Promise<void> {
		if (this._server !== null) throw new Error('Server already running')

		return new Promise((resolve, reject) => {
			// https://stackoverflow.com/a/69324331/14813577
			this._server = this.express.listen(
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
			if (path === null) this.express.use(router.expressRouter)
			else this.express.use(path, router.expressRouter)
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
		) as BaseMiddleware[]

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

			if (path === null) this.express.use(handler)
			else this.express.use(path, handler)
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
