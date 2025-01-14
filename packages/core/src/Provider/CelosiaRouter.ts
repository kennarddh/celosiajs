/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { NextFunction, Request, Response } from 'express'

import {
	CelosiaRequest,
	Controller,
	EmptyObject,
	ExtensionsRegistry,
	Globals,
	InvalidExtensionError,
	MergeMiddlewaresOutput,
	Middleware,
	MiddlewareArray,
	NoInputMiddleware,
	ValidateController,
	ValidateControllerWithoutBody,
	ValidateMiddlewares,
} from '..'

// TODO: Make descendant routers inherit their parent options.

// https://github.com/pillarjs/router
/**
 * Descendant routers will not inherit their parent's options.
 */
export interface CelosiaRouterOptions {
	/**
	 * When `false` trailing slashes are optional.
	 *
	 * @default false
	 */
	strictTrailingSlashes?: boolean

	/**
	 * When `true` the routing will be case sensitive.
	 *
	 * @default false
	 */
	caseSensitive?: boolean

	/**
	 * When `true` any `req.params` passed to the router will be merged into the router's `req.params`.
	 *
	 * @default false
	 */
	mergeParams?: boolean
}

/**
 * Descendant routers will not inherit their parent's options.
 */
export interface CelosiaRouterConstructorOptions<Strict extends boolean = true>
	extends CelosiaRouterOptions {
	strict: Strict
}

/**
 * Group router will only their direct parent's options.
 */
export type CelosiaRouterGroupCallback<Strict extends boolean> = (
	router: CelosiaRouter<Strict>,
) => void

/**
 * Descendant routers will not inherit their parent's options.
 */
class CelosiaRouter<Strict extends boolean = true> {
	protected _celosiaRouterOptions: CelosiaRouterConstructorOptions<Strict>
	protected _isStrict: Strict
	private _expressRouter

	protected _cachedExtensionsProxy: CelosiaJS.CelosiaRouter<Strict> | null = null

	protected logger = Globals.logger.child({ source: 'CelosiaJS' })

	constructor(options: CelosiaRouterConstructorOptions<Strict>) {
		this._celosiaRouterOptions = options

		this._isStrict = options.strict

		this._expressRouter = express.Router({
			strict: options.strictTrailingSlashes,
			caseSensitive: options.caseSensitive,
			mergeParams: options.mergeParams,
		})
	}

	/**
	 * Returns the options used to initialize this instance.
	 */
	public get celosiaRouterOptions() {
		return this._celosiaRouterOptions
	}

	/**
	 * User-defined extensions method.
	 * Register by using `ExtensionsRegistry.registerCelosiaRouterExtension`.
	 */
	public get extensions(): CelosiaJS.CelosiaRouter<Strict> {
		if (this._cachedExtensionsProxy === null)
			this._cachedExtensionsProxy = new Proxy(
				{},
				{
					get: (_, property, __) => {
						const extensionHandler =
							ExtensionsRegistry.getCelosiaRouterExtension(property)

						if (extensionHandler === undefined)
							throw new InvalidExtensionError(
								`Use of unregistered extension "${property.toString()}".`,
							)

						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
						return (...args: any[]) => extensionHandler(this, ...args)
					},
				},
			) as CelosiaJS.CelosiaRouter<Strict>

		return this._cachedExtensionsProxy
	}

	/**
	 * Returns true if this router is strict.
	 */
	public get isStrict(): Strict {
		return this._isStrict
	}

	/**
	 * Express router object.
	 */
	public get expressRouter() {
		return this._expressRouter
	}

	/**
	 * Use another router extending the path of this router.
	 */
	public useRouters(path: string, ...routers: [CelosiaRouter<any>, ...CelosiaRouter<any>[]]): this

	/**
	 * Use another router on the same path.
	 */
	public useRouters(...routers: [CelosiaRouter<any>, ...CelosiaRouter<any>[]]): this

