<script lang="ts">
	import { superForm } from '$lib/index.js';

	export let data;

	const sForm1 = superForm(data.form1, { resetForm: true });

	const { errors: errors1 } = sForm1;
</script>

<p id="error">{$errors1.value1 || 'NO ERROR'}</p>

<br />
<a href="/v2/issue-467?error" data-sveltekit-preload-data="tap">Trigger error</a>
<br />
<a href="/v2/issue-467" data-sveltekit-preload-data="tap">Remove error</a>
