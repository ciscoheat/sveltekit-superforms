<script lang="ts">
  import type { SuperForm } from '$lib/client';

  import { formFieldProxy } from '$lib/client/proxies';
  import type { FieldPath } from '$lib';
  import type { z, AnyZodObject } from 'zod';

  type T = $$Generic<AnyZodObject>;

  export let form: SuperForm<T, any>;
  export let path: keyof z.infer<T> | FieldPath<z.infer<T>>;

  const data = formFieldProxy(form, path);

  $: name = String(path);
  $: value = data.value;
  $: errors = data.errors;
  $: constraints = data.constraints;
</script>

<label>
  {name}<br />
  <input
    type="text"
    data-invalid={$errors}
    bind:value={$value}
    {...$$restProps}
  />
  {#if $errors}<span class="invalid">{$errors}</span>{/if}
</label>
