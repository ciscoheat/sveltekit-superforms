<script lang="ts">
  import { fieldProxy } from '$lib/client/proxies';
  import type { FieldPath } from '$lib';
  import type { Writable } from 'svelte/store';

  type P = $$Generic<Record<string, unknown>>;

  export let form: Writable<P>;
  export let path: keyof P | FieldPath<P>;

  const proxy = fieldProxy(form, path);
</script>

<label>
  <span>{path}</span><br />
  <input type="text" bind:value={$proxy} {...$$restProps} />
</label>
