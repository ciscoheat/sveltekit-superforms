<script lang="ts" module>
	type T = Record<string, unknown>;
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import type { FormPathLeaves, SuperForm } from '$lib/index.js';

	export let superForm: SuperForm<T>;
	export let field: FormPathLeaves<T>;
</script>

<p>{superForm.isTainted()}</p>
<p>{field}</p>
