<script lang="ts">
  import { onMount } from 'svelte';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export let data;

  const { form } = superForm(data.form);

  onMount(() => {
    $form.nested = { foo: 'bar' };
  });
</script>

<SuperDebug data={$form} />
