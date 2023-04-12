<script lang="ts">
  import type { Validation } from '$lib';
  import type { Schema } from './schemas';
  import { superForm } from '$lib/client';
  import TextInput from './TextInput.svelte';
  import TextFormField from './TextField.svelte';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { fieldProxy, formFieldProxy } from '$lib/client/proxies';

  export let data: Validation<Schema>;

  const form = superForm(data, {
    dataType: 'json'
  });
  const { form: formData, errors, enhance, constraints } = form;

  const proxy1 = formFieldProxy(form, 'name');
  const proxy2 = formFieldProxy(form, ['name']);
  const proxy3 = formFieldProxy(form, ['tags', 3]);
  const proxy4 = formFieldProxy(form, ['luckyNumber']);

  let field1 = fieldProxy(formData, 'luckyNumber');
  /*
  field1 = 123;

  proxy1.value = 'abc';
  proxy2.value = 'abc';
  proxy3.value = { name: 'Test' };
  proxy4.value = 123;
  */
</script>

<SuperDebug data={$formData} />

<form method="POST" use:enhance>
  <section>
    <TextInput label="name" bind:value={$formData.name} />

    <TextFormField {form} field="address" />

    <TextInput
      name="city"
      label="city"
      bind:value={$formData.city}
      errors={$errors.city}
      constraints={$constraints.city}
    />
  </section>

  <section>
    <h4>Tags</h4>
    {#each $formData.tags as _, i}
      {#if i % 2}
        <TextInput
          name="tags"
          label="Name"
          bind:value={$formData.tags[i].name}
          errors={$errors.tags?.[i]?.name}
          constraints={$constraints.tags?.name}
        />
      {:else}
        <TextFormField {form} field={['tags', i, 'name']} />
      {/if}
    {/each}
  </section>

  <section>
    <button>Submit</button>
  </section>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  section {
    display: flex;
    flex-direction: column;

    button {
      align-self: flex-start;
    }
  }

  h4 {
    margin: 0;
    margin-bottom: 1rem;
  }
</style>
