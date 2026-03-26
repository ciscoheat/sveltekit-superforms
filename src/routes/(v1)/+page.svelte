<script lang="ts">
	import { goto } from '$app/navigation';
	import { superForm } from '$lib/client/superForm.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import * as flashModule from 'sveltekit-flash-message/client';

	export let data;

	const { form, errors, enhance, message, delayed, reset, tainted } = superForm(data.form, {
		dataType: 'json',
		async onUpdate({ form }) {
			if (form.valid) {
				await goto('?id=' + form.data.id);
			}
		},
		onSubmit({ formData, cancel }) {
			if (formData.has('cancel')) {
				console.log('Cancelling');
				cancel();
			}
		},
		onUpdated({ form }) {
			updates = [...updates, '1:' + String(form.valid)];
		},
		onError({ result }) {
			$message = { type: 'error', message: result.error.message };
		},
		flashMessage: {
			module: flashModule,
			onError({ result }) {
				$message = {
					type: 'error',
					message: result.error.message
				};
			}
		},
		syncFlashMessage: true,
		selectErrorText: true
	});

	const {
		form: staticform,
		errors: staticerrors,
		constraints: staticconstraints
	} = superForm(data.form, {
		warnings: {
			duplicateId: false
		}
	});

	let updates: string[] = [];
</script>

<SuperDebug data={{ $form, $tainted, $errors }} />

{#if $message}
	<h4 class:error={$message.type == 'error'} class="message">
		{$message.message}
	</h4>
{/if}

<div class="updates">Updates: {updates.join(',')}</div>

<h1>sveltekit-superforms</h1>

<div class="users">
	<b>Select customer:</b>
	{#each data.users as user}
		| <a href="?id={user.id}">{user.name}</a> |
	{/each}
	{#if $form.id}
		<button on:click={() => goto('?')}>Create new</button>
	{/if}
</div>

<h2>{!$form.id ? 'Create' : 'Update'} user</h2>

<div class="forms">
	<form
		method="POST"
		action="?/edit"
		use:enhance={{
			onUpdated: ({ form }) => {
				updates = [...updates, '2:' + String(form.valid)];
			}
		}}
	>
		<input type="hidden" name="id" bind:value={$form.id} />
		<input type="hidden" name="notInSchema" value="123" />

		<label>
			Name<br /><input name="name" data-invalid={$errors.name} bind:value={$form.name} />
			{#if $errors.name}<br /><span class="invalid">{$errors.name[0]}</span>{/if}
		</label>

		<label>
			E-mail<br /><input
				type="email"
				name="email"
				data-invalid={$errors.email}
				bind:value={$form.email}
			/>
			{#if $errors.email}<br /><span class="invalid">{$errors.email[0]}</span>{/if}
		</label>

		<label>
			Gender<br /><input
				type="text"
				name="gender"
				bind:value={$form.gender}
				data-invalid={$errors}
			/>
			{#if $errors.gender}<span class="invalid">{$errors.gender}</span>{/if}
		</label>

		<div class="submit">
			<button>Submit</button>
			<span><input type="checkbox" name="error" style="margin-left:1rem;" /> Trigger error</span>
			<span><input type="checkbox" name="cancel" style="margin-left:1rem;" /> Cancel request</span>
		</div>
		{#if $delayed}Working...{/if}

		<div style="height:1200px;">&nbsp;</div>

		<div>
			<button>Submit</button>
			{#if $delayed}Working...{/if}
		</div>

		<div>&nbsp;</div>

		<div>
			<button on:click|preventDefault={() => reset()}>Reset</button>
		</div>
	</form>

	<!--------- Static form (no javascript/enhance) ----------------------->
	<form method="POST" action="?/edit">
		<input type="hidden" name="id" bind:value={$staticform.id} />

		<label>
			Name<br /><input
				name="name"
				data-invalid={$staticerrors.name}
				bind:value={$staticform.name}
				{...$staticconstraints.name}
			/>
			{#if $staticerrors.name}<span class="invalid">{$staticerrors.name}</span>{/if}
		</label>

		<label>
			E-mail<br /><input
				type="email"
				name="email"
				data-invalid={$staticerrors.email}
				bind:value={$staticform.email}
			/>
			{#if $staticerrors.email}<span class="invalid">{$staticerrors.email}</span>{/if}
		</label>

		<label>
			Gender<br /><input
				name="gender"
				data-invalid={$staticerrors.gender}
				bind:value={$staticform.gender}
				{...$staticconstraints.gender}
			/>
			{#if $staticerrors.gender}<span class="invalid">{$staticerrors.gender}</span>{/if}
		</label>

		<div>
			<button>Submit</button>
			<span><input type="checkbox" name="error" style="margin-left:1rem;" /> Trigger error</span>
			{#if $delayed}Working...{/if}
		</div>

		<div style="height:1200px;">&nbsp;</div>

		<div>
			<button>Submit</button>
			{#if $delayed}Working...{/if}
		</div>

		<div>&nbsp;</div>

		<div>
			<button on:click|preventDefault={() => reset()}>Reset</button>
		</div>
	</form>
</div>

<button on:click={() => ($form.id = 'Test')}>Set form id</button>

<style lang="scss">
	.submit {
		display: grid;
		grid-template-columns: 30% 70%;
	}

	.submit span {
		grid-column: 2;
	}

	.forms {
		display: flex;
		justify-content: space-between;
		gap: 30px;

		form {
			width: 300px;
		}
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
