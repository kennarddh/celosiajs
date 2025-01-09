import { CelosiaInstance, CelosiaRequest, CelosiaResponse } from '..'

declare global {
	namespace Express {
		interface Request {
			celosiaInstance: CelosiaInstance<boolean>
			celosiaRequest: CelosiaRequest
			celosiaResponse: CelosiaResponse
		}

		interface Response {
			celosiaInstance: CelosiaInstance<boolean>
			celosiaRequest: CelosiaRequest
			celosiaResponse: CelosiaResponse
		}

		interface Application {
			celosiaInstance: CelosiaInstance<boolean>
		}
	}
}
