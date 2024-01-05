<script lang="ts">
	import { arrayProxy } from '$lib/client/index.js';
	export let form;
	export let field;
	export let taint = false;

	const { values, fieldErrors } = arrayProxy(form, field, { taint });

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
		$fieldErrors = [];
	}

	//$: console.log($values, $fieldErrors, taint);
</script>

<div>
	{#each $values as item, index}
		<input
			name={field}
			id={index}
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
