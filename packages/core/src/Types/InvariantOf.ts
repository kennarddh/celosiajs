// https://github.com/sindresorhus/type-fest/blob/main/source/invariant-of.d.ts
declare const invariantSymbol: unique symbol

type InvariantOf<Type> = Type & { [invariantSymbol]: (_: Type) => Type }

export default InvariantOf
