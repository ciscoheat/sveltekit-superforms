<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, message, formId } = superForm(data.first);

	const {
		form: secondform,
		errors: seconderrors,
		constraints: secondconstraints,
		message: secondmessage,
		formId: secondFormId
	} = superForm(data.second, { id: 'second' });
</script>

<a href="/">&lt; Back to start</a>

<SuperDebug data={{ $formId, $form, $secondFormId, $secondform }} />

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<h4 class:error={$page.status >= 400} class="first message">
		{$message.message}
	</h4>
{/if}
{#if $secondmessage}
	<h4 class:error={$page.status >= 400} class="second message">
		{$secondmessage.message}
	</h4>
{/if}

<h1>Multiple forms</h1>

<div class="forms">
	<form method="POST">
		<input type="hidden" name="__superform_id" value={$formId} />
		<input type="hidden" name="id" bind:value={$form.id} />

		<label>
			Name<br /><input name="name" data-invalid={$errors.name} bind:value={$form.name} />
			{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
		</label>

		<label>
			Email<br /><input name="email" data-invalid={$errors.email} bind:value={$form.email} />
			{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
		</label>

		<div>
			<button>Submit</button>
		</div>
	</form>
	<form method="POST">
		<input type="hidden" name="__superform_id" value={$secondFormId} />
		<input type="hidden" name="id" bind:value={$form.id} />

		<label>
			Name<br /><input
				name="name"
				data-invalid={$seconderrors.name}
				bind:value={$secondform.name}
				{...$secondconstraints.name}
			/>
			{#if $seconderrors.name}<span class="invalid">{$seconderrors.name}</span>{/if}
		</label>

		<label>
			Email<br /><input
				name="email"
				data-invalid={$seconderrors.email}
				bind:value={$secondform.email}
				{...$secondconstraints.email}
			/>
			{#if $seconderrors.email}<span class="invalid">{$seconderrors.email}</span>{/if}
		</label>

		<div>
			<button>Submit</button>
		</div>
	</form>
</div>

<style lang="scss">
	.forms {
		display: flex;
		justify-content: space-between;
		gap: 50px;
	}

	.invalid {
		color: red;
	}

	.message {
		color: white;
		padding: 10px;
		background-color: rgb(46, 168, 68);

		&.error {
			background-color: rgb(168, 60, 46);
		}
	}
</style>
