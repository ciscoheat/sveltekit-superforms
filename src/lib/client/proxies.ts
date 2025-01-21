/* eslint-disable @typescript-eslint/no-explicit-any */
import { derived, get, writable, type Readable, type Updater, type Writable } from 'svelte/store';
import type { InputConstraint } from '../jsonSchema/constraints.js';
import { SuperFormError } from '$lib/errors.js';
import { pathExists, traversePath } from '../traversal.js';
import { splitPath, type FormPath, type FormPathLeaves, type FormPathType } from '../stringPath.js';
import type { FormPathArrays } from '../stringPath.js';
import type { SuperForm, TaintOption } from './superForm.js';
import type { IsAny, Prettify } from '$lib/utils.js';
import { browser } from '$app/environment';

export type ProxyOptions = {
	taint?: TaintOption;
};

type FormPaths<T extends Record<string, unknown>, Type = any> =
	| FormPath<T, Type>
	| FormPathLeaves<T, Type>;

type CorrectProxyType<In, Out, T extends Record<string, unknown>, Path extends FormPaths<T>> =
	NonNullable<FormPathType<T, Path>> extends In ? Writable<Out> : never;

type PathType<Type, T, Path extends string> =
	IsAny<Type> extends true ? FormPathType<T, Path> : Type;

type Nullable<
	T extends Record<string, unknown>,
	Path extends FormPaths<T> | FormPathArrays<T> | FormPathLeaves<T>
> = null extends FormPathType<T, Path> ? null : never;

type Optional<
	T extends Record<string, unknown>,
	Path extends FormPaths<T> | FormPathArrays<T> | FormPathLeaves<T>
> = [undefined] extends [FormPathType<T, Path>] ? undefined : never;

type DefaultOptions = {
	trueStringValue: string;
	dateFormat:
		| 'date'
		| 'datetime'
		| 'time'
		| 'date-utc'
		| 'datetime-utc'
		| 'time-utc'
		| 'date-local'
		| 'datetime-local'
		| 'time-local'
		| 'iso';
	delimiter?: '.' | ',';
	empty?: 'null' | 'undefined' | 'zero';
	initiallyEmptyIfZero?: boolean;
	taint?: TaintOption;
	step: number;
};

const defaultOptions = {
	trueStringValue: 'true',
	dateFormat: 'iso',
	step: 60
} satisfies DefaultOptions;

///// Proxy functions ///////////////////////////////////////////////

export function booleanProxy<T extends Record<string, unknown>, Path extends FormPaths<T>>(
	form: Writable<T> | SuperForm<T>,
	path: Path,
	options?: Prettify<Pick<DefaultOptions, 'trueStringValue' | 'taint'>>
) {
	return _stringProxy(form, path, 'boolean', {
		...defaultOptions,
		...options
	}) as CorrectProxyType<boolean, string, T, Path>;
}

export function intProxy<T extends Record<string, unknown>, Path extends FormPaths<T>>(
	form: Writable<T> | SuperForm<T>,
	path: Path,
	options?: Prettify<Pick<DefaultOptions, 'empty' | 'initiallyEmptyIfZero' | 'taint'>>
) {
	return _stringProxy(form, path, 'int', {
		...defaultOptions,
		...options
	}) as CorrectProxyType<number, string, T, Path>;
}

export function numberProxy<T extends Record<string, unknown>, Path extends FormPaths<T>>(
	form: Writable<T> | SuperForm<T>,
	path: Path,
	options?: Prettify<Pick<DefaultOptions, 'empty' | 'delimiter' | 'initiallyEmptyIfZero' | 'taint'>>
) {
	return _stringProxy(form, path, 'number', {
		...defaultOptions,
		...options
	}) as CorrectProxyType<number, string, T, Path>;
}

export function dateProxy<T extends Record<string, unknown>, Path extends FormPaths<T>>(
	form: Writable<T> | SuperForm<T>,
	path: Path,
	options?: {
		format?: DefaultOptions['dateFormat'];
		empty?: Exclude<DefaultOptions['empty'], 'zero'>;
		taint?: TaintOption;
		step?: number;
	}
) {
	return _stringProxy(form, path, 'date', {
		...defaultOptions,
		dateFormat: options?.format ?? 'iso',
		empty: options?.empty,
		step: options?.step ?? 60
	}) as CorrectProxyType<Date, string, T, Path>;
}

