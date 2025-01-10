/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { NextFunction, Request, Response } from 'express'

import {
	BaseController,
	BaseMiddleware,
	CelosiaRequest,
	EmptyObject,
	ExtensionsRegistry,
	Globals,
	InvalidExtensionError,
	MergeMiddlewaresOutput,
	MiddlewareArray,
	NoInputMiddleware,
	ValidateController,
	ValidateControllerWithoutBody,
	ValidateMiddlewares,
} from '..'

export interface CelosiaRouterConstructorOptions<Strict extends boolean = true> {
	strict: Strict
}

export type CelosiaRouterGroupCallback<Strict extends boolean> = (
	router: CelosiaRouter<Strict>,
) => void

class CelosiaRouter<Strict extends boolean = true> {
	protected _isStrict: Strict
	private _expressRouter = express.Router()

	protected _cachedExtensionsProxy: CelosiaJS.CelosiaRouter<Strict> | null = null

	protected logger = Globals.logger.child({ source: 'CelosiaJS' })

	constructor(options: CelosiaRouterConstructorOptions<Strict>) {
		this._isStrict = options.strict
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
		) as BaseMiddleware[]

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
	 * Group routes, creating another router.
	 */
	public group(callback: CelosiaRouterGroupCallback<Strict>): void

	public group(
		callbackOrPath: CelosiaRouterGroupCallback<Strict> | string,
		callback?: CelosiaRouterGroupCallback<Strict>,
	) {
		const router = new CelosiaRouter({ strict: this.isStrict })

		if (typeof callbackOrPath === 'string') {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			callback!(router)
		} else {
			callbackOrPath(router)
		}

		if (typeof callbackOrPath === 'string') {
			this.useRouters(callbackOrPath, router)
		} else {
			this.useRouters(router)
		}
	}

