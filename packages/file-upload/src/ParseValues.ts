/* eslint-disable @typescript-eslint/no-explicit-any */
import QueryString from 'qs'

const parseArrayValue = (
	val: any,
	options: QueryString.IParseOptions<QueryString.BooleanOptional>,
) => {
	if (val && typeof val === 'string' && options.comma && val.includes(',')) {
		return val.split(',')
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return val
}

const ParseValues = (
	input: [string, any][],
	options: QueryString.IParseOptions<QueryString.BooleanOptional>,
) => {
	const obj = { __proto__: null }

	for (const [key, rawValue] of input) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		let value = parseArrayValue(rawValue, options)

		if (key.endsWith('[]')) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			value = Array.isArray(value) ? [value] : value
		}

		const existing = Object.prototype.hasOwnProperty.call(obj, key)
		if (existing && options.duplicates === 'combine') {
			// eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
			;(obj as any)[key] = [].concat((obj as any)[key], value)
		} else if (!existing || options.duplicates === 'last') {
			// eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
			;(obj as any)[key] = value
		}
	}

	return obj
}

export default ParseValues
