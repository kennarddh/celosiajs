import { format } from 'winston'

import { Format } from 'logform'

const FilterLevel: (opts: { list: string[]; isWhitelist: boolean }) => Format = format(
	(info, opts) => {
		const options = opts as { list: string[]; isWhitelist: boolean }

		if (options.isWhitelist) {
			if (options.list.includes(info.level)) {
				return info
			} else {
				return false
			}
		} else {
			if (options.list.includes(info.level)) {
				return false
			} else {
				return info
			}
		}
	},
)

export default FilterLevel
