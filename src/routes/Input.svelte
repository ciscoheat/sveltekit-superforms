<script lang="ts">
  import type { FormField } from '$lib';

  type T = $$Generic<AnyZodObject>;
  type P = $$Generic<keyof z.infer<T>>;

  export let type = 'text';
  export let label: string;
  export let field: FormField<T, P>;
  export let placeholder = '';

  function setType(el: HTMLInputElement) {
    el.type = type;
  }

  $: value = field.value;
  $: errors = field.errors;
  $: constraints = field.constraints;
</script>

<label>
  {label}<br /><input
    use:setType
    {placeholder}
    bind:value={$value}
    name={field.name}
    {...$constraints}
    data-invalid={$errors}
  />
  {#if $errors}<span class="invalid">{$errors}</span>{/if}
</label>

<style lang="scss">
  [data-invalid],
  .invalid {
    color: red;
  }
</style>
