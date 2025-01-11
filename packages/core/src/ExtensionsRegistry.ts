/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	CelosiaInstance,
	CelosiaRequest,
	CelosiaResponse,
	CelosiaRouter,
	DuplicateExtensionError,
	InvalidExtensionError,
} from './'

export type ExtensionHandler<T, Args extends any[], Return> = (extended: T, ...args: Args) => Return

export type CelosiaInstanceExtensionHandler<
	Args extends any[] = any[],
	Return = void,
> = ExtensionHandler<CelosiaInstance<boolean>, Args, Return>

export type CelosiaRouterExtensionHandler<
	Args extends any[] = any[],
	Return = void,
> = ExtensionHandler<CelosiaRouter<boolean>, Args, Return>

export type CelosiaRequestExtensionHandler<
	Args extends any[] = any[],
	Return = void,
> = ExtensionHandler<CelosiaRequest<any>, Args, Return>

export type CelosiaResponseExtensionHandler<
	Args extends any[] = any[],
	Return = void,
> = ExtensionHandler<CelosiaResponse<any>, Args, Return>

export type TransformExtensionHandlerToExtensionType<
	Handler extends ExtensionHandler<any, any, any>,
> =
	Handler extends ExtensionHandler<any, infer Args, infer Return>
		? (...args: Args) => Return
		: never

export class ExtensionsRegistryClass {
	private celosiaInstanceExtensionsHandler = new Map<
		string | symbol,
		CelosiaInstanceExtensionHandler
	>()
	private celosiaRouterExtensionsHandler = new Map<
		string | symbol,
		CelosiaRouterExtensionHandler
	>()
	private celosiaRequestExtensionsHandler = new Map<
		string | symbol,
		CelosiaRequestExtensionHandler
	>()
	private celosiaResponseExtensionsHandler = new Map<
		string | symbol,
		CelosiaResponseExtensionHandler
	>()

	/**
	 * Register a new extension for CelosiaInstance.
	 *
	 * Throws `DuplicateExtensionError` when a key has been registered.
	 */
	public registerCelosiaInstanceExtension(
		key: string | symbol,
		handler: CelosiaInstanceExtensionHandler,
	): void {
		if (this.celosiaInstanceExtensionsHandler.has(key))
			throw new DuplicateExtensionError(
				`Cannot register key "${key.toString()}" because the same key already exists.`,
			)

		this.celosiaInstanceExtensionsHandler.set(key, handler)
	}

	/**
	 * Remove an extension for CelosiaInstance.
	 *
	 * Throws `InvalidExtensionError` when a key has not been registered.
	 */
	public removeCelosiaInstanceExtension(key: string | symbol): void {
		if (!this.celosiaInstanceExtensionsHandler.has(key))
			throw new InvalidExtensionError(
				`Cannot remove key "${key.toString()}" because key doesn't exist.`,
			)

		this.celosiaInstanceExtensionsHandler.delete(key)
	}

	/**
	 * Get a registered extension for CelosiaInstance.
	 */
	public getCelosiaInstanceExtension(
		key: string | symbol,
	): CelosiaInstanceExtensionHandler | undefined {
		return this.celosiaInstanceExtensionsHandler.get(key)
	}

	/**
	 * Register a new extension for CelosiaRouter.
	 *
	 * Throws `DuplicateExtensionError` when a key has been registered.
	 */
	public registerCelosiaRouterExtension(
		key: string | symbol,
		handler: CelosiaRouterExtensionHandler,
	): void {
		if (this.celosiaRouterExtensionsHandler.has(key))
			throw new DuplicateExtensionError(
				`Cannot register key "${key.toString()}" because the same key already exists.`,
			)

		this.celosiaRouterExtensionsHandler.set(key, handler)
	}

	/**
	 * Remove an extension for CelosiaRouter.
	 *
	 * Throws `InvalidExtensionError` when a key has not been registered.
	 */
	public removeCelosiaRouterExtension(key: string | symbol): void {
		if (!this.celosiaRouterExtensionsHandler.has(key))
			throw new InvalidExtensionError(
				`Cannot remove key "${key.toString()}" because key doesn't exist.`,
			)

		this.celosiaRouterExtensionsHandler.delete(key)
	}

	/**
	 * Get a registered extension for CelosiaRouter.
	 */
	public getCelosiaRouterExtension(
		key: string | symbol,
	): CelosiaRouterExtensionHandler | undefined {
		return this.celosiaRouterExtensionsHandler.get(key)
	}

	/**
	 * Register a new extension for CelosiaRequest.
	 *
	 * Throws `DuplicateExtensionError` when a key has been registered.
	 */
	public registerCelosiaRequestExtension(
		key: string | symbol,
		handler: CelosiaRequestExtensionHandler,
	): void {
		if (this.celosiaRequestExtensionsHandler.has(key))
			throw new DuplicateExtensionError(
				`Cannot register key "${key.toString()}" because the same key already exists.`,
			)

		this.celosiaRequestExtensionsHandler.set(key, handler)
	}

	/**
	 * Remove an extension for CelosiaRequest.
	 *
	 * Throws `InvalidExtensionError` when a key has not been registered.
	 */
	public removeCelosiaRequestExtension(key: string | symbol): void {
		if (!this.celosiaRequestExtensionsHandler.has(key))
			throw new InvalidExtensionError(
				`Cannot remove key "${key.toString()}" because key doesn't exist.`,
			)

		this.celosiaRequestExtensionsHandler.delete(key)
	}

	/**
	 * Get a registered extension for CelosiaRequest.
	 */
	public getCelosiaRequestExtension(
		key: string | symbol,
	): CelosiaRequestExtensionHandler | undefined {
		return this.celosiaRequestExtensionsHandler.get(key)
	}

	/**
	 * Register a new extension for CelosiaResponse.
	 *
	 * Throws `DuplicateExtensionError` when a key has been registered.
	 */
	public registerCelosiaResponseExtension(
		key: string | symbol,
		handler: CelosiaResponseExtensionHandler,
	): void {
		if (this.celosiaResponseExtensionsHandler.has(key))
			throw new DuplicateExtensionError(
				`Cannot register key "${key.toString()}" because the same key already exists.`,
			)

		this.celosiaResponseExtensionsHandler.set(key, handler)
	}

	/**
	 * Remove an extension for CelosiaResponse.
	 *
	 * Throws `InvalidExtensionError` when a key has not been registered.
	 */
	public removeCelosiaResponseExtension(key: string | symbol): void {
		if (!this.celosiaResponseExtensionsHandler.has(key))
			throw new InvalidExtensionError(
				`Cannot remove key "${key.toString()}" because key doesn't exist.`,
			)

		this.celosiaResponseExtensionsHandler.delete(key)
	}

	/**
	 * Get a registered extension for CelosiaResponse.
	 */
	public getCelosiaResponseExtension(
		key: string | symbol,
	): CelosiaResponseExtensionHandler | undefined {
		return this.celosiaResponseExtensionsHandler.get(key)
	}
}

const ExtensionsRegistry = new ExtensionsRegistryClass()

export default ExtensionsRegistry
