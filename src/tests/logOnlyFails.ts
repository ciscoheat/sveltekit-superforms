import { type TestContext } from 'vitest';

const loggers = ['log', 'debug', 'trace', 'info', 'warn', 'error'] as const;

type LogFunction = (...args: unknown[]) => void;
type LoggedInvocation = [LogFunction, unknown[]];

export const logOnlyFails = (ctx: TestContext) => {
	const logs: LoggedInvocation[] = [];

	const original: Record<string, LogFunction> = {};
	for (const logger of loggers) {
		original[logger] = console[logger];
		console[logger] = (...args) => logs.push([original[logger], args]);
	}

	ctx.onTestFailed(() => {
		for (const [logger, data] of logs) {
			logger.call(console, ...data);
		}
	});

	return () => {
		for (const logger of loggers) {
			console[logger] = original[logger];
		}
	};
};
