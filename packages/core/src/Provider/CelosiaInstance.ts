import express, { NextFunction, Request, Response } from 'express'

import { Server } from 'http'

import cookieParser from 'cookie-parser'

import {
	BaseMiddleware,
	CelosiaRequest,
	CelosiaResponse,
	CelosiaRouter,
	ExtensionsRegistry,
	Globals,
	IListenOptions,
	InvalidExtensionError,
	NoInputMiddleware,
} from '..'
import ParseJson from './Middlewares/ParseJson'
import ParseUrlencoded from './Middlewares/ParseUrlencoded'

export interface CelosiaInstanceConstructorOptions<Strict extends boolean = true> {
	strict: Strict
}

export const CelosiaInstanceInternalsSymbol = Symbol('celosiaInstanceInternals')

class CelosiaInstance<Strict extends boolean> {
	protected _cachedExtensionsProxy: CelosiaJS.CelosiaInstance<Strict> | null = null

	protected readonly isStrict: Strict
	protected readonly express: ReturnType<typeof express>
	protected _server: Server | null = null
	protected logger = Globals.logger.child({ source: 'CelosiaJS' })

	constructor(options: CelosiaInstanceConstructorOptions<Strict>) {
		this.isStrict = options.strict

		this.express = express()

		// Only for internal use.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, security/detect-object-injection
		;(this.express as any)[CelosiaInstanceInternalsSymbol] = {
			instance: this,
		}

		// Settings
		this.express.disable('x-powered-by')

		this.express.use(ParseUrlencoded)
		this.express.use(ParseJson)

		this.express.use(cookieParser())
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
	 * Must be called last after all router is registered
	 *
	 * TODO: Doesn't work until Express 5 because Express 4.x won't catch uncaught exception in promise.
	 */
	public addErrorHandler() {
		this.express.use((error: Error, _: Request, response: Response, __: NextFunction): void => {
			this.logger.error('Global error handler', error)
			response.status(500).json({ errors: { others: ['Internal Server Error'] }, data: {} })
		})
	}

	/**
	 * Listen for connections.
	 */
	public listen(options: IListenOptions): Promise<void> {
		if (this._server !== null) throw new Error('Server already running')

		return new Promise(resolve => {
			// https://stackoverflow.com/a/69324331/14813577
			this._server = this.express.listen(
				options.port ?? 0,
				options.host ?? '127.0.0.1',
				options.backlog ?? 511,
				resolve,
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
				const newRequest = new CelosiaRequest(request)
				const newResponse = new CelosiaResponse(response)

				try {
					middleware.index({}, newRequest, newResponse, () => {
						next()
					})
				} catch (error) {
					this.logger.error('Unknown middleware error occured', error)
				}
			}

			if (path === null) this.express.use(handler)
			else this.express.use(path, handler)
		})

		return this
	}
}

export default CelosiaInstance
