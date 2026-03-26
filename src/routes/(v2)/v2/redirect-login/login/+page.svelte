<script lang="ts">
	import * as flashModule from 'sveltekit-flash-message/client';
	import { superForm } from '$lib/index.js';

	export let data;

	const { form, errors, enhance } = superForm(data.form, {
		syncFlashMessage: true,
		flashMessage: {
			module: flashModule
		},
		onError: 'apply',
		resetForm: false
	});
</script>

<span class="page page-login">
	<main>
		<div class="page-container container-xxl">
			<div class="d-flex">
				<div class="w-lg-500px p-4 p-sm-10 p-lg-15 mx-auto">
					<form class="form w-100" method="POST" action="?/login" use:enhance>
						<div class="text-center mb-10">
							<div class="fv-row mb-10">
								<label class="form-label fs-6 fw-bold text-dark" for="emailInput">Email</label>
								<input
									class="form-control form-control-lg form-control-solid"
									type="text"
									name="email"
									id="emailInput"
									autocomplete="email"
									aria-invalid={$errors.email ? 'true' : undefined}
									bind:value={$form.email}
								/>
								{#if $errors.email}<div class="invalid-feedback">{$errors.email}</div>{/if}
							</div>

							<div class="fv-row mb-10">
								<div class="d-flex flex-stack mb-2">
									<label class="form-label fw-bold text-dark fs-6 mb-0" for="passwordInput"
										>Password</label
									>
								</div>

								<input
									class="form-control form-control-lg form-control-solid"
									type="password"
									name="password"
									id="passwordInput"
									autocomplete="off"
									aria-invalid={$errors.password ? 'true' : undefined}
									bind:value={$form.password}
								/>
								{#if $errors.password}<div class="invalid-feedback">{$errors.password}</div>{/if}
							</div>

							<div class="text-center">
								<button type="submit" id="kt_sign_in_submit" class="btn btn-lg btn-apb w-100 mb-5">
									<span class="indicator-label">Continue</span>
									<!-- <span class="indicator-progress"
                                  >Please wait...
                                  <span class="spinner-border spinner-border-sm align-middle ms-2"></span></span
                              > -->
								</button>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
		<!-- /.post-container -->
	</main>
</span>
