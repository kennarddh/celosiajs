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

// Class decorator
export const Injectable = (
	scope: DependencyScope = DependencyScope.Transient,
	key?: string | symbol,
) => {
	return (constructor: Provider<any>) => {
		const anyConstructor = constructor as any

		if (!key) {
			if (!anyConstructor[providerKeySymbol]) anyConstructor[providerKeySymbol] = Symbol()
		}

		const resolvedKey = key ?? (anyConstructor[providerKeySymbol] as symbol)

		DependencyInjection.registerProvider(resolvedKey, constructor, scope)
	}
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class DependencyInjection {
	private static providers = new Map<symbol, RegisteredDependency<any>>()
	private static singletonCache = new Map<symbol, any>()

	private constructor() {}

	public static registerProvider<T>(
		key: string | symbol,
		provider: Provider<T>,
		scope: DependencyScope = DependencyScope.Transient,
	) {
		const resolvedKey = this.resolveKey(key)

		if (DependencyInjection.providers.has(resolvedKey))
			throw new Error(`Provider for ${resolvedKey.description} already exist`)

		DependencyInjection.providers.set(resolvedKey, {
			key: resolvedKey,
			provider,
			scope,
		})
	}

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

	public static resolveKey<T>(key: string | symbol | Provider<T>): symbol {
		if (typeof key === 'symbol') return key
		if (typeof key === 'string') return Symbol.for(key)

		if (!(key as any)[providerKeySymbol])
			throw new Error(`${key.name} is not a registered provider`)

		return (key as any)[providerKeySymbol] as symbol
	}
}

export default DependencyInjection
