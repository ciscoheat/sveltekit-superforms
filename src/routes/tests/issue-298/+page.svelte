<script lang="ts">
  import { z } from 'zod';
  import { superForm as _superForm } from '$lib/client';
  import { superValidateSync } from '$lib/client';

  function ruleSet<T extends readonly [string, ...string[]]>(options: T) {
    let prev: string | undefined = undefined;
    let current = options[0];
    return z
      .object({
        options: z.enum(options).default(options[0] as any),
        prev: z.string().optional()
      })
      .transform((value) => {
        const output = { ...value, prev: prev };
        if (value.options != current) {
          prev = current;
          current = value.options as string;
        }
        return output;
      });
  }

  const r1 = ['r1A', 'r1B', 'r1C'] as const;
  const r2 = ['r2A', 'r2B', 'r2C'] as const;

  const schema = z.object({
    r1: ruleSet(r1),
    r2: ruleSet(r2)
  });

  const superForm = _superForm(superValidateSync(schema), {
    SPA: true,
    dataType: 'json',
    validators: schema,
    taintedMessage: null
  });

  $: ({ form } = superForm);
</script>

<h4>
  {$form.r1.options}-{$form.r1.prev} / {$form.r2.options}-{$form.r2.prev}
</h4>

<form use:superForm.enhance method="post">
  {#each r1 as item}
    <div>
      <input
        value={item}
        bind:group={$form.r1.options}
        type="radio"
        id={item}
        name={item}
      />
      {item}
    </div>
  {/each}

  <hr />

  <select bind:value={$form.r2.options}>
    {#each r2 as item}
      <option value={item}>{item}</option>
    {/each}
  </select>
</form>
