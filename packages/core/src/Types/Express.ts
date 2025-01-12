import QueryString from 'qs'

import { CelosiaInstance, CelosiaRequest, CelosiaResponse } from '..'

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			/**
			 * Reference to the CelosiaInstance currently handling this request.
			 */
			celosiaInstance: CelosiaInstance<boolean>

			/**
			 * Reference to the CelosiaRequest for this request.
			 */
			celosiaRequest: CelosiaRequest

			/**
			 * Reference to the CelosiaResponse for this request.
			 */
			celosiaResponse: CelosiaResponse

			/**
			 * Internal to CelosiaJS. Do NOT use.
			 */
			__CELOSIAJS__: {
				postValidationQuery: QueryString.ParsedQs
			}
		}

		interface Response {
			/**
			 * Reference to the CelosiaInstance currently handling this request.
			 */
			celosiaInstance: CelosiaInstance<boolean>

			/**
			 * Reference to the CelosiaRequest for this request.
			 */
			celosiaRequest: CelosiaRequest

			/**
			 * Reference to the CelosiaResponse for this request.
			 */
			celosiaResponse: CelosiaResponse
		}

		interface Application {
			/**
			 * Reference to the CelosiaInstance for this app.
			 */
			celosiaInstance: CelosiaInstance<boolean>
		}
	}
}
