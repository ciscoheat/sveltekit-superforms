<script>
	import { page } from '$app/stores';
	import { getFlash } from 'sveltekit-flash-message/client';

	const flash = getFlash(page);

	console.log('Flash in layout', JSON.stringify($flash));

	// https://svelte-french-toast.com/
	import toast, { Toaster } from 'svelte-french-toast';

	// Simple Toasts TODO: style and integrate in theme
	$: if ($flash) {
		switch ($flash.type) {
			case 'ok':
				toast.success($flash.message);
				break;
			case 'error':
				toast.error($flash.message);
				break;
		}

		// Clear the flash message to avoid double-toasting.
		//$flash = undefined;
	}
</script>

<p>{JSON.stringify($flash)}</p>

<Toaster />
<slot />
