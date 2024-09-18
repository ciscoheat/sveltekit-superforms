<script module lang="ts">
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import { type FormPathLeaves } from '$lib/index.js';
	import CmptWithGenericShared from './cmpt-with-generic-shared.svelte';

	export let name: FormPathLeaves<T>;
</script>

<CmptWithGenericShared name={name as string} />
