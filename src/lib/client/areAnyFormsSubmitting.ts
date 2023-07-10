import { writable, derived } from 'svelte/store';

const submittingForms = writable<Set<HTMLFormElement>>(new Set());
export const areAnyFormsSubmitting = derived(
  submittingForms,
  ($submittingForms) => $submittingForms.size > 0
);

export const addSubmittingForm = (formEl: HTMLFormElement) => {
  submittingForms.update((formEls) => {
    formEls.add(formEl);
    return formEls;
  });
};

export const removeSubmittingForm = (formEl: HTMLFormElement) => {
  submittingForms.update((formEls) => {
    formEls.delete(formEl);
    return formEls;
  });
};
