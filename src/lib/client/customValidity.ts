import type { ValidationErrors } from '$lib/client/index.js';
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

export function setCustomValidityForm(
	formElement: HTMLFormElement,
	errors: ValidationErrors<Record<string, unknown>>
) {
	for (const el of formElement.querySelectorAll<HTMLInputElement>('input,select,textarea,button')) {
		if (('dataset' in el && noCustomValidityDataAttribute in el.dataset) || !el.name) {
			continue;
		}

		const path = traversePath(errors, splitPath(el.name));
		const error =
			path && typeof path.value === 'object' && '_errors' in path.value
				? path.value._errors
				: path?.value;

		setCustomValidity(el, error);
		if (error) return;
	}
}

function setCustomValidity(el: HTMLInputElement, errors: string[] | undefined) {
	const message = errors && errors.length ? errors.join('\n') : '';
	el.setCustomValidity(message);
	if (message) el.reportValidity();
}
