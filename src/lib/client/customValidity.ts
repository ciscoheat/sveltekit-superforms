import type { SuperValidated } from '$lib/client/index.js';
import { splitPath } from '$lib/stringPath.js';
import { traversePath } from '$lib/traversal.js';

const noCustomValidityDataAttribute = 'noCustomValidity';

export async function updateCustomValidity(validityEl: HTMLElement, errors: string[] | undefined) {
	// Always reset validity, in case it has been validated on the server.
	if ('setCustomValidity' in validityEl) {
		(validityEl as HTMLInputElement).setCustomValidity('');
	}

	if (noCustomValidityDataAttribute in validityEl.dataset) return;
	setCustomValidity(validityEl as HTMLInputElement, errors);
}

export function setCustomValidityForm<T extends Record<string, unknown>, M>(
	formEl: HTMLFormElement,
	errors: SuperValidated<T, M>['errors']
) {
	for (const el of formEl.querySelectorAll<
		HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement & HTMLButtonElement
	>('input,select,textarea,button')) {
		if (noCustomValidityDataAttribute in el.dataset) {
			continue;
		}

		const error = traversePath(errors, splitPath(el.name));
		setCustomValidity(el, error?.value);
		if (error?.value) return;
	}
}

function setCustomValidity(el: HTMLInputElement, errors: string[] | undefined) {
	const message = errors && errors.length ? errors.join('\n') : '';
	el.setCustomValidity(message);
	if (message) el.reportValidity();
}
