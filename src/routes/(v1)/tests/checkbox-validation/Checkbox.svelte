<script lang="ts">
	export let label: string;
	export let name: string;
	export let checked: boolean;
</script>

<input type="checkbox" {name} bind:checked /> <span>{label}</span>
