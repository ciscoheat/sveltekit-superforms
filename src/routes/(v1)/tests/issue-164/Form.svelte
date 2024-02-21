<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { onMount } from 'svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let data: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let cancel: any;

	console.log('init:', data.data);

	const { form, enhance, reset } = superForm(data, {
		resetForm: true
	});

	onMount(() => {
		console.log('onMount', data.data);
	});

	$: {
		console.log('Form initial data:', data.data);
		console.log('Form $form:', $form);
	}
</script>

<SuperDebug data={$form} />

<button
	type="button"
	on:click={() => {
		//debugger;
		console.log('Resetting, before:', $form, 'initial:', data.data);
		reset();
		console.log('Resetting, after:', $form, 'initial:', data.data);
		cancel?.();
	}}>Close Edit</button
>
<form method="POST" use:enhance>
	<fieldset>
		<label>
			Name
			<input
				name="name"
				on:input={() => console.log('on:input', data.data)}
				bind:value={$form.name}
			/>
		</label>
	</fieldset>
	<fieldset>
		<label>
			Email
			<input name="email" bind:value={$form.email} />
		</label>
	</fieldset>
</form>
