import { CelosiaResponse, Controller, ControllerRequest, EmptyObject } from '@celosiajs/core'
import { ZodUploadedFileType } from '@celosiajs/file-upload'

import z from 'zod/v4'

class FileUploadController extends Controller {
	constructor() {
		super('FileUploadController')
	}

	public async index(
		_: EmptyObject,
		request: ControllerRequest<FileUploadController>,
		response: CelosiaResponse,
	) {
		console.log('controller body', request.body)
		response.status(200).json({ hi: true })
	}

	public override get body() {
		return z.object({
			str: z.string(),
			files: ZodUploadedFileType.array(),
		})
	}
}

export default FileUploadController