	public useRouters(
		...routersAndPath: [string | CelosiaRouter<any>, ...(string | CelosiaRouter<any>)[]]
	): this {
		const possiblyPath = routersAndPath[0]
		const path = typeof possiblyPath === 'string' ? possiblyPath : null

		const routers = (
			path === null ? routersAndPath : routersAndPath.filter((_, index) => index !== 0)
		) as CelosiaRouter[]

		routers.forEach(router => {
			if (path === null) this._expressRouter.use(router.expressRouter)
			else this._expressRouter.use(path, router.expressRouter)
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
			const handler = async (request: Request, response: Response, next: NextFunction) => {
				try {
					await middleware.index(
						{},
						request.celosiaRequest,
						response.celosiaResponse,
						() => {
							next()
						},
					)
				} catch (error) {
					this.logger.error(
						'Unknown middleware error occured',
						{ requestId: request.celosiaRequest.id },
						error,
					)
				}
			}

			if (path === null) this._expressRouter.use(handler)
			else this._expressRouter.use(path, handler)
		})

		return this
	}

	/**
	 * Group routes by a path, creating another router.
	 */
	public group(path: string, callback: CelosiaRouterGroupCallback<Strict>): void

	/**
	 * Group routes by a path, creating another router.
	 */
	public group(
		path: string,
		options: CelosiaRouterConstructorOptions<Strict>,
		callback: CelosiaRouterGroupCallback<Strict>,
	): void

	/**
	 * Group routes, creating another router.
	 */
	public group(callback: CelosiaRouterGroupCallback<Strict>): void

	/**
	 * Group routes, creating another router.
	 */
	public group(
		// eslint-disable-next-line @typescript-eslint/unified-signatures
		options: CelosiaRouterConstructorOptions<Strict>,
		callback: CelosiaRouterGroupCallback<Strict>,
	): void

	public group(
		callbackOrPathOrOptions:
			| CelosiaRouterGroupCallback<Strict>
			| string
			| CelosiaRouterConstructorOptions<Strict>,
		callbackOrOptions?:
			| CelosiaRouterGroupCallback<Strict>
			| CelosiaRouterConstructorOptions<Strict>,
		callback?: CelosiaRouterGroupCallback<Strict>,
	) {
		let router: CelosiaRouter<Strict>

		if (typeof callbackOrPathOrOptions === 'string') {
			if (typeof callbackOrOptions === 'function') {
				router = new CelosiaRouter(this.celosiaRouterOptions)

				callbackOrOptions(router)
			} else {
				router = new CelosiaRouter({
					...this.celosiaRouterOptions,
					...callbackOrOptions,
				})

				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				callback!(router)
			}

			this.useRouters(callbackOrPathOrOptions, router)
		} else {
			if (typeof callbackOrPathOrOptions === 'function') {
				router = new CelosiaRouter(this.celosiaRouterOptions)

				callbackOrPathOrOptions(router)
			} else {
				router = new CelosiaRouter({
					...this.celosiaRouterOptions,
					...callbackOrPathOrOptions,
				})
				;(callbackOrOptions as CelosiaRouterGroupCallback<Strict>)(router)
			}

			this.useRouters(router)
		}
	}

