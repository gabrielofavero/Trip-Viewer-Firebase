const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('esbuild');

const code = transformSync(fs.readFileSync('public/assets/ts/utils/messages.ts', 'utf8'), {
	loader: 'ts',
	format: 'cjs',
}).code;

function setup() {
	const timers = new Map();
	let nextTimer = 0;
	const sandbox = {
		module: { exports: {} },
		exports: {},
		require: () => ({}),
		setTimeout(callback) {
			timers.set(++nextTimer, callback);
			return nextTimer;
		},
		clearTimeout(id) {
			timers.delete(id);
		},
	};
	vm.runInNewContext(code, sandbox);
	const element = new EventTarget();
	element.style = { display: 'flex' };
	const classes = new Set();
	element.classList = {
		add: (name) => classes.add(name),
		remove: (name) => classes.delete(name),
		contains: (name) => classes.has(name),
	};
	return {
		...sandbox.module.exports,
		element,
		flushTimers() {
			const pending = [...timers.values()];
			timers.clear();
			for (const callback of pending) callback();
		},
		animationEnd() {
			element.dispatchEvent(new Event('animationend'));
		},
	};
}

test('an interrupted close cannot hide a reopened card when animation events resume', () => {
	const dialog = setup();
	let completed = 0;
	dialog.animateDialogClose(dialog.element, () => completed++);
	// Backgrounding can suppress animationend; the fallback completes the close.
	dialog.flushTimers();
	assert.equal(completed, 1);
	dialog.animateDialogOpen(dialog.element);
	dialog.animationEnd();
	assert.equal(dialog.element.style.display, 'flex');
	assert.equal(completed, 1);
});

test('animation completion cannot leave a timer that closes a reopened card', () => {
	const dialog = setup();
	let completed = 0;
	dialog.animateDialogClose(dialog.element, () => completed++);
	dialog.animationEnd();
	dialog.animateDialogOpen(dialog.element);
	dialog.flushTimers();
	assert.equal(dialog.element.style.display, 'flex');
	assert.equal(completed, 1);
});

test('reopening during a close cancels its listener, timer and completion callback', () => {
	const dialog = setup();
	let completed = 0;
	dialog.animateDialogClose(dialog.element, () => completed++);
	dialog.animateDialogOpen(dialog.element);
	dialog.animationEnd();
	dialog.flushTimers();
	assert.equal(dialog.element.style.display, 'flex');
	assert.equal(dialog.element.classList.contains('dialog-leave'), false);
	assert.equal(completed, 0);
});

test('a descendant animation ending does not consume the card close listener', () => {
	const dialog = setup();
	let completed = 0;
	dialog.animateDialogClose(dialog.element, () => completed++);
	const childEvent = new Event('animationend');
	Object.defineProperty(childEvent, 'target', { value: new EventTarget() });
	dialog.element.dispatchEvent(childEvent);
	assert.equal(completed, 0);
	dialog.animationEnd();
	assert.equal(completed, 1);
	assert.equal(dialog.element.style.display, 'none');
	dialog.flushTimers();
	assert.equal(completed, 1);
});