export function stringProxy<T extends Record<string, unknown>, Path extends FormPaths<T>>(
	form: Writable<T> | SuperForm<T>,
	path: Path,
	options: {
		empty: NonNullable<Exclude<DefaultOptions['empty'], 'zero'>>;
		taint?: TaintOption;
	}
): Writable<string> {
	return _stringProxy(form, path, 'string', {
		...defaultOptions,
		...options
	}) as CorrectProxyType<string, string, T, Path>;
}

export function fileFieldProxy<
	T extends Record<string, unknown>,
	Path extends FormPathLeaves<T, File>
>(
	form: SuperForm<T>,
	path: Path,
	options?: ProxyOptions & { empty?: 'null' | 'undefined' }
): FormFieldProxy<FileList | File | Nullable<T, Path> | Optional<T, Path>, Path> {
	const fileField = fileProxy(form, path, options);
	const formField = formFieldProxy(form, path, options);

	return { ...formField, value: fileField };
}

export function fileProxy<T extends Record<string, unknown>, Path extends FormPathLeaves<T, File>>(
	form: Writable<T> | SuperForm<T>,
	path: Path,
	options?: ProxyOptions & { empty?: 'null' | 'undefined' }
) {
	const formFile = fieldProxy(form, path, options) as FieldProxy<File>;
	const fileProxy = writable<FileList>(browser ? new DataTransfer().files : ({} as FileList));

	let initialized = false;
	let initialValue: File | null | undefined;

	formFile.subscribe((file) => {
		if (!browser) return;

		if (!initialized) {
			initialValue = options?.empty ? (options.empty === 'undefined' ? undefined : null) : file;
			initialized = true;
		}

		const dt = new DataTransfer();
		if (file instanceof File) dt.items.add(file);
		fileProxy.set(dt.files);
	});

	const fileStore = {
		subscribe(run: (value: FileList) => void) {
			return fileProxy.subscribe(run);
		},
		set(file: FileList | File | Nullable<T, Path> | Optional<T, Path>) {
			if (!browser) return;

			if (!file) {
				const dt = new DataTransfer();
				fileProxy.set(dt.files);
				formFile.set(file as File);
			} else if (file instanceof File) {
				const dt = new DataTransfer();
				dt.items.add(file);
				fileProxy.set(dt.files);
				formFile.set(file);
			} else if (file instanceof FileList) {
				fileProxy.set(file);
				if (file.length > 0) formFile.set(file.item(0) as File);
				else formFile.set(initialValue as File);
			}
		},
		update() {
			throw new SuperFormError('You cannot update a fileProxy, only set it.');
		}
	} satisfies Writable<FileList>;

	return fileStore;
}

export function filesFieldProxy<
	T extends Record<string, unknown>,
	Path extends FormPathArrays<T, File[]>
>(form: SuperForm<T>, path: Path, options?: ProxyOptions) {
	const filesStore = filesProxy<T, Path>(form, path as any, options);
	const arrayField = arrayProxy<T, Path>(form, path, options);

	return { ...arrayField, values: filesStore };
}

export function filesProxy<
	T extends Record<string, unknown>,
	Path extends FormPathArrays<T, File[]>
>(form: Writable<T> | SuperForm<T>, path: Path, options?: ProxyOptions) {
	const formFiles = fieldProxy(form, path as any, options) as FieldProxy<
		File[] | Nullable<T, Path> | Optional<T, Path>
	>;
	const filesProxy = writable<FileList>(browser ? new DataTransfer().files : ({} as FileList));

	formFiles.subscribe((files) => {
		if (!browser) return;
		const dt = new DataTransfer();

		if (Array.isArray(files)) {
			if (files.length && files.every((f) => !f)) {
				formFiles.set([]);
				return;
			}

			files.filter((f) => f instanceof File).forEach((file) => dt.items.add(file));
		}
		filesProxy.set(dt.files);
	});

	const filesStore = {
		subscribe(run: (value: FileList) => void) {
			return filesProxy.subscribe(run);
		},
		set(files: FileList | File[] | Nullable<T, Path> | Optional<T, Path>) {
			if (!browser) return;

			if (!(files instanceof FileList)) {
				const dt = new DataTransfer();
				if (Array.isArray(files))
					files.forEach((file) => {
						if (file instanceof File) dt.items.add(file);
					});
				filesProxy.set(dt.files);
				formFiles.set(files);
			} else {
				const output: File[] = [];
				for (let i = 0; i < files.length; i++) {
					const file = files.item(i);
					if (file) output.push(file);
				}
				filesProxy.set(files);
				formFiles.set(output);
			}
		},
		update(updater: Updater<File[] | Nullable<T, Path> | Optional<T, Path>>) {
			filesStore.set(updater(get(formFiles)));
		}
	};

	return filesStore;
}

