(function () {
    window.SZ = window.SZ || {};

    const API_KEY = "a1f4af351bf053ea8eea3e836abfd328";
    const BASE_URL = "https://api.themoviedb.org/3";
    
    // Create cache instance for TMDB data (7 days TTL)
    const tmdbCache = window.SZ.cache.createCache('tmdb');
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

	async function fetchTmdb(endpoint, params = {}) {
		const query = new URLSearchParams({ api_key: API_KEY, ...params }).toString();
		const url = `${BASE_URL}${endpoint}?${query}`;
		
		// Check cache first
		const cacheKey = `${endpoint}:${query}`;
		const cached = tmdbCache.get(cacheKey);
		if (cached) {
			return cached;
		}
		
		try {
			// Use shorter timeout on mobile networks, reduced retries
			const isMobile = /Mobile|Android|iPhone/.test(navigator.userAgent);
			const fetchOptions = {
				retries: isMobile ? 2 : 3,
				backoffMs: 500,
				timeoutMs: isMobile ? 10000 : 15000
			};
			
			const response = await window.SZ.http.fetchWithRetry(url, fetchOptions);
			if (!response.ok) {
				throw new Error(`TMDb API error: ${response.status}`);
			}
			const data = JSON.parse(response.text);
			
			// Cache the response
			tmdbCache.set(cacheKey, data, CACHE_TTL);
			
			return data;
		} catch (error) {
			console.error("Error fetching from TMDb:", error);
			// Return null on error, allowing fallback to CSV data
			return null;
		}
	}    // Example function to get movie details by ID
    async function getMovieDetails(movieId) {
        return fetchTmdb(`/movie/${movieId}`, { append_to_response: 'credits,images' });
    }

    // Example function to search for movies
    async function searchMovies(query) {
        return fetchTmdb(`/search/movie`, { query });
    }

    window.SZ.tmdb = {
        fetchTmdb,
        getMovieDetails,
        searchMovies
    };
})();