<script lang="ts">
	import { defaults, superForm } from '$lib/index.js';
	import { zod } from '$lib/adapters/index.js';
	import Form from '../form.svelte';
	import { updateUserSchema } from '../user-schema.js';

	const form = superForm(defaults(zod(updateUserSchema)), { SPA: true, dataType: 'json' });
</script>

<a href="/v2/issue-309-unions">Back</a>

<Form superForm={form} />
