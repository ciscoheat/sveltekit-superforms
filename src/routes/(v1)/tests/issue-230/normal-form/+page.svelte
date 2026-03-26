<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types.js';

	export let form: ActionData;
</script>

<div style="background-color: yellow;">
	This is +page.svelte, in the slot of Layout<br />Try Submitting the form below - which is a normal
	Svelte Form Action use:enhance
</div>

<form style="margin-top: 10px;" method="POST" use:enhance>
	<input type="text" name="name" value="test" />
	<button type="submit">Submit</button>
	{#if form?.success}Posted!{/if}
</form>
