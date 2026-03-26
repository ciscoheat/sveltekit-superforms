<script lang="ts">
	import { page } from '$app/stores';
	import { defaults, superForm } from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import SuperDebug from '$lib/index.js';
	import { goto } from '$app/navigation';

	import { schema } from './schema.js';

	//export let data;

	const form = superForm(defaults(zod(schema)), {
		SPA: true,
		validators: zod(schema),
		async onUpdate() {
			// uncomment out this line to fix the redirect
			//cancel();
			await goto('/v2/issue-360/target');
			// navigating directly to the second target (no redirect) works fine
			// await goto('/v2/issue-360/second-target');
		}
	});

	const { form: formStore, message, enhance } = form;
</script>

<SuperDebug data={$formStore} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<button>Submit</button>
</form>

<hr />
<p><a target="_blank" href="https://superforms.rocks/api">API Reference</a></p>

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

	a {
		text-decoration: underline;
	}

	hr {
		margin-top: 4rem;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
