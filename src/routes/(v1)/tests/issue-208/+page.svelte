<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	//import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { page } from '$app/stores';
	import { UserType, NumberType } from './UserType.js';

	export let data: PageData;

	const { form, message, enhance } = superForm(data.form);
</script>

<h3>Native string enums</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Type<br />
		<select bind:value={$form.type} name="type">
			<option value={UserType.WORKER}>{UserType.WORKER}</option>
			<option value={UserType.MANAGER}>{UserType.MANAGER}</option>
		</select>
	</label>

	<label>
		Number<br />
		<select bind:value={$form.number} name="number">
			<option value={NumberType.WORKER}>{NumberType.WORKER}</option>
			<option value={NumberType.MANAGER}>{NumberType.MANAGER}</option>
		</select>
	</label>

	<button>Submit</button>
</form>

<style>
	.status {
		color: white;
		padding: 4px;
		padding-left: 8px;
		border-radius: 2px;
		font-weight: 500;
	}

	.status.success {
		background-color: seagreen;
	}

	.status.error {
		background-color: #ff2a02;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
