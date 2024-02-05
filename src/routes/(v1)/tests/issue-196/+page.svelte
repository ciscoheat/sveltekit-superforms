<script lang="ts">
	import { superForm, defaults } from '$lib/client/index.js';
	import { zod } from '$lib/adapters/zod.js';

	import { z } from 'zod';

	const childSchema = z.object({
		option: z.enum(['', 'one', 'two', 'three'])
	});
	const parentSchema = z.object({
		children: childSchema
			.array()
			.refine((children) => children.some((child) => child.option.length > 0))
	});

	const initialValues = {
		children: [{ option: '' as const }, { option: '' as const }]
	};

	const { enhance, form, errors, allErrors } = superForm(
		defaults(initialValues, zod(parentSchema)),
		{
			SPA: true,
			dataType: 'json',
			validators: zod(parentSchema),
			taintedMessage: null
		}
	);

	$: console.log($form, $errors);
</script>

{#if $errors.children?._errors}
	<p>{$errors.children._errors}</p>
{/if}

<form method="POST" use:enhance>
	<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
	{#each $form.children as _, i}
		<p>
			<label for={`options-${i}`}>Child {i + 1}</label>
			<select id={`options-${i}`} bind:value={$form.children[i].option}>
				<option value="">None</option>
				<option value="one">One</option>
				<option value="two">Two</option>
				<option value="three">Three</option>
			</select>
		</p>
	{/each}

	<button type="submit" disabled={$allErrors?.length > 0}> Submit </button>
</form>
