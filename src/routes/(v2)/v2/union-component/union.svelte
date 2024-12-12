<script lang="ts">
	import type { SuperForm } from '$lib/index.js';
	import { type UnionSchema } from './schemas.js';
	import Input from './input.svelte';

	export let superForm: SuperForm<UnionSchema>;
</script>

{superForm.isTainted()}

<Input {superForm} field="name" />
