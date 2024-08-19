/* eslint-disable @typescript-eslint/no-unused-vars */
import { CelosiaResponse as CelosiaResponseClass, ExtensionsRegistry } from '@celosiajs/core'

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace CelosiaJS {
		interface CelosiaResponse<Body> {
			/**
			 * Send a json containing "Internal Server Error" response with 500 status code
			 */
			sendInternalServerError: () => CelosiaResponseClass
		}
	}
}

ExtensionsRegistry.registerCelosiaResponseExtension('sendInternalServerError', response => {
	return response.status(500).json({
		errors: {
			others: ['Internal server error'],
		},
		data: {},
	})
})
