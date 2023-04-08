<script>
  import { onMount, tick } from 'svelte';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { schema } from './schemas';

  export let data;

  const { form, tainted, enhance } = superForm(data.form);

  let names = ['fred', 'sally', 'joe', 'mary'];
  let cities = ['Berlin', 'Paris', 'London', 'New York'];

  onMount(async () => {
    $form = {
      ...$form,
      name: names[Math.floor(Math.random() * names.length)],
      city: cities[Math.floor(Math.random() * cities.length)],
      age: Math.floor(Math.random() * 100)
    };
    /*
    $form.name = names[Math.floor(Math.random() * names.length)];
    $form.city = cities[Math.floor(Math.random() * cities.length)];
    $form.age = Math.floor(Math.random() * 100);
    */

    if ($tainted) {
      await tick();
      await tick();
      $tainted = {
        ...$tainted,
        name: undefined,
        city: undefined,
        age: undefined
      };
    }
  });
</script>

<h3>Triple Set via onMount</h3>

<form method="POST" use:enhance>
  <div>
    Name:
    <input type="text" bind:value={$form.name} />
  </div>

  <div>
    city:
    <input type="text" bind:value={$form.city} />
  </div>

  <div>
    Age:
    <input type="number" bind:value={$form.age} />
  </div>

  <div>
    <button type="submit">Submit</button>
    <a href="/">cancel</a>
  </div>
</form>

<h4>form</h4>
<SuperDebug data={$form} />
<h4>tainted</h4>
<SuperDebug data={$tainted} />