///// Implementation ////////////////////////////////////////////////

/**
 * Creates a string store that will pass its value to a field in the form.
 * @param form The form
 * @param field Form field
 * @param type 'number' | 'int' | 'boolean'
 */
function _stringProxy<T extends Record<string, unknown>, Path extends FormPaths<T>>(
	form: Writable<T> | SuperForm<T>,
	path: Path,
	type: 'number' | 'int' | 'boolean' | 'date' | 'string',
	options: DefaultOptions
): Writable<string> {
	function toValue(value: unknown) {
		if (!value && options.empty !== undefined) {
			return options.empty === 'null' ? null : options.empty === 'zero' ? 0 : undefined;
		}

		if (typeof value === 'number') {
			value = value.toString();
		}

		if (typeof value !== 'string') {
			// Can be undefined due to Proxy in Svelte 5
			value = '';
		}

		const stringValue = value as string;

		if (type == 'string') return stringValue;
		else if (type == 'boolean') return !!stringValue;
		else if (type == 'date') {
			if (stringValue.indexOf('-') === -1) {
				const utc = options.dateFormat.indexOf('utc') >= 0;
				const date = utc ? UTCDate(new Date()) : localDate(new Date());
				return new Date(date + 'T' + stringValue + (utc ? 'Z' : ''));
			} else return new Date(stringValue);
		}

		const numberToConvert = options.delimiter
			? stringValue.replace(options.delimiter, '.')
			: stringValue;

		let num: number;

		if (numberToConvert === '' && options.empty == 'zero') num = 0;
		else if (type == 'number') num = parseFloat(numberToConvert);
		else num = parseInt(numberToConvert, 10);

		return num;
	}

	const isSuper = isSuperForm(form, options);

	const realProxy = isSuper
		? superFieldProxy(form, path, { taint: options.taint })
		: fieldProxy(form, path);

	let updatedValue: string | null = null;
	let initialized = false;

	const proxy: Readable<string> = derived(realProxy, (value: unknown) => {
		if (!initialized) {
			initialized = true;
			if (options.initiallyEmptyIfZero && !value) return '';
		}

		// Prevent proxy updating itself
		if (updatedValue !== null) {
			const current = updatedValue;
			updatedValue = null;
			return current;
		}

		if (value === undefined || value === null) return '';

		if (type == 'string') {
			return value as string;
		} else if (type == 'int' || type == 'number') {
			if (value === '') {
				// Special case for empty string values in number proxies
				// Set the value to 0, to conform to the type.
				realProxy.set(0 as FormPathType<T, Path>, isSuper ? { taint: false } : undefined);
			}

			if (typeof value === 'number' && isNaN(value)) return '';
			return String(value);
		} else if (type == 'date') {
			const date = value as unknown as Date;
			if (isNaN(date as unknown as number)) return '';

			switch (options.dateFormat) {
				case 'iso':
					return date.toISOString();
				case 'date':
					return date.toISOString().slice(0, 10);
				case 'datetime':
					return date.toISOString().slice(0, options.step % 60 ? 19 : 16);
				case 'time':
					return date.toISOString().slice(11, options.step % 60 ? 19 : 16);
				case 'date-utc':
					return UTCDate(date);
				case 'datetime-utc':
					return UTCDate(date) + 'T' + UTCTime(date, options.step);
				case 'time-utc':
					return UTCTime(date, options.step);
				case 'date-local':
					return localDate(date);
				case 'datetime-local':
					return localDate(date) + 'T' + localTime(date, options.step);
				case 'time-local':
					return localTime(date, options.step);
			}
		} else {
			// boolean
			return value ? options.trueStringValue : '';
		}
	});

	return {
		subscribe: proxy.subscribe,
		set(val: string) {
			updatedValue = val;
			const newValue = toValue(updatedValue) as FormPathType<T, Path>;
			realProxy.set(newValue);
		},
		update(updater) {
			realProxy.update((f) => {
				updatedValue = updater(String(f));
				const newValue = toValue(updatedValue) as FormPathType<T, Path>;
				return newValue;
			});
		}
	};
}

type ValueErrors = any[];

export type ArrayProxy<T, Path = string, Errors = ValueErrors, ExtraValues = never> = {
	path: Path;
	values: Writable<(T[] & unknown[]) | ExtraValues>;
	errors: Writable<string[] | undefined>;
	valueErrors: Writable<Errors>;
};

