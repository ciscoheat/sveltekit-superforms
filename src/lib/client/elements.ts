// https://stackoverflow.com/a/7557433/70894
export const isElementInViewport = (el: Element, topOffset = 0) => {
	const rect = el.getBoundingClientRect();
	return (
		rect.top >= topOffset &&
		rect.left >= 0 &&
		rect.bottom <=
			(window.innerHeight || document.documentElement.clientHeight) /* or $(window).height() */ &&
		rect.right <=
			(window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
	);
};

// https://stackoverflow.com/a/36499256/70894
export const scrollToAndCenter = (
	el: Element,
	offset = 1.125,
	behavior: ScrollBehavior = 'smooth'
) => {
	const elementRect = el.getBoundingClientRect();
	const absoluteElementTop = elementRect.top + window.pageYOffset;
	const top = absoluteElementTop - window.innerHeight / (2 * offset);
	window.scrollTo({ left: 0, top, behavior });
};

const immediateInputTypes = ['checkbox', 'radio', 'range'];

export function isImmediateInput(el: EventTarget | null) {
	return (
		el &&
		(el instanceof HTMLSelectElement ||
			(el instanceof HTMLInputElement && immediateInputTypes.includes(el.type)))
	);
}
