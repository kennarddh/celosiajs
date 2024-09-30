import { z } from 'zod'

export const ZodActualUploadedFileType = z.object({
	fileName: z.string(),
	encoding: z.string(),
	mimeType: z.string(),
	buffer: z.instanceof(Buffer),
})

// To hide individual property's error. Because the internal working of the system should not be shown to the client.
const ZodUploadedFileType = z.any().refine(
	async (data: unknown) => {
		const result = await ZodActualUploadedFileType.safeParseAsync(data)

		return result.success
	},
	{ message: 'Invalid file' },
)

export default ZodUploadedFileType
