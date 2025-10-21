# Website Project Tasks

This document outlines the tasks for enhancing the Scene Still website with new features and performance improvements.

## Completed Tasks

## In Progress Tasks

- [x] **Integrate The Movie Database (TMDb) API**:
    - [x] Create `utils-tmdb.js` to handle API requests.
    - [x] Fetch director, cinematographer, and cast for movie pages.
    - [x] Fetch movie posters for the Films page.
    - [x] Fetch cast information for the Cast & Crew page.
    - [x] Dynamically update the Cast & Crew page based on all movie pages.
- [x] **Dynamically Load Films Page**:
    - [x] Populate `films.html` with all movies from `Scene still DB - Sheet1.csv` in alphabetical order.
- [x] **Implement Dynamic Search Functionality**:
    - [x] Create a search function that filters movies and cast dynamically as the user types.
    - [x] Update the page content based on search results.
- [x] **Improve Image Loading Performance**:
    - [x] Use local images for `barry_lyndon.html` instead of TMDb images.
    - [x] Create 16 thumbnail elements for `barry_lyndon.html` with the first image as the main image.
    - [x] Ensure color palette extractor works correctly with local images on movie pages.
    - [x] Implement image compression for movie stills.
    - [x] Display compressed images for thumbnails on movie pages.
    - [x] Load original size images when a thumbnail is clicked for the main image.

## Future Tasks

- [x] **Create User Image Color Palette Extraction Page**:
    - [x] Design a page for users to upload images.
    - [x] Implement JavaScript to extract a color palette from uploaded images, reusing existing `color-palette.js` functionality.
- [x] **Implement Lazy Loading for Films Page**:
    - [x] Apply lazy loading to movie posters on the Films page to improve initial load times.

## Implementation Plan

### 1. The Movie Database (TMDb) API Integration
- **Goal**: Replace static CSV data with dynamic data from TMDb for movie and cast information.
- **Steps**:
    - Obtain a TMDb API key.
    - Create a new utility script (e.g., `utils-tmdb.js`) to handle API requests.
    - Modify movie pages (`barry_lyndon.html`, `dune2.html`, etc.) to fetch and display data from TMDb.
    - Update `films.html` to display movie posters from TMDb.
    - Update `cast_crew.html` to display cast information from TMDb.
- **Relevant Files**:
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\utils\utils-tmdb.js` (new) - Handles TMDb API calls.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\barry_lyndon.html` - Example movie page to be updated.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\dune2.html` - Another movie page to be updated.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\films.html` - Page to display movie posters.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\cast_crew.html` - Page to display cast information.

### 2. Dynamically Load Films Page
- **Goal**: Populate the Films page with all movies from the CSV in alphabetical order.
- **Steps**:
    - Read movie data from `Scene still DB - Sheet1.csv`.
    - Sort movies alphabetically by name.
    - Generate and display movie cards dynamically on `films.html`.
- **Relevant Files**:
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\films.html` - Page to be dynamically populated.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\Scene still DB - Sheet1.csv` - Source of movie data.

### 3. Dynamic Search Functionality
- **Goal**: Enable real-time search across movies and cast.
- **Steps**:
    - Create a new JavaScript file (e.g., `js/search.js`) to handle search logic.
    - Attach an event listener to the search input field.
    - Implement a function to filter movie and cast data based on user input.
    - Dynamically update the displayed content on the page.
- **Relevant Files**:
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\js\search.js` (new) - Contains search logic.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\index.html` - Contains the search input field.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\films.html` - Page to be dynamically filtered.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\cast_crew.html` - Page to be dynamically filtered.

### 3. Image Loading Performance
- **Goal**: Optimize image loading for movie pages.
- **Steps**:
    - Implement a process to generate compressed versions of high-quality images.
    - Modify movie pages to load compressed images for thumbnails.
    - Implement JavaScript to swap the compressed thumbnail with the original high-quality image when clicked.
- **Relevant Files**:
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\barry_lyndon.html` - Example movie page to be updated.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\dune2.html` - Another movie page to be updated.
    - Image directories (e.g., `img/Dune2/`, `img/Barry-Lyndon/`).

### 4. User Image Color Palette Extraction Page
- **Goal**: Allow users to upload images and extract color palettes.
- **Steps**:
    - Create a new HTML page (e.g., `color_palette_upload.html`).
    - Add an image upload input and a display area for the color palette.
    - Reuse or adapt `js/color-palette.js` to process uploaded images and extract colors.
- **Relevant Files**:
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\color_palette_upload.html` (new) - The new page for image upload.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\js\color-palette.js` - Existing script to be reused.

### 5. Lazy Loading for Films Page
- **Goal**: Improve performance of the Films page by loading images as they become visible.
- **Steps**:
    - Modify `films.html` to use a lazy loading technique (e.g., Intersection Observer API).
    - Update image `src` attributes to a placeholder and store the actual image URL in a `data-src` attribute.
    - Implement JavaScript to load images when they enter the viewport.
- **Relevant Files**:
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\films.html` - Page to implement lazy loading.
    - `c:\Users\HP\Desktop\Scene Still\Scene-Still\js\lazy-load.js` (new) - Script for lazy loading functionality.
