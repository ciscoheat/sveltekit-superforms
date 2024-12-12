/* eslint-disable @typescript-eslint/no-unused-vars */
import { zod } from '$lib/adapters/zod.js';
import * as v from 'valibot';
import { superValidate, fieldProxy, setError, type Infer } from '$lib/index.js';
import type {
	FormPathType,
	FormPathArrays,
	FormPathLeaves,
	FormPathLeavesWithErrors,
	FormPath
} from '$lib/stringPath.js';
import { writable } from 'svelte/store';
import { test } from 'vitest';
import { z } from 'zod';

type Obj = {
	name: string;
	points: number;
	scores: Date[][];
	city: {
		name: string;
	};
	tags: ({ id: number; name: string; parents: number[] } | null)[] | undefined;
	names: string[];
};

type FormData = {
	field1: string[] | null;
	field2: {
		subField1: number[] | null;
		subField2: {
			nestedField: boolean[] | null;
		} | null;
	} | null;
	field3: {
		nestedArray: {
			innerArray: string[] | null;
		}[];
	};
};

type ObjUnion = {
	name: string;
	entity: { type: 'person'; DOB: Date } | { type: 'corporate'; taxId: string };
};

const i = 7 + 3;

type Test = FormPath<Obj>;
type Arrays = FormPathArrays<Obj>;

test('FormPath', () => {
	const t1: Test = 'name';
	const t2: Test = 'city';
	const t3: Test = 'tags';
	const t4: Test = 'city.name';
	const t5: Test = 'tags[3]';
	const t6: Test = 'tags[3].name';
	const t7: Test = 'scores[3][4]';
	const t8: Test = 'names[3]';

	// @ts-expect-error incorrect path
	const t1e: Test = 'city[3]';
	// @ts-expect-error incorrect path
	const t2e: Test = 'city.nope';
	// @ts-expect-error incorrect path
	const t3e: Test = 'tags[4].nope';
	// @ts-expect-error incorrect path
	const t4e: Test = 'nope';
	// @ts-expect-error incorrect path
	const t5e: Test = 'names[2].test';

	const a1: Arrays = 'scores';
	const a2: Arrays = 'scores[3]';
	const a3: Arrays = 'tags';
	const a4: Arrays = 'tags[2].parents';
	const a5: Arrays = 'names';

	// @ts-expect-error incorrect path
	const a1e: Arrays = 'name';
	// @ts-expect-error incorrect path
	const a2e: Arrays = 'points';
	// @ts-expect-error incorrect path
	const a3e: Arrays = 'scores[2][1]';
	// @ts-expect-error incorrect path
	const a4e: Arrays = 'city';
	// @ts-expect-error incorrect path
	const a5e: Arrays = 'tags[1]';
	// @ts-expect-error incorrect path
	const a6e: Arrays = 'names[1]';
});

type TestUnion = FormPath<ObjUnion>;

test('FormPath with Union', () => {
	const t1: TestUnion = 'name';
	const t2: TestUnion = 'entity';
	const t3: TestUnion = 'entity.type';
	const t4: TestUnion = 'entity.DOB';
	const t5: TestUnion = 'entity.taxId';

	// @ts-expect-error incorrect path
	const e1: TestUnion = 'another';

	// @ts-expect-error incorrect path
	const e2: TestUnion = 'entity.nope';
});

function checkPath<T = never>() {
	return function <U extends string = string>(path: U): FormPathType<T, U> {
		return path as FormPathType<T, U>;
	};
}

const checkObj = checkPath<Obj>();
const checkUnion = checkPath<ObjUnion>();

test('FormPathType', () => {
	const a = checkObj(`tags[${i + 3}].name`); // string
	const b = checkObj(`scores[${i + 3}][0]`); // Date

	const t0: FormPathType<Obj, 'name'> = 'string';
	const t1: FormPathType<Obj, 'points'> = 123;
	const t2: FormPathType<Obj, 'city'> = { name: 'London' };
	const t3: FormPathType<Obj, 'tags'> = [{ id: 123, name: 'Test', parents: [] }];
	const t4: FormPathType<Obj, 'tags[0]'> = {
		id: 123,
		name: 'Test',
		parents: [1]
	};
	const t5: FormPathType<Obj, 'tags[0].name'> = 'string';
	const t6: FormPathType<Obj, `tags[5].id`> = 123;

	// @ts-expect-error incorrect path
	const n1: FormPathType<Obj, 'city[2]'> = 'never';
	// @ts-expect-error incorrect path
	const n2: FormPathType<Obj, 'nope incorrect'> = 'never';
});

