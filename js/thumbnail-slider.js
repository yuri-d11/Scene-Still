(function () {
    window.SZ = window.SZ || {};

    const IMAGES_PER_ROW = 4;
    const ROWS_THRESHOLD = 4;
    const MIN_IMAGES_FOR_SLIDER = IMAGES_PER_ROW * ROWS_THRESHOLD; // 16 images

    let currentSlideIndex = 0;
    let totalSlides = 0;
    let sliderEnabled = false;

    const initializeSlider = (thumbnailCount) => {
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        const indicatorsContainer = document.getElementById('slider-indicators');
        const sliderControls = indicatorsContainer?.parentElement;
        
        if (!thumbnailGrid || !indicatorsContainer) return;

        // Check if we need a slider (more than 16 images)
        if (thumbnailCount <= MIN_IMAGES_FOR_SLIDER) {
            // Keep regular grid layout
            sliderEnabled = false;
            if (sliderControls) sliderControls.classList.remove('active');
            thumbnailGrid.classList.remove('thumbnail-slider');
            thumbnailGrid.classList.add('row');
            thumbnailGrid.style.transform = '';
            return;
        }

        sliderEnabled = true;
        if (sliderControls) sliderControls.classList.add('active');
        
        // Remove the 'row' class when converting to slider
        thumbnailGrid.classList.remove('row');

        // Calculate how many rows per slide to distribute evenly
        const totalRows = Math.ceil(thumbnailCount / IMAGES_PER_ROW);
        const imagesPerSlide = calculateImagesPerSlide(totalRows, thumbnailCount);
        
        // Group thumbnails into slides
        const thumbnails = Array.from(thumbnailGrid.children);
        const slides = [];
        
        for (let i = 0; i < thumbnails.length; i += imagesPerSlide) {
            slides.push(thumbnails.slice(i, i + imagesPerSlide));
        }

        totalSlides = slides.length;

        // Restructure the grid into slider format
        thumbnailGrid.innerHTML = '';
        thumbnailGrid.classList.add('thumbnail-slider');
        
        slides.forEach((slideImages, slideIndex) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'thumbnail-slide';
            
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            
            slideImages.forEach(img => {
                rowDiv.appendChild(img);
            });
            
            slideDiv.appendChild(rowDiv);
            thumbnailGrid.appendChild(slideDiv);
        });

        // Create indicators with letters
        createIndicators(totalSlides, indicatorsContainer);
        
        // Set initial slide
        goToSlide(0);
    };

    const calculateImagesPerSlide = (totalRows, totalImages) => {
        // Calculate how many rows should be in each slide for even distribution
        const targetRowsPerSlide = Math.ceil(totalRows / Math.ceil(totalRows / ROWS_THRESHOLD));
        const imagesPerSlide = targetRowsPerSlide * IMAGES_PER_ROW;
        
        // Make sure we don't exceed total images
        return Math.min(imagesPerSlide, totalImages);
    };

    const createIndicators = (count, container) => {
        container.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const indicator = document.createElement('button');
            indicator.type = 'button';
            indicator.className = 'slider-indicator';
            // Generate letter: A, B, C, ... Z, AA, AB, etc.
            indicator.textContent = getLetterForIndex(i);
            indicator.setAttribute('data-slide', i);
            indicator.addEventListener('click', () => goToSlide(i));
            container.appendChild(indicator);
        }
    };

    const getLetterForIndex = (index) => {
        let letter = '';
        let num = index;
        
        do {
            letter = String.fromCharCode(65 + (num % 26)) + letter;
            num = Math.floor(num / 26) - 1;
        } while (num >= 0);
        
        return letter;
    };

    const goToSlide = (index) => {
        if (!sliderEnabled) return;
        
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        const indicators = document.querySelectorAll('.slider-indicator');
        
        if (!thumbnailGrid || index < 0 || index >= totalSlides) return;
        
        currentSlideIndex = index;
        
        // Move slider
        const offset = -index * 100;
        thumbnailGrid.style.transform = `translateX(${offset}%)`;
        
        // Update indicators
        indicators.forEach((indicator, i) => {
            if (i === index) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
        
        // Notify lazy loader about slide change
        if (window.SZ?.lazyLoad?.onSlideChange) {
            window.SZ.lazyLoad.onSlideChange(index);
        }
    };

    const nextSlide = () => {
        if (!sliderEnabled) return;
        const nextIndex = (currentSlideIndex + 1) % totalSlides;
        goToSlide(nextIndex);
    };

    const previousSlide = () => {
        if (!sliderEnabled) return;
        const prevIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides;
        goToSlide(prevIndex);
    };

    // Expose public API
    window.SZ.thumbnailSlider = {
        initializeSlider,
        goToSlide,
        nextSlide,
        previousSlide,
        isEnabled: () => sliderEnabled
    };
})();
