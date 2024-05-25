<script lang="ts">
	import Union from './union.svelte';
	import { superForm as _superForm } from '$lib/index.js';
	import type { UnionSchema } from './schemas.js';

	export let data;

	const superForm = _superForm<UnionSchema>(data.form);
</script>

<Union {superForm} />
