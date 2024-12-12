<script lang="ts" module>
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import type { SuperForm } from '$lib/index.js';

	export let form: SuperForm<T>;

	const { tainted, isTainted } = form;
</script>

<button disabled={!isTainted($tainted)}>Submit</button>
