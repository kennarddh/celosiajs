/* eslint-disable @typescript-eslint/no-unsafe-function-type */
export type DeepPartial<T> = T extends Function
	? T
	: T extends object
		? {
				[P in keyof T]?: DeepPartial<T[P]>
			}
		: T

export type DeepRequired<T> = T extends Function
	? T
	: T extends object
		? {
				[P in keyof T]-?: DeepRequired<T[P]>
			}
		: T
