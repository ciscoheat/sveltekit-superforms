<script lang="ts" context="module">
	type T = { name: string };
</script>

<script lang="ts" generics="T extends { name: string }">
	import type { SuperForm } from '$lib/index.js';
	//import type { admissionSchema, eventTemplateSchema, eventSchema } from './schemas.js';
	import Input from './input.svelte';

	export let superForm: SuperForm<T>;
</script>

<Input {superForm} field="name" />
