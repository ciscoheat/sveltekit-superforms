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
</script>

<label>
  {label}<br /><input
    use:setType
    {placeholder}
    bind:value={$value}
    name={field.name}
    {...field.constraints}
    data-invalid={field.errors}
  />
  {#if field.errors}<span class="invalid">{field.errors}</span>{/if}
</label>

<style lang="scss">
  [data-invalid],
  .invalid {
    color: red;
  }
</style>
