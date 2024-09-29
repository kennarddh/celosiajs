import { BaseController, CelosiaResponse, EmptyObject, IControllerRequest } from '@celosiajs/core'
import { ZodUploadedFileType } from '@celosiajs/file-upload'

import { z } from 'zod'

class FileUploadController extends BaseController {
	public async index(
		_: EmptyObject,
		request: IControllerRequest<FileUploadController>,
		response: CelosiaResponse,
	) {
		response.json({ hi: true })
	}

	public override get body() {
		return z.object({
			str: z.string(),
			file: ZodUploadedFileType,
		})
	}
}

export default FileUploadController