	/**
	 * Register a get route to a controller with pre-validation middlewares.
	 */
	public get<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends BaseMiddleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<Controller, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<
				Controller,
				Middlewares,
				MergeMiddlewaresOutput<PreValidationMiddlewares>
			>,
		controller: Controller & ValidateControllerWithoutBody<Controller, Middlewares, Strict>,
	): this

	/**
	 * Register a get route to a controller.
	 */
	public get<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<Controller, Middlewares>,
		controller: Controller & ValidateControllerWithoutBody<Controller, Middlewares, Strict>,
	): this

	public get(
		path: string,
		preValidationMiddlewaresOrMiddlewares: BaseMiddleware[],
		middlewaresOrController:
			| BaseMiddleware[]
			| BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.get(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseMiddleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.get(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseController<
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
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends BaseMiddleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<Controller, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<
				Controller,
				Middlewares,
				MergeMiddlewaresOutput<PreValidationMiddlewares>
			>,
		controller: Controller & ValidateControllerWithoutBody<Controller, Middlewares, Strict>,
	): this

	/**
	 * Register a head route to a controller.
	 */
	public head<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<Controller, Middlewares>,
		controller: Controller & ValidateControllerWithoutBody<Controller, Middlewares, Strict>,
	): this

	public head(
		path: string,
		preValidationMiddlewaresOrMiddlewares: BaseMiddleware[],
		middlewaresOrController:
			| BaseMiddleware[]
			| BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.head(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseMiddleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.head(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseController<
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
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends BaseMiddleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<Controller, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<
				Controller,
				Middlewares,
				MergeMiddlewaresOutput<PreValidationMiddlewares>
			>,
		controller: Controller & ValidateController<Controller, Middlewares>,
	): this

	/**
	 * Register a post route to a controller.
	 */
	public post<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<Controller, Middlewares>,
		controller: Controller & ValidateController<Controller, Middlewares>,
	): this

	public post(
		path: string,
		preValidationMiddlewaresOrMiddlewares: BaseMiddleware[],
		middlewaresOrController:
			| BaseMiddleware[]
			| BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.post(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseMiddleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.post(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseController<
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
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends BaseMiddleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<Controller, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<
				Controller,
				Middlewares,
				MergeMiddlewaresOutput<PreValidationMiddlewares>
			>,
		controller: Controller & ValidateController<Controller, Middlewares>,
	): this

	/**
	 * Register a put route to a controller.
	 */
	public put<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<Controller, Middlewares>,
		controller: Controller & ValidateController<Controller, Middlewares>,
	): this

	public put(
		path: string,
		preValidationMiddlewaresOrMiddlewares: BaseMiddleware[],
		middlewaresOrController:
			| BaseMiddleware[]
			| BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.put(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseMiddleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.put(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseController<
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
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends BaseMiddleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<Controller, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<
				Controller,
				Middlewares,
				MergeMiddlewaresOutput<PreValidationMiddlewares>
			>,
		controller: Controller & ValidateController<Controller, Middlewares>,
	): this

	/**
	 * Register a patch route to a controller.
	 */
	public patch<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<Controller, Middlewares>,
		controller: Controller & ValidateController<Controller, Middlewares>,
	): this

	public patch(
		path: string,
		preValidationMiddlewaresOrMiddlewares: BaseMiddleware[],
		middlewaresOrController:
			| BaseMiddleware[]
			| BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.patch(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseMiddleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.patch(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseController<
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
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends BaseMiddleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<Controller, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<
				Controller,
				Middlewares,
				MergeMiddlewaresOutput<PreValidationMiddlewares>
			>,
		controller: Controller & ValidateControllerWithoutBody<Controller, Middlewares, Strict>,
	): this

	/**
	 * Register a delete route to a controller.
	 */
	public delete<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<Controller, Middlewares>,
		controller: Controller & ValidateControllerWithoutBody<Controller, Middlewares, Strict>,
	): this

	public delete(
		path: string,
		preValidationMiddlewaresOrMiddlewares: BaseMiddleware[],
		middlewaresOrController:
			| BaseMiddleware[]
			| BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.delete(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseMiddleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.delete(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseController<
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
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends BaseMiddleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<Controller, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<
				Controller,
				Middlewares,
				MergeMiddlewaresOutput<PreValidationMiddlewares>
			>,
		controller: Controller & ValidateControllerWithoutBody<Controller, Middlewares, Strict>,
	): this

	/**
	 * Register a options route to a controller.
	 */
	public options<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<Controller, Middlewares>,
		controller: Controller & ValidateControllerWithoutBody<Controller, Middlewares, Strict>,
	): this

	public options(
		path: string,
		preValidationMiddlewaresOrMiddlewares: BaseMiddleware[],
		middlewaresOrController:
			| BaseMiddleware[]
			| BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.options(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseMiddleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.options(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseController<
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
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		PreValidationMiddlewares extends BaseMiddleware<CelosiaRequest, any, any, any>[],
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		preValidationMiddlewares: PreValidationMiddlewares &
			ValidateMiddlewares<Controller, PreValidationMiddlewares>,
		middlewares: Middlewares &
			ValidateMiddlewares<
				Controller,
				Middlewares,
				MergeMiddlewaresOutput<PreValidationMiddlewares>
			>,
		controller: Controller & ValidateController<Controller, Middlewares>,
	): this

	/**
	 * Register a route which handles every methods to a controller.
	 */
	public all<
		Controller extends BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		Middlewares extends MiddlewareArray,
	>(
		path: string,
		middlewares: Middlewares & ValidateMiddlewares<Controller, Middlewares>,
		controller: Controller & ValidateController<Controller, Middlewares>,
	): this

	public all(
		path: string,
		preValidationMiddlewaresOrMiddlewares: BaseMiddleware[],
		middlewaresOrController:
			| BaseMiddleware[]
			| BaseController<any, CelosiaRequest<any, any, any, any>, any>,
		controller?: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
	) {
		if (controller) {
			this._expressRouter.all(
				path,
				this.handler(
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseMiddleware[],
					controller,
				),
			)
		} else {
			this._expressRouter.all(
				path,
				this.handler(
					[],
					preValidationMiddlewaresOrMiddlewares,
					middlewaresOrController as BaseController<
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
		preValidationMiddlewares: BaseMiddleware[],
		middlewares: BaseMiddleware[],
		controller: BaseController<any, CelosiaRequest<any, any, any, any>, any>,
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

			const parsedBody = await controller.body.safeParseAsync(request.body)
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

			if (!parsedBody.success) {
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
				!(
					parsedBody.success &&
					parsedQuery.success &&
					parsedParams.success &&
					parsedCookies.success
				)
			) {
				return response.status(422).json({
					data: {},
					errors,
				})
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			request.body = parsedBody.data
			request.query = parsedQuery.data
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
			if (response.writableEnded)
				return this.logger.warn(
					"A middleware calls next after writing response. Request won't be processed further.",
					{
						requestId: request.celosiaRequest.id,
						url: request.url,
					},
				)

			controller.index(data, request.celosiaRequest, response.celosiaResponse)

			return
		}
	}
}

export default CelosiaRouter
