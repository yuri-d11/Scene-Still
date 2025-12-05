(function () {
	window.SZ = window.SZ || {};
	window.SZ.utils = window.SZ.utils || {};

	const sleep = (ms) => new Promise(r => setTimeout(r, ms));

	/**
	 * Fetch with retry, exponential backoff, and redirect-to-HTML detection.
	 * @param {string} url
	 * @param {object} options { method, headers, body, retries, backoffMs, factor, timeoutMs, acceptTypes }
	 * @returns {Promise<{ ok: boolean, status: number, text: string }>} response text wrapper
	 */
	async function fetchWithRetry(url, options = {}) {
		const {
			retries = 3,
			backoffMs = 1000,
			factor = 2,
			timeoutMs = 15000,
			acceptTypes = 'text/csv, text/plain, */*',
			method = 'GET',
			headers = {},
			body
		} = options;

		let lastError;
		for (let attempt = 1; attempt <= retries; attempt++) {
			let timeoutId;
			try {
				const controller = new AbortController();
				timeoutId = setTimeout(() => controller.abort(), timeoutMs);
				
				const response = await fetch(url, {
					method,
					headers: { 'Accept': acceptTypes, 'Cache-Control': 'no-cache', ...headers },
					body,
					redirect: 'follow',
					signal: controller.signal
				});
				clearTimeout(timeoutId);

				const text = await response.text();
				if (!response.ok) {
					throw new Error(`HTTP error ${response.status}`);
				}

				// Detect HTML redirects disguised as CSV/text
				if (window.SZ?.csv?.detectRedirectHTML && window.SZ.csv.detectRedirectHTML(text)) {
					throw new Error('Received HTML instead of expected text response');
				}

				return { ok: true, status: response.status, text };
			} catch (error) {
				if (timeoutId) clearTimeout(timeoutId);
				lastError = error;
				
				// Log attempt for debugging
				console.debug(`Fetch attempt ${attempt}/${retries} failed for ${url}:`, error.message);
				
				if (attempt < retries) {
					const waitTime = backoffMs * Math.pow(factor, attempt - 1);
					console.debug(`Retrying in ${waitTime}ms...`);
					await sleep(waitTime);
					continue;
				}
			}
		}

		return Promise.reject(lastError || new Error('fetchWithRetry failed'));
	}

	window.SZ.http = { fetchWithRetry };
})();
