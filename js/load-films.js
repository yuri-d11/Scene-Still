(function () {
    // Global namespace
    window.SZ = window.SZ || {};
    window.SZ.searchManager = window.SZ.searchManager || {};

    let allFilms = []; // Store all films globally

    // Load films on the index page immediately
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        document.addEventListener('DOMContentLoaded', () => fetchAllFilms());
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

    // Function to render film cards
    const renderFilmCards = (filmsToRender, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (filmsToRender.length === 0) {
            container.innerHTML = '<p>No films found.</p>';
            return;
        }

        let htmlContent = '';
        filmsToRender.forEach(film => {
            htmlContent += `
                <div class="image-card">
                    <a href="film.html?id=${film.movieId}">
                        <img src="${film.poster}" alt="${film.movieName} Poster">
                        <h4>${film.movieName} (${film.movieYear})</h4>
                    </a>
                </div>
            `;
        });
        container.innerHTML = htmlContent;
    };

    // Function to fetch and process all film data
    const fetchAllFilms = async () => {
        try {
            const response = await fetch('Scene still DB - Sheet1.csv');
            const csvText = await response.text();
            const rows = window.SZ.csv.parseCSVToObjects(csvText);

            const films = [];
            for (const row of rows) {
                const movieId = row['Movie ID'];
                let movieName = row['Movie Name'];
                let movieYear = row['Movie Year'];
                let poster = row['Poster'];
                let castAndCrewNames = [];

                if (movieId) {
                    const tmdbDetails = await window.SZ.tmdb.getMovieDetails(movieId);
                    if (tmdbDetails) {
                        movieName = tmdbDetails.title;
                        movieYear = new Date(tmdbDetails.release_date).getFullYear();
                        if (!row['Poster']) {
                            poster = `https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}`;
                        }

                        // Extract cast and crew names
                        if (tmdbDetails.credits && tmdbDetails.credits.cast) {
                            castAndCrewNames = castAndCrewNames.concat(tmdbDetails.credits.cast.map(person => person.name));
                        }
                        if (tmdbDetails.credits && tmdbDetails.credits.crew) {
                            castAndCrewNames = castAndCrewNames.concat(tmdbDetails.credits.crew.map(person => person.name));
                        }
                    }
                }
                films.push({ movieId, movieName, movieYear, poster, castAndCrewNames });
            }

            // Sort films alphabetically by movieName, ignoring leading articles
            films.sort((a, b) => removeArticles(a.movieName).localeCompare(removeArticles(b.movieName)));
            allFilms = films;

            // Only render all films if we're not on the person page
            const isPersonPage = window.location.pathname.endsWith('person.html');
            if (!isPersonPage) {
                renderFilmCards(allFilms, 'film-cards-container');
            }
        } catch (error) {
            console.error('Error loading or parsing data:', error);
        }
    };

    // Initialize search functionality
    window.SZ.searchManager.initializeSearch = function(config) {
        const searchInput = document.getElementById(config.searchInputId);
        if (!searchInput) return;

        // Start loading films if not on person page
        const isPersonPage = window.location.pathname.endsWith('person.html');
        if (!isPersonPage) {
            fetchAllFilms();
        }

        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const isIndexPage = window.location.pathname.endsWith('index.html') || 
                              window.location.pathname.endsWith('/');
            
            // Use the appropriate films source based on the page
            const filmsToSearch = isPersonPage ? window.SZ.personFilms : allFilms;

            const filmCardsContainer = document.getElementById(config.filmCardsContainerId);

            if (searchTerm.length > 0) {
                // Show search results
                if (filmCardsContainer) {
                    filmCardsContainer.style.display = 'flex';
                }
                
                // Update section header based on page type
                if (isIndexPage) {
                    const sectionHeader = document.querySelector('h4.section_start');
                    if (sectionHeader) {
                        sectionHeader.textContent = 'Search Results:';
                    }
                } else {
                    const searchResultsHeader = document.querySelector('h4.search-results-header');
                    if (searchResultsHeader) {
                        searchResultsHeader.style.display = 'block';
                    }
                }
                
                // Only hide content if keepContentVisible is not true
                if (config.mainContentSelector && !config.keepContentVisible) {
                    document.querySelectorAll(config.mainContentSelector).forEach(el => {
                        el.style.display = 'none';
                    });
                }
            } else {
                // Reset to initial state
                if (filmCardsContainer) {
                    filmCardsContainer.style.display = (isPersonPage || isIndexPage) ? 'flex' : 'none';
                }
                
                // Reset headers based on page type
                if (isIndexPage) {
                    const sectionHeader = document.querySelector('h4.section_start');
                    if (sectionHeader) {
                        sectionHeader.textContent = 'All Films:';
                    }
                } else {
                    const searchResultsHeader = document.querySelector('h4.search-results-header');
                    if (searchResultsHeader) {
                        searchResultsHeader.style.display = 'none';
                    }
                }
                
                // Only show content if it was hidden and keepContentVisible is not true
                if (config.mainContentSelector && !config.keepContentVisible) {
                    document.querySelectorAll(config.mainContentSelector).forEach(el => {
                        if (el.id === 'cast-crew-grid') {
                            el.style.display = 'grid';  // Restore grid display for column-grid
                        } else if (el.id === 'thumbnail-grid') {
                            el.style.display = 'flex';  // Restore flex display for thumbnail grid
                        } else if (el.classList.contains('row')) {
                            el.style.display = 'flex';  // Restore flex display for Bootstrap rows
                        } else {
                            el.style.display = 'block';
                        }
                    });
                }
            }

            // Filter and render films
            const filteredFilms = filmsToSearch.filter(film =>
                film.movieName.toLowerCase().includes(searchTerm) ||
                (film.castAndCrewNames && film.castAndCrewNames.some(name => 
                    name && name.toLowerCase().includes(searchTerm)
                ))
            );
            renderFilmCards(filteredFilms, config.filmCardsContainerId);
        });
    };
})();