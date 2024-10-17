import { ZodEffects, z } from 'zod'

export const ZodActualUploadedFileType = z.object({
	fileName: z.string(),
	encoding: z.string(),
	mimeType: z.string(),
	buffer: z.instanceof(Buffer),
})

// To hide individual property's error. Because the internal working of the system should not be shown to the client.
const ZodUploadedFileType = z.any().superRefine(async (data, ctx) => {
	if (data === undefined) {
		return ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Required',
		})
	}

	const result = await ZodActualUploadedFileType.safeParseAsync(data)

	if (!result.success) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Invalid file`,
		})
	}
}) as ZodEffects<z.ZodAny, z.infer<typeof ZodActualUploadedFileType>>

export default ZodUploadedFileType
