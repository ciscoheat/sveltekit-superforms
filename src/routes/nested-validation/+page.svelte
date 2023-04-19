<script lang="ts">
  import type { PageData } from './$types';
  import TagForm from './TagForm.svelte';

  export let data: PageData;
</script>

<h2>Nested forms</h2>

<h4>With direct client-side validation</h4>

<div class="forms">
  <TagForm data={data.form} validator="zod" />
  <TagForm data={data.form2} validator="superforms" />
</div>

<style>
  .forms {
    display: flex;
    gap: 7rem;
  }
</style>
