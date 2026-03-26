<script lang="ts">
	import { superForm } from '$lib/index.js';
	import Form from './Form.svelte';

	export let data;

	const superform = superForm(data.form);
</script>

<h4>Component with different types</h4>

<Form {superform} />
