import { json } from '@sveltejs/kit';
import { stringify } from 'devalue';

/**
 * Cookie configuration options. The defaults are:
 * Path=/; Max-Age=120; SameSite=Strict;
 */
export interface CookieSerializeOptions {
	path?: string | undefined;
	maxAge?: number | undefined;
	sameSite?: 'Lax' | 'Strict' | 'None';
	secure?: boolean | undefined;
}

export function actionResult<
	T extends Record<string, unknown> | App.Error | string,
	Type extends T extends string ? 'redirect' | 'error' : 'success' | 'failure' | 'error'
>(
	type: Type,
	data?: T,
	options?:
		| number
		| {
				status?: number;
				message?: Type extends 'redirect' ? App.PageData['flash'] : never;
				cookieOptions?: CookieSerializeOptions;
		  }
) {
	function cookieData() {
		if (typeof options === 'number' || !options?.message) return '';

		const extra = [
			`Path=${options?.cookieOptions?.path || '/'}`,
			`Max-Age=${options?.cookieOptions?.maxAge || 120}`,
			`SameSite=${options?.cookieOptions?.sameSite ?? 'Strict'}`
		];

		if (options?.cookieOptions?.secure) {
			extra.push(`Secure`);
		}

		return `flash=${encodeURIComponent(JSON.stringify(options.message))}; ` + extra.join('; ');
	}

	const status = options && typeof options !== 'number' ? options.status : options;

	const result = <T extends { status: number }>(struct: T) => {
		return json(
			{ type, ...struct },
			{
				status: struct.status,
				headers:
					typeof options === 'object' && options.message
						? {
								'Set-Cookie': cookieData()
							}
						: undefined
			}
		);
	};

	if (type == 'error') {
		return result({
			status: status || 500,
			error: typeof data === 'string' ? { message: data } : data
		});
	} else if (type == 'redirect') {
		return result({
			status: status || 303,
			location: data
		});
	} else if (type == 'failure') {
		return result({
			status: status || 400,
			data: stringify(data)
		});
	} else {
		return result({ status: status || 200, data: stringify(data) });
	}
}
