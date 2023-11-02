<script lang="ts" context="module">
  import type { AnyZodObject } from 'zod';
  type T = AnyZodObject;
</script>

<script lang="ts" generics="T extends AnyZodObject">
  import type { z } from 'zod';
  import type { ZodValidation, FormPath, FormPathArrays } from '$lib';
  import type { Writable } from 'svelte/store';
  import { fieldProxy, type SuperForm } from '$lib/client';

  export let form: SuperForm<ZodValidation<T>, unknown>;
  export let field: FormPathArrays<z.infer<T>>;
  export let options: { value: string; label: string }[];
  export let label = '';

  const value = fieldProxy(form.form, field) as Writable<unknown[]>;
  const errors = fieldProxy(
    form.errors,
    `${field}._errors` as FormPath<z.infer<T>>
  );
</script>

{#if label}<label for={field}>{label}</label>{/if}

<!-- Note that the selected attribute is required for this to work without JS -->
<select multiple name={field} bind:value={$value}>
  {#each options as option}
    <option value={option.value} selected={$value.includes(option.value)}
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
