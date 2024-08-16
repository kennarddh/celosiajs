/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	BaseMiddleware,
	CelosiaRequest,
	CelosiaResponse,
	CookiesObject,
	EmptyObject,
	JSON,
	PathParams,
	QueryParams,
} from '@celosiajs/core'
import busboyFactory from 'busboy'

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

interface IFileUploadLimitsOptions {
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

interface IFileUploadOptions {
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

interface IUploadedFile {
	fileName: string
	encoding: string
	mimeType: string
	buffer: Buffer
}

class FileUpload extends BaseMiddleware<CelosiaRequest, CelosiaResponse> {
	constructor(public options: IFileUploadOptions) {
		super()
	}

	public override async index(
		_: EmptyObject,
		request: CelosiaRequest,
		response: CelosiaResponse,
	) {
		const busboy = busboyFactory({
			headers: request.headers,
			highWaterMark: this.options.highWaterMark,
			fileHwm: this.options.fileHighWaterMark,
			defCharset: this.options.defaultCharset ?? 'utf8',
			defParamCharset: this.options.defaultParameterCharset ?? 'latin1',
			preservePath: this.options.preservePath ?? false,
			limits: {
				fieldNameSize: this.options.limits?.fieldNameSize ?? 100,
				fields: this.options.limits?.fields ?? Infinity,
				fieldSize: this.options.limits?.fieldSize ?? 1048576,
				files: this.options.limits?.files ?? Infinity,
				fileSize: this.options.limits?.fileSize ?? Infinity,
				headerPairs: this.options.limits?.headerPairs ?? 2000,
				parts: this.options.limits?.parts ?? Infinity,
			},
		})

		// TODO: Support other than memory storage engine for bigger file

		const resultBody: Record<string, string | IUploadedFile> = {}

		busboy.on('file', (name, file, info) => {
			const { filename, encoding, mimeType } = info

			const buffers: Buffer[] = []

			file.on('data', (data: Buffer) => {
				buffers.push(data)
			})

			file.on('close', () => {
				const buffer = Buffer.concat(buffers)

				// eslint-disable-next-line security/detect-object-injection
				resultBody[name] = {
					encoding,
					fileName: filename,
					mimeType,
					buffer,
				}
			})
		})

		busboy.on('field', (name, val, info) => {
			// eslint-disable-next-line security/detect-object-injection
			resultBody[name] = val

			// 	if (info.nameTruncated) {
			// 	}

			// 	if (info.valueTruncated) {
			// 	}
		})

		busboy.end()

		busboy.on('close', () => {
			console.log('Done parsing form!')
		})

		busboy.on('partsLimit', () => {
			console.log('Parts limit')
		})

		busboy.on('filesLimit', () => {
			console.log('Files limit')
		})

		busboy.on('fieldsLimit', () => {
			console.log('Fields limit')
		})

		request.expressRequest.pipe(busboy)
	}
}
