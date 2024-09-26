import { z } from 'zod'

const UploadedFile = z.object({
	fileName: z.string(),
	encoding: z.string(),
	mimeType: z.string(),
	buffer: z.instanceof(Buffer),
})

export default UploadedFile
