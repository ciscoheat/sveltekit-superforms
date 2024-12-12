<script lang="ts">
	import { superForm, dateProxy } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schemaToStr } from './schema.js';
	import { type Writable, writable, derived } from 'svelte/store';

	export let data: PageData;

	const logs: Writable<Record<string, string>[]> = writable([]);
	const valid = derived(logs, ($logs) => {
		if (!$logs.length) return {};

		const output = Object.fromEntries(Object.keys($logs[0]).map((key) => [key, true]));

		for (const log of $logs) {
			for (const [key, value] of Object.entries(log)) {
				if ($logs[0][key] !== value) output[key] = false;
			}
		}

		return output;
	});

	$: isValid = $valid;

	async function log(data: Record<string, string | Date>) {
		logs.update((logs) => [...logs, schemaToStr(data)]);
	}

	log(data.form.data);
	log(data.log);

	const { form, enhance } = superForm(data.form, {
		//dataType: 'json',
		onResult({ result }) {
			if (result.type == 'success') {
				log(result.data?.form.data);
				log(result.data?.log);
			}
		}
	});

	let proxy = dateProxy(form, 'proxy', { format: 'date' });
	let proxyCoerce = dateProxy(form, 'proxyCoerce', { format: 'date' });
</script>

<SuperDebug data={$form} />

<a href="/">&lt; Back to start</a>

<form method="POST" use:enhance>
	<label>plain <input type="text" name="plain" bind:value={$form.plain} /></label>
	<label>str <input type="text" name="str" bind:value={$form.str} /></label>
	<label>coerced <input type="text" name="coerced" bind:value={$form.coerced} /></label>

	<label>
		proxy <input type="date" bind:value={$proxy} name="proxy" />
	</label>
	<label>
		proxyCoerce <input type="date" bind:value={$proxyCoerce} name="proxyCoerce" />
	</label>

	<button>Submit</button>
</form>

<table>
	<thead>
		<tr>
			{#each Object.keys($logs[0]) as key}<th>{key}</th>{/each}
		</tr>
	</thead>
	<tbody>
		{#each $logs as dates}
			<tr>
				{#each Object.values(dates) as value}
					{@const time = value.split('T')}
					<td>{time[0]}<br />{time[1]?.replace('.000', '')}</td>
				{/each}
			</tr>
		{/each}
		<tr>
			{#each Object.values(isValid) as valid}
				<td class="result" class:valid>{valid ? 'OK' : 'Mismatch'}</td>
			{/each}
		</tr>
	</tbody>
</table>

<style lang="scss">
	form {
		margin: 2rem 0;
	}

	.result {
		color: white;
		background-color: red;
	}

	.result.valid {
		background-color: green;
	}

	input[type='text'] {
		width: 500px;
	}

	table {
		font-size: 80%;

		tr {
			white-space: nowrap;
			&:nth-child(2n) {
				background-color: #eee;
			}
		}
	}
</style>
