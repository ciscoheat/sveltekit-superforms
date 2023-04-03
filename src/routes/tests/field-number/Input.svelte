<script lang="ts">
  import type { FormField } from '$lib';

  type T = $$Generic<AnyZodObject>;
  type P = $$Generic<keyof z.infer<T>>;

  export let type = 'text';
  export let label: string;
  export let field: FormField<T, P>;
  export let placeholder = '';
  export let labelClasses = '';

  function setType(el: HTMLInputElement) {
    el.type = type;
  }

  $: value = field.value;
  $: errors = field.errors;
  $: constraints = field.constraints;
  $: inputClass = type === 'checkbox' ? 'checkbox' : 'input';
</script>

<div>
  <label class="label {labelClasses}">
    <span>{label}</span>
    <div class="relative block">
      <input
        type="number"
        data-lpignore="true"
        use:setType
        {placeholder}
        bind:value={$value}
        name={field.name}
        {...$constraints}
        data-invalid={$errors}
        class="{inputClass} {$errors ? '!border !border-error-500' : ''}"
      />
    </div>
  </label>
  {#if $errors}
    <span class="flex text-red-500 font-medium">{$errors}</span>
  {/if}
</div>
