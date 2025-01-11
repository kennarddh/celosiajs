import { NextFunction, Request, Response } from 'express'

import bodyParser, { OptionsUrlencoded } from 'body-parser'

const ParseUrlencoded =
	(options: Partial<OptionsUrlencoded>) => (req: Request, res: Response, next: NextFunction) => {
		if (!req.header('content-type')?.startsWith('application/x-www-form-urlencoded'))
			return next()

		req.body = {}

		const errorHandler = (err: Error | null) => {
			if (err instanceof Error) {
				res.status(422).json({
					errors: { others: ['Invalid urlencoded body'] },
					data: {},
				})

				return
			}

			next()
		}

		bodyParser.urlencoded(options)(req, res, errorHandler)
	}

export default ParseUrlencoded
