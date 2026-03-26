<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, enhance, message, tainted } = superForm(data.form, {
		dataType: 'json'
	});

	function untaint(rowIndex: number) {
		console.log('🚀 ~ file: +page.svelte:13 ~ untaint ~ rowIndex:', rowIndex);

		/*
    if ($tainted && $tainted.tags && $tainted.tags[rowIndex]) {
      $tainted.tags[rowIndex].id = undefined;
      $tainted.tags[rowIndex].name = undefined;
    }
    */

		delete $tainted?.tags?.[rowIndex]?.id;

		if ($tainted && $tainted.tags && $tainted.tags[rowIndex]) {
			$tainted.tags[rowIndex].name = false;
		}
	}
</script>

<SuperDebug data={{ $tainted }} />

<a href="/tainted/multiple-tainted">Multiple tainted &gt;</a> |
<a href="/tainted/programmatically">Programmatically &gt;</a>

<h2>Tainted modification test</h2>

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
	{#each $form.tags as _, i}
		<div>
			<input type="number" data-invalid={$errors.tags?.[i]?.id} bind:value={$form.tags[i].id} />
			<input data-invalid={$errors.tags?.[i]?.name} bind:value={$form.tags[i].name} />
			<button type="button" on:click={() => untaint(i)} class="untaint">Untaint</button>
			{#if $errors.tags?.[i]?.id}
				<br />
				<span class="invalid">{$errors.tags[i].id}</span>
			{/if}
			{#if $errors.tags?.[i]?.name}
				<br />
				<span class="invalid">{$errors.tags[i].name}</span>
			{/if}
		</div>
	{/each}
	<button>Submit</button>
	<button
		type="button"
		on:click={() => {
			form.update(
				($form) => {
					$form.tags[3].id = 7;
					return $form;
				},
				{ taint: false }
			);
		}}>Change without taint</button
	>
</form>

<style lang="scss">
	button {
		margin-right: 20px;

		&.untaint {
			color: #1d7484;
			border: 1px solid #1d7484;
			background-color: #ddd;
		}
	}

	:global(input:not([type='checkbox'])) {
		width: 100px;
	}

	.invalid {
		color: red;
	}
</style>
