<script lang="ts">
	import { zod } from '$lib/adapters/zod.js';
	import { dateProxy, intProxy, numberProxy, superForm, defaults } from '$lib/client/index.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { schema } from './schema.js';

	const { errors, enhance, form, tainted } = superForm(defaults(zod(schema)), {
		SPA: true,
		taintedMessage: null,
		validators: zod(schema),
		dataType: 'json',
		onSubmit({ cancel }) {
			if (!$tainted) cancel();
		},
		onUpdate({ form }) {
			if (form.valid) alert('valid');
			else alert('invalid');
		}
	});

	const date = dateProxy(form, 'date', {
		format: 'datetime-local',
		empty: 'undefined'
	});

	const emptyUndef = intProxy(form, 'emptyUndef', {
		empty: 'undefined'
	});

	const emptyZero = numberProxy(form, 'emptyZero', {
		empty: 'undefined'
	});
</script>

<SuperDebug data={{ $form, $tainted, $errors }} />

<form method="POST" use:enhance>
	<label>
		Empty if undefined and zero: <input name="emptyUndef" type="number" bind:value={$emptyUndef} />
		<span class="value">
			{$emptyUndef === '' ? 'undefined' : $emptyUndef}
		</span>
		{#if $errors.emptyUndef}
			<span class="invalid">{$errors.emptyUndef}</span>
		{/if}
	</label>

	<label>
		Empty if undefined and not zero: <input
			name="emptyZero"
			type="number"
			bind:value={$emptyZero}
		/>
		<span class="value">
			{$emptyZero === '' ? 'undefined' : $emptyZero}
		</span>
		{#if $errors.emptyZero}
			<span class="invalid">{$errors.emptyZero}</span>
		{/if}
	</label>

	<label>
		Normal number: <input name="number2" type="number" bind:value={$form.number2} />
		<span class="value">
			{String($form.number2)}
		</span>
		{#if $errors.number2}<span class="invalid">{$errors.number2}</span>{/if}
	</label>

	<label>
		Date between 2021-2023: <input name="date" type="datetime-local" bind:value={$date} />
		<span class="value">
			{$date === '' ? 'invalid-date' : new Date($date).toISOString().slice(0, 10)}
		</span>
		{#if $errors.date}<span class="invalid">{$errors.date}</span>{/if}
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

		.value {
			font-weight: normal;
			color: mediumseagreen;
		}
	}
</style>
