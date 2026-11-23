// Deliberately a classic script with no imports: recovery must survive a broken
// module graph or language pack. It never touches account data or auth tokens.
(() => {
	const PARAM = '__tv_recovery';
	const KEY = 'tripviewer:startupRecovery';
	let recovering = false;
	let complete = false;

	// Emergency translations live here because JSON/i18n may be the failed asset.
	const messages = {
		en: {
			title: 'TripViewer could not start',
			message:
				'Please check your connection and try again. If this continues, send the details below to the administrator.',
			retry: 'Clear cache and retry',
		},
		pt: {
			title: 'Não foi possível iniciar o TripViewer',
			message:
				'Verifique sua conexão e tente novamente. Se o problema continuar, envie os detalhes abaixo ao administrador.',
			retry: 'Limpar cache e tentar novamente',
		},
	};
	function translate(key) {
		let language = navigator.language || 'en';
		try {
			language = localStorage.getItem('userLanguage') || language;
		} catch {
			/* storage blocked */
		}
		return (messages[language.split('-')[0]] || messages.en)[key];
	}

	function wasAttempted() {
		// The URL guard still works when Safari blocks sessionStorage entirely.
		if (new URL(location.href).searchParams.has(PARAM)) return true;
		try {
			return sessionStorage.getItem(KEY) === '1';
		} catch {
			return false;
		}
	}

	function showFailure(error) {
		const render = () => {
			const host = document.getElementById('preloader') || document.body;
			const panel = document.createElement('div');
			panel.className = 'message-container';
			panel.setAttribute('role', 'alert');
			const content = document.createElement('div');
			content.className = 'message-text-container';
			for (const [tag, text] of [
				['h2', translate('title')],
				['p', translate('message')],
				['p', error?.message || String(error)],
			]) {
				const element = document.createElement(tag);
				element.textContent = text;
				content.appendChild(element);
			}
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'btn btn-secondary btn-format';
			button.textContent = translate('retry');
			button.addEventListener('click', () => recover(error, true));
			content.appendChild(button);
			panel.appendChild(content);
			host.replaceChildren(panel);
			host.style.display = 'block';
			host.style.opacity = '1';
		};
		if (document.body) render();
		else document.addEventListener('DOMContentLoaded', render, { once: true });
	}

	async function clearCaches() {
		const tasks = [];
		if ('caches' in window) {
			tasks.push(
				window.caches
					.keys()
					.then((keys) => Promise.all(keys.map((key) => window.caches.delete(key)))),
			);
		}
		if ('serviceWorker' in navigator) {
			tasks.push(
				navigator.serviceWorker
					.getRegistrations()
					.then((registrations) =>
						Promise.all(registrations.map((registration) => registration.unregister())),
					),
			);
		}
		// Storage APIs can reject or hang in privacy modes. Neither may block escape.
		await Promise.race([
			Promise.allSettled(tasks),
			new Promise((resolve) => setTimeout(resolve, 2000)),
		]);
	}

	async function recover(error, manual = false) {
		if (window.TRIPVIEWER_STATIC === true || recovering) return;
		console.error('TripViewer startup asset failure:', error);
		if (!manual && (wasAttempted() || navigator.onLine === false)) {
			showFailure(error);
			return;
		}
		recovering = true;
		try {
			sessionStorage.setItem(KEY, '1');
		} catch {
			/* URL guard below */
		}
		try {
			await clearCaches();
		} catch {
			/* unavailable storage must not block reload */
		}
		const url = new URL(location.href);
		url.searchParams.set(PARAM, String(Date.now()));
		// JS cannot evict the HTTP cache. A unique shell URL bypasses it and loads
		// the current, dependency-hashed assets without dropping document params.
		location.replace(url.href);
	}

	window.TripViewerStartup = {
		recover,
		complete() {
			complete = true;
			try {
				sessionStorage.removeItem(KEY);
			} catch {
				/* storage blocked */
			}
			const url = new URL(location.href);
			if (url.searchParams.has(PARAM)) {
				url.searchParams.delete(PARAM);
				history.replaceState(history.state, '', url.href);
			}
		},
	};

	// Failed module fetches can prevent main.ts from executing at all.
	window.addEventListener(
		'error',
		(event) => {
			if (!complete && event.target?.tagName === 'SCRIPT' && event.target.type === 'module') {
				void recover(new Error(`Failed to load module ${event.target.src}`));
			}
		},
		true,
	);
	window.addEventListener('unhandledrejection', (event) => {
		if (
			!complete &&
			/importing a module|module script|dynamically imported module/i.test(
				event.reason?.message || '',
			)
		) {
			event.preventDefault();
			void recover(event.reason);
		}
	});
})();
