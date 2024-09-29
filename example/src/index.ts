import {
	BaseMiddleware,
	CelosiaInstance,
	CelosiaRequest,
	CelosiaResponse,
	CelosiaRouter,
	EmptyObject,
	INextFunction,
} from '@celosiajs/core'
import { FileUpload } from '@celosiajs/file-upload'

import FileUploadController from 'Controllers/FileUploadController'

const port = 9999

const instance = new CelosiaInstance({ strict: true })

const router = new CelosiaRouter({ strict: true })

class Middleware1 extends BaseMiddleware {
	override index(
		data: EmptyObject,
		request: CelosiaRequest,
		response: CelosiaResponse,
		next: INextFunction,
	): void {
		console.log('middleware')
		next()
	}
}

router.post('/file-upload', [new FileUpload({})], [new Middleware1()], new FileUploadController())

instance.useRouters(router)

instance.addErrorHandler()

await instance.listen({ port: port })

console.log(`Server up on port ${port}.`)
