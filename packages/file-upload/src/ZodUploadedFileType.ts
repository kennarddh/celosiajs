import z, { ZodType } from 'zod/v4'

export const ZodActualUploadedFileType = z.object({
	fileName: z.string(),
	encoding: z.string(),
	mimeType: z.string(),
	buffer: z.instanceof(Buffer),
})

// To hide individual property's error. Because the internal working of the system should not be shown to the client.
const ZodUploadedFileType = z.any().check(async ctx => {
	if (ctx.value === undefined) {
		ctx.issues.push({ code: 'custom', message: 'Required', input: ctx.value })

		return
	}

	const result = await ZodActualUploadedFileType.safeParseAsync(ctx.value)

	if (!result.success) {
		ctx.issues.push({ code: 'custom', message: `Invalid file`, input: ctx.value })
	}
}) as ZodType<z.infer<typeof ZodActualUploadedFileType>>

export default ZodUploadedFileType
