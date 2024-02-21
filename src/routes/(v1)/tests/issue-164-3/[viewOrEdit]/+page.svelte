<script lang="ts">
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { superForm } from '$lib/client/index.js';
	//import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const baseUrl = '/tests/issue-164-3';

	const { form, errors, reset, enhance } = superForm(data.form, {
		taintedMessage: null
	});

	// eslint-disable-next-line svelte/valid-compile
	$: editing = $page.params.viewOrEdit === 'edit';

	const gotoView = async () => {
		goto(baseUrl + '/view');
	};
	const back = async () => {
		history.back();
	};
	const resetAndBack = async () => {
		console.log('BEFORE reset', $form, $page.data.form.data);
		reset();
		console.log('AFTER reset', $form, $page.data.form.data);
		await gotoView();
		console.log('AFTER goto', $form, $page.data.form.data);
	};
	const resetInvalidateBack = async () => {
		reset();
		await invalidateAll();
		gotoView();
	};
</script>

<form method="POST" use:enhance>
	Name: <input name="name" bind:value={$form.name} disabled={!editing} />
	{#if $errors.name}
		<span style:color="red">{$errors.name}</span>
	{/if}
</form>

{#if !editing}
	<a href={baseUrl + '/edit'}>Edit</a>
{:else}
	<button on:click={gotoView}>Goto View</button>
	<button on:click={back}>Back to View</button>
	<button on:click={() => reset()}>Reset</button>
	<button on:click={resetAndBack}>Reset & back</button>
	<button on:click={resetInvalidateBack}>Reset, invalidate, back</button>

	<ul>
		<li>Edit the name above</li>
		<li>Clicking the "Reset" will reset the form as expected</li>
		<li>Clicking the "Reset & back" button doesn't reset the form</li>
		<li>
			Clicking the browser's back button, "Goto View" or "Back to View" all are similar to the
			"Reset & back" button - form is not reset
		</li>
		<li>Clicking the "Reset, invalidate, back" button works</li>
	</ul>
{/if}
