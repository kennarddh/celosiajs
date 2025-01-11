/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
import { z } from 'zod'

import { BaseController, BaseMiddleware, CelosiaRequest, DeepRequired, EmptyObject } from '../'
import InvariantOf from './InvariantOf'

export type NextFunction<Output = undefined> = (output?: Output) => void

export interface ListenOptions {
	port?: number
	host?: string
	backlog?: number
}

export type MiddlewareArray = BaseMiddleware<any, any, any, any>[]

export type NoInputMiddleware = BaseMiddleware<CelosiaRequest>

// & EmptyObject is used so that `{ x: string } extends EmptyObject` become true, because EmptyObject has it's own brand symbol.
export type ControllerRequest<Controller extends BaseController<any, any, any>> = CelosiaRequest<
	{} extends DeepRequired<z.infer<Controller['body']>>
		? EmptyObject
		: z.infer<Controller['body']> & EmptyObject,
	{} extends DeepRequired<z.infer<Controller['query']>>
		? EmptyObject
		: z.infer<Controller['query']> & EmptyObject,
	{} extends DeepRequired<z.infer<Controller['params']>>
		? EmptyObject
		: z.infer<Controller['params']> & EmptyObject,
	{} extends DeepRequired<z.infer<Controller['cookies']>>
		? EmptyObject
		: z.infer<Controller['cookies']> & EmptyObject
>

export type ControllerResponse<Controller extends BaseController<any, any, any>> =
	Controller extends BaseController<any, any, infer Response> ? Response : never

export type ValidateMiddlewares<
	Controller extends BaseController<any, any, any>,
	T extends MiddlewareArray,
	Input extends Record<string, any> = EmptyObject,
	Results extends MiddlewareArray = [],
> = T extends [
	BaseMiddleware<infer Request, infer Response, infer RequiredInput, infer Output>,
	...infer Tail extends MiddlewareArray,
]
	? ControllerRequest<Controller> extends Request
		? Response extends ControllerResponse<Controller>
			? RequiredInput extends Input
				? ValidateMiddlewares<Controller, Tail, Input & Output, [...Results, T[0]]>
				: ValidateMiddlewares<
						Controller,
						Tail,
						Input,
						[
							...Results,
							BaseMiddleware<
								ControllerRequest<Controller>,
								ControllerResponse<Controller>,
								InvariantOf<Input>,
								Output
							>,
						]
					>
			: ValidateMiddlewares<
					Controller,
					Tail,
					Input,
					[
						...Results,
						BaseMiddleware<
							InvariantOf<ControllerRequest<Controller>>,
							InvariantOf<ControllerResponse<Controller>>,
							Input,
							Output
						>,
					]
				>
		: ValidateMiddlewares<
				Controller,
				Tail,
				Input,
				[
					...Results,
					BaseMiddleware<
						InvariantOf<ControllerRequest<Controller>>,
						InvariantOf<ControllerResponse<Controller>>,
						Input,
						Output
					>,
				]
			>
	: Results

export type MergeMiddlewaresOutput<
	T extends MiddlewareArray,
	Input extends Record<string, any> = {},
> = T extends [BaseMiddleware<any, any, any, infer Output>, ...infer Tail extends MiddlewareArray]
	? MergeMiddlewaresOutput<Tail, Output & Input>
	: Input

export type ValidateController<
	Controller extends BaseController<any, any, any>,
	Middlewares extends MiddlewareArray | [],
> =
	Controller extends BaseController<infer Data, any, any>
		? MergeMiddlewaresOutput<Middlewares> extends Data
			? Controller
			: never
		: never

export type ValidateControllerWithoutBody<
	Controller extends BaseController<any, any, any>,
	Middlewares extends MiddlewareArray | [],
	Strict extends boolean = true,
> =
	z.infer<Controller['body']> extends EmptyObject
		? ValidateController<Controller, Middlewares>
		: Strict extends true
			? never
			: ValidateController<Controller, Middlewares>

export type OutgoingHeaderValue = string | string[] | number
export type IncomingHeaderValue = string | string[]
export type OutgoingHeaders = Record<string, OutgoingHeaderValue>
export type IncomingHeaders = Record<string, IncomingHeaderValue>

export interface SendOptions {
	/**
	 * Enable or disable accepting ranged requests, defaults to true.
	 * Disabling this will not send Accept-Ranges and ignore the contents of the Range request header.
	 */
	acceptRanges?: boolean | undefined

