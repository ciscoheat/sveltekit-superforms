<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import Input from './Input.svelte';
  export let data: PageData;
  const { form, fields, enhance, delayed } = superForm(data.form, {
    dataType: 'json'
  });

  let selectedIndex = 0;
</script>

<form method="POST" use:enhance>
  <input type="hidden" bind:value={$form.id} />
  <fieldset>
    <Input
      type="checkbox"
      label="Confirm"
      labelClasses="flex items-center space-x-2"
      field={fields.confirm}
      placeholder="Confirm"
    />
  </fieldset>
  <select class="select" bind:value={selectedIndex}>
    {#each $form.addresses as address, index}
      <option value={index}>{address.name}</option>
    {/each}
  </select>
  {#each $form.addresses as address, i}
    {#if i === selectedIndex}
      <Input
        type="text"
        label="Name"
        field={fields.addresses[i].name}
        placeholder="Name"
      />
      <Input
        type="text"
        label="Address 1"
        field={fields.addresses[i].address1}
        placeholder="Address 1"
      />
      <Input
        type="text"
        label="Address 2"
        field={fields.addresses[i].address2}
        placeholder="Address 2"
      />
    {/if}
  {/each}
</form>
