<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';

	export let data;

	const { form, errors, tainted, message, enhance } = superForm(data.form, {
		taintedMessage: false
		//dataType: 'json',
		//validators: zod(schema)
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	{#if $form && $form.instances && $form.instances.length > 0}
		{#each $form.instances as item, i}
			<label
				class="CrispLabel"
				data-align="center"
				data-direction="row"
				for={`instances[${i}].name`}
				style="justify-content: space-between;"
			>
				<span data-mandatory style="color: inherit;"> Name </span>
				<input
					type="text"
					class="CrispInput"
					bind:value={item.name}
					name={`instances[${i}].name`}
					style="--crp-input-width: 70%;"
				/>
			</label>
			{#if $errors.instances && $errors.instances[i] && $errors.instances[i].name}
				<ul class="CrispMessageList w-100">
					{#each $errors.instances[i].name ?? [] as error}
						<li class="CrispMessage" data-type="error">{error}</li>
					{/each}
				</ul>
			{/if}
		{/each}
	{/if}
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}
	}
</style>
