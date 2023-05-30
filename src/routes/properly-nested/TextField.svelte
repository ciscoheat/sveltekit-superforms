<script lang="ts">
  import type { z, AnyZodObject } from 'zod';
  import type { ZodValidation, StringPathLeaves } from '$lib';
  import { formFieldProxy, type SuperForm } from '$lib/client';

  type T = $$Generic<AnyZodObject>;

  export let form: SuperForm<ZodValidation<T>, unknown>;
  export let field: string & StringPathLeaves<z.infer<T>>;

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
