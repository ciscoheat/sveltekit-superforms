<script lang="ts">
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';
  import TagForm from './TagForm.svelte';

  export let data: PageData;

  let output: (string[] | undefined)[];
  let output2: (string[] | undefined)[];
</script>

<h2>Nested forms</h2>

<h4>With direct client-side validation</h4>

<div class="forms">
  <TagForm bind:output data={data.form} validator="zod" />
  <TagForm bind:output={output2} data={data.form2} validator="superforms" />
</div>

<pre style="margin-top:3rem;">
Zod validate:
{#if output}{output.join('\n')}{/if}
</pre>

<pre style="margin-top:3rem;">
Superforms validate:
{#if output}{output.join('\n')}{/if}
</pre>

<style>
  .forms {
    display: flex;
    gap: 7rem;
  }
</style>
