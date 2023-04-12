<script lang="ts">
  import type { InputConstraint } from '$lib';

  export let value: string;

  export let label: string | undefined = undefined;
  export let errors: string[] | undefined = undefined;
  export let constraints: InputConstraint | undefined = undefined;
</script>

<div>
  <label>
    {#if label}<span>{label}</span><br />{/if}
    <input type="text" bind:value {...constraints} {...$$restProps} />
  </label>
  {#if errors}<span class="invalid">{errors}</span>{/if}
</div>

<style lang="scss">
  input,
  label {
    margin-bottom: 0;
  }

  .invalid {
    color: indianred;
  }
</style>
