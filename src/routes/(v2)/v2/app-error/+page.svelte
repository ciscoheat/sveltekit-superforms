<script lang="ts">
	import { defaults, superForm } from '$lib/index.js';
	import { userSchema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	const formData = defaults({ name: 'First name' }, zod(userSchema));

	let error: string;

	export const spForm = superForm(formData, {
		onError: (e) => {
			console.log(e.result.error);
			// @ts-expect-error Does not follow the App.Error shape
			error = 'code' in e.result.error ? e.result.error.code : e.result.error.message;
		}
	});

	const { enhance, form } = spForm;
</script>

<p id="error">ERROR:{error}</p>

<form use:enhance method="POST">
	<input name="name" bind:value={$form.name} />
	<button type="submit">Save</button>
	<br /><input type="checkbox" name="exception" bind:checked={$form.exception} /> Throw exception
</form>