export function arrayProxy<
	T extends Record<string, unknown>,
	Path extends FormPathArrays<T, ArrType>,
	ArrType = any
>(
	superForm: SuperForm<T>,
	path: Path,
	options?: { taint?: TaintOption }
): ArrayProxy<FormPathType<T, Path> extends (infer U)[] ? U : never, Path> {
	const formErrors = fieldProxy(superForm.errors, `${path}` as any);

	const onlyFieldErrors = derived<typeof formErrors, ValueErrors>(formErrors, ($errors) => {
		const output: ValueErrors = [];
		for (const key in $errors) {
			if (key == '_errors') continue;
			output[key as unknown as number] = $errors[key];
		}
		return output as ValueErrors;
	});

	function updateArrayErrors(errors: Record<number, unknown>, value: ValueErrors) {
		for (const key in errors) {
			if (key == '_errors') continue;
			errors[key] = undefined;
		}
		if (value !== undefined) {
			for (const key in value) {
				errors[key] = value[key];
			}
		}
		return errors;
	}

	const fieldErrors: Writable<ValueErrors> = {
		subscribe: onlyFieldErrors.subscribe,
		update(upd: Updater<ValueErrors>) {
			formErrors.update(($errors) =>
				// @ts-expect-error Type is correct
				updateArrayErrors($errors, upd($errors))
			);
		},
		set(value: ValueErrors) {
			// @ts-expect-error Type is correct
			formErrors.update(($errors) => updateArrayErrors($errors, value));
		}
	};

	const values = superFieldProxy(superForm, path, options);

	// If array is shortened, delete all keys above length
	// in errors, so they won't be kept if the array is lengthened again.
	let lastLength = Array.isArray(get(values)) ? (get(values) as unknown[]).length : 0;
	values.subscribe(($values) => {
		const currentLength = Array.isArray($values) ? $values.length : 0;
		if (currentLength < lastLength) {
			superForm.errors.update(
				($errors) => {
					const node = pathExists($errors, splitPath(path));
					if (!node) return $errors;
					for (const key in node.value) {
						if (Number(key) < currentLength) continue;
						delete node.value[key];
					}
					return $errors;
				},
				{ force: true }
			);
		}
		lastLength = currentLength;
	});

	return {
		path,
		values: values as any,
		errors: fieldProxy(superForm.errors, `${path}._errors` as any) as Writable<
			string[] | undefined
		>,
		valueErrors: fieldErrors
	};
}

export type FormFieldProxy<T, Path = string> = {
	path: Path;
	value: SuperFieldProxy<T>;
	errors: Writable<string[] | undefined>;
	constraints: Writable<InputConstraint | undefined>;
	tainted: Writable<boolean | undefined>;
};

export function formFieldProxy<
	T extends Record<string, unknown>,
	Path extends FormPathLeaves<T, Type>,
	Type = any
>(
	superForm: SuperForm<T>,
	path: Path,
	options?: ProxyOptions
): FormFieldProxy<PathType<Type, T, Path>, Path> {
	const path2 = splitPath(path);
	// Filter out array indices, the constraints structure doesn't contain these.
	const constraintsPath = path2.filter((p) => /\D/.test(String(p))).join('.');

	const taintedProxy = derived<typeof superForm.tainted, boolean | undefined>(
		superForm.tainted,
		($tainted) => {
			if (!$tainted) return $tainted;
			const taintedPath = traversePath($tainted, path2);
			return taintedPath ? taintedPath.value : undefined;
		}
	);

	const tainted = {
		subscribe: taintedProxy.subscribe,
		update(upd: Updater<boolean | undefined>) {
			superForm.tainted.update(($tainted) => {
				if (!$tainted) $tainted = {};
				const output = traversePath($tainted, path2, (path) => {
					if (!path.value) path.parent[path.key] = {};
					return path.parent[path.key];
				});
				if (output) output.parent[output.key] = upd(output.value);
				return $tainted;
			});
		},
		set(value: boolean | undefined) {
			superForm.tainted.update(($tainted) => {
				if (!$tainted) $tainted = {};
				const output = traversePath($tainted, path2, (path) => {
					if (!path.value) path.parent[path.key] = {};
					return path.parent[path.key];
				});
				if (output) output.parent[output.key] = value;
				return $tainted;
			});
		}
	};

	return {
		path,
		value: superFieldProxy(superForm, path, options),
		errors: fieldProxy(superForm.errors, path as any) as unknown as Writable<string[] | undefined>,
		constraints: fieldProxy(superForm.constraints, constraintsPath as never) as Writable<
			InputConstraint | undefined
		>,
		tainted
	};
}

