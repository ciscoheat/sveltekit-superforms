<script lang="ts">
	import type { SuperForm } from '$lib/index.js';
	import type { z } from 'zod';
	import TextInput from './text-input.svelte';
	import type { unionizedSchema } from './user-schema.js';

	type Inferred = z.infer<typeof unionizedSchema>;

	export let superForm: SuperForm<Inferred, unknown>;

	//$: ({ form } = superForm);
</script>

<!-- this is the problem: -->
<TextInput {superForm} field="email" />
