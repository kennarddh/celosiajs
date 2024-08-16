import {
	BaseMiddleware,
	CelosiaRequest,
	CelosiaResponse,
	EmptyObject,
	INextFunction,
} from '@celosiajs/core'
import { IFileUploadOptions, IUploadedFile } from 'Types'
import busboyFactory from 'busboy'

class FileUpload extends BaseMiddleware<CelosiaRequest, CelosiaResponse> {
	constructor(public options: IFileUploadOptions) {
		super()
	}

	public override async index(
		_: EmptyObject,
		request: CelosiaRequest,
		response: CelosiaResponse,
		next: INextFunction,
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
			if (!this.options.ignoreLimits) {
				if (file.truncated) {
					request.expressRequest.unpipe(busboy)
					busboy.end()

					return response.status(422).json({
						errors: {
							others: [`Body file "${name}" exceeded the file size limit.`],
						},
						data: {},
					})
				}
			}

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

			if (!this.options.ignoreLimits) {
				if (info.nameTruncated) {
					request.expressRequest.unpipe(busboy)
					busboy.end()

					return response.status(422).json({
						errors: {
							others: [
								`Body field name that starts with "${info.nameTruncated}" exceeded the length limit.`,
							],
						},
						data: {},
					})
				}

				if (info.valueTruncated) {
					request.expressRequest.unpipe(busboy)
					busboy.end()

					return response.status(422).json({
						errors: {
							others: [
								`Body field "${info.nameTruncated}" value exceeded the length limit.`,
							],
						},
						data: {},
					})
				}
			}
		})

		busboy.on('close', () => {
			request.body = resultBody

			next()
		})

		busboy.on('partsLimit', () => {
			if (this.options.ignoreLimits) return

			request.expressRequest.unpipe(busboy)
			busboy.end()

			response.status(422).json({
				errors: {
					others: ['Body parts amount exceeded the limit.'],
				},
				data: {},
			})
		})

		busboy.on('filesLimit', () => {
			if (this.options.ignoreLimits) return

			request.expressRequest.unpipe(busboy)
			busboy.end()

			response.status(422).json({
				errors: {
					others: [`Body files amount exceeded the limit.`],
				},
				data: {},
			})
		})

		busboy.on('fieldsLimit', () => {
			if (this.options.ignoreLimits) return

			request.expressRequest.unpipe(busboy)
			busboy.end()

			response.status(422).json({
				errors: {
					others: [`Fields amount exceeded the limit.`],
				},
				data: {},
			})
		})

		request.expressRequest.pipe(busboy)
	}
}

export default FileUpload
