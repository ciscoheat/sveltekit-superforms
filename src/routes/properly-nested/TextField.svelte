<script lang="ts">
  import type { StringPath } from '$lib/stringPath';

  import type { FieldPath, UnwrapEffects } from '$lib';
  import type { SuperForm } from '$lib/client';
  import type { z, AnyZodObject } from 'zod';

  import { formFieldProxy } from '$lib/client';

  type T = $$Generic<AnyZodObject>;

  export let form: SuperForm<UnwrapEffects<T>, unknown>;
  export let field: string & StringPath<z.infer<UnwrapEffects<T>>>;

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
