/* eslint-disable security/detect-object-injection */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
const providerKeySymbol = Symbol('providerKey')

export enum DependencyScope {
	Singleton,
	Transient,
}

export type Provider<T> = new (...args: any[]) => T

export interface RegisteredDependency<T> {
	key: symbol
	provider: Provider<T>
	scope: DependencyScope
}

/**
 * Mark a class as injectable and register it to DependencyInjection.
 *
 * @param key When not supplied, the class itself will be the key
 */
export const Injectable = (
	scope: DependencyScope = DependencyScope.Transient,
	key?: string | symbol,
) => {
	return (constructor: Provider<any>) => {
		const anyConstructor = constructor as any

		if (key === undefined && anyConstructor[providerKeySymbol] === undefined) {
			anyConstructor[providerKeySymbol] = Symbol()
		}

		const resolvedKey = key ?? (anyConstructor[providerKeySymbol] as symbol)

		DependencyInjection.registerProvider(resolvedKey, constructor, scope)
	}
}

/**
 * Dependency injection singleton.
 *
 * Can be used to register or get dependency.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class DependencyInjection {
	private static providers = new Map<symbol, RegisteredDependency<any>>()
	private static singletonCache = new Map<symbol, any>()

	private constructor() {}

	/**
	 * Register a dependency provider.
	 */
	public static registerProvider<T>(
		key: string | symbol,
		provider: Provider<T>,
		scope: DependencyScope = DependencyScope.Transient,
	) {
		const resolvedKey = this.resolveKey(key)

		if (DependencyInjection.providers.has(resolvedKey))
			throw new Error(`Provider for ${resolvedKey.description} already exist`)

		DependencyInjection.providers.set(resolvedKey, { key: resolvedKey, provider, scope })
	}

	/**
	 * Get a dependency.
	 *
	 * If the dependency provider's scope is transient, this will create a new instance and returns it.
	 * If the dependency provider's scope is singleton, this will returns the already cached instance.
	 */
	public static get<T>(key: string | symbol | Provider<T>): T {
		const resolvedKey = this.resolveKey(key)

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

	/**
	 * Resolve dependency's symbol key based on class/symbol/string key.
	 */
	public static resolveKey<T>(key: string | symbol | Provider<T>): symbol {
		if (typeof key === 'symbol') return key
		if (typeof key === 'string') return Symbol.for(key)

		if (!(key as any)[providerKeySymbol])
			throw new Error(`${key.name} is not a registered provider`)

		return (key as any)[providerKeySymbol] as symbol
	}
}

export default DependencyInjection
