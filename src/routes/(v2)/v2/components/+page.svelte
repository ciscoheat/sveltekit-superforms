<script lang="ts">
	import Form from './Form.svelte';
	import TextField from './TextField.svelte';

	export let data;
</script>

<h3>Multiple componentized Forms</h3>
<hr />

<h4>Register Form</h4>

<!-- Form with dataType 'form' -->
<Form action="?/register" data={data.regForm} invalidateAll={false} let:form let:message>
	{#if message}
		<div
			class="status"
			class:error={message.status >= 400}
			class:success={!message.status || message.status < 300}
		>
			{message.text}
		</div>
	{/if}

	<TextField type="text" {form} field="name" label="Name"></TextField>
	<TextField type="text" {form} field="email" label="E-Mail"></TextField>
	<p>
		<button type="submit">submit</button>
	</p>
</Form>

<hr />

<h4>Another Form</h4>

<!-- Form with dataType 'json' -->
<Form
	action="?/edit"
	data={data?.profileForm}
	dataType="json"
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
	<TextField type="text" {form} field="name" label="Name"></TextField>
	<TextField type="number" {form} field="age" label="Age"></TextField>
	<p>
		<button type="submit">submit</button>
	</p>
</Form>

<hr />
<p>
	<a target="_blank" href="https://Forms.rocks/components"
		>Documentation about componentization here</a
	>
</p>

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
