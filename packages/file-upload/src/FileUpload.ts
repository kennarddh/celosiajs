import busboyFactory from 'busboy'

import { Readable, Writable } from 'stream'

import {
	CelosiaRequest,
	CelosiaResponse,
	type EmptyObject,
	Middleware,
	type NextFunction,
} from '@celosiajs/core'

import appendField from 'append-field'

import {
	ExceededLimitInfo,
	ExceededLimitKind,
	FileUploadErrorInfo,
	FileUploadErrorKind,
	FileUploadOptions,
} from './Types'

class FileUpload extends Middleware<CelosiaRequest, CelosiaResponse> {
	public options: Required<FileUploadOptions>

	constructor(options: FileUploadOptions = {}) {
		super('FileUpload')

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
					request: CelosiaRequest,
					response: CelosiaResponse,
					info: ExceededLimitInfo,
					options: Required<FileUploadOptions>,
				) => {
					switch (info.kind) {
						case ExceededLimitKind.FieldNameTruncated: {
							response.status(422).json({
								errors: {
									others: [
										`Body field name that starts with '${info.name}' exceeded the length limit of ${options.limits.fieldNameSize}.`,
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
										`Body file '${info.name}' exceeded the file size limit of ${options.limits.fileSize} bytes.`,
									],
								},
								data: {},
							})

							break
						}

						default: {
							this.logger.warn(
								'Invalid ExceededLimitKind passed to default limitExceededHandler.',
								{ requestId: request.id },
							)

							break
						}
					}
				}),
			errorHandler:
				options.errorHandler ??
				((
					request: CelosiaRequest,
					response: CelosiaResponse,
					info: FileUploadErrorInfo,
					__: Required<FileUploadOptions>,
				) => {
					this.logger.error(
						'FileUpload error',
						{
							kind: info.kind,
							kindName: FileUploadErrorKind[info.kind],
							requestId: request.id,
						},
						info.error,
					)

					response.sendInternalServerError()
				}),
			parser: {
				duplicates: 'combine',
				comma: false,
				...(options.parser ?? {}),
			},
		}
	}

	public override async index(
		_: EmptyObject,
		request: CelosiaRequest,
		response: CelosiaResponse,
		next: NextFunction,
	) {
		if (!request.header('content-type')?.startsWith('multipart/form-data')) return next()

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

		const body: object = {}

		let errorOccured = false

		busboy.on('file', (name, file, info) => {
			const { filename, encoding, mimeType } = info

			const buffers: Buffer[] = []

			file.on('data', (data: Buffer) => {
				buffers.push(data)
			})

			file.on('error', (error: Error) => {
				errorOccured = true

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
				if (!this.options.ignoreLimits) {
					if (file.truncated) {
						errorOccured = true

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

				const buffer = Buffer.concat(buffers)

				appendField(body, name, {
					encoding,
					fileName: filename,
					mimeType,
					buffer,
				})
			})
		})

		busboy.on('field', (name, value, info) => {
			appendField(body, name, value)

			if (!this.options.ignoreLimits) {
				if (info.nameTruncated) {
					errorOccured = true

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
					errorOccured = true

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
			if (errorOccured) return

			request.body = body

			next()
		})

		busboy.on('error', (error: Error) => {
			errorOccured = true

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

			errorOccured = true
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

			errorOccured = true

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

			errorOccured = true

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
