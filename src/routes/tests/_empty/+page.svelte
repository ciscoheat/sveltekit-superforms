<script lang="ts">
  import { superForm } from '$lib/client';
  import type { PageData } from './$types';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schemas';

  export let data: PageData;

  const { form, errors, enhance } = superForm(data.form, {
    //dataType: 'json',
  });
</script>

<SuperDebug data={$form} />

<form method="POST" use:enhance>
  <button>Submit</button>
</form>

<style lang="scss">
  form {
    margin: 2rem 0;
  }
</style>
