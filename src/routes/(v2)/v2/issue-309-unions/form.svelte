<script lang="ts">
	import type { z } from 'zod';
	import type { unionizedSchema } from './user-schema.js';
	import type { SuperForm } from '$lib/index.js';
	import TextInput from './text-input.svelte';

	type Inferred = z.infer<typeof unionizedSchema>;

	export let superForm: SuperForm<Inferred, unknown>;

	//$: ({ form } = superForm);
</script>

<!-- this is the problem: -->
<TextInput {superForm} field="email" />
