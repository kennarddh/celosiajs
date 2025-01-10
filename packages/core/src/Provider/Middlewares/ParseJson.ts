import { NextFunction, Request, Response } from 'express'

import bodyParser, { OptionsJson } from 'body-parser'

const ParseJson = (options: OptionsJson) => (req: Request, res: Response, next: NextFunction) => {
	const errorHandler = (err: Error | null) => {
		if (err instanceof Error) {
			res.status(422).json({
				errors: { others: ['Invalid json body'] },
				data: {},
			})

			return
		}

		next()
	}

	bodyParser.json(options)(req, res, errorHandler)
}

export default ParseJson
