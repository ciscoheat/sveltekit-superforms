<script lang="ts">
	import { type SuperForm } from '$lib/index.js';
	// Remove "c: string" to show a complicated type error
	export let superform: SuperForm<{ a: string; b: string; c: string }>;
</script>

<form method="POST" use:superform.enhance {...$$restProps}></form>