test('FormPathType with union', () => {
	const a = checkUnion(`name`); // string
	const b = checkUnion(`entity.DOB`); // Date

	const t0: FormPathType<ObjUnion, 'name'> = 'string';
	const t2: FormPathType<ObjUnion, 'entity'> = { type: 'corporate', taxId: '12345' };
	const t3: FormPathType<ObjUnion, 'entity.DOB'> = new Date();
	const t4: FormPathType<ObjUnion, 'entity.type'> = 'person';
	const t5: FormPathType<ObjUnion, 'entity.taxId'> = '12345';

	// @ts-expect-error incorrect type
	const n1: FormPathType<ObjUnion, 'entity'> = 'never';
	// @ts-expect-error incorrect path
	const n2: FormPathType<ObjUnion, 'nope incorrect'> = 'never';
});

test('FormPathLeaves', () => {
	const o = {
		test: [1, 2, 3],
		test2: [[{ date: new Date() }], [{ date: new Date() }, { date: new Date() }]],
		name: 'name',
		other: [{ test: 'a', ok: 123 }, { test: 'b' }],
		obj: {
			ok: new Date('2023-05-29'),
			arr: [1, 2, 3],
			test: '1231231',
			next: [{ level: 1 }, { level: 2 }]
		}
	};

	// obj.ok should exist even though it's an object (Date)
	const p: FormPathLeaves<typeof o> = 'test[3]';

	type ExtraLeaves = FormPathLeavesWithErrors<typeof o>;

	const a1: ExtraLeaves = 'test._errors';
	const a2: ExtraLeaves = 'obj.arr._errors';
	// @ts-expect-error incorrect path
	const a3: ExtraLeaves = 'obj.name._errors';
	// @ts-expect-error incorrect path
	const a4: ExtraLeaves = 'obj._errors';
	// @ts-expect-error incorrect path
	const a5: ExtraLeaves = 'obj.arr[2]._errors';
	const a6: ExtraLeaves = 'obj.arr[2]';
	const a7: ExtraLeaves = 'obj.next._errors';
	const a8: ExtraLeaves = 'obj.next[1].level';
	// @ts-expect-error incorrect path
	const a9: ExtraLeaves = 'obj.next[1]._errors';
	const a10: ExtraLeaves = 'test[4]';
});

test('Objects with sets', () => {
	type SetObj = {
		numbers: {
			set: Set<number>;
		};
	};

	type SetTest = FormPath<SetObj>;

	const a1: SetTest = 'numbers';
	const a2: SetTest = 'numbers.set';
	// @ts-expect-error incorrect path
	const a3: SetTest = 'numbers.set.size';

	type SetLeaves = FormPathLeaves<SetObj>;

	// @ts-expect-error incorrect path
	const b1: SetLeaves = 'numbers';
	const b2: SetLeaves = 'numbers.set';
	// @ts-expect-error incorrect path
	const b3: SetTest = 'numbers.set.size';
});

test('Unions', async () => {
	const createUserSchema = z.object({
		email: z.string(),
		pw: z.string(),
		both: z.string()
	});

	const updateUserSchema = createUserSchema.merge(
		z.object({
			id: z.string(),
			both: z.number(),
			nested: z.object({
				level2: z.string()
			})
		})
	);

	const unionizedSchema = z.union([createUserSchema, updateUserSchema]);

	type UnionSchema = z.infer<typeof unionizedSchema>;
	type UnionLeaves = FormPathLeaves<UnionSchema>;

	const email: UnionLeaves = 'email';
	const pw: UnionLeaves = 'pw';
	const id: UnionLeaves = 'id';
	const both: UnionLeaves = 'both';

	// @ts-expect-error incorrect path
	const nested: UnionLeaves = 'nested';
	const nestedLevel: UnionLeaves = 'nested.level2';

	// @ts-expect-error incorrect path
	const error: UnionLeaves = 'nope';

	const a1: FormPathType<UnionSchema, 'both'> = 123;
	const a2: FormPathType<UnionSchema, 'both'> = '123';
});

test('Nested nullable object with optional array', async () => {
	const schema = z.object({
		tags: z
			.object({ name: z.string().min(1) })
			.nullable()
			.array()
			.optional()
	});

	const person: z.infer<typeof schema> = {
		tags: [{ name: 'tag1' }, { name: 'tag2' }]
	};

	const store = writable<z.infer<typeof schema>>({
		tags: [{ name: 'tag1' }, { name: 'tag2' }]
	});

	const proxy1 = fieldProxy(store, 'tags');
	const proxy2 = fieldProxy(store, 'tags[0]');
	const proxy3 = fieldProxy(store, 'tags[1].name');
});

