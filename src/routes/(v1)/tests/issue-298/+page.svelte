<script lang="ts">
	import { z } from 'zod';
	import { superForm as _superForm } from '$lib/client/index.js';
	import { defaults } from '$lib/client/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import SuperDebug from '$lib/index.js';

	function ruleSet<T extends readonly [string, ...string[]]>(options: T) {
		let prev: string | undefined = undefined;
		let current = options[0];
		return z
			.object({
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				options: z.enum(options).default(options[0] as any),
				prev: z.string().optional()
			})
			.transform((value) => {
				if (value.options != current) {
					prev = current;
					current = value.options as string;
				}
				const output = { ...value, prev: prev };
				return output;
			});
	}

	const r1 = ['r1A', 'r1B', 'r1C'] as const;
	const r2 = ['r2A', 'r2B', 'r2C'] as const;

	const schema = z.object({
		r1: ruleSet(r1),
		r2: ruleSet(r2)
	});

	const superForm = _superForm(defaults(zod(schema)), {
		SPA: true,
		dataType: 'json',
		validators: zod(schema),
		taintedMessage: null
	});

	$: ({ form } = superForm);
</script>

<SuperDebug data={$form} />

<h4>
	{$form.r1.options}-{String($form.r1.prev)} / {$form.r2.options}-{String($form.r2.prev)}
</h4>

<form use:superForm.enhance method="post">
	{#each r1 as item}
		<div>
			<input value={item} bind:group={$form.r1.options} type="radio" id={item} name={item} />
			{item}
		</div>
	{/each}

	<hr />

	<select bind:value={$form.r2.options}>
		{#each r2 as item}
			<option value={item}>{item}</option>
		{/each}
	</select>
</form>
