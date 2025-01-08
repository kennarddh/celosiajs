export enum DependencyScope {
	Singleton,
	Transient,
}

export type Provider<T> = new (...args: any[]) => T

export interface IRegisteredDependency<T> {
	key: symbol
	provider: Provider<T>
	scope: DependencyScope
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Class decorator
export const Injectable = (
	scope: DependencyScope = DependencyScope.Transient,
	key?: string | symbol,
) => {
	return <T extends Provider<any>>(constructor: T) => {
		const anyConstructor = constructor as any

		anyConstructor.__injectable__ = {
			scope,
		}

		if (!key) {
			if (!anyConstructor.__providerKey__) anyConstructor.__providerKey__ = Symbol()
		}

		const resolvedKey = key || (anyConstructor.__providerKey__ as symbol)

		DependencyInjection.registerProvider(resolvedKey, constructor, scope)
	}
}

class DependencyInjection {
	private static providers = new Map<symbol, IRegisteredDependency<any>>()
	private static singletonCache = new Map<symbol, any>()

	private constructor() {}

	public static registerProvider<T>(
		key: string | symbol,
		provider: Provider<T>,
		scope: DependencyScope = DependencyScope.Transient,
	) {
		const resolvedKey = typeof key === 'string' ? Symbol.for(key) : key

		if (DependencyInjection.providers.has(resolvedKey))
			throw new Error(`Provider for ${resolvedKey.description} already exist`)

		DependencyInjection.providers.set(resolvedKey, {
			key: resolvedKey,
			provider,
			scope,
		})
	}

	public static get<T>(key: string | symbol | Provider<T>): T {
		let resolvedKey

		if (typeof key === 'symbol') {
			resolvedKey = key
		} else if (typeof key === 'string') {
			resolvedKey = Symbol.for(key)
		} else {
			if (!(key as any).__providerKey__)
				throw new Error(`${key} is not a registered provider`)

			resolvedKey = (key as any).__providerKey__
		}

		const registeredDependency = DependencyInjection.providers.get(resolvedKey)

		if (!registeredDependency)
			throw new Error(`Provider for ${resolvedKey.description} does not exist`)

		if (registeredDependency.scope === DependencyScope.Singleton) {
			if (DependencyInjection.singletonCache.has(resolvedKey))
				return DependencyInjection.singletonCache.get(resolvedKey)

			const instance = new registeredDependency.provider()

			DependencyInjection.singletonCache.set(resolvedKey, instance)

			return instance
		}

		return new registeredDependency.provider()
	}
}

export default DependencyInjection
