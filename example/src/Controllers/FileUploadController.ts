import { BaseController, CelosiaResponse, EmptyObject, IControllerRequest } from '@celosiajs/core'
import { ZodUploadedFileType } from '@celosiajs/file-upload'

import { z } from 'zod'

class FileUploadController extends BaseController {
	public async index(
		_: EmptyObject,
		request: IControllerRequest<FileUploadController>,
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
