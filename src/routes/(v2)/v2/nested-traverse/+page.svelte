<script lang="ts">
	import SuperDebug from '$lib/index.js';
	import { superForm } from '$lib/index.js';

	export let data;

	const form = superForm(data.form, { dataType: 'json', taintedMessage: false });
	const { form: formData, enhance, message } = form;

	const sections = ['motor', 'sensory', 'dysesthesia'] as const;
	const sides = ['left', 'right'] as const;
</script>

{#if $message}<h3>{$message}</h3>{/if}

<form method="POST" use:enhance>
	<main class="flex flex-col gap-y-8">
		{#each sections as section}
			<fieldset class="border p-4 rounded-md">
				<legend class="px-2">{section}</legend>
				<div class="flex gap-4">
					{#each sides as side}
						<div class="flex flex-col space-y-2 basis-1/2">
							<div>{side} grade</div>
							<input type="number" bind:value={$formData[section][side].grade} class="w-28" />
							<textarea bind:value={$formData[section][side].comments}></textarea>
						</div>
					{/each}
				</div>
			</fieldset>
		{/each}
	</main>
	<footer class="my-8">
		<button class="border rounded-md px-2 py-1 bg-green-300" type="submit">Save Data</button>
	</footer>
</form>

<SuperDebug data={formData} />
