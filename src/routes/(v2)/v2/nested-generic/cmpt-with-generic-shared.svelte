<script module lang="ts">
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import type { FormPathLeaves } from '$lib/index.js';
	export let name: FormPathLeaves<T>;
</script>

<p>Value in nested field...</p>

<p>{name}</p>
