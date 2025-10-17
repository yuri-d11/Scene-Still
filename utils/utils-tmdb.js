(function () {
    window.SZ = window.SZ || {};

    const API_KEY = "a1f4af351bf053ea8eea3e836abfd328";
    const BASE_URL = "https://api.themoviedb.org/3";

    async function fetchTmdb(endpoint, params = {}) {
        const query = new URLSearchParams({ api_key: API_KEY, ...params }).toString();
        const url = `${BASE_URL}${endpoint}?${query}`;
        try {
            const response = await window.SZ.http.fetchWithRetry(url);
            if (!response.ok) {
                throw new Error(`TMDb API error: ${response.status}`);
            }
            return JSON.parse(response.text);
        } catch (error) {
            console.error("Error fetching from TMDb:", error);
            return null;
        }
    }

    // Example function to get movie details by ID
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