<script lang="ts">
	import Form from './Form.svelte';

	let formVisible = true;
</script>

<button on:click={() => (formVisible = !formVisible)}>toggle form visibility</button>

<h1>Main page</h1>

{#if formVisible}
	<Form />
{/if}
