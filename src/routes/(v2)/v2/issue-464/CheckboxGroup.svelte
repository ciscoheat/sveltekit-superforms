<script lang="ts" module>
	type T = Record<string, unknown>;
	type TItem = unknown;
</script>

<script lang="ts" generics="T extends Record<string, unknown>, TItem extends unknown">
	import { type SuperForm, arrayProxy, type FormPathArrays } from '$lib/index.js';

	export let form: SuperForm<T>;
	export let field: FormPathArrays<T, TItem>;

	const { values: rawValue, errors } = arrayProxy(form, field);

	export let options: Array<{ label: string; value: TItem }>;
	export let label: string | undefined = undefined;
</script>

<fieldset>
	{#if $$slots.default || label}
		<legend><slot>{label}</slot></legend>
	{/if}

	{#each options as { label, value } (value)}
		<label class="">
			<div class="flex items-center gap-x-2">
				<input
					name={field}
					class="checkbox"
					class:input-error={!!$errors}
					type="checkbox"
					bind:group={$rawValue}
					{value}
				/>
				<p>{label}</p>
			</div>
		</label>
	{:else}
		<p>Geen opties</p>
	{/each}
</fieldset>
