<script lang="ts">
	import { registerSchema } from './schema.js';

	import SuperForm from './Form.svelte';
	import TextField from './TextField.svelte';
	import type { PageData } from './$types.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	let visible = true;
</script>

<h3>Multiple componentized Forms</h3>
<hr />

<h4>Register Form</h4>

<button on:click={() => (visible = !visible)}>Toggle</button>

{#if visible}
	<!-- SuperForm with dataType 'form' -->
	<SuperForm
		action="?/register"
		schema={zod(registerSchema)}
		data={data.regForm}
		invalidateAll={false}
		let:form
		let:message
	>
		{#if message}
			<div
				class="status"
				class:error={message.status >= 400}
				class:success={!message.status || message.status < 300}
			>
				{message.text}
			</div>
		{/if}

		<TextField type="text" {form} field="name" label="Name" />
		<TextField type="text" {form} field="email" label="E-Mail" />
		<p>
			<button type="submit">submit</button>
		</p>
	</SuperForm>
{/if}

<style>
	.status {
		color: white;
		padding: 6px;
		padding-left: 8px;
		border-radius: 2px;
		font-weight: 500;
		margin-block: 0.75em;
	}

	.status.success {
		background-color: seagreen;
	}

	.status.error {
		background-color: #ff2a02;
	}

	hr {
		margin: 2rem 0;
	}
</style>
