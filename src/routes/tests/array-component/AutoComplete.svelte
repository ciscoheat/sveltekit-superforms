<script lang="ts" context="module">
  import type { AnyZodObject } from 'zod';
  type T = AnyZodObject;
</script>

<script lang="ts" generics="T extends AnyZodObject">
  import type { z } from 'zod';
  import type { ZodValidation, FormPathArrays } from '$lib';
  import type { SuperForm } from '$lib/client';
  import { arrayProxy } from '$lib/client/proxies';

  export let form: SuperForm<ZodValidation<T>, unknown>;
  export let field: FormPathArrays<z.infer<T>>;
  export let options: { value: string; label: string }[];
  export let label = '';

  const { values, errors } = arrayProxy(form, field);
</script>

{#if label}<label for={field}>{label}</label>{/if}

<!-- Note that the selected attribute is required for this to work without JS -->
<select multiple name={field} bind:value={$values}>
  {#each options as option}
    <option value={option.value} selected={$values.includes(option.value)}
      >{option.label}</option
    >
  {/each}
</select>

{#if $errors}<p class="invalid">{$errors}</p>{/if}

<style>
  .invalid {
    color: crimson;
  }
</style>