	/**
	 * Register a get route to a controller with pre-validation middlewares.
	 */
	public get<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends Middleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<C, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<C, Middlewares, MergeMiddlewaresOutput<PreValidationMiddlewares>>,
		controller: C & ValidateControllerWithoutBody<C, Middlewares, Strict>,
	): this

	/**
	 * Register a get route to a controller.
	 */
	public get<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<C, Middlewares>,
		controller: C & ValidateControllerWithoutBody<C, Middlewares, Strict>,
	): this

	public get(
		path: string,
		preValidationMiddlewaresOrMiddlewares: Middleware[],
		middlewaresOrController:
			| Middleware[]
			| Controller<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.get(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Middleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.get(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Controller<
						any,
						CelosiaRequest<any, any, any, any>,
						any
					>,
				),
			)
		}

		return this
	}

	/**
	 * Register a head route to a controller with pre-validation middlewares.
	 */
	public head<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends Middleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<C, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<C, Middlewares, MergeMiddlewaresOutput<PreValidationMiddlewares>>,
		controller: C & ValidateControllerWithoutBody<C, Middlewares, Strict>,
	): this

	/**
	 * Register a head route to a controller.
	 */
	public head<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<C, Middlewares>,
		controller: C & ValidateControllerWithoutBody<C, Middlewares, Strict>,
	): this

	public head(
		path: string,
		preValidationMiddlewaresOrMiddlewares: Middleware[],
		middlewaresOrController:
			| Middleware[]
			| Controller<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.head(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Middleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.head(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Controller<
						any,
						CelosiaRequest<any, any, any, any>,
						any
					>,
				),
			)
		}

		return this
	}

	/**
	 * Register a post route to a controller with pre-validation middlewares.
	 */
	public post<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends Middleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<C, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<C, Middlewares, MergeMiddlewaresOutput<PreValidationMiddlewares>>,
		controller: C & ValidateController<C, Middlewares>,
	): this

	/**
	 * Register a post route to a controller.
	 */
	public post<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<C, Middlewares>,
		controller: C & ValidateController<C, Middlewares>,
	): this

	public post(
		path: string,
		preValidationMiddlewaresOrMiddlewares: Middleware[],
		middlewaresOrController:
			| Middleware[]
			| Controller<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.post(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Middleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.post(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Controller<
						any,
						CelosiaRequest<any, any, any, any>,
						any
					>,
				),
			)
		}

		return this
	}

	/**
	 * Register a put route to a controller with pre-validation middlewares.
	 */
	public put<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends Middleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<C, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<C, Middlewares, MergeMiddlewaresOutput<PreValidationMiddlewares>>,
		controller: C & ValidateController<C, Middlewares>,
	): this

	/**
	 * Register a put route to a controller.
	 */
	public put<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<C, Middlewares>,
		controller: C & ValidateController<C, Middlewares>,
	): this

	public put(
		path: string,
		preValidationMiddlewaresOrMiddlewares: Middleware[],
		middlewaresOrController:
			| Middleware[]
			| Controller<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.put(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Middleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.put(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Controller<
						any,
						CelosiaRequest<any, any, any, any>,
						any
					>,
				),
			)
		}

		return this
	}

	/**
	 * Register a patch route to a controller with pre-validation middlewares.
	 */
	public patch<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends Middleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<C, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<C, Middlewares, MergeMiddlewaresOutput<PreValidationMiddlewares>>,
		controller: C & ValidateController<C, Middlewares>,
	): this

	/**
	 * Register a patch route to a controller.
	 */
	public patch<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<C, Middlewares>,
		controller: C & ValidateController<C, Middlewares>,
	): this

	public patch(
		path: string,
		preValidationMiddlewaresOrMiddlewares: Middleware[],
		middlewaresOrController:
			| Middleware[]
			| Controller<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.patch(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Middleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.patch(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Controller<
						any,
						CelosiaRequest<any, any, any, any>,
						any
					>,
				),
			)
		}

		return this
	}

	/**
	 * Register a delete route to a controller with pre-validation middlewares.
	 */
	public delete<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends Middleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<C, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<C, Middlewares, MergeMiddlewaresOutput<PreValidationMiddlewares>>,
		controller: C & ValidateControllerWithoutBody<C, Middlewares, Strict>,
	): this

	/**
	 * Register a delete route to a controller.
	 */
	public delete<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<C, Middlewares>,
		controller: C & ValidateControllerWithoutBody<C, Middlewares, Strict>,
	): this

	public delete(
		path: string,
		preValidationMiddlewaresOrMiddlewares: Middleware[],
		middlewaresOrController:
			| Middleware[]
			| Controller<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.delete(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Middleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.delete(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Controller<
						any,
						CelosiaRequest<any, any, any, any>,
						any
					>,
				),
			)
		}

		return this
	}

	/**
	 * Register a options route to a controller with pre-validation middlewares.
	 */
	public options<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends Middleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<C, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<C, Middlewares, MergeMiddlewaresOutput<PreValidationMiddlewares>>,
		controller: C & ValidateControllerWithoutBody<C, Middlewares, Strict>,
	): this

	/**
	 * Register a options route to a controller.
	 */
	public options<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<C, Middlewares>,
		controller: C & ValidateControllerWithoutBody<C, Middlewares, Strict>,
	): this

	public options(
		path: string,
		preValidationMiddlewaresOrMiddlewares: Middleware[],
		middlewaresOrController:
			| Middleware[]
			| Controller<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.options(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Middleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.options(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Controller<
						any,
						CelosiaRequest<any, any, any, any>,
						any
					>,
				),
			)
		}

		return this
	}

	/**
	 * Register a route which handles every methods to a controller with pre-validation middlewares.
	 */
	public all<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends Middleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<C, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<C, Middlewares, MergeMiddlewaresOutput<PreValidationMiddlewares>>,
		controller: C & ValidateController<C, Middlewares>,
	): this

	/**
	 * Register a route which handles every methods to a controller.
	 */
	public all<
		C extends Controller<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<C, Middlewares>,
		controller: C & ValidateController<C, Middlewares>,
	): this

	public all(
		path: string,
		preValidationMiddlewaresOrMiddlewares: Middleware[],
		middlewaresOrController:
			| Middleware[]
			| Controller<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.all(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Middleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.all(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as Controller<
						any,
						CelosiaRequest<any, any, any, any>,
						any
					>,
				),
			)
		}

		return this
	}

	private handler(
		preValidationMiddlewares: Middleware[],
		middlewares: Middleware[],
		controller: Controller<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		return async (request: Request, response: Response) => {
			let data = {}

			for (const preValidationMiddleware of preValidationMiddlewares) {
				try {
					const output = await new Promise<EmptyObject | Record<string, any> | undefined>(
						(resolve, reject) => {
							try {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								const mightBePromise = preValidationMiddleware.index(
									data,
									request.celosiaRequest,
									response.celosiaResponse,
									output => {
										resolve(output)
									},
								)

								if (mightBePromise instanceof Promise) {
									mightBePromise.catch((error: unknown) => {
										// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
										reject(error)
									})
								}
							} catch (error) {
								// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
								reject(error)
							}
						},
					)

					data = output ?? {}
				} catch (error) {
					this.logger.error(
						'Unknown handler preValidationMiddleware error occured',
						{ requestId: request.celosiaRequest.id },
						error,
					)

					if (!response.writableEnded) response.celosiaResponse.sendInternalServerError()

					return
				}
			}

			if (response.writableEnded) {
				this.logger.warn(
					"A pre validation middleware calls next after writing response. Request won't be processed further.",
					{ requestId: request.celosiaRequest.id, url: request.url },
				)

				return
			}

			let parsedBody

			if (request.method !== 'GET') {
				parsedBody = await controller.body.safeParseAsync(request.body)
			}

			const parsedQuery = await controller.query.safeParseAsync(request.query)
			const parsedParams = await controller.params.safeParseAsync(request.params)
			const parsedCookies = await controller.cookies.safeParseAsync(request.cookies)

			const errors: {
				parsing: {
					body?: Record<string, string[]>
					query?: Record<string, string[]>
					params?: Record<string, string[]>
					cookies?: Record<string, string[]>
				}
				others?: string[]
			} = { parsing: {} }

			if (parsedBody && !parsedBody.success) {
				errors.parsing.body = parsedBody.error.format()
			}

			if (!parsedQuery.success) {
				errors.parsing.query = parsedQuery.error.format()
			}

			if (!parsedParams.success) {
				errors.parsing.params = parsedParams.error.format()
			}

			if (!parsedCookies.success) {
				errors.parsing.cookies = parsedCookies.error.format()
			}

			if (
				!(parsedBody?.success ?? true) ||
				!parsedQuery.success ||
				!parsedParams.success ||
				!parsedCookies.success
			) {
				response.status(422).json({
					data: {},
					errors,
				})

				return
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			request.body = parsedBody?.data

			// Cannot modify query directly, as now Request.query is a getter not a property.
			request.__CELOSIAJS__.postValidationQuery = parsedQuery.data

			Object.defineProperty(request, 'query', {
				configurable: true,
				enumerable: true,
				get: () => request.__CELOSIAJS__.postValidationQuery,
			})

			request.params = parsedParams.data
			request.cookies = parsedCookies.data

			for (const middleware of middlewares) {
				try {
					const output = await new Promise<EmptyObject | Record<string, any> | undefined>(
						(resolve, reject) => {
							try {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								const mightBePromise = middleware.index(
									data,
									request.celosiaRequest,
									response.celosiaResponse,
									output => {
										resolve(output)
									},
								)

								if (mightBePromise instanceof Promise) {
									mightBePromise.catch((error: unknown) => {
										// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
										reject(error)
									})
								}
							} catch (error) {
								// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
								reject(error)
							}
						},
					)

					data = { ...data, ...(output ?? {}) }
				} catch (error) {
					this.logger.error(
						'Unknown handler middleware error occured',
						{ requestId: request.celosiaRequest.id },
						error,
					)

					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (!response.writableEnded) response.celosiaResponse.sendInternalServerError()

					return
				}
			}

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (response.writableEnded) {
				this.logger.warn(
					"A middleware calls next after writing response. Request won't be processed further.",
					{
						requestId: request.celosiaRequest.id,
						url: request.url,
					},
				)

				return
			}

			controller.index(data, request.celosiaRequest, response.celosiaResponse)

			return
		}
	}
}

export default CelosiaRouter
