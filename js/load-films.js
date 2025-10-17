document.addEventListener('DOMContentLoaded', async () => {
    const filmCardsContainer = document.querySelector('.image-container'); // Select the correct container

    try {
        const response = await fetch('Scene still DB - Sheet1.csv');
        const csvText = await response.text();
        const rows = parseCSV(csvText);

        let allFilms = [];

        for (const row of rows) {
            const movieId = row['Movie ID'];
            let movieName = row['Movie Name'];
            let movieYear = row['Movie Year'];
            let poster = row['Poster'];

            if (movieId) {
                const tmdbDetails = await getMovieDetails(movieId);
                if (tmdbDetails) {
                    movieName = tmdbDetails.title;
                    movieYear = new Date(tmdbDetails.release_date).getFullYear();
                    if (!row['Poster']) {
                        poster = `https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}`;
                    }
                }
            }
            allFilms.push({ movieName, movieYear, poster, movieId });
        }

        // Helper function to remove leading articles for sorting
        const removeArticles = (title) => {
            if (!title) return '';
            const articles = ['The ', 'A ', 'An '];
            for (const article of articles) {
                if (title.startsWith(article)) {
                    return title.substring(article.length);
                }
            }
            return title;
        };

        // Sort films alphabetically by movieName, ignoring leading articles
        allFilms.sort((a, b) => removeArticles(a.movieName).localeCompare(removeArticles(b.movieName)));

        // Clear existing static content
        filmCardsContainer.innerHTML = '';

        // Populate the container with dynamically generated film cards
        for (const film of allFilms) {
            const filmCard = `
                <div class="image-card">
                    <a href="film.html?id=${film.movieId}">
                        <img src="${film.poster}" alt="${film.movieName} Poster">
                        <h4>${film.movieName} (${film.movieYear})</h4>
                    </a>
                </div>
            `;
            filmCardsContainer.innerHTML += filmCard;
        }

    } catch (error) {
        console.error('Error loading or parsing data:', error);
    }
});
