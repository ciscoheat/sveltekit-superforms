<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	let dialog: HTMLDialogElement;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		// eslint-disable-next-line svelte/valid-compile
		taintedMessage: $page.url.searchParams.has('text')
			? 'Are you sure??'
			: () => {
					dialog.showModal();
					return new Promise((resolve) => {
						dialog.addEventListener(
							'close',
							() => {
								// to discard redirection you can or reject the promise or resolve(false)
								resolve(dialog.returnValue === 'leave');
							},
							{ once: true }
						);
					});
				}
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input name="name" bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<div>
		<button>Submit</button>
	</div>
</form>

<dialog bind:this={dialog}>
	<p>Do you want to leave this page? Changes you made may not be saved.</p>
	<div class="action-button">
		<button on:click={() => dialog.close('leave')}>Leave</button>
		<button on:click={() => dialog.close('stay')}>Stay</button>
	</div>
</dialog>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
