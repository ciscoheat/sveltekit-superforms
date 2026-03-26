<script lang="ts">
	/* eslint svelte/no-at-html-tags: "off" */

	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { onMount } from 'svelte';
	import { derived, readable, writable } from 'svelte/store';

	const ENABLE_TESTS_IN_SSR = false;

	export let data;

	const simpleSForm = superForm(data.simpleForm, { taintedMessage: false });
	const complexSForm = superForm(data.complexForm, {
		dataType: 'json',
		taintedMessage: false
	});

	function myCustomFunction() {}
	myCustomFunction.myCustomProperty = 'myCustomProperty';
	myCustomFunction.myCustomSubFunction = () => {};

	class MyCustomClass {}

	class MyCustomError extends Error {
		constructor(message: string) {
			super(message);
			this.name = 'MyError';
		}
	}
	class MyBadCustomError extends Error {
		constructor() {
			super();
		}
	}

	/** @type {{
	 * theme: import('svelte').ComponentProps<SuperDebug>['theme'];
	 * functions: boolean;
	 * promise: boolean;
	 * raw: boolean;
	 * }} */
	const config: {
		theme: import('svelte').ComponentProps<SuperDebug>['theme'];
		functions: boolean;
		promise: boolean;
		raw: boolean;
	} = {
		theme: 'default',
		functions: false,
		promise: false,
		raw: false
	};

	/**
	 * @typedef {{index: number, values: any, value: any, enabled: boolean}} Rotation
	 * @typedef {import('svelte').ComponentProps<SuperDebug> & {label: string}} TestCase
	 * @typedef {TestCase[]} TestCases
	 */

	/** @type {{
	 * primitive: boolean;
	 * nonPrimitive: boolean;
	 * store: boolean;
	 * promise: boolean;
	 * complex: boolean;
	 * edgecase: boolean;
	 * }} */
	const testType: {
		primitive: boolean;
		nonPrimitive: boolean;
		store: boolean;
		promise: boolean;
		complex: boolean;
		edgecase: boolean;
	} = {
		primitive: false,
		nonPrimitive: false,
		complex: false,
		store: false,
		promise: false,
		edgecase: false
	};

	/** @type {TestCases} */
	const primitiveValues = [
		{ label: 'number', data: 13 },
		{ label: 'boolean', data: true },
		{ label: 'string', data: 'Some text' },
		{ label: 'undefined', data: undefined },
		{ label: 'null', data: null },
		{ label: 'symbol', data: Symbol.toStringTag },
		{ label: 'object', data: new Object() }
	];
	// /** @type {typeof primitiveValues[number]}*/
	/** @type {Rotation}*/
	const primitiveRotation = {
		index: 0,
		values: primitiveValues,
		value: primitiveValues[0],
		enabled: false
	};

	/** @type {TestCases} */
	const nonPrimitiveValues = [
		{ label: 'function', data: console.log },
		{ label: 'console', data: console },
		{ label: 'array', data: [1, 2, 3] },
		{ label: 'object', data: { a: 1, b: 2 } },
		{ label: 'class', data: new MyCustomClass() },
		{ label: 'function with properties', data: myCustomFunction },
		{ label: 'error', data: new MyCustomError('This is an error') },
		{ label: 'bad error', data: new MyBadCustomError() },
		{ label: 'native error', data: new Error('random error') },
		{ label: 'date', data: new Date() },
		{ label: 'regexp', data: new RegExp('test') },
		{ label: 'map', data: new Map() },
		{ label: 'set', data: new Set() },
		{ label: 'weakmap', data: new WeakMap() },
		{ label: 'weakset', data: new WeakSet() },
		{ label: 'weakref', data: new WeakRef({}) }
	];
	/** @type {Rotation}*/
	const nonPrimitiveRotation = {
		index: 0,
		values: nonPrimitiveValues,
		value: nonPrimitiveValues[0],
		enabled: false
	};

	/** @type {TestCases} */
	const complexValues = [
		{
			label: 'mix object',
			data: {
				object: {
					inner: [[1, 2], { a: 1, b: 2 }],
					some: true,
					value: undefined
				},
				function: () => {},
				error: new Error('This is an error'),
				date: new Date(),
				regexp: new RegExp('test')
			}
		},
		{ label: 'simple form object', data: simpleSForm }
	];
	/** @type {Rotation}*/
	const complexRotation = {
		index: 0,
		values: complexValues,
		value: complexValues[0],
		enabled: false
	};

	const numberStore = writable(1);
	const timeStore = writable(new Date());
	let changeableStoreCount = 0;
	/** @type {import('svelte/store').Writable<number>}*/
	let changeableStore: import('svelte/store').Writable<number> = writable(changeableStoreCount++);
	function renewChangeableStore() {
		changeableStore = writable(changeableStoreCount++);
	}
	const storeOfPromisesStore = readable(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(set: any, update: any) => {
			let count = 0;
			/** @type {ReturnType<typeof setTimeout> | undefined}*/
			let timeoutId: ReturnType<typeof setTimeout> | undefined;

			set(
				new Promise((resolve) => {
					timeoutId = setTimeout(() => {
						timeoutId = undefined;
						resolve(count++);
					}, 1000);
				})
			);

			const interval = setInterval(() => {
				update(
					() =>
						new Promise((resolve) => {
							timeoutId = setTimeout(() => {
								timeoutId = undefined;
								resolve(count++);
							}, 1000);
						})
				);
			}, 5000);

			return () => {
				if (timeoutId !== undefined) {
					clearTimeout(timeoutId);
				}
				clearInterval(interval);
			};
		}
	);
	const storeReturnedByPromise = writable(0);

	function createPromiseOfStore() {
		return new Promise<typeof storeReturnedByPromise>((resolve) => {
			setTimeout(() => {
				$storeReturnedByPromise++;
				resolve(storeReturnedByPromise);
			}, 1000);
		});
	}

	let showPageStore = false;
	/** @type {TestCases} */
	const storeValues = [
		{ label: 'number store', data: numberStore },
		{ label: 'readable store', data: readable('readable store') },
		{ label: 'time store', data: timeStore },
		{
			label: 'derived store',
			data: derived([numberStore], ([a]) => a * 2, 0)
		},
		{ label: 'store of promises store', data: storeOfPromisesStore },
		{ label: 'simple svelte form store', data: simpleSForm.form },
		{ label: 'complex svelte form store', data: complexSForm.form }
	];
	/** @type {Rotation}*/
	const storeRotation = {
		index: 0,
		values: storeValues,
		value: storeValues[0],
		enabled: false
	};

	/** @type {Promise<import('svelte/store').Readable<unknown>>} */
	let promiseOfStore: Promise<import('svelte/store').Readable<unknown>>;

	/** @type {TestCases} */
	const edgecaseValues = [
		{ label: 'null', data: null },
		{ label: 'undefined', data: undefined },
		{ label: 'NaN', data: NaN },
		{ label: 'Infinity', data: Infinity },
		{ label: '-Infinity', data: -Infinity },
		{ label: '0', data: 0 },
		{ label: '-0', data: -0 },
		{ label: 'empty string', data: '' },
		{ label: 'long string', data: 'a'.repeat(1000) },
		{ label: 'long string in object', data: { a: 'a'.repeat(1000) } },
		{ label: 'long string in array', data: ['a'.repeat(1000)] },
		{ label: 'empty array', data: [] },
		{ label: 'empty object', data: {} },
		{ label: 'empty anonymous function', data: function () {} },
		{ label: 'empty anonymous arrow function', data: () => {} },
		{ label: 'empty anonymous async arrow function', data: async () => {} },
		{ label: 'empty anonymous class', data: class {} },
		{ label: 'empty anonymous generator', data: (function* () {})() },
		{
			label: 'empty anonymous async generator',
			data: (async function* () {})()
		},
		{ label: 'empty anonymous async function', data: async () => {} },
		{ label: 'empty async class', data: class {} }
	];

	const edgecaseRotation = {
		index: 0,
		values: edgecaseValues,
		value: edgecaseValues[0],
		enabled: false
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function nextValue(rotation: any) {
		if (rotation.index >= rotation.values.length - 1) {
			rotation.index = 0;
		} else {
			rotation.index++;
		}
		return rotation.values[rotation.index];
	}

	function updateRotationValues() {
		if (testType.primitive && primitiveRotation.enabled) {
			primitiveRotation.value = nextValue(primitiveRotation);
		}
		if (testType.nonPrimitive && nonPrimitiveRotation.enabled) {
			nonPrimitiveRotation.value = nextValue(nonPrimitiveRotation);
		}
		if (testType.complex && complexRotation.enabled) {
			complexRotation.value = nextValue(complexRotation);
		}
		if (testType.store && storeRotation.enabled) {
			storeRotation.value = nextValue(storeRotation);
		}
		// if (testType.promise && promiseRotation.enabled) {
		//   promiseRotation.value = nextValue(promiseRotation);
		// }
		if (testType.edgecase && edgecaseRotation.enabled) {
			edgecaseRotation.value = nextValue(edgecaseRotation);
		}
	}

	// /** @type {ReturnType<setInterval> | undefined} */
	//   let promiseRotationId;
	// $: if (testType.promise) {
	//   createPromises();
	//   if (promiseRotationId !== undefined) {
	//     clearInterval(promiseRotationId);
	//   }
	//   promiseRotationId = setInterval(() => {
	//     promiseRotation.value = nextValue(promiseRotation);
	//   }, 2000);
	// }

	let enableTests = ENABLE_TESTS_IN_SSR;
	onMount(() => {
		if (!enableTests) {
			enableTests = true;
		}

		const rotationIntervalId = setInterval(() => {
			updateRotationValues();
		}, 5000);
		const timeStoreIntervalId = setInterval(() => {
			$timeStore = new Date();
		}, 1000);
		const autoRenewablePromiseOfStoreId = setInterval(() => {
			promiseOfStore = createPromiseOfStore();
		}, 10000);

		return () => {
			clearInterval(rotationIntervalId);
			clearInterval(timeStoreIntervalId);
			clearInterval(autoRenewablePromiseOfStoreId);
			// if (promiseRotationId !== undefined) {
			//   clearInterval(promiseRotationId);
			// }
		};
	});
</script>

<main class="space-y-4">
	<header style="border-bottom: 1px solid gray;">
		<h2>Super Debug extensive usage cases examples</h2>
	</header>

	<section
		class="sticky z-10"
		style="background-color: #f9f9f9; border-bottom: 1px solid gray; padding-inline:1rem; padding-top: 1rem;"
	>
		<h4>Super Debug configuration</h4>
		<div class="flex gap-8">
			<div class="flex config-check">
				<label for="functions">functions</label>
				<input id="config.functions" type="checkbox" bind:checked={config.functions} />
			</div>
			<div class="flex config-check">
				<label for="config.raw">raw</label>
				<input id="config.raw" type="checkbox" bind:checked={config.raw} />
			</div>
			<div class="flex config-check">
				<label for="config.promise">promise (deprecated)</label>
				<input id="config.promise" type="checkbox" bind:checked={config.promise} />
			</div>
			<div class="flex gap-4 items-center">
				<label for="config.theme"> Theme </label>
				<select id="config.theme" bind:value={config.theme}>
					<option value="default">Default</option>
					<option value="vscode">VSCode</option>
				</select>
			</div>
		</div>
	</section>

	{#if enableTests}
		<section>
			<div class="flex gap-4">
				<h4>Primitive values</h4>
				<button
					style="height:max-content; margin-top:3rem;"
					on:click={() => (testType.primitive = !testType.primitive)}
				>
					{testType.primitive ? 'Disable' : 'Enable'}
				</button>
				{#if testType.primitive}
					<button
						style="height:max-content; margin-top:3rem;"
						on:click={() => (primitiveRotation.enabled = !primitiveRotation.enabled)}
					>
						{primitiveRotation.enabled ? 'Disable value rotation' : 'Enable value rotation'}
					</button>
				{/if}
			</div>
			{#if testType.primitive}
				{#key config.functions}
					<ul class="flex flex-col gap-4">
						{#each primitiveValues as value}
							<li>
								<SuperDebug {...value} {...config} />
							</li>
						{/each}
						{#if primitiveRotation.enabled}
							<li>
								<SuperDebug data={primitiveRotation.value} label="primitive values" {...config} />
							</li>
						{/if}
					</ul>
				{/key}
			{/if}
		</section>

		<section>
			<div class="flex gap-4">
				<h4>Non primitive values</h4>
				<button
					style="height:max-content; margin-top:3rem;"
					on:click={() => (testType.nonPrimitive = !testType.nonPrimitive)}
				>
					{testType.primitive ? 'Disable' : 'Enable'}
				</button>
				{#if testType.nonPrimitive}
					<button
						style="height:max-content; margin-top:3rem;"
						on:click={() => (nonPrimitiveRotation.enabled = !nonPrimitiveRotation.enabled)}
					>
						{nonPrimitiveRotation.enabled ? 'Disable value rotation' : 'Enable value rotation'}
					</button>
				{/if}
			</div>
			{#if testType.nonPrimitive}
				{#key config.functions}
					<ul class="flex flex-col gap-4">
						{#each nonPrimitiveValues as value}
							<li>
								<SuperDebug {...value} {...config} />
							</li>
						{/each}
						{#if nonPrimitiveRotation.enabled}
							<li>
								<SuperDebug
									data={nonPrimitiveRotation.value}
									label="non primitive values"
									{...config}
								/>
							</li>
						{/if}
					</ul>
				{/key}
			{/if}
		</section>

		<section>
			<div class="flex gap-4">
				<h4>Complex values</h4>
				<button
					style="height:max-content; margin-top:3rem;"
					on:click={() => (testType.complex = !testType.complex)}
				>
					{testType.primitive ? 'Disable' : 'Enable'}
				</button>
			</div>
			{#if testType.complex}
				{#key config.functions}
					<ul class="flex flex-col gap-4">
						{#each complexValues as value}
							<li>
								<SuperDebug {...value} {...config} />
							</li>
						{/each}
						<!-- <li>
              <SuperDebug {data} {...config} />
            </li> -->
					</ul>
				{/key}
			{/if}
		</section>

		<section>
			<div class="flex gap-4">
				<h4>Store values</h4>
				<button
					style="height:max-content; margin-top:3rem;"
					on:click={() => (testType.store = !testType.store)}
				>
					{testType.primitive ? 'Disable' : 'Enable'}
				</button>
				{#if testType.store}
					<button
						style="height:max-content; margin-top:3rem;"
						on:click={() => (storeRotation.enabled = !storeRotation.enabled)}
					>
						{storeRotation.enabled ? 'Disable value rotation' : 'Enable value rotation'}
					</button>
				{/if}
			</div>
			{#if testType.store}
				{#key config.functions}
					<ul class="flex flex-col gap-4">
						{#each storeValues as value}
							<li>
								<SuperDebug {...value} {...config} />
							</li>
						{/each}
						<li>
							<button on:click={() => $numberStore++}> Increment </button>
							<SuperDebug data={numberStore} label="number store" {...config} />
						</li>
						<li>
							<button on:click={renewChangeableStore}>Change store</button>
							<SuperDebug data={changeableStore} label="changeable store" {...config} />
						</li>
						<li>
							<button on:click={() => (showPageStore = !showPageStore)}
								>{showPageStore ? 'Hide page store' : 'Show page store'}</button
							>
							{#if showPageStore}
								<SuperDebug data={page} label="page store literally" {...config} />
							{/if}
						</li>
						{#if storeRotation.enabled}
							<li>
								<SuperDebug data={storeRotation.value} label="store values" {...config} />
							</li>
						{/if}
					</ul>
				{/key}
			{/if}
		</section>

		<section>
			<div class="flex gap-4">
				<h4>Promise values</h4>
				<button
					style="height:max-content; margin-top:3rem;"
					on:click={() => (testType.promise = !testType.promise)}
				>
					{testType.promise ? 'Disable' : 'Enable'}
				</button>
			</div>
			{#if testType.promise}
				{#key config.functions}
					<ul class="flex flex-col gap-4">
						{#each [{ label: 'promise of store', data: createPromiseOfStore() }, { label: 'promise that resolves', data: new Promise( (resolve) => {
										setTimeout(() => {
											resolve('resolved');
										}, 3000);
									} ) }, { label: 'promise that rejects', data: new Promise((resolve, reject) => {
									setTimeout(() => {
										reject('rejected');
									}, 3000);
								}) }, { label: 'fetch', data: fetch('randomthatewewenevercametrueurl.io/beweweaks').then( (res) => res.text() ) }] as value}
							<li>
								<SuperDebug {...value} {...config} />
							</li>
						{/each}
						<li>
							<SuperDebug
								data={promiseOfStore}
								label="promise of stores that renews itself"
								{...config}
							/>
						</li>
					</ul>
				{/key}
			{/if}
		</section>

		<section>
			<div class="flex gap-4">
				<h4>Edge case values</h4>
				<button
					style="height:max-content; margin-top:3rem;"
					on:click={() => (testType.edgecase = !testType.edgecase)}
				>
					{testType.edgecase ? 'Disable' : 'Enable'}
				</button>

				{#if testType.edgecase}
					<button
						style="height:max-content; margin-top:3rem;"
						on:click={() => (edgecaseRotation.enabled = !edgecaseRotation.enabled)}
					>
						{edgecaseRotation.enabled ? 'Disable value rotation' : 'Enable value rotation'}
					</button>
				{/if}
			</div>
			{#if testType.edgecase}
				{#key config.functions}
					<ul class="flex flex-col gap-4">
						{#each edgecaseValues as value}
							<li>
								<SuperDebug {...value} {...config} />
							</li>
						{/each}
						<li>
							<SuperDebug
								label="long string in promise"
								data={new Promise((resolve) => {
									setTimeout(() => {
										resolve('a'.repeat(1000));
									}, 5000);
								})}
								{...config}
							/>
						</li>
						<li>
							<SuperDebug
								label="empty promise"
								data={new Promise((resolve) => {
									setTimeout(() => {
										resolve(void 0);
									}, 5000);
								})}
								{...config}
							/>
						</li>
						{#if edgecaseRotation.enabled}
							<li>
								<SuperDebug data={edgecaseRotation.value} {...config} />
							</li>
						{/if}
					</ul>
				{/key}
			{/if}
		</section>
	{/if}
</main>

<style>
	:global(.space-y-4 > * + *) {
		margin-top: 1rem;
	}
	.flex {
		display: flex;
	}
	.flex-col {
		flex-direction: column;
	}
	.gap-4 {
		gap: 1rem;
	}
	.gap-8 {
		gap: 2rem;
	}
	.sticky {
		position: sticky;
		top: 0;
	}
	.z-10 {
		z-index: 10;
	}
	.items-center {
		align-items: center;
	}
	.config-check {
		align-items: center;
		gap: 0.5rem;
	}
	.config-check > * {
		margin: 0px;
	}
	.config-check input {
		display: block;
		width: 1em;
		height: 1em;
	}
	ul {
		list-style: none;
		padding: 0;
		padding-inline: 0.5rem;
	}
</style>
