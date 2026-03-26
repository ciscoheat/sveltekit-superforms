<script lang="ts">
	import ArrayField from './ArrayField.svelte';
	import { superForm } from '$lib/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import { schema } from './schema.js';

	export let data;

	const form = superForm(data.form, {
		validators: zod(schema)
	});
</script>

<ArrayField {form} field="tags" newValue="new" />