function updateProxyField<T extends Record<string, unknown>, Path extends string, Type = any>(
	obj: T,
	path: (string | number | symbol)[],
	updater: Updater<PathType<Type, T, Path>>
) {
	const output = traversePath(obj, path, ({ parent, key, value }) => {
		if (value === undefined) parent[key] = /\D/.test(key) ? {} : [];
		return parent[key];
	});
	if (output) {
		const newValue = updater(output.value);
		output.parent[output.key] = newValue;
	}
	return obj;
}

type SuperFieldProxy<T> = {
	subscribe: Readable<T>['subscribe'];
	set(this: void, value: T, options?: { taint?: TaintOption }): void;
	update(this: void, updater: Updater<T>, options?: { taint?: TaintOption }): void;
};

function superFieldProxy<T extends Record<string, unknown>, Path extends string, Type = any>(
	superForm: SuperForm<T>,
	path: Path,
	baseOptions?: ProxyOptions
): SuperFieldProxy<PathType<Type, T, Path>> {
	const form = superForm.form;
	const path2 = splitPath(path);

	const proxy = derived(form, ($form: object) => {
		const data = traversePath($form, path2);
		return data?.value;
	});

	return {
		subscribe(...params: Parameters<typeof proxy.subscribe>) {
			const unsub = proxy.subscribe(...params);
			return () => unsub();
		},
		update(upd: Updater<PathType<Type, T, Path>>, options?: ProxyOptions) {
			form.update((data) => updateProxyField(data, path2, upd), options ?? baseOptions);
		},
		set(value: PathType<Type, T, Path>, options?: ProxyOptions) {
			form.update((data) => updateProxyField(data, path2, () => value), options ?? baseOptions);
		}
	};
}

function isSuperForm<T extends Record<string, unknown>>(
	form: Writable<T> | SuperForm<T>,
	options?: { taint?: TaintOption }
): form is SuperForm<T> {
	const isSuperForm = 'form' in form;

	if (!isSuperForm && options?.taint !== undefined) {
		throw new SuperFormError(
			'If options.taint is set, the whole superForm object must be used as a proxy.'
		);
	}

	return isSuperForm;
}

export type FieldProxy<T> = Writable<T>;

export function fieldProxy<
	T extends Record<string, unknown>,
	Path extends FormPaths<T, Type>,
	Type = any
>(
	form: Writable<T> | SuperForm<T>,
	path: Path,
	options?: ProxyOptions
): FieldProxy<PathType<Type, T, Path>> {
	const path2 = splitPath(path);

	if (isSuperForm(form, options)) {
		return superFieldProxy(form, path, options);
	}

	const proxy = derived(form, ($form) => {
		const data = traversePath($form, path2);
		return data?.value;
	});

	return {
		subscribe(...params: Parameters<typeof proxy.subscribe>) {
			const unsub = proxy.subscribe(...params);
			return () => unsub();
		},
		update(upd: Updater<PathType<Type, T, Path>>) {
			form.update((data) => updateProxyField(data, path2, upd));
		},
		set(value: PathType<Type, T, Path>) {
			form.update((data) => updateProxyField(data, path2, () => value));
		}
	};
}

function localDate(date: Date) {
	return (
		date.getFullYear() +
		'-' +
		String(date.getMonth() + 1).padStart(2, '0') +
		'-' +
		String(date.getDate()).padStart(2, '0')
	);
}

function localTime(date: Date, step: number) {
	return (
		String(date.getHours()).padStart(2, '0') +
		':' +
		String(date.getMinutes()).padStart(2, '0') +
		(step % 60 ? ':' + String(date.getSeconds()).padStart(2, '0') : '')
	);
}

function UTCDate(date: Date) {
	return (
		date.getUTCFullYear() +
		'-' +
		String(date.getUTCMonth() + 1).padStart(2, '0') +
		'-' +
		String(date.getUTCDate()).padStart(2, '0')
	);
}

function UTCTime(date: Date, step: number) {
	return (
		String(date.getUTCHours()).padStart(2, '0') +
		':' +
		String(date.getUTCMinutes()).padStart(2, '0') +
		(step % 60 ? ':' + String(date.getUTCSeconds()).padStart(2, '0') : '')
	);
}

/*
function dateToUTC(date: Date) {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}
*/
