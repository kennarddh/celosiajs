/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable security/detect-object-injection */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Taken mostly from qs library with some modification
 */
import { IDuplicateStrategy, IParsePartsOptions, IParsedParts } from './Types'

const defaultOptions: IParsePartsOptions = {
	allowDots: false,
	allowEmptyArrays: false,
	allowPrototypes: false,
	allowSparse: false,
	arrayLimit: 20,
	comma: false,
	decodeDotInKeys: false,
	depth: 5,
	duplicateStrategy: IDuplicateStrategy.Combine,
	parameterLimit: 1000,
	parseArrays: true,
	plainObjects: false,
	strictDepth: false,
	strictNullHandling: false,
}

const arrayToIndexedObject = (
	source: (string | undefined)[],
	options: IParsePartsOptions,
): Record<string, string | null | undefined> =>
	source.reduce(
		(acc, value, index) => {
			if (value !== undefined) (acc as any)[index] = value

			return acc
		},
		options.plainObjects ? { __proto__: null } : {},
	)

const merge = (target: any, source: any, options: IParsePartsOptions) => {
	/* eslint no-param-reassign: 0 */
	if (!source) return target

	if (typeof source !== 'object' && typeof source !== 'function') {
		if (Array.isArray(target)) {
			target.push(source)
		} else if (target && typeof target === 'object') {
			if (
				options.plainObjects ||
				options.allowPrototypes ||
				!Object.prototype.hasOwnProperty.call(Object.prototype, source)
			) {
				target[source] = true
			}
		} else {
			return [target, source]
		}

		return target
	}

	if (!target || typeof target !== 'object') {
		return [target].concat(source)
	}

	let mergeTarget = target
	if (Array.isArray(target) && !Array.isArray(source)) {
		mergeTarget = arrayToIndexedObject(target, options)
	}

	if (Array.isArray(target) && Array.isArray(source)) {
		source.forEach(function (item, i) {
			if (Object.prototype.hasOwnProperty.call(target, i)) {
				const targetItem = target[i]

				if (
					targetItem &&
					typeof targetItem === 'object' &&
					item &&
					typeof item === 'object'
				) {
					target[i] = merge(targetItem, item, options)
				} else {
					target.push(item)
				}
			} else {
				target[i] = item
			}
		})

		return target
	}

	return Object.keys(source).reduce((acc, key) => {
		const value = source[key]

		if (Object.prototype.hasOwnProperty.call(acc, key)) {
			acc[key] = merge(acc[key], value, options)
		} else {
			acc[key] = value
		}
		return acc
	}, mergeTarget)
}

const parseArrayValue = (val: any, options: IParsePartsOptions) => {
	if (val && typeof val === 'string' && options.comma && val.includes(',')) {
		return val.split(',')
	}

	return val
}

const parseValues = (input: [string, any][], options: IParsePartsOptions) => {
	const obj = { __proto__: null }

	for (const [key, rawValue] of input) {
		let value = parseArrayValue(rawValue, options)

		if (key.endsWith('[]')) {
			value = Array.isArray(value) ? [value] : value
		}

		const existing = Object.prototype.hasOwnProperty.call(obj, key)
		if (existing && options.duplicateStrategy === IDuplicateStrategy.Combine) {
			;(obj as any)[key] = [].concat((obj as any)[key], value)
		} else if (!existing || options.duplicateStrategy === IDuplicateStrategy.Last) {
			;(obj as any)[key] = value
		}
	}

	return obj
}

