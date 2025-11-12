// Initialize global namespace
window.SZ = window.SZ || {};
window.SZ.personFilms = [];

// Update page title and canonical URL immediately (before DOMContentLoaded) for better Google indexing
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const personName = urlParams.get('name');
    const personRole = urlParams.get('role');
    if (personName && personRole) {
        // Update title as soon as script loads
        if (document.getElementById('page-title')) {
            document.getElementById('page-title').textContent = `${personName} - ${personRole} | Scene Still`;
        }
        
        // Set canonical URL using clean URL format (no .html, proper encoding)
        const cleanUrl = `https://www.scenestill.com/person?name=${encodeURIComponent(personName)}&role=${encodeURIComponent(personRole)}`;
        const canonicalTag = document.getElementById('canonical-url');
        if (canonicalTag) {
            canonicalTag.setAttribute('href', cleanUrl);
        }
        
        // Also update og:url and twitter:url immediately for consistency
        const ogUrlTag = document.getElementById('og-url');
        if (ogUrlTag) {
            ogUrlTag.setAttribute('content', cleanUrl);
        }
        const twitterUrlTag = document.getElementById('twitter-url');
        if (twitterUrlTag) {
            twitterUrlTag.setAttribute('content', cleanUrl);
        }
    }
})();

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Person page data loading...');
    const urlParams = new URLSearchParams(window.location.search);
    const personName = urlParams.get('name');
    const personRole = urlParams.get('role');

    if (!personName || !personRole) {
        console.error('Person name or role not found in URL parameters.');
        return;
    }
    
    console.log(`Loading films for ${personName} (${personRole})...`);

    document.querySelector('h1').textContent = personName;
    document.getElementById('page-title').textContent = `${personName} - ${personRole} | Scene Still`;
    document.getElementById('meta-description').content = `Explore ${personName}'s filmography with handpicked high quality film screencaptures from their ${personRole.toLowerCase()} work.`;
    document.querySelector('h4').textContent = personRole;
    
    // Update Open Graph tags
    const ogTitle = `${personName} - ${personRole}`;
    const ogDescription = `Explore ${personName}'s filmography with handpicked high quality film screencaptures from their ${personRole.toLowerCase()} work.`;
    
    // Canonical URL and social URLs are already set in the synchronous IIFE above
    
    document.getElementById('og-type').setAttribute('content', 'profile');
    document.getElementById('og-title').setAttribute('content', ogTitle);
    document.getElementById('og-description').setAttribute('content', ogDescription);
    
    document.getElementById('twitter-card').setAttribute('content', 'summary_large_image');
    document.getElementById('twitter-title').setAttribute('content', ogTitle);
    document.getElementById('twitter-description').setAttribute('content', ogDescription);
    
    let roleText = `${personRole} Films:`;
    if (personRole === 'Director') {
        roleText = 'Directed Films:';
    } else if (personRole === 'Cinematographer') {
        roleText = 'Shot Films:';
    } else if (personRole === 'Actor') {
        roleText = 'Starring Films:';
    }
    document.querySelector('.section_start').textContent = roleText;
    const filmCardsContainer = document.getElementById('film-cards-container');
    
    // Clear the container first
    filmCardsContainer.innerHTML = '';

    try {
        const response = await fetch('Scene still DB - Sheet1.csv');
        const csvText = await response.text();
        const rows = window.SZ.csv.parseCSVToObjects(csvText);

        let firstPosterSet = false; // Track if we've set the OG image yet

        for (const row of rows) {
            const movieId = row['Movie ID'];
            let movieName = row['Movie Name'];
            let movieYear = row['Movie Year'];
            let director = row['Director'];
            let cinematographer = row['Cinematographer'];
            let cast = row['Cast'] ? row['Cast'].split('|') : [];
            let poster = row['Poster'];

            if (movieId) {
                const tmdbDetails = await window.SZ.tmdb.getMovieDetails(movieId);
                if (tmdbDetails) {
                    movieName = tmdbDetails.title;
                    movieYear = new Date(tmdbDetails.release_date).getFullYear();
                    // Only update poster from TMDB if no manual poster is provided in CSV
                    if (!row['Poster']) {
                        poster = `https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}`;
                    }

                    director = tmdbDetails.credits.crew.find(crew => crew.job === 'Director')?.name || director;
                    cinematographer = tmdbDetails.credits.crew.find(crew => crew.job === 'Director of Photography')?.name || cinematographer;
                    cast = tmdbDetails.credits.cast.map(actor => actor.name) || cast;
                }
            }

            let isRelated = false;
            if (personRole === 'Director' && director === personName) {
                isRelated = true;
            } else if (personRole === 'Cinematographer' && cinematographer === personName) {
                isRelated = true;
            } else if (personRole === 'Actor' && cast.includes(personName)) {
                isRelated = true;
            }

            if (isRelated) {
                // Set the first film's poster as the Open Graph image
                if (!firstPosterSet && poster) {
                    document.getElementById('og-image').setAttribute('content', poster);
                    document.getElementById('twitter-image').setAttribute('content', poster);
                    firstPosterSet = true;
                }

                // Add to person films array for search functionality
                window.SZ.personFilms.push({
                    movieId,
                    movieName,
                    movieYear,
                    poster,
                    castAndCrewNames: [director, cinematographer, ...cast].filter(Boolean)
                });

                const filmCard = `
                    <div class="image-card" data-movie-id="${movieId}">
                        <a href="film.html?id=${movieId}">
                            <img src="${poster}" alt="${movieName}">
                            <h4>${movieName} (${movieYear})</h4>
                        </a>
                    </div>
                `;
                filmCardsContainer.innerHTML += filmCard;
            }
        }
        
        console.log(`Loaded ${window.SZ.personFilms.length} films for ${personName}`);
    } catch (error) {
        console.error('Error loading or parsing data:', error);
    }
});