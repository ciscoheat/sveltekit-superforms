<script lang="ts">
	import z from 'zod';
	import Form from './Form.svelte';
	import TextField from './TextField.svelte';
	import SuperDebug from '$lib/index.js';

	const schema = z.object({
		name: z.string(),
		items: z
			.object({
				name: z.string()
			})
			.array()
	});

	type Schema = z.infer<typeof schema>;

	let initial: Schema = {
		name: 'b',
		items: [
			{
				name: 'a'
			},
			{
				name: 'b'
			}
		]
	};
</script>

<Form let:form let:data {schema} {initial}>
	<SuperDebug {data} />
	{#each data.items as row, index (row)}
		<div class="row">
			<div class="col">
				<TextField {form} name="items[{index}].name" />
			</div>
		</div>
	{/each}
</Form>
