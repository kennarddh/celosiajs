/* eslint-disable @typescript-eslint/no-unused-vars */
import busboy from 'busboy'

import { CelosiaRequest, CelosiaResponse } from '@celosiajs/core'

import { z } from 'zod'

import UploadedFile from './ZodUploadedFileType'

export enum ExceededLimitKind {
	FileSize,
	FieldNameTruncated,
	FieldValueTruncated,
	Parts,
	Files,
	Fields,
}

export type ExceededLimitInfo =
	| { kind: ExceededLimitKind.FileSize; name: string; info: busboy.FileInfo }
	| {
			kind: ExceededLimitKind.FieldNameTruncated
			name: string
			value: string
			info: busboy.FieldInfo
	  }
	| {
			kind: ExceededLimitKind.FieldValueTruncated
			name: string
			value: string
			info: busboy.FieldInfo
	  }
	| { kind: ExceededLimitKind.Parts }
	| { kind: ExceededLimitKind.Files }
	| { kind: ExceededLimitKind.Fields }

export interface IFileUploadLimitsOptions {
	/**
	 * Max field name size (in bytes). Default: 100.
	 */
	fieldNameSize: number

	/**
	 * Max field value size (in bytes). Default: 1048576 (1MB).
	 */
	fieldSize: number

	/**
	 * Max number of non-file fields. Default: Infinity.
	 */
	fields: number

	/**
	 * For multipart forms, the max file size (in bytes). Default: Infinity.
	 */
	fileSize: number

	/**
	 * For multipart forms, the max number of file fields. Default: Infinity.
	 */
	files: number

	/**
	 * For multipart forms, the max number of parts (fields + files). Default: Infinity.
	 */
	parts: number

	/**
	 * For multipart forms, the max number of header key-value pairs to parse. Default: 2000 (same as node's http module).
	 */
	headerPairs: number
}

export interface IFileUploadOptions {
	/**
	 * highWaterMark to use for the parser stream. Default: node's stream.Writable default.
	 */
	highWaterMark: number

	/**
	 * highWaterMark to use for individual file streams. Default: node's stream.Readable default.
	 */
	fileHighWaterMark: number

	/**
	 * Default character set to use when one isn't defined. Default: 'utf8'.
	 */
	defaultCharset: string

	/**
	 * For multipart forms, the default character set to use for values of part header parameters (e.g. filename) that are not extended parameters (that contain an explicit charset). Default: 'latin1'.
	 */
	defaultParameterCharset: string

	/**
	 * If paths in filenames from file parts in a 'multipart/form-data' request shall be preserved. Default: false.
	 */
	preservePath: boolean

	/**
	 *  Various limits on incoming data.
	 */
	limits: IFileUploadLimitsOptions

	/**
	 * Ignore limits. Will truncate the data if it's over the configured limit. Default: false.
	 */
	ignoreLimits: boolean

	/**
	 * Called when a limit is exceeded while parsing body. Can be used to send a error response. Default: Send a json error response with status 422.
	 */
	limitExceededHandler: (
		request: CelosiaRequest,
		response: CelosiaResponse,
		info: ExceededLimitInfo,
		options: IFileUploadOptions,
	) => void
}

export type IUploadedFile = z.infer<typeof UploadedFile>

export enum IDuplicateStrategy {
	Combine,
	First,
	Last,
}

export interface IParsePartsOptions {
	allowDots: boolean
	allowEmptyArrays: boolean
	allowPrototypes: boolean
	allowSparse: boolean
	arrayLimit: number
	comma: boolean
	decodeDotInKeys: boolean
	depth: number
	duplicateStrategy: IDuplicateStrategy
	parameterLimit: number
	parseArrays: boolean
	plainObjects: boolean
	strictDepth: boolean
	strictNullHandling: boolean
}

export type IParsedPartsValue<T> = T | IParsedParts<T> | IParsedPartsArray<T>

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface IParsedParts<T> {
	[x: string]: IParsedPartsValue<T>
}

export type IParsedPartsArray<T> = IParsedPartsValue<T>[]