	/**
	 * Enable or disable setting Cache-Control response header, defaults to true.
	 * Disabling this will ignore the maxAge option.
	 */
	cacheControl?: boolean | undefined

	/**
	 * Set how "dotfiles" are treated when encountered.
	 * A dotfile is a file or directory that begins with a dot (".").
	 * Note this check is done on the path itself without checking if the path actually exists on the disk.
	 * If root is specified, only the dotfiles above the root are checked (i.e. the root itself can be within a dotfile when when set to "deny").
	 * 'allow' No special treatment for dotfiles.
	 * 'deny' Send a 403 for any request for a dotfile.
	 * 'ignore' Pretend like the dotfile does not exist and 404.
	 * The default value is similar to 'ignore', with the exception that this default will not ignore the files within a directory that begins with a dot, for backward-compatibility.
	 */
	dotfiles?: 'allow' | 'deny' | 'ignore' | undefined

	/**
	 * Byte offset at which the stream ends, defaults to the length of the file minus 1.
	 * The end is inclusive in the stream, meaning end: 3 will include the 4th byte in the stream.
	 */
	end?: number | undefined

	/**
	 * Enable or disable etag generation, defaults to true.
	 */
	etag?: boolean | undefined

	/**
	 * If a given file doesn't exist, try appending one of the given extensions, in the given order.
	 * By default, this is disabled (set to false).
	 * An example value that will serve extension-less HTML files: ['html', 'htm'].
	 * This is skipped if the requested file already has an extension.
	 */
	extensions?: string[] | string | boolean | undefined

	/**
	 * Enable or disable the immutable directive in the Cache-Control response header, defaults to false.
	 * If set to true, the maxAge option should also be specified to enable caching.
	 * The immutable directive will prevent supported clients from making conditional requests during the life of the maxAge option to check if the file has changed.
	 * @default false
	 */
	immutable?: boolean | undefined

	/**
	 * By default send supports "index.html" files, to disable this set false or to supply a new index pass a string or an array in preferred order.
	 */
	index?: string[] | string | boolean | undefined

	/**
	 * Enable or disable Last-Modified header, defaults to true.
	 * Uses the file system's last modified value.
	 */
	lastModified?: boolean | undefined

	/**
	 * Provide a max-age in milliseconds for http caching, defaults to 0.
	 * This can also be a string accepted by the ms module.
	 */
	maxAge?: string | number | undefined

	/**
	 * Serve files relative to path.
	 */
	root?: string | undefined

	/**
	 * Byte offset at which the stream starts, defaults to 0.
	 * The start is inclusive, meaning start: 2 will include the 3rd byte in the stream.
	 */
	start?: number | undefined
}

export interface SendFileOptions extends SendOptions {
	/** Object containing HTTP headers to serve with the file. */
	headers?: Record<string, unknown>
}

export interface DownloadOptions extends SendOptions {
	/** Object containing HTTP headers to serve with the file. The header `Content-Disposition` will be overridden by the filename argument. */
	headers?: Record<string, unknown>
}

export interface CookieOptions {
	/** Convenient option for setting the expiry time relative to the current time in **milliseconds**. */
	maxAge?: number
	/** Indicates if the cookie should be signed. */
	signed?: boolean
	/** Expiry date of the cookie in GMT. If not specified or set to 0, creates a session cookie. */
	expires?: Date
	/** Flags the cookie to be accessible only by the web server. */
	httpOnly?: boolean
	/** Path for the cookie. Defaults to “/”. */
	path?: string
	/** Domain name for the cookie. Defaults to the domain name of the app. */
	domain?: string
	/** Marks the cookie to be used with HTTPS only. */
	secure?: boolean
	/**
	 * Value of the "SameSite" Set-Cookie attribute.
	 * @link https://tools.ietf.org/html/draft-ietf-httpbis-cookie-same-site-00#section-4.1.1.
	 */
	sameSite?: boolean | 'lax' | 'strict' | 'none'
	/**
	 * Value of the "Priority" Set-Cookie attribute.
	 * @link https://datatracker.ietf.org/doc/html/draft-west-cookie-priority-00#section-4.3
	 */
	priority?: 'low' | 'medium' | 'high'
}

export interface QueryParams {
	[key: string]: string | QueryParams | QueryParams[]
}

export type PathParams = Record<string, string>

export type CookiesObject = Record<string, string>
