export enum DependencyScope {
	Singleton,
	Transient,
}

export type Provider<T> = new (...args: any[]) => T

export interface IRegisteredDependency<T> {
	key: string
	provider: Provider<T>
	scope: DependencyScope
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Class decorator
export const Injectable = (key: string, scope: DependencyScope = DependencyScope.Transient) => {
	return <T extends Provider<any>>(constructor: T) => {
		;(constructor as any).__injectable__ = {
			scope,
		}

		DependencyInjection.registerProvider(key, constructor, scope)
	}
}

class DependencyInjection {
	private static providers = new Map<string, IRegisteredDependency<any>>()
	private static singletonCache = new Map<string, any>()

	private constructor() {}

	public static registerProvider<T>(
		key: string,
		provider: Provider<T>,
		scope: DependencyScope = DependencyScope.Transient,
	) {
		if (DependencyInjection.providers.has(key))
			throw new Error(`Provider for ${key.toString()} already exist`)

		DependencyInjection.providers.set(key, {
			key,
			provider,
			scope,
		})
	}

	public static get<T>(key: string): T {
		const registeredDependency = DependencyInjection.providers.get(key)

		if (!registeredDependency) throw new Error(`Provider for ${key.toString()} does not exist`)

		if (registeredDependency.scope === DependencyScope.Singleton) {
			if (DependencyInjection.singletonCache.has(key))
				return DependencyInjection.singletonCache.get(key)

			const instance = new registeredDependency.provider()

			DependencyInjection.singletonCache.set(key, instance)

			return instance
		}

		return new registeredDependency.provider()
	}
}

export default DependencyInjection
