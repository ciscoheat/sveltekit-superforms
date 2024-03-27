<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data;

	const { enhance } = superForm(
		{},
		{
			SPA: '/v2/spa-action-2/classify',
			taintedMessage: false,
			onUpdate({ form }) {
				const entry = data.entries.find((e) => e.id == form.message.id);
				if (entry) entry.name = 'Modified';
			}
		}
	);
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
				<td>{entry.name}</td>
				<td>
					<form use:enhance>
						<input type="hidden" name="id" value={entry.id} />
						<input type="hidden" name="name" value={entry.name} />
						<button>Change name</button>
					</form>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
