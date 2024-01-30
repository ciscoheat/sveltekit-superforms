<script lang="ts">
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import Form from '../form.svelte';
	import { createUserSchema } from '../user-schema';

	const form = superForm(defaults(zod(createUserSchema)), { SPA: true, dataType: "json" });
</script>

<a href="/">Back</a>

<Form superForm={form} />
