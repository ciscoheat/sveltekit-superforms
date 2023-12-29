import type { SuperValidated } from '$lib/index.js';
import { splitPath } from '$lib/stringPath.js';
import { traversePath } from '$lib/traversal.js';

const noCustomValidityDataAttribute = 'noCustomValidity';

export async function updateCustomValidity(validityEl: HTMLElement, errors: string[] | undefined) {
	// Always reset validity, in case it has been validated on the server.
	if ('setCustomValidity' in validityEl) {
		(validityEl as HTMLInputElement).setCustomValidity('');
	}

	// If event is input but element shouldn't use custom validity,
	// return immediately since validateField don't have to be called
	// in this case, validation is happening elsewhere.
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
