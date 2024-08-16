/* eslint-disable @typescript-eslint/no-unused-vars */
import { CookiesObject, EmptyObject, JSON, PathParams, QueryParams } from '@celosiajs/core'

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace CelosiaJS {
		interface CelosiaRequest<
			Body extends EmptyObject | JSON,
			Query extends EmptyObject | QueryParams,
			Params extends EmptyObject | PathParams,
			Cookies extends EmptyObject | CookiesObject,
		> {
			files: []
		}
	}
}

export interface IFileUploadLimitsOptions {
	/**
	 * Max field name size (in bytes). Default: 100.
	 */
	fieldNameSize?: number

	/**
	 * Max field value size (in bytes). Default: 1048576 (1MB).
	 */
	fieldSize?: number

	/**
	 * Max number of non-file fields. Default: Infinity.
	 */
	fields?: number

	/**
	 * For multipart forms, the max file size (in bytes). Default: Infinity.
	 */
	fileSize?: number

	/**
	 * For multipart forms, the max number of file fields. Default: Infinity.
	 */
	files?: number

	/**
	 * For multipart forms, the max number of parts (fields + files). Default: Infinity.
	 */
	parts?: number

	/**
	 * For multipart forms, the max number of header key-value pairs to parse. Default: 2000 (same as node's http module).
	 */
	headerPairs?: number
}

export interface IFileUploadOptions {
	/**
	 * highWaterMark to use for the parser stream. Default: node's stream.Writable default.
	 */
	highWaterMark?: number

	/**
	 * highWaterMark to use for individual file streams. Default: node's stream.Readable default.
	 */
	fileHighWaterMark?: number

	/**
	 * Default character set to use when one isn't defined. Default: 'utf8'.
	 */
	defaultCharset?: string

	/**
	 * For multipart forms, the default character set to use for values of part header parameters (e.g. filename) that are not extended parameters (that contain an explicit charset). Default: 'latin1'.
	 */
	defaultParameterCharset?: string

	/**
	 * If paths in filenames from file parts in a 'multipart/form-data' request shall be preserved. Default: false.
	 */
	preservePath?: boolean

	/**
	 *  Various limits on incoming data.
	 */
	limits?: IFileUploadLimitsOptions

	/**
	 * Ignore limits. Will truncate the data if it's over the configured limit. Default: false.
	 */
	ignoreLimits: boolean
}

export interface IUploadedFile {
	fileName: string
	encoding: string
	mimeType: string
	buffer: Buffer
}
