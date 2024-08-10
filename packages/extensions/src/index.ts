/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExtensionsRegistry } from '@celosiajs/core'

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace CelosiaJS {
		interface CelosiaResponse<Body> {
			sendInternalServerError: () => void
		}
	}
}

ExtensionsRegistry.registerCelosiaResponseExtension('sendInternalServerError', response => {
	response.status(500).json({
		errors: {
			others: ['Internal server error'],
		},
		data: {},
	})
})
