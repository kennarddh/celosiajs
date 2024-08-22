import winston from 'winston'

import { Format } from 'logform'

const FilterLevel: (opts: { list: string[]; isWhitelist: boolean }) => Format = winston.format(
	(info, opts: { list: string[]; isWhitelist: boolean }) => {
		if (opts.isWhitelist) {
			if (opts.list.includes(info.level)) {
				return info
			} else {
				return false
			}
		} else {
			if (opts.list.includes(info.level)) {
				return false
			} else {
				return info
			}
		}
	},
)

export default FilterLevel
