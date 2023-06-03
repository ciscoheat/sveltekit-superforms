<script lang="ts">
  import type { Writable } from 'svelte/store';
  import type { ZodValidation, FormPathLeaves } from '$lib';
  import { dateProxy, formFieldProxy, type SuperForm } from '$lib/client';
  import type { z, AnyZodObject } from 'zod';

  type T = $$Generic<AnyZodObject>;
  export let form: SuperForm<ZodValidation<T>, unknown>;
  export let field: FormPathLeaves<z.infer<T>>;
  export let type:
    | 'text'
    | 'password'
    | 'email'
    | 'number'
    | 'email'
    | 'date'
    | 'datetime'
    | 'checkbox' = 'text';

  export let label: string;

  const fieldProxy = formFieldProxy(form, field);
  const { errors, constraints, value } = fieldProxy;

  let proxy: Writable<string> | undefined;

  if (type === 'date') {
    proxy = dateProxy(form.form, field, {
      format: 'date'
    });
  } else if (type === 'datetime') {
    proxy = dateProxy(form.form, field, {
      format: 'datetime'
    });
  }
  $: boolValue = value as Writable<boolean>;
</script>

<label
  for={String(field)}
  class={type === 'checkbox' ? 'flex items-center pt-2 space-x-2' : ''}
  >{#if type !== 'checkbox'}<span>{label}</span>{/if}
  {#if type === 'checkbox'}
    <input
      type="checkbox"
      class="checkbox"
      bind:checked={$boolValue}
      {...$constraints}
      {...$$restProps}
    />
  {:else if type === 'date'}
    <input
      type="date"
      class="input"
      name={String(field)}
      bind:value={$proxy}
      {...$$restProps}
    />
  {:else if type === 'datetime'}
    <input
      type="datetime-local"
      class="input"
      name={String(field)}
      bind:value={$proxy}
      {...$$restProps}
    />
  {:else if type === 'email'}
    <input
      type="email"
      class="input"
      name={String(field)}
      bind:value={$value}
      {...$constraints}
      {...$$restProps}
    />
  {:else if type === 'number'}
    <input
      type="number"
      class="input"
      name={String(field)}
      bind:value={$value}
      {...$constraints}
      {...$$restProps}
    />
  {:else if type === 'password'}
    <input
      type="password"
      class="input"
      name={String(field)}
      bind:value={$value}
      {...$constraints}
      {...$$restProps}
    />
  {:else}
    <input
      type="text"
      class="input"
      name={String(field)}
      bind:value={$value}
      {...$constraints}
      {...$$restProps}
    />
  {/if}
  {#if type === 'checkbox'}<span>{label}</span>{/if}
</label>
{#if $errors}<span class="invalid">{$errors}</span>{/if}
