import busboyFactory from 'busboy'

import { Readable, Writable } from 'stream'

import {
	BaseMiddleware,
	CelosiaRequest,
	CelosiaResponse,
	type DeepPartial,
	type EmptyObject,
	Globals,
	type INextFunction,
} from '@celosiajs/core'

import ParseParts from 'ParseParts'
import {
	ExceededLimitInfo,
	ExceededLimitKind,
	FileUploadErrorInfo,
	FileUploadErrorKind,
	IFileUploadOptions,
	IUploadedFile,
} from 'Types'

class FileUpload extends BaseMiddleware<CelosiaRequest, CelosiaResponse> {
	public options: IFileUploadOptions

	constructor(options: DeepPartial<IFileUploadOptions>) {
		super()

		this.options = {
			defaultCharset: options.defaultCharset ?? 'utf8',
			defaultParameterCharset: options.defaultParameterCharset ?? 'latin1',
			preservePath: options.preservePath ?? false,
			highWaterMark: options.highWaterMark ?? Writable.getDefaultHighWaterMark(false),
			fileHighWaterMark: options.fileHighWaterMark ?? Readable.getDefaultHighWaterMark(false),
			ignoreLimits: options.ignoreLimits ?? false,
			limits: {
				fieldNameSize: options.limits?.fieldNameSize ?? 100,
				fields: options.limits?.fields ?? Infinity,
				fieldSize: options.limits?.fieldSize ?? 1048576,
				headerPairs: options.limits?.headerPairs ?? 2000,
				fileSize: options.limits?.fileSize ?? Infinity,
				files: options.limits?.files ?? Infinity,
				parts: options.limits?.parts ?? Infinity,
			},
			limitExceededHandler:
				options.limitExceededHandler ??
				((
					_: CelosiaRequest,
					response: CelosiaResponse,
					info: ExceededLimitInfo,
					options: IFileUploadOptions,
				) => {
					switch (info.kind) {
						case ExceededLimitKind.FieldNameTruncated: {
							response.status(422).json({
								errors: {
									others: [
										`Body field name that starts with "${info.name}" exceeded the length limit of ${options.limits.fieldNameSize}.`,
									],
								},
								data: {},
							})

							break
						}

						case ExceededLimitKind.FieldValueTruncated: {
							response.status(422).json({
								errors: {
									others: [
										`Body field "${info.name}" value exceeded the length limit of ${options.limits.fieldSize}.`,
									],
								},
								data: {},
							})

							break
						}

						case ExceededLimitKind.Fields: {
							response.status(422).json({
								errors: {
									others: [
										`Body fields amount exceeded the limit of ${options.limits.fields}.`,
									],
								},
								data: {},
							})

							break
						}

						case ExceededLimitKind.Parts: {
							response.status(422).json({
								errors: {
									others: [
										`Body parts amount exceeded the limit of ${options.limits.parts}.`,
									],
								},
								data: {},
							})

							break
						}

						case ExceededLimitKind.Files: {
							response.status(422).json({
								errors: {
									others: [
										`Body files amount exceeded the limit of ${options.limits.files}.`,
									],
								},
								data: {},
							})

							break
						}

						case ExceededLimitKind.FileSize: {
							response.status(422).json({
								errors: {
									others: [
										`Body file "${info.name}" exceeded the file size limit of ${options.limits.fileSize} bytes.`,
									],
								},
								data: {},
							})

							break
						}

						default: {
							Globals.logger.warn(
								'Invalid ExceededLimitKind passed to default limitExceededHandler.',
							)

							break
						}
					}
				}),
			errorHandler:
				options.errorHandler ??
				((
					_: CelosiaRequest,
					response: CelosiaResponse,
					info: FileUploadErrorInfo,
					__: IFileUploadOptions,
				) => {
					Globals.logger.error(
						'FileUpload error',
						{ kind: info.kind, kindName: FileUploadErrorKind[info.kind] },
						info.error,
					)

					response.status(500).json({
						errors: {
							others: ['Internal server error'],
						},
						data: {},
					})
				}),
			parser: options.parser ?? {},
		}
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
			defCharset: this.options.defaultCharset,
			defParamCharset: this.options.defaultParameterCharset,
			preservePath: this.options.preservePath,
			limits: {
				fieldNameSize: this.options.limits.fieldNameSize,
				fields: this.options.limits.fields,
				fieldSize: this.options.limits.fieldSize,
				files: this.options.limits.files,
				fileSize: this.options.limits.fileSize,
				headerPairs: this.options.limits.headerPairs,
				parts: this.options.limits.parts,
			},
		})

		const parts: [string, string | IUploadedFile][] = []

		busboy.on('file', (name, file, info) => {
			if (!this.options.ignoreLimits) {
				if (file.truncated) {
					request.expressRequest.unpipe(busboy)
					busboy.end()

					this.options.limitExceededHandler(
						request,
						response,
						{ kind: ExceededLimitKind.FileSize, info, name },
						this.options,
					)

					return
				}
			}

			const { filename, encoding, mimeType } = info

			const buffers: Buffer[] = []

			file.on('data', (data: Buffer) => {
				buffers.push(data)
			})

			file.on('error', (error: Error) => {
				request.expressRequest.unpipe(busboy)
				busboy.end()

				this.options.errorHandler(
					request,
					response,
					{ kind: FileUploadErrorKind.FileStream, error },
					this.options,
				)
			})

			file.on('close', () => {
				const buffer = Buffer.concat(buffers)

				parts.push([
					name,
					{
						encoding,
						fileName: filename,
						mimeType,
						buffer,
					},
				])
			})
		})

		busboy.on('field', (name, value, info) => {
			parts.push([name, value])

			if (!this.options.ignoreLimits) {
				if (info.nameTruncated) {
					request.expressRequest.unpipe(busboy)
					busboy.end()

					this.options.limitExceededHandler(
						request,
						response,
						{ kind: ExceededLimitKind.FieldNameTruncated, info, name, value },
						this.options,
					)

					return
				}

				if (info.valueTruncated) {
					request.expressRequest.unpipe(busboy)
					busboy.end()

					this.options.limitExceededHandler(
						request,
						response,
						{ kind: ExceededLimitKind.FieldValueTruncated, info, name, value },
						this.options,
					)

					return
				}
			}
		})

		busboy.on('close', () => {
			const body = ParseParts<string | IUploadedFile>(parts)

			request.body = body

			next()
		})

		busboy.on('error', (error: Error) => {
			request.expressRequest.unpipe(busboy)
			busboy.end()

			this.options.errorHandler(
				request,
				response,
				{ kind: FileUploadErrorKind.Busboy, error },
				this.options,
			)
		})

		busboy.on('partsLimit', () => {
			if (this.options.ignoreLimits) return

			request.expressRequest.unpipe(busboy)
			busboy.end()

			this.options.limitExceededHandler(
				request,
				response,
				{ kind: ExceededLimitKind.Parts },
				this.options,
			)
		})

		busboy.on('filesLimit', () => {
			if (this.options.ignoreLimits) return

			request.expressRequest.unpipe(busboy)
			busboy.end()

			this.options.limitExceededHandler(
				request,
				response,
				{ kind: ExceededLimitKind.Files },
				this.options,
			)
		})

		busboy.on('fieldsLimit', () => {
			if (this.options.ignoreLimits) return

			request.expressRequest.unpipe(busboy)
			busboy.end()

			this.options.limitExceededHandler(
				request,
				response,
				{ kind: ExceededLimitKind.Fields },
				this.options,
			)
		})

		request.expressRequest.pipe(busboy)
	}
}

export default FileUpload
