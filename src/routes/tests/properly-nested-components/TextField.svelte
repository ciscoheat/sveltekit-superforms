<script lang="ts">
  import { fieldProxy } from '$lib/client/proxies';
  import type { FieldPath } from '$lib';
  import type { Writable } from 'svelte/store';

  type P = $$Generic<Record<string, unknown>>;

  export let form: Writable<P>;
  export let field: keyof P | FieldPath<P>;
  export let label: string | undefined = undefined;

  if (label === undefined) label = String(field);

  const proxy = fieldProxy(form, field);
</script>

<label>
  <span>{label}</span><br />
  <input type="text" bind:value={$proxy} {...$$restProps} />
</label>

<style lang="scss">
  input,
  label {
    margin-bottom: 0;
  }
  label {
    margin-top: 2rem;
  }
</style>
