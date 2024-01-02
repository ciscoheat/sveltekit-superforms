<script lang="ts">
	import FormBar from './FormBar.svelte';
	import FormFoo from './FormFoo.svelte';
</script>

<FormBar />
<br />
<FormFoo />

<br />
<br />
<div>Steps to reproduce</div>
<ol>
	<li>
		type a name into "Bar Name" (this is simply to observe that the data isn't wiped out when we
		submit "FormFoo")
	</li>
	<li>click "edit" button</li>
	<li>enter "bill" into "Foo Name" field and click submit</li>
	<li>click "edit" button again</li>
	<li>
		enter "error" into "Foo Name" filed and click submit (this will trigger an error to be thrown
		from the action)
	</li>
	<li>obserrve the valuie in "Foo Name" reverts to "bill"</li>
</ol>

<div>
	Important Pieces to look at:
	<ul>
		<li>"throw error" in `+page.server.js`</li>
		<li>"invalidateAll" in `FormFoo.svelte`</li>
	</ul>
</div>

<div>
	Findings:
	<ul>
		<li>
			This appears to only happen when returning an error from an action via "throw error". I wonder
			if it is because "throw error" doens't return the form
		</li>
		<li>
			The issue doesn't happen when you return a message from an action (we also pass back the form)
		</li>
	</ul>
</div>

<style>
	:global(input) {
		background-color: #ddd;
	}
</style>
