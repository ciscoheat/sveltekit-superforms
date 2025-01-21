<script lang="ts">
	const testDirs = [
		'allow-files',
		'array-proxy',
		'boolean-same-union',
		'catchall',
		'components',
		'custom-tainted-dialog',
		'defaults-fail',
		'dynamic-validators',
		'empty-enum',
		'issue-309-unions',
		'issue-332-arrays',
		'issue-337-checkboxes',
		'issue-345',
		'letters',
		'multiple-files',
		'multistep-client',
		'multistep-server',
		'nested-files',
		'nested-validation-valibot',
		'on-change-event',
		'oninput-errors',
		'posted',
		'redirect',
		'step-form',
		'submit-enter',
		'submit-json',
		'trim-fields',
		'unions',
		'valibot-dates',
		'valibot-nullable',
		'validate',
		'validate-update',
		'validators-clear',
		'submit-prog',
		'modify-reset',
		'index-errors',
		'onchange-target',
		'issue-356',
		'issue-358',
		'issue-360',
		'unknown-in-schema',
		'issue-374',
		'issue-366',
		'issue-368',
		'zod-discriminated',
		'syncflash',
		'redirect-login',
		'debounce-username',
		'mixed-forms',
		'custom-validity',
		'file-component',
		'tainted-history',
		'files-proxy',
		'tainted-array',
		'spa-clearonsubmit',
		'app-error',
		'form-result-type',
		'nested-traverse',
		'reset-errors',
		'schemasafe-types',
		'discriminated-union',
		'simple-tainted',
		'validity-objects',
		'issue-466',
		'spa-error',
		'issue-470',
		'issue-484',
		'component-regen',
		'issue-485',
		'arktype',
		'effect',
		'issue-500',
		'typebox',
		'transport',
		'bigint',
		'issue-455',
		'vine',
		'timeproxy'
	].sort();
</script>

<nav class="flex-list">
	<ul>
		<li><a href="/">v1</a></li>
		<li><a href="/v2">v2</a></li>
		{#each testDirs as dir}
			<li><a href="/v2/{dir}">{dir}</a></li>
		{/each}
	</ul>
</nav>

<style lang="scss">
	.flex-list {
		position: relative;
		overflow: hidden;
	}
	.flex-list ul {
		padding: 0;
		list-style-type: none;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-between;
		margin-left: -1px;
	}
	.flex-list li {
		flex-grow: 1;
		flex-basis: auto;
		margin: 0;
		padding: 0 0.2em;
		text-align: center;
		border-left: 1px solid #bbb;
	}
</style>
