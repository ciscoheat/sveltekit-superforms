<script lang="ts">
  import { z } from 'zod';
  import { superForm as _superForm } from '$lib/client';
  import { superValidateSync } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';

  export const timePatternSchema = z.object({
    recurrenceRuleSets: z
      .object({
        endType: z.enum(['never', 'date', 'after']),
        rrule: z.string()
      })
      .transform((value) => {
        let newRrule = 'after';
        console.log({ ...value, rrule: newRrule });
        return { ...value, rrule: newRrule };
      })
  });

  const superForm = _superForm(superValidateSync(timePatternSchema), {
    SPA: true,
    dataType: 'json',
    validators: timePatternSchema,
    taintedMessage: null
  });

  $: ({ form } = superForm);
</script>

<SuperDebug data={$form} />

<form use:superForm.enhance method="post">
  {#each ['never', 'date', 'after'] as item}
    <div>
      <input
        value={item}
        bind:group={$form.recurrenceRuleSets.endType}
        type="radio"
        id={item}
        name={item}
      />
      {item}
    </div>
  {/each}
</form>
