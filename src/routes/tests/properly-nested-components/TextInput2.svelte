<script lang="ts">
  export let value: string;
  export let label: string;
  export let errors: string[] | undefined;
</script>

<label>
  <span>{label}</span><br />
  <input type="text" bind:value {...$$restProps} />
</label>
{#if errors}<span class="invalid">{errors}</span>{/if}

<style lang="scss">
  input,
  label {
    margin-bottom: 0;
  }

  .invalid {
    color: indianred;
  }
</style>
