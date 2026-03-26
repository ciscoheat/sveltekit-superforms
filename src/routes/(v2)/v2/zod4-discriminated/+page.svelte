<script lang="ts">
	import { z } from 'zod/v4';
	import { superForm, defaults } from '$lib/index.js';
	import { zod as zod4 } from '$lib/adapters/zod4.js';

	// ==================== VALIDATORS ====================

	/**
	 * Base validator for common UI schema properties.
	 */
	const BaseUiSchemaItemValidator = z.object({
		defaultValueCompute: z.string().nullable(),
		dynamicValueCompute: z
			.object({
				dependencies: z.array(z.string()),
				fn: z.string()
			})
			.nullable()
	});

	/**
	 * Text UI Schema variant
	 */
	const TextUiSchemaValidator = BaseUiSchemaItemValidator.extend({
		dataType: z.literal('text'),
		selectedWidget: z.enum(['text_input', 'textarea']).default('text_input')
	});

	/**
	 * Boolean UI Schema variant
	 */
	const BoolUiSchemaValidator = BaseUiSchemaItemValidator.extend({
		dataType: z.literal('bool'),
		selectedWidget: z.enum(['checkbox', 'toggle']).default('checkbox')
	});

	/**
	 * DISCRIMINATED UNION - This is what causes the error
	 * TypeError: Cannot read properties of undefined (reading '_zod')
	 */
	const UiSchemaItemValidator = z.discriminatedUnion('dataType', [
		TextUiSchemaValidator,
		BoolUiSchemaValidator
	]);

	// ==================== SUPERFORM SETUP ====================

	// THIS IS WHERE THE ERROR OCCURS
	const data = defaults(zod4(UiSchemaItemValidator));
	const { form, enhance } = superForm(data, {
		SPA: true,
		resetForm: false,
		dataType: 'json',
		validators: zod4(UiSchemaItemValidator),
		id: crypto.randomUUID(),
		validationMethod: 'submit-only',
		onUpdate: async (e) => {
			console.log(e.form.data);
		}
	});
</script>

<!-- ==================== TEMPLATE ==================== -->

<form method="POST" use:enhance>
	{#if $form.dataType === 'text'}
		<input type="text" bind:value={$form.selectedWidget} name="selectedWidget" />
	{:else if $form.dataType === 'bool'}
		<select bind:value={$form.selectedWidget} name="selectedWidget">
			<option value="checkbox">Checkbox</option>
			<option value="toggle">Toggle</option>
		</select>
	{/if}
	<div>
		<button>Submit</button>
	</div>
</form>
