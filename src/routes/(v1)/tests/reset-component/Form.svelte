<script lang="ts">
	import { superForm, defaults } from '$lib/client/index.js';
	import { zod } from '$lib/adapters/zod.js';

	import { z } from 'zod';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { page } from '$app/stores';

	const schema = z.object({
		id: z.number().min(1).max(255).default(1),
		name: z
			.string()
			.min(2, 'Name must contain at least 2 characters')
			.max(255, 'Name must not exceed 255 characters')
			.default('')
	});

	const data = defaults(zod(schema));

	const { form, errors, enhance, constraints } = superForm(data, {
		SPA: true,
		validators: zod(schema),
		taintedMessage: null,

		onUpdate({ form }) {
			if (form.valid) {
				console.log('form is valid', form.data);
			}
		}
	});
</script>

<form method="POST" class="flex flex-col h-[300px] gap-4" use:enhance>
	<input bind:value={$form.id} {...$constraints.id} />
	<input bind:value={$form.name} {...$constraints.name} />

	<button type="submit"> submit</button>
</form>

<br />

<!-- eslint-disable-next-line svelte/valid-compile -->
<SuperDebug data={{ $form, $errors, 'page.form': $page.form?.form }} />
