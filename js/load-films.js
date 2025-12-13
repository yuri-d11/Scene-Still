(function () {
    // Global namespace
    window.SZ = window.SZ || {};
    window.SZ.searchManager = window.SZ.searchManager || {};

    let allFilms = []; // Store all films globally
    let currentSortType = 'alphabetical'; // Default sort type
    let currentSortOrder = 'asc'; // Default sort order (ascending for alphabetical A-Z)
    let currentFilteredFilms = null; // Track current search results

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

    // Sorting functions
    const sortFilms = (films, sortType, sortOrder) => {
        const sorted = [...films];
        
        switch (sortType) {
            case 'time-added':
                // Sort by CSV index (order added)
                sorted.sort((a, b) => {
                    const indexA = a.csvIndex || 0;
                    const indexB = b.csvIndex || 0;
                    return sortOrder === 'asc' ? indexA - indexB : indexB - indexA;
                });
                break;
            
            case 'year':
                // Sort by film year
                sorted.sort((a, b) => {
                    const yearA = parseInt(a.movieYear) || 0;
                    const yearB = parseInt(b.movieYear) || 0;
                    if (yearA === yearB) {
                        // Secondary sort by name if years are equal
                        return removeArticles(a.movieName).localeCompare(removeArticles(b.movieName));
                    }
                    return sortOrder === 'asc' ? yearA - yearB : yearB - yearA;
                });
                break;
            
            case 'alphabetical':
                // Sort alphabetically, ignoring articles
                sorted.sort((a, b) => {
                    const comparison = removeArticles(a.movieName).localeCompare(removeArticles(b.movieName));
                    return sortOrder === 'asc' ? comparison : -comparison;
                });
                break;
        }
        
        return sorted;
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
        const fullTitle = `${film.movieName} (${film.movieYear})`;
        filmCard.innerHTML = `
            <a href="film.html?id=${film.movieId}">
                <img src="${film.poster}" alt="${film.movieName} Poster" width="272" height="350" loading="lazy">
                <h4 title="${fullTitle}">${film.movieName} (${film.movieYear})</h4>
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
                const fullTitle = `${film.movieName} (${film.movieYear})`;
                htmlContent += `
                    <div class="image-card" data-movie-id="${film.movieId}">
                        <a href="film.html?id=${film.movieId}">
                            <img src="${film.poster}" alt="${film.movieName} Poster" width="272" height="350" loading="lazy">
                            <h4 title="${fullTitle}">${film.movieName} (${film.movieYear})</h4>
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

    // Function to update grid columns
    const updateGridColumns = (itemsPerRow) => {
        const container = document.getElementById('film-cards-container');
        if (!container) return;

        // Remove existing column classes
        for (let i = 2; i <= 6; i++) {
            container.classList.remove(`columns-${i}`);
        }

        // Add the new column class
        container.classList.add(`columns-${itemsPerRow}`);
    };

    // Function to fetch and process all film data
    const fetchAllFilms = async () => {
        const container = document.getElementById('film-cards-container');
        
        try {
            // Show loading indicator in the container
            if (container) {
                container.innerHTML = '<h4 class="loading">Loading films...</h4>';
            }

            // Fetch CSV data with timeout
            const csvTimeout = new AbortController();
            const csvTimeoutId = setTimeout(() => csvTimeout.abort(), 15000);
            
            let csvText;
            try {
                const response = await fetch('Scene still DB - Sheet1.csv', { signal: csvTimeout.signal });
                csvText = await response.text();
            } finally {
                clearTimeout(csvTimeoutId);
            }

            const rows = window.SZ.csv.parseCSVToObjects(csvText);

            if (!rows || rows.length === 0) {
                if (container) {
                    container.innerHTML = '<p>No films found.</p>';
                }
                return;
            }

            // Adaptive batch size: faster for desktop, safer for mobile
            const isMobile = /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
            const BATCH_SIZE = isMobile ? 4 : 5; // 4 for mobile, 5 for desktop
            let processedFilms = [];
            
            // Helper function to process a single row with timeout
            const processRow = async (row) => {
                const movieId = row['Movie ID'];
                let movieName = row['Movie Name'] || '';
                let movieYear = row['Movie Year'] || '';
                let poster = row['Poster'] || '';
                let castAndCrewNames = [];

                if (movieId && window.SZ.tmdb) {
                    try {
                        const tmdbDetails = await window.SZ.tmdb.getMovieDetails(movieId);
                        if (tmdbDetails) {
                            movieName = tmdbDetails.title || movieName;
                            const releaseDate = tmdbDetails.release_date;
                            if (releaseDate) {
                                movieYear = new Date(releaseDate).getFullYear() || movieYear;
                            }
                            if (!row['Poster'] && tmdbDetails.poster_path) {
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
                        // Continue with CSV data if TMDB fails
                    }
                }

                return { movieId, movieName, movieYear, poster, castAndCrewNames };
            };

            // Process rows in batches with error handling
            try {
                for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                    const batch = rows.slice(i, i + BATCH_SIZE);
                    const batchPromises = batch.map((row, batchIndex) => 
                        processRow(row).then(result => {
                            if (result) {
                                // Store CSV index for time-added sorting
                                result.csvIndex = i + batchIndex;
                            }
                            return result;
                        })
                    );
                    const batchResults = await Promise.allSettled(batchPromises);
                    
                    // Only add successful results
                    batchResults.forEach(result => {
                        if (result.status === 'fulfilled' && result.value) {
                            processedFilms.push(result.value);
                        }
                    });
                    
                    // Update loading message with progress
                    if (container) {
                        const progress = Math.round((processedFilms.length / rows.length) * 100);
                        container.innerHTML = `<h4 class="loading">Loading films... ${progress}%</h4>`;
                    }
                }
            } catch (batchError) {
                console.error('Error processing batch:', batchError);
                // Continue with whatever films were processed successfully
            }

            if (processedFilms.length === 0) {
                console.warn('No films were successfully processed');
                if (container) {
                    container.innerHTML = '<p>Error loading films. Please refresh the page.</p>';
                }
                return;
            }

            // Store all films (unsorted initially)
            allFilms = processedFilms;

            // Apply initial sorting (time-added, descending by default)
            const sortedFilms = sortFilms(allFilms, currentSortType, currentSortOrder);

            // Clear loading message
            if (container) {
                container.innerHTML = '';
            }

            // Render sorted films
            const isPersonPageCheck = checkIfPersonPage();
            if (!isPersonPageCheck) {
                renderFilmCards(sortedFilms, 'film-cards-container');
            }
        } catch (error) {
            console.error('Error loading or parsing data:', error);
            if (container) {
                container.innerHTML = '<p>Error loading films. Please refresh the page.</p>';
            }
        }
    };

    // Event listener for the histogram buttons
    document.addEventListener('DOMContentLoaded', () => {
        const histogramContainer = document.querySelector('.histogram-container');
        const histogramBars = document.querySelectorAll('.histogram-bar');
        const filmCardsContainer = document.getElementById('film-cards-container');
        const defaultValue = 4;
        const LS_KEY = 'sceneStillGridColumns';

        // If the necessary elements don't exist, do nothing.
        if (!histogramContainer || !histogramBars.length || !filmCardsContainer) {
            return;
        }

        let isMouseDown = false;

        const debounce = (func, delay = 250) => {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    func.apply(this, args);
                }, delay);
            };
        };

        // Save preference to localStorage
        const savePreference = (value) => {
            try {
                localStorage.setItem(LS_KEY, value);
            } catch (e) {}
        };

        // Get preference from localStorage
        const getPreference = () => {
            try {
                const val = localStorage.getItem(LS_KEY);
                const num = parseInt(val, 10);
                if (num >= 2 && num <= 6) return num;
            } catch (e) {}
            return null;
        };

        const updateSelection = (selectedValue, save = true) => {
            // Only update the grid classes if on desktop
            if (window.innerWidth >= 1024) {
                updateGridColumns(selectedValue);
                if (save) savePreference(selectedValue);
            }
            // Update the visual state of the bars
            histogramBars.forEach(bar => {
                const barValue = parseInt(bar.dataset.value, 10);
                bar.classList.toggle('active', barValue <= selectedValue);
            });
        };

        const handleScreenState = () => {
            if (window.innerWidth < 1024) {
                // On small screens, remove any desktop-specific grid classes
                for (let i = 2; i <= 6; i++) {
                    filmCardsContainer.classList.remove(`columns-${i}`);
                }
            } else {
                // On large screens, restore preference or default
                const hasColumnClass = Array.from(filmCardsContainer.classList).some(c => c.startsWith('columns-'));
                const pref = getPreference();
                if (pref) {
                    updateSelection(pref, false);
                } else if (!hasColumnClass) {
                    updateSelection(defaultValue, false);
                }
            }
        };

        // --- Event Listeners ---
        histogramContainer.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            e.preventDefault();
        });

        document.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        histogramBars.forEach(bar => {
            const value = parseInt(bar.dataset.value, 10);
            bar.addEventListener('click', () => updateSelection(value));
            bar.addEventListener('mouseover', () => {
                if (isMouseDown) {
                    updateSelection(value);
                }
            });
        });

        window.addEventListener('resize', debounce(handleScreenState));

        // Set the initial state when the page loads
        handleScreenState();
    });

    // Event listeners for sort controls
    document.addEventListener('DOMContentLoaded', () => {
        const sortSelect = document.getElementById('sort-select');
        const sortOrderToggle = document.getElementById('sort-order-toggle');
        const LS_SORT_TYPE_KEY = 'sceneStillSortType';
        const LS_SORT_ORDER_KEY = 'sceneStillSortOrder';

        if (!sortSelect || !sortOrderToggle) {
            return; // Exit if sort controls don't exist on this page
        }

        // Load saved preferences from localStorage
        const loadSortPreferences = () => {
            try {
                const savedType = localStorage.getItem(LS_SORT_TYPE_KEY);
                const savedOrder = localStorage.getItem(LS_SORT_ORDER_KEY);
                
                if (savedType && ['time-added', 'year', 'alphabetical'].includes(savedType)) {
                    currentSortType = savedType;
                    sortSelect.value = savedType;
                }
                
                if (savedOrder && ['asc', 'desc'].includes(savedOrder)) {
                    currentSortOrder = savedOrder;
                    updateSortOrderButton();
                }
            } catch (e) {
                console.warn('Could not load sort preferences:', e);
            }
        };

        // Save sort preferences to localStorage
        const saveSortPreferences = () => {
            try {
                localStorage.setItem(LS_SORT_TYPE_KEY, currentSortType);
                localStorage.setItem(LS_SORT_ORDER_KEY, currentSortOrder);
            } catch (e) {
                console.warn('Could not save sort preferences:', e);
            }
        };

        // Update the sort order button appearance
        const updateSortOrderButton = () => {
            if (currentSortOrder === 'asc') {
                sortOrderToggle.classList.add('ascending');
                sortOrderToggle.setAttribute('title', 'Ascending');
            } else {
                sortOrderToggle.classList.remove('ascending');
                sortOrderToggle.setAttribute('title', 'Descending');
            }
        };

        // Apply sorting and re-render films
        const applySorting = () => {
            if (allFilms.length === 0) {
                return; // Wait for films to load
            }

            // Use filtered films if search is active, otherwise use all films
            const filmsToSort = currentFilteredFilms || allFilms;
            const sortedFilms = sortFilms(filmsToSort, currentSortType, currentSortOrder);
            const container = document.getElementById('film-cards-container');
            
            if (container) {
                // Use isSearch=true if we're sorting filtered results
                renderFilmCards(sortedFilms, 'film-cards-container', currentFilteredFilms !== null);
            }

            saveSortPreferences();
        };

        // Sort type change handler
        sortSelect.addEventListener('change', (e) => {
            currentSortType = e.target.value;
            applySorting();
        });

        // Sort order toggle handler
        sortOrderToggle.addEventListener('click', () => {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            updateSortOrderButton();
            applySorting();
        });

        // Load preferences on page load
        loadSortPreferences();
    });
    
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
                    const searchResultsHeader = document.getElementById('search-results-section');
                    if (searchResultsHeader) {
                        searchResultsHeader.style.display = 'flex';
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
                    const searchResultsHeader = document.getElementById('search-results-section');
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
                        } else if (el.classList.contains('slider-controls-top')) {
                            // For top slider controls, only show if active AND on mobile (<=768px)
                            const isMobile = window.innerWidth <= 768;
                            el.style.display = (el.classList.contains('active') && isMobile) ? 'flex' : 'none';
                        } else if (el.classList.contains('slider-controls-bottom')) {
                            // For bottom slider controls, restore flex if active
                            el.style.display = el.classList.contains('active') ? 'flex' : 'none';
                        } else if (el.classList.contains('slider-controls')) {
                            el.style.display = 'flex';  // Restore flex display for slider controls
                        } else {
                            el.style.display = 'block';
                        }
                    });
                }
                
                // On person page with empty search, restore the person's films
                if (isPersonPageInSearch) {
                    currentFilteredFilms = null; // Clear search state
                    renderFilmCards(filmsToSearch, config.filmCardsContainerId, true);
                    return;
                }
                
                // Clear search state for non-person pages
                currentFilteredFilms = null;
            }

            // Filter and render films
            const filteredFilms = filmsToSearch.filter(film =>
                film.movieName.toLowerCase().includes(searchTerm) ||
                (film.castAndCrewNames && film.castAndCrewNames.some(name => 
                    name && name.toLowerCase().includes(searchTerm)
                ))
            );
            
            // Apply current sorting to search results
            const sortedFilteredFilms = sortFilms(filteredFilms, currentSortType, currentSortOrder);
            
            // Track filtered films for sorting
            currentFilteredFilms = filteredFilms;
            
            renderFilmCards(sortedFilteredFilms, config.filmCardsContainerId, true);
        });
    };
})();