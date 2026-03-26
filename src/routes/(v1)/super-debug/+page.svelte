<script lang="ts">
	/* eslint svelte/no-at-html-tags: "off" */

	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { onMount } from 'svelte';
	import { readable } from 'svelte/store';

	export let data;

	const bigSForm = superForm(data.bigForm, { taintedMessage: null });
	const bigForm = bigSForm.form;
	const { form } = superForm(data.form, { taintedMessage: null });

	const name = 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.';
	$bigForm.full_name = name;
	$form.full_name = name;

	let someUnknownData: unknown;
	const emptyObject = {};

	const promiseNeverCameTrue = new Promise((_, reject) => {
		setTimeout(() => reject(new Error('Broken promise')), 1000);
	});

	/** @type {() => Promise<unknown>} */
	let promiseProduct: () => Promise<unknown> = async (): Promise<unknown> => ({});

	onMount(async () => {
		// Put fetch inside onMount so svelte would stop gawking at us.
		promiseProduct = async () => {
			const response = await fetch('https://dummyjson.com/products/1');
			const body = await response.json();
			return body;
		};
	});

	const promiseStore = readable(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(set: any, update: any) => {
			let count = 0;
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
</script>

<main class="space-y-4">
	<section>
		<h3>SuperDebug demonstrations</h3>
		<p
			style:margin-top="1em"
			style:padding-left="4px"
			style:background-color="#1f1f1f0f"
			style:opacity="0.8"
		>
			<strong>Note:</strong> looking for the capabilities of SuperDebug? Check
			<b> <a href="super-debug/extensive-usage-cases">All data cases examples</a></b>.
		</p>
		<b>Change name: <input bind:value={$form.full_name} /></b>
	</section>
	<section>
		<h4>SuperDebug without label</h4>
		<p>
			This is SuperDebug's classic layout. Make sure we don't have weird spaces when there is no
			label.
		</p>
		<SuperDebug data={$form} />
	</section>
	<section>
		<h4>SuperDebug with label</h4>
		<p>Label is useful when using multiple instance of SuperDebug.</p>
		<SuperDebug label="Sample User" data={$form} collapsible />
	</section>
	<section>
		<h4>SuperDebug, initially collapsed</h4>
		<p>
			Use the <code>collapsible</code> and <code>collapsed</code> props for this.
		</p>
		<SuperDebug label="Sample User" data={$form} collapsible collapsed />
	</section>
	<section>
		<h4>SuperDebug, initially collapsed, no label</h4>
		<p>It should not hide the status if no label.</p>
		<SuperDebug data={$form} collapsible collapsed />
	</section>
	<section>
		<h4>SuperDebug without status</h4>
		<SuperDebug label="Sample User" status={false} data={$form} />
	</section>
	<section>
		<h4>SuperDebug without label and status</h4>
		<SuperDebug data={$form} status={false} />
	</section>
	<section>
		<h4>SuperDebug with label and undefined data</h4>
		<p>
			Do not hide output when the result is undefined. In JavaScript it is a crucial piece of
			information.
		</p>
		<SuperDebug label="Data not ready" data={someUnknownData} />
	</section>
	<section>
		<h4>SuperDebug without label and undefined data</h4>
		<p>
			There are cases when the data is not readily available on page load. Make sure SuperDebug
			layout does not break on itself.
		</p>
		<SuperDebug data={someUnknownData} />
	</section>
	<section>
		<h4>SuperDebug with empty object</h4>
		<SuperDebug data={emptyObject} />
	</section>
	<section class="space-y-4">
		<h4>SuperDebug promise support</h4>
		<p>To see this in action, slightly scroll above near Dummyjson product and hit refresh.</p>
		<pre><code
				>{@html `let promiseProduct = async () => {
    const response = await fetch('https://dummyjson.com/products/1')
    const body = await response.json()
    return body
}`}
{@html `&lt;SuperDebug label="Dummyjson product" data={promiseProduct()} /&gt;`}</code
			></pre>
		<SuperDebug label="Dummyjson product" promise={true} data={promiseProduct()} />
		<pre><code
				>{@html `let promiseNeverCameTrue = new Promise((resolve, reject) => {
  setTimeout(() => resolve({}), 5000)
})`}
{@html '&lt;SuperDebug data={promiseNeverCameTrue} /&gt;'}</code
			></pre>
		<h4>SuperDebug rejected promises</h4>
		<p>To see this in action, hit refresh. The promise is rejected with</p>
		<pre><code>new Error("Broken promise")</code></pre>

		<SuperDebug data={promiseNeverCameTrue} />
	</section>
	<section>
		<h4>SuperDebug displaying $page data</h4>
		<p>Svelte's <code>$page</code> data in all its glory.</p>
		<!-- eslint-disable-next-line svelte/valid-compile -->
		<SuperDebug label="$page data" data={$page} collapsible />
	</section>

	<section>
		<h4>SuperDebug loves stores</h4>
		<p>Why not to pass a store directly.</p>
		<label for="form_full_name">
			<span>Full Name</span>
			<input id="form_full_name" bind:value={$bigForm.full_name} />
		</label>
		<SuperDebug data={bigSForm.form} label="Auto detected store" />
		<p style:margin-top="1em">
			Or maybe you want to see the store literal value instead of the store itself. SuperDebug has
			you covered.
		</p>
		<p>
			For this use the <code>raw</code> and <code>functions</code> props.
		</p>
		<SuperDebug data={bigSForm.errors} label="Literal Store value" raw functions />
	</section>

	<section>
		<h4>SuperDebug loves stores x2</h4>
		<p>Does superform handle stores of promises?, Yep its cool.</p>
		<SuperDebug data={promiseStore} label="Store of promises" />
	</section>

	<section>
		<h4>SuperDebug custom styling 😎</h4>
		<p>Bugs are easier to solve if they look familiar.</p>
		<SuperDebug data={$form} label="VS Code like theme" theme="vscode" />
		<p style:margin-top="1em" style:padding-left="4px" style:background-color="#1f1f1f0f">
			<strong>Note:</strong> styling the component produces the side-effect described at the
			<a href="https://svelte.dev/docs/component-directives#style-props" target="_blank"
				>Svelte docs</a
			>.
		</p>
	</section>

	<section>
		<h4>SuperDebug and long strings</h4>
		<SuperDebug
			data={{
				longString:
					'The long name without any apparent end, goes on like a wind, however that is supposed to be. Very long. And winded. Long-winded so to speak.'
			}}
			label="Truncated string"
		/>
	</section>
</main>

<style>
	:global(.space-y-4 > * + *) {
		margin-top: 1rem;
	}

	:global(.hidden) {
		display: none;
	}
</style>
