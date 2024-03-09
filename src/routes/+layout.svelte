<script lang="ts">
	import { getFlash } from 'sveltekit-flash-message/client';
	import { page } from '$app/stores';
	import { beforeNavigate } from '$app/navigation';

	const flash = getFlash(page);

	beforeNavigate((nav) => {
		if ($flash && nav.from?.url.toString() != nav.to?.url.toString()) {
			$flash = undefined;
		}
	});
</script>

<svelte:head><title>Superforms testing grounds</title></svelte:head>

{#if $flash}
	{@const bg = $flash.type == 'success' || $flash.type == 'ok' ? '#3D9970' : '#FF4136'}
	<div style:background-color={bg} class="flash">{$flash.message}</div>
{/if}

<slot />

<style lang="scss">
	.flash {
		padding: 5px 10px;
		color: white;
		border-radius: 3px;
	}
</style>
