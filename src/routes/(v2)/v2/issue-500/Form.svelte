<script lang="ts">
	import { page } from '$app/stores';
	import { defaults, superForm } from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import SuperDebug from '$lib/index.js';
	import { modifyGroupAccessSchema } from './schema.js';

	export let group;

	const { form, message, enhance } = superForm(defaults(group, zod(modifyGroupAccessSchema)), {
		dataType: 'json',
		validators: zod(modifyGroupAccessSchema)
	});
</script>

<SuperDebug data={$form} />

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance action="?/modify">
	{#each group.users as user, i}
		<input type="hidden" name="username" bind:value={$form.username} />

		<label>
			Remove {user.username}
			<input name="remove" type="checkbox" bind:checked={$form.users[i].remove} />
		</label>
	{/each}

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

	input {
		background-color: #ddd;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