const parseObject = (chain: any[], val: any, options: IParsePartsOptions) => {
	let leaf = parseArrayValue(val, options)

	for (let i = chain.length - 1; i >= 0; --i) {
		let obj: any
		const root = chain[i]

		if (root === '[]' && options.parseArrays) {
			obj =
				options.allowEmptyArrays &&
				(leaf === '' || (options.strictNullHandling && leaf === null))
					? []
					: [].concat(leaf)
		} else {
			obj = options.plainObjects ? { __proto__: null } : {}
			const cleanRoot =
				root.charAt(0) === '[' && root.charAt(root.length - 1) === ']'
					? root.slice(1, -1)
					: root

			const decodedRoot = options.decodeDotInKeys ? cleanRoot.replace(/%2E/g, '.') : cleanRoot

			const index = parseInt(decodedRoot, 10)

			if (!options.parseArrays && decodedRoot === '') {
				obj = { 0: leaf }
			} else if (
				!isNaN(index) &&
				root !== decodedRoot &&
				String(index) === decodedRoot &&
				index >= 0 &&
				options.parseArrays &&
				index <= options.arrayLimit
			) {
				obj = []
				obj[index] = leaf
			} else if (decodedRoot !== '__proto__') {
				obj[decodedRoot] = leaf
			}
		}

		leaf = obj
	}

	return leaf
}

const parseKeys = (givenKey: string | undefined, val: any, options: IParsePartsOptions) => {
	if (!givenKey) return

	// Transform dot notation to bracket notation
	const key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey

	// The regex chunks

	const brackets = /(\[[^[\]]*])/
	const child = /(\[[^[\]]*])/g

	// Get the parent

	let segment = options.depth > 0 && brackets.exec(key)
	const parent = segment ? key.slice(0, segment.index) : key

	// Stash the parent if it exists

	const keys: any[] = []

	if (parent) {
		// If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
		if (
			!options.plainObjects &&
			Object.prototype.hasOwnProperty.call(Object.prototype, parent)
		) {
			if (!options.allowPrototypes) {
				return
			}
		}

		keys.push(parent)
	}

	// Loop through children appending to the array until we hit depth

	let i = 0
	while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
		i += 1
		if (
			!options.plainObjects &&
			Object.prototype.hasOwnProperty.call(Object.prototype, segment[1]!.slice(1, -1))
		) {
			if (!options.allowPrototypes) {
				return
			}
		}
		keys.push(segment[1])
	}

	// If there's a remainder, check strictDepth option for throw, else just add whatever is left

	if (segment) {
		if (options.strictDepth) {
			throw new RangeError(
				`Input depth exceeded depth option of ${options.depth} and strictDepth is true`,
			)
		}
		keys.push(`[${key.slice(segment.index)}]`)
	}

	return parseObject(keys, val, options)
}

const normalizeParseOptions = (opts?: Partial<IParsePartsOptions>) => {
	if (!opts) return defaultOptions

	const allowDots =
		(opts.allowDots ?? opts.decodeDotInKeys === true) ? true : defaultOptions.allowDots

	return {
		...defaultOptions,
		...opts,
		allowDots,
	}
}

type ICleanUpIO = undefined | string | ICleanUpIOObject | ICleanUpIOArray

interface ICleanUpIOObject {
	[x: string]: ICleanUpIO
}

type ICleanUpIOArray = ICleanUpIO[]

const cleanUp = (input: ICleanUpIO): ICleanUpIO => {
	if (Array.isArray(input)) {
		// Remove every empty element.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		return input.filter(() => true).map(row => cleanUp(row))
	}

	if (typeof input === 'object' && !(input instanceof Buffer)) {
		return Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, cleanUp(value)]),
		)
	}

	return input
}

const ParseParts = <T>(
	input: [string, T][],
	opts?: Partial<IParsePartsOptions>,
): IParsedParts<T> => {
	const options = normalizeParseOptions(opts)

	const tempObj = parseValues(input, options)
	let obj = options.plainObjects ? { __proto__: null } : {}

	const keys = Object.keys(tempObj)

	for (let i = 0; i < keys.length; ++i) {
		const key = keys[i]
		const newObj = parseKeys(key, (tempObj as any)[key as any], options)

		obj = merge(obj, newObj, options)
	}

	if (options.allowSparse) return obj as IParsedParts<T>

	return cleanUp(obj as ICleanUpIO) as IParsedParts<T>
}

export default ParseParts
