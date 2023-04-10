<script lang="ts">
  export let data;
  export let name: string;

  const { form, errors, constraints } = data;
</script>

<input
  type="text"
  bind:value={$form[name]}
  {...$constraints[name]}
  {...$$restProps}
/>
