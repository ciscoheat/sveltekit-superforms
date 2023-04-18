<script lang="ts">
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import type { PageData } from './$types';
  import TagForm from './TagForm.svelte';
  import { schema } from './schema';
  import * as flashModule from 'sveltekit-flash-message/client';

  export let data: PageData;

  const { form, errors, enhance, message, tainted } = superForm(data.form, {
    taintedMessage: null,
    dataType: 'json',
    onUpdate(event) {
      if ($page.url.searchParams.has('cancel')) event.cancel();
    },
    //validators: schema,
    validators: {
      tags: {
        id: (id) => (id < 3 ? 'Id must be larger than 2' : null),
        name: (name) =>
          name.length < 2 ? 'Tags must be at least two characters' : null
      }
    },
    flashMessage: {
      module: flashModule,
      onError({ result, message }) {
        message.set({
          type: 'error',
          message: result.error.message
        });
      }
    }
  });
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
