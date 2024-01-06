<script lang="ts">
	import { z } from 'zod';
	import type { userSchema } from './users.js';
	import { arrayProxy } from '$lib/client/proxies.js';
	export let form;
	export let field: 'emails';
	export let taint = false;

	const { values, fieldErrors } = arrayProxy<z.infer<typeof userSchema>, 'emails'>(form, field, {
		taint
	});

	function handleAdd() {
		const field = { email: '', type: 'private' };
		$values.push(field);
		$values = $values;
	}

	function handleRemove(i: number) {
		const field = { email: '', type: 'private' };
		if ($values.length > 1) {
			$values = $values.filter((_, ind) => ind !== i);
		} else {
			$values = [field];
		}
		$values = $values;
	}

	//$: console.log($values, $fieldErrors, taint);
</script>

<div>
	{#each $values as item, index}
		<input
			name={field}
			id={String(index)}
			type="text"
			aria-invalid={$fieldErrors?.[index]?.email ? 'true' : undefined}
			bind:value={item.email}
			data-invalid={$fieldErrors?.[index]?.email}
		/>
		{#if $fieldErrors?.[index]?.email}<span class="invalid">{$fieldErrors?.[index]?.email}</span
			>{/if}
		<button type="button" on:click={() => handleRemove(index)}>remove</button>
		<br />
	{/each}
</div>
<button type="button" on:click={handleAdd}>add</button>
