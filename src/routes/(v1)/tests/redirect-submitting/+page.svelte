<script>
	import { v4 } from 'uuid';
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>Superforms debug app</h1>
	<p>Description: the submitting store will be stuck as true forever in certaint cases</p>
	<p>Repro steps:</p>
	<ol>
		<li>Load this page "fresh" in a browser session</li>
		<li>
			<a href={`/tests/redirect-submitting/${v4()}`}>Open form page</a> (client side navigation)
		</li>
		<li>Submit form</li>
		<li>
			The submit will return a 303 to a different url with the same form. This form is "stuck" with
			$submtting = true forever
		</li>
	</ol>
	<p>
		The issue does not occur if you open the form page directly, omitting the client side navigation
	</p>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}
</style>
