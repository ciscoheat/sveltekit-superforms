<script lang="ts">
  import type { UnwrapEffects } from '$lib';
  import type { SuperForm } from '$lib/client';

  import { formFieldProxy } from '$lib/client/proxies';
  import type { FieldPath } from '$lib';
  import type { z, AnyZodObject } from 'zod';

  type T = $$Generic<AnyZodObject>;

  export let form: SuperForm<UnwrapEffects<T>, unknown>;
  export let field: keyof z.infer<T> | FieldPath<z.infer<T>>;

  const data = formFieldProxy(form, field);

  $: name = String(field);
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
    {...$constraints}
    {...$$restProps}
  />
</label>
{#if $errors}<span class="invalid">{$errors}</span>{/if}

<style lang="scss">
  div {
    margin-top: 1rem;

    input {
      margin-bottom: 0;
    }

    label {
      margin-top: 2rem;
    }
  }

  .invalid {
    color: orangered;
  }
</style>
