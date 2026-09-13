type JSON = null | string | number | boolean | bigint | JSONObject | JSONArray

export interface JSONObject {
	[x: string]: JSON
}

export type JSONArray = JSON[]

export default JSON
