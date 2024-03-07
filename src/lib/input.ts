import type { BuiltInObjects } from './utils.js';

export type DeepPartial<T> = {
	[K in keyof T]?: NonNullable<T[K]> extends BuiltInObjects
		? T[K]
		: NonNullable<T[K]> extends (infer U)[]
			? NonNullable<U> extends BuiltInObjects
				? U[]
				: DeepPartial<U>[]
			: NonNullable<T[K]> extends object
				? DeepPartial<T[K]>
				: T[K];
};

/////////////////////////////////////////////////////////////////////

type ExtraFields<In, Out> = {
	[K in keyof In as Exclude<K, keyof In & keyof Out>]: In[K];
};

type RequiredFields<In, Out> = {
	[K in keyof In & keyof Out as Out[K] extends In[K] ? never : K]: In[K];
};

type OptionalFields<In, Out> = Partial<{
	[K in keyof In & keyof Out as Out[K] extends In[K] ? K : never]: In[K];
}>;

export type InputFields<
	In extends Record<string, unknown>,
	Out extends Record<string, unknown>
> = RequiredFields<In, Out> & OptionalFields<In, Out> & ExtraFields<In, Out>;
