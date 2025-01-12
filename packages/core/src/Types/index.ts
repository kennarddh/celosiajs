import './Express'
import './Globals'

export type { default as JSON, JSONObject, JSONArray } from './JSON'
export type { default as EmptyObject } from './EmptyObject'
export type { default as StrictOmit } from './StrictOmit'

export * from './Types'
export * from './Utils'

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace X2345 {
		interface Celo2siaInstance<Strict extends boolean> {}
	}
}
