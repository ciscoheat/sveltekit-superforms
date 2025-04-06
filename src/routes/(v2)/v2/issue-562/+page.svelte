<script lang="ts">
	import { Schema } from './schemas.js';
	import { valibotClient } from '$lib/adapters/valibot.js';
	import { dateProxy, superForm } from '$lib/client/index.js';

	let { data } = $props();

	const { form, capture, restore } = superForm(data.form, {
		validators: valibotClient(Schema)
	});

	const proxy = dateProxy(form, 'date', {
		format: 'datetime-local',
		empty: 'undefined'
	});

	// works without this, fails with it when refreshing page, not when from another page
	export const snapshot = { capture, restore };

	$inspect({ $form, $proxy });
</script>

<p class="time">{$form.date.getTime()}</p>

<input type="datetime-local" bind:value={$proxy} />
