<script lang="ts">
	import { registerSchema } from './schema.js';

	import Form from './Form.svelte';
	import TextField from './TextField.svelte';
	import { zod } from '$lib/adapters/zod.js';
	import type { Infer, SuperForm } from '$lib/index.js';

	let visible = $state(true);
	let { data } = $props();
</script>

<h3>Multiple componentized Forms</h3>
<hr />

<h4>Register Form</h4>

<button onclick={() => (visible = !visible)}>Toggle</button>

{#snippet msg(message: { status: number; text: string })}
	{#if message}
		<div
			class="status"
			class:error={message.status >= 400}
			class:success={!message.status || message.status < 300}
		>
			{message.text}
		</div>
	{/if}
{/snippet}

{#snippet fields(form: SuperForm<Infer<typeof registerSchema>>)}
	<TextField type="text" {form} field="name" label="Name" />
	<TextField type="text" {form} field="email" label="E-Mail" />
	<p>
		<button type="submit">submit</button>
	</p>
{/snippet}

{#if visible}
	<!-- SuperForm with dataType 'form' -->
	<Form
		action="?/register"
		schema={zod(registerSchema)}
		data={data.regForm}
		invalidateAll={false}
		{msg}
		{fields}
	></Form>
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
