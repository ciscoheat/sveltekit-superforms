<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import { schema } from './schema.js';
	import { zod } from '$lib/adapters/zod.js';

	export let data: PageData;

	let _log: string[] = [];
	let _cancel = false;

	function log(msg: string) {
		_log = [..._log, msg];
	}

	let SPA = false;
	$: options.SPA = SPA || undefined;

	const { form, errors, message, enhance, options } = superForm(data.form, {
		taintedMessage: null,
		validators: zod(schema),
		onSubmit: ({ cancel }) => {
			_log = ['onSubmit'];
			if (_cancel) {
				log('Cancelled');
				cancel();
			}
		},
		onError: () => {
			log('onError');
		},
		onResult: () => {
			log('onResult');
		},
		onUpdate: ({ form }) => {
			log('onUpdate');
			if (form.valid && SPA) form.message = 'SPA form OK!';
		},
		onUpdated: () => {
			log('onUpdated');
		}
	});
</script>

<pre>{_log.join('\n')}</pre>

<input type="checkbox" bind:checked={SPA} /> SPA mode<br />
<input type="checkbox" bind:checked={_cancel} /> Cancel submit in onSubmit

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input name="name" bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<div>
		<button>Submit</button>
	</div>
</form>

<style lang="scss">
	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
