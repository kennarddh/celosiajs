/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
import { CookiesObject, EmptyObject, JSON, PathParams, QueryParams } from '../'

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace CelosiaJS {
		interface CelosiaInstance<Strict extends boolean> {}
		interface CelosiaRequest<
			Body extends EmptyObject | JSON,
			Query extends EmptyObject | QueryParams,
			Params extends EmptyObject | PathParams,
			Cookies extends EmptyObject | CookiesObject,
		> {}
		interface CelosiaRouter<Strict extends boolean> {}
		interface CelosiaResponse<Body> {}
	}
}
