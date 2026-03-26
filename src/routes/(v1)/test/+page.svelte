<script lang="ts">
	import { dateProxy, intProxy, booleanProxy, superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/index.js';
	import { tick } from 'svelte';
	import type { PageData } from './$types.js';
	import * as flashModule from 'sveltekit-flash-message/client';

	export let data: PageData;

	//console.log('superValidate', data.form);

	let runTests = true;
	let testErrors: string[] | undefined = undefined;

	async function runFormTests() {
		if (!runTests) {
			testErrors = undefined;
			return;
		}
		await tick();

		const tests: string[] = [];
		function assert(expr: boolean, failMsg: string) {
			if (!expr) tests.push(failMsg);
		}
		function assertInnerText(selector: string, text: string, failMsg?: string) {
			if (!failMsg) failMsg = `Text not found in ${selector}: ${text}`;
			assert(q(selector)?.innerText == text, failMsg);
		}
		function q(selector: string) {
			return document.querySelector<HTMLElement>(selector);
		}

		if (q('[data-message]')?.innerText == 'Post successful!') {
			testErrors = [];
			return;
		}

		/////////////////////////////////////////////////////////////////

		assertInnerText(
			'[data-all-errors]',
			'email: [Email error]\nproxyNumber: Number must be greater than or equal to 10\ncoercedDate: Invalid date'
		);

		const fieldErrors = Array.from(
			document.querySelectorAll<HTMLElement>('span[data-invalid]')
		).map((el) => el.innerText);

		assert(
			fieldErrors.join(', ') ==
				'[Email error], Number must be greater than or equal to 10, Invalid date',
			'Incorrect validation errors: ' + fieldErrors.join(', ')
		);

		const inputErrors = Array.from(
			document.querySelectorAll<HTMLInputElement>('input[data-invalid]')
		).map((el) => el.name);

		assert(inputErrors.join(', ') == 'email, proxyNumber, coercedDate', 'Incorrect field errors.');

		testErrors = tests;
	}

	const theForm = superForm(data.form, {
		taintedMessage: null,
		onError({ result }) {
			theForm.message.set(result.error.message);
		},
		onUpdated: runFormTests,
		flashMessage: {
			module: flashModule
		}
	});

	const { form, errors, message, delayed, timeout, enhance, allErrors, tainted, constraints } =
		theForm;

	// Testing default values
	const {
		form: modalForm,
		allErrors: modalAllErrors,
		message: modalMessage,
		enhance: modalEnhance
	} = superForm(
		{ email: '', password: '' },
		{
			resetForm: true,
			taintedMessage: null,
			dataType: 'json',
			invalidateAll: false,
			flashMessage: {
				module: flashModule
			},
			warnings: {}
		}
	);

	const proxyBool = booleanProxy(theForm, 'bool', { trueStringValue: '1' });
	const proxyNumber = intProxy(theForm, 'proxyNumber', {
		empty: 'zero',
		initiallyEmptyIfZero: true
	});
	const proxyDate = dateProxy(form, 'date', {
		format: 'datetime-local'
	});
	const coercedDate = dateProxy(form, 'coercedDate', {
		format: 'date-local'
	});

	const fields = ['nullableString', 'nullishString', 'optionalString', 'trimmedString'] as const;
</script>

<SuperDebug data={{ ...$form, $tainted, $modalForm }} />

<a href="/">&lt; Back to start</a>

<form method="POST" action="/test/login" use:modalEnhance>
	<div data-errors>
		{#if $modalMessage}{$modalMessage}{/if}
		{#each $modalAllErrors as error}• {error.messages}<br />{/each}
	</div>
	<div>Email</div>
	<input
		on:input={() => {
			$form.proxyString = '456';
		}}
		bind:value={$modalForm.email}
	/>
	<div>Password</div>
	<input bind:value={$modalForm.password} />
	<div class="submit-button">
		<button data-submit>Login</button>
		<input type="checkbox" name="redirect" />
		<span style="font-size:75%">Redirect on success</span>
	</div>
</form>

{#if runTests}
	{#if testErrors === undefined}
		<div style="color:gray">
			<h2>Tests not run yet</h2>
		</div>
	{:else if testErrors.length}
		<div style="color: red">
			<h2>Tests failed</h2>
			<ul>
				{#each testErrors as error}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div style="color: green">
			<h2>Tests OK</h2>
		</div>
	{/if}
{/if}

<h1>sveltekit-superforms</h1>
<input type="checkbox" bind:checked={runTests} /> Run tests<br />

{#if $message}
	<h3 data-message>{$message}</h3>
{/if}

{#if $allErrors.length}
	<ul data-all-errors>
		{#each $allErrors as error}
			{#each error.messages as message}
				<li>{error.path}: {message}</li>
			{/each}
		{/each}
	</ul>
{/if}

<form method="POST" action="?/form" use:enhance>
	<input type="hidden" name="nativeEnumInt" value="1" />
	<input type="hidden" name="nativeEnumString2" value="Banana" />

	<input type="hidden" name="proxyString" bind:value={$form.proxyString} />

	<input type="hidden" name="numberArray" value="123" />
	<input type="hidden" name="numberArray" value="456" />
	<input type="hidden" name="numberArray" value="789" />

	<div>
		<button style="margin-bottom: 1rem;">Submit</button>
		<input type="checkbox" name="redirect" /> Redirect on post
		{#if $timeout}
			<span class="timeout">Timeout!</span>
		{:else if $delayed}
			<span class="delayed">Delayed...</span>
		{/if}
	</div>

	<label for="string">string</label>
	<input type="text" name="string" bind:value={$form.string} {...$constraints.string} />
	{#if $errors.string}<span data-invalid>{$errors.string}</span>{/if}

	<label for="email">email</label>
	<input type="text" data-invalid={$errors.email} name="email" bind:value={$form.email} />
	{#if $errors.email}<span data-invalid>{$errors.email}</span>{/if}
	{#if $tainted?.email}<span data-tainted>Field is tainted</span>{/if}

	<div>
		<input type="checkbox" name="agree" bind:checked={$form.agree} />
		Agree to terms
		{#if $errors.agree}<br /><span data-invalid>You must agree to the terms.</span>{/if}
	</div>

	<label for="bool">bool</label>
	<select name="bool" bind:value={$proxyBool}>
		<option value="1">true</option>
		<option value="">false</option>
	</select>
	{#if $errors.bool}<span data-invalid>{$errors.bool}</span>{/if}

	<label for="number">number</label>
	<input type="number" name="number" bind:value={$form.number} />
	delay ms
	{#if $errors.number}<span data-invalid>{$errors.number}</span>{/if}

	<label for="proxyNumber">proxyNumber</label>
	<!-- Must be text -->
	<input
		type="text"
		name="proxyNumber"
		placeholder="A number"
		data-invalid={$errors.proxyNumber}
		bind:value={$proxyNumber}
	/>
	{#if $errors.proxyNumber}<span data-invalid>{$errors.proxyNumber}</span>{/if}

	<label for="date">proxyDate</label>
	<input type="datetime-local" data-invalid={$errors.date} name="date" bind:value={$proxyDate} />
	{#if $errors.date}<span data-invalid>{$errors.date}</span>{/if}

	<label for="date">coercedDate</label>
	<input
		type="date"
		name="coercedDate"
		data-invalid={$errors.coercedDate}
		value={$coercedDate}
		on:blur={(e) => ($coercedDate = e.currentTarget.value)}
		on:input={(e) => {
			const value = e.currentTarget.value;
			if (/^\d{4}-\d\d-\d\d$/.test(value)) $coercedDate = value;
		}}
	/>
	<p>{$coercedDate}</p>
	{#if $errors.coercedDate}<span data-invalid>{$errors.coercedDate}</span>{/if}

	{#each fields as key}
		<label for={key}>{key}</label>
		<input type="text" name={key} bind:value={$form[key]} />
		{#if $errors[key]}<span data-invalid>{$errors[key]}</span>{/if}
	{/each}

	<label for="nativeEnumString">enum color</label>
	<input name="nativeEnumString" value="GREEN" />

	<div>
		<button>Submit</button>
		{#if $timeout}
			<span class="timeout">Timeout!</span>
		{:else if $delayed}
			<span class="delayed">Delayed...</span>
		{/if}
	</div>
</form>

<style lang="scss">
	[data-invalid] {
		color: red;
	}

	form[action='/test/login'] {
		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap: 10px;
		align-items: baseline;
		width: min-content;
		padding: 10px;
		background-color: gainsboro;
		border-radius: 4px;

		[data-errors] {
			font-weight: bold;
			color: red;
			grid-column: 1 / -1;
		}

		.submit-button {
			grid-column-start: 2;
			justify-self: left;
		}
	}
</style>
