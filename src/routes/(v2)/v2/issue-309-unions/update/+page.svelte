<script lang="ts">
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import Form from '../form.svelte';
	import { updateUserSchema } from '../user-schema';

	const form = superForm(defaults(zod(updateUserSchema)), { SPA: true, dataType: "json" });
</script>

<a href="/">Back</a>

<Form superForm={form} />
