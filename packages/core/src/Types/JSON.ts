type JSON = null | string | number | boolean | JSONObject | JSONArray

export interface JSONObject {
	[x: string]: JSON
}

export type JSONArray = JSON[]

export default JSON
