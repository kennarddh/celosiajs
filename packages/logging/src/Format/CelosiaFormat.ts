/* eslint-disable security/detect-object-injection */
import { format } from 'winston'

import { Format } from 'logform'
import { MESSAGE, SPLAT } from 'triple-beam'
import util, { InspectOptions } from 'util'

const CelosiaFormat: (opts: {
	inspectOptions?: InspectOptions
	levelPadLength?: number
	timestamp?: boolean
}) => Format = format((info, opts) => {
	let message = ''

	const {
		inspectOptions,
		timestamp = true,
		levelPadLength = 7,
	} = opts as {
		inspectOptions?: InspectOptions
		levelPadLength?: number
		timestamp?: boolean
	}

	if (timestamp) {
		const timestampString = new Date().toLocaleString()

		message += `[${timestampString}]`
	}

	message += `${message ? ' ' : ''}[${info.level.padEnd(levelPadLength, ' ')}]`

	if (info.source) message += ` [${info.source as string}]`

	message += `: ${info.message as string}`

	if (info.ms) {
		message += ` ${info.ms as string}`
	}

	for (const splat of (info[SPLAT] ?? []) as string[]) {
		message += `\n${util.inspect(splat, inspectOptions)}`
	}

	info[MESSAGE] = message

	return info
})

export default CelosiaFormat
