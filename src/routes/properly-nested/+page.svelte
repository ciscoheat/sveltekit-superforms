<script lang="ts">
  import type { PageData } from './$types';
  import Form from './Form.svelte';

  export let data: PageData;
</script>

<h2>Super-nested form</h2>

<Form data={data.form} />
