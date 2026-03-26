import { browser } from '$app/environment';
import type { FormOptions } from './superForm.js';

export function cancelFlash<T extends Record<string, unknown>, M>(options: FormOptions<T, M>) {
	if (!options.flashMessage || !browser) return;
	if (!shouldSyncFlash(options)) return;

	document.cookie = `flash=; Max-Age=0; Path=${options.flashMessage.cookiePath ?? '/'};`;
}

export function shouldSyncFlash<T extends Record<string, unknown>, M>(options: FormOptions<T, M>) {
	if (!options.flashMessage || !browser) return false;
	return options.syncFlashMessage;
}
