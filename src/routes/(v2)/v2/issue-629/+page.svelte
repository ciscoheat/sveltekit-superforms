<script lang="ts">
	import { untrack } from 'svelte';
	import { dateProxy, superForm } from '$lib/index.js';
	import { zodClient } from '$lib/adapters/zod4.js';
	import { v4FormSchema } from './form-schema.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const v4Form = superForm(
		untrack(() => data.v4Form),
		{
			validators: zodClient(v4FormSchema)
		}
	);

	const { errors: v4Errors, enhance: v4Enhance } = v4Form;
	const v4DateValue = dateProxy(v4Form, 'dateTime', {
		format: 'datetime-local'
	});
</script>

<form method="post" use:v4Enhance>
	<input type="datetime-local" name="dateTime" bind:value={$v4DateValue} />

	{#if $v4Errors.dateTime}
		{#each $v4Errors.dateTime as error}
			<small>{error}</small>
		{/each}
	{/if}

	<button>Submit</button>
</form>
