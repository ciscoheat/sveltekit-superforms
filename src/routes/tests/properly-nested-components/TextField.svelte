<script lang="ts">
  import type { FieldPath, UnwrapEffects } from '$lib';
  import type { SuperForm } from '$lib/client';
  import type { z, AnyZodObject } from 'zod';

  import { formFieldProxy } from '$lib/client/proxies';

  type T = $$Generic<AnyZodObject>;

  export let form: SuperForm<UnwrapEffects<T>, unknown>;
  export let field: keyof z.infer<T> | FieldPath<z.infer<T>>;

  const { path, value, errors, constraints } = formFieldProxy(form, field);
</script>

<label>
  {String(path)}<br />
  <input
    type="text"
    data-invalid={$errors}
    bind:value={$value}
    {...$constraints}
    {...$$restProps}
  />
</label>
{#if $errors}<span class="invalid">{$errors}</span>{/if}

<style lang="scss">
  .invalid {
    color: orangered;
  }
</style>
