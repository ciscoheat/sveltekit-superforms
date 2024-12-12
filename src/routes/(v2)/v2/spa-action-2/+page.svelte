<script lang="ts">
	import { valibot } from '$lib/adapters/valibot.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { defaults, superForm } from '$lib/index.js';
	import type { ActionData } from './classify/$types.js';
	import { classifySchema } from './classify/schema.js';

	export let data;

	const { enhance, submitting, formId } = superForm(defaults(valibot(classifySchema)), {
		SPA: '/v2/spa-action-2/classify',
		taintedMessage: false,
		onUpdate({ result }) {
			const status = result.data as NonNullable<ActionData>;
			const entry = data.entries.find((e) => e.id == status.posted);
			if (entry) {
				entry.name = 'Modified ' + status.posted;
				data = data;
			}
		}
	});
</script>

<SuperDebug data={data.entries} />

<table>
	<thead>
		<tr>
			<th>Id</th>
			<th>Name</th>
			<th>Action</th>
		</tr>
	</thead>
	<tbody>
		{#each data.entries as entry}
			<tr>
				<td>{entry.id}</td>
				<td id="name-{entry.id}">{entry.name}</td>
				<td>
					<form use:enhance>
						<input type="hidden" name="id" value={entry.id} />
						<input type="hidden" name="name" value={entry.name} />
						<button on:click={() => ($formId = String(entry.id))}>
							{#if $submitting && $formId == String(entry.id)}Loading...
							{:else}Change name{/if}
						</button>
					</form>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
