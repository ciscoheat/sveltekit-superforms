<script lang="ts">
  import type { PageData } from './$types';
  import Form from './Form.svelte';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export let data: PageData;

  let isEditing = false;
  const toggleEdit = (enable: boolean) => {
    isEditing = !!enable;
  };

  $: console.log('data.form:', data.form.data);
</script>

<div>isEditing: {isEditing}</div>
{#if isEditing}
  <Form data={data.form} cancel={() => toggleEdit(false)} />
{:else}
  <button type="button" on:click={() => toggleEdit(true)}>Edit</button>
{/if}

<SuperDebug data={data.form} />
