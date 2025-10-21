(function () {
    // Global namespace
    window.SZ = window.SZ || {};
    window.SZ.searchManager = window.SZ.searchManager || {};

    let allFilms = []; // Store all films globally

    // Helper to detect person page
    const checkIfPersonPage = () => {
        const path = window.location.pathname;
        return path.includes('person.html') || path.endsWith('/person') || path.includes('/person?');
    };

    // Load films on the index page immediately
    const isIndexPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname.endsWith('/') || 
                        window.location.pathname.endsWith('index');
    const isPersonPage = checkIfPersonPage();
    
    if (isIndexPage && !isPersonPage) {
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

    // Function to render a single film card
    const renderFilmCard = (film, container, position = null) => {
        // Check if film already exists
        const existingCard = container.querySelector(`[data-movie-id="${film.movieId}"]`);
        if (existingCard) {
            return;
        }

        const filmCard = document.createElement('div');
        filmCard.className = 'image-card';
        filmCard.setAttribute('data-movie-id', film.movieId);
        filmCard.innerHTML = `
            <a href="film.html?id=${film.movieId}">
                <img src="${film.poster}" alt="${film.movieName} Poster">
                <h4>${film.movieName} (${film.movieYear})</h4>
            </a>
        `;

        if (position === null || position >= container.children.length) {
            container.appendChild(filmCard);
        } else {
            container.insertBefore(filmCard, container.children[position]);
        }
    };

    // Function to render film cards
    const renderFilmCards = (filmsToRender, containerId, isSearch = false) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear and show "no results" if empty
        if (filmsToRender.length === 0) {
            container.innerHTML = '<p>No films found.</p>';
            return;
        }

        // For search results or when rendering all films at once
        if (isSearch) {
            container.innerHTML = '';
            let htmlContent = '';
            filmsToRender.forEach(film => {
                htmlContent += `
                    <div class="image-card" data-movie-id="${film.movieId}">
                        <a href="film.html?id=${film.movieId}">
                            <img src="${film.poster}" alt="${film.movieName} Poster">
                            <h4>${film.movieName} (${film.movieYear})</h4>
                        </a>
                    </div>
                `;
            });
            container.innerHTML = htmlContent;
        } else {
            // For initial loading, render incrementally
            container.innerHTML = '';
            filmsToRender.forEach((film, index) => {
                renderFilmCard(film, container);
            });
        }
    };

    // Function to fetch and process all film data
    const fetchAllFilms = async () => {
        try {
            // Show loading indicator in the container
            const container = document.getElementById('film-cards-container');
            if (container) {
                container.innerHTML = '<h4 class="loading">Loading films...</h4>';
            }

            // Fetch CSV data
            const response = await fetch('Scene still DB - Sheet1.csv');
            const csvText = await response.text();
            const rows = window.SZ.csv.parseCSVToObjects(csvText);

            // Clear loading message but keep container empty for incremental loading
            if (container) {
                container.innerHTML = '';
            }

            // Process films one by one
            let processedFilms = [];
            for (const row of rows) {
                const movieId = row['Movie ID'];
                let movieName = row['Movie Name'];
                let movieYear = row['Movie Year'];
                let poster = row['Poster'];
                let castAndCrewNames = [];

                if (movieId) {
                    try {
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
                    } catch (error) {
                        console.warn(`Failed to fetch TMDB details for movie ${movieId}:`, error);
                    }
                }

                const film = { movieId, movieName, movieYear, poster, castAndCrewNames };
                
                // Find the correct position to insert the new film
                const insertIndex = processedFilms.findIndex(existing => 
                    removeArticles(existing.movieName).localeCompare(removeArticles(film.movieName)) > 0
                );
                
                // Add to processed films array at the correct position
                if (insertIndex === -1) {
                    processedFilms.push(film);
                } else {
                    processedFilms.splice(insertIndex, 0, film);
                }
                
                allFilms = processedFilms;

                // Only render if we're on the index page
                const isPersonPageCheck = checkIfPersonPage();
                if (!isPersonPageCheck) {
                    const container = document.getElementById('film-cards-container');
                    if (container) {
                        renderFilmCard(film, container, insertIndex);
                    }
                }
            }

            // Sort films alphabetically by movieName, ignoring leading articles
            allFilms = processedFilms.sort((a, b) => removeArticles(a.movieName).localeCompare(removeArticles(b.movieName)));

            // Only render all films if we're not on the person page
            const isPersonPageCheck = checkIfPersonPage();
            if (!isPersonPageCheck) {
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
        const isPersonPage = checkIfPersonPage();
        console.log('Search initialized. Is person page?', isPersonPage, 'Path:', window.location.pathname);
        if (!isPersonPage) {
            console.log('Loading all films for index page...');
            fetchAllFilms();
        } else {
            console.log('Person page detected, using personFilms array');
        }

        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const isIndexPage = window.location.pathname.endsWith('index.html') || 
                              window.location.pathname.endsWith('/') ||
                              window.location.pathname.endsWith('index');
            const isPersonPageInSearch = checkIfPersonPage();
            
            // Use the appropriate films source based on the page
            const filmsToSearch = isPersonPageInSearch ? (window.SZ.personFilms || []) : allFilms;

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
                    filmCardsContainer.style.display = (isPersonPageInSearch || isIndexPage) ? 'flex' : 'none';
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
                        } else if (el.classList.contains('slider-controls')) {
                            el.style.display = 'flex';  // Restore flex display for slider controls
                        } else {
                            el.style.display = 'block';
                        }
                    });
                }
                
                // On person page with empty search, restore the person's films
                if (isPersonPageInSearch) {
                    renderFilmCards(filmsToSearch, config.filmCardsContainerId, true);
                    return;
                }
            }

            // Filter and render films
            const filteredFilms = filmsToSearch.filter(film =>
                film.movieName.toLowerCase().includes(searchTerm) ||
                (film.castAndCrewNames && film.castAndCrewNames.some(name => 
                    name && name.toLowerCase().includes(searchTerm)
                ))
            );
            renderFilmCards(filteredFilms, config.filmCardsContainerId, true);
        });
    };
})();