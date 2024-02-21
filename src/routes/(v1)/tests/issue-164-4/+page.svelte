<script lang="ts">
	import Form from './Form.svelte';
	import { page } from '$app/stores';

	let isOpen = false;

	page.subscribe(($page) => {
		console.log('🚀 ~ file: +page.svelte:12 ~ page:', $page.data.form.data);
	});

	/*
  if (browser) {
    setInterval(() => {
      console.log('$page - +page.svelte', $page.data.form.data);
    }, 500);
  }
  */
</script>

<!--SuperDebug label="$page.data" data={$page.data.form.data} /><br /-->

{#if isOpen}
	<Form
		on:cancel={() => {
			isOpen = false;
		}}
	/>
{:else}
	<button
		style="margin-bottom: 12px;"
		on:click={() => {
			isOpen = !isOpen;
		}}
	>
		Toggle
	</button>
{/if}