test('setError paths', async () => {
	const schema = z.object({
		scopeId: z.number().int().min(1),
		name: z.string().nullable(),
		object: z.object({ name: z.string() }).optional(),
		arr: z.string().array().optional(),
		enumber: z.enum(['test', 'testing']).optional()
	});

	test('Adding errors with setError', async () => {
		const output = await superValidate({ scopeId: 3, name: null }, zod(schema));

		setError(output, 'scopeId', 'This should not be displayed.');
		setError(output, 'scopeId', 'This is an error', { overwrite: true });
		// @ts-expect-error Invalid path
		setError(output, 'object', 'Object error');
		// @ts-expect-error Invalid path
		setError(output, 'arr', 'Array error');
		setError(output, 'arr[3]', 'Array item error');
		setError(output, 'enumber', 'This should be ok');
		setError(output, 'enumber', 'Still ok');
		setError(output, 'arr._errors', 'Array-level error');
		setError(output, '', 'Form-level error that should not be displayed.');
		setError(output, 'Form-level error', { overwrite: true });
		setError(output, 'Second form-level error');
	});
});

test('FormPath with type narrowing, simple types', () => {
	type Numbers = FormPath<Obj, number>;
	type Nevers = FormPath<Obj, File>;

	const t1: Numbers = 'points';
	const t2: Numbers = 'tags[2].id';
	const t3: Numbers = 'tags[2].parents[3]';

	// @ts-expect-error incorrect path
	const f1: Numbers = 'name';
	// @ts-expect-error incorrect path
	const f2: Nevers = 'nope';
});

test('FormPath with type narrowing, arrays', () => {
	type NameArrays = FormPath<Obj, string[]>;

	const t1: NameArrays = 'names';

	// @ts-expect-error incorrect path
	const i1: NameArrays = 'tags[2].id';
	// @ts-expect-error incorrect path
	const i2: NameArrays = 'tags';
});

test('FormPath with type narrowing, arrays 2', () => {
	type NameArrays = FormPath<FormData, string[]>;

	const t1: NameArrays = 'field1';
	const t2: NameArrays = 'field3.nestedArray[3].innerArray';

	// @ts-expect-error incorrect path
	const i1: NameArrays = 'field1[2].id';
	// @ts-expect-error incorrect path
	const i2: NameArrays = 'field3.nestedArray[2]';
});

test('FormPath with type narrowing, union', () => {
	type NameArrays = FormPath<Obj, string | number>;

	const ok: NameArrays[] = ['name', 'points', 'tags[3].name', 'names[3]', 'tags[0].parents[5]'];

	// @ts-expect-error incorrect path
	const i1: NameArrays = 'tags';
});

test('FormPath with unknown type', () => {
	const schema = z.object({
		name: z.string(),
		age: z.number(),
		homePlanet: z.unknown()
	});

	type FP = FormPath<z.infer<typeof schema>>;
	type FPL = FormPathLeaves<z.infer<typeof schema>>;
	type FPA = FormPathArrays<z.infer<typeof schema>>;

	const t1: FP = 'homePlanet';
	const t2: FPL = 'homePlanet';
	const t3: FPA = 'homePlanet';
});

test('FormPath with any type', () => {
	const schema = z.object({
		name: z.string(),
		age: z.any()
	});

	type FP = FormPath<z.infer<typeof schema>>;
	type FPL = FormPathLeaves<z.infer<typeof schema>>;
	type FPA = FormPathArrays<z.infer<typeof schema>>;

	const t1: FP = 'age';
	const t11: FP = 'age[3]';
	const t2: FPL = 'age';
	const t21: FPL = 'age[3]';
	const t3: FPA = 'age';

	// @ts-expect-error Invalid path
	const f1: FP = 'nope';
	const f2: FPA = 'age[3]';
});

test('Schemas with built-in objects', () => {
	const schema = v.object({
		id: v.nullish(v.string(), ''),
		name: v.pipe(v.string(), v.minLength(1)),
		date: v.date()
	});

	type FPL = FormPathLeaves<Infer<typeof schema>, Date>;

	const t1: FPL = 'date';
	// @ts-expect-error Invalid type
	const tf: FPL = 'name';
});

test('Schema with nested arrays', () => {
	const reportSchema = z.object({
		reportDate: z.date(),
		images: z.instanceof(File, { message: 'Please upload a file.' }).array()
	});

	const schema = z.object({
		reports: z.array(reportSchema).min(1, 'At least one report must be submitted')
	});

	type FPL = FormPathLeaves<Infer<typeof schema>>;

	const ok: FPL[] = ['reports[3].reportDate', 'reports[3].images[2]'];
	// @ts-expect-error Invalid type
	const no: FPL = 'reports[3]';
});

///////////////////////////////////////////////////

// Recursive schema test
const baseExampleSchema = z.object({
	name: z.string()
});

const exampleSchema = baseExampleSchema.extend({
	children: z.lazy(() => baseExampleSchema.array().optional())
});

type ExampleFormPathLeaves = FormPathLeaves<z.infer<typeof exampleSchema>>;
