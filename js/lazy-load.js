(function () {
    window.SZ = window.SZ || {};

    const IMAGES_PER_ROW = 4;
    const ROWS_THRESHOLD = 4;
    const MIN_IMAGES_FOR_SLIDER = IMAGES_PER_ROW * ROWS_THRESHOLD; // 16 images

    let observer = null;
    let currentSlideIndex = 0;
    let isSliderMode = false;

    // Initialize Intersection Observer for lazy loading
    const initLazyLoading = () => {
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        loadImage(img);
                        obs.unobserve(img);
                    }
                });
            }, {
                root: null,
                rootMargin: '50px', // Start loading slightly before entering viewport
                threshold: 0.01
            });
        }
    };

    // Load an individual image
    const loadImage = (img) => {
        const src = img.dataset.lazySrc;
        if (src && !img.src.includes(src)) {
            img.src = src;
            img.classList.add('loaded');
            
            // Remove srcset after loading to prevent browser from loading higher resolution
            // The compressed image is already loaded via src
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
        }
    };

    // Setup lazy loading for thumbnails
    const setupThumbnails = (thumbnailCount) => {
        isSliderMode = thumbnailCount > MIN_IMAGES_FOR_SLIDER;
        
        if (!observer) {
            initLazyLoading();
        }

        const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');
        
        if (isSliderMode) {
            // In slider mode: Load first slide immediately, lazy load others
            loadSlideImages(0);
            
            // Observe remaining images for lazy loading
            thumbnails.forEach((img, index) => {
                const slideIndex = Math.floor(index / (ROWS_THRESHOLD * IMAGES_PER_ROW));
                if (slideIndex > 0 && observer) {
                    observer.observe(img);
                }
            });
        } else {
            // In grid mode: Load visible images, lazy load below fold
            thumbnails.forEach((img, index) => {
                if (index < MIN_IMAGES_FOR_SLIDER) {
                    // Load first 16 images immediately (first 4 rows)
                    loadImage(img);
                } else if (observer) {
                    // Lazy load remaining images
                    observer.observe(img);
                }
            });
        }
    };

    // Load all images in a specific slide
    const loadSlideImages = (slideIndex) => {
        const imagesPerSlide = ROWS_THRESHOLD * IMAGES_PER_ROW;
        const startIndex = slideIndex * imagesPerSlide;
        const endIndex = startIndex + imagesPerSlide;
        
        const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');
        for (let i = startIndex; i < Math.min(endIndex, thumbnails.length); i++) {
            loadImage(thumbnails[i]);
        }
    };

    // Preload next and previous slides when slider changes
    const onSlideChange = (newSlideIndex) => {
        currentSlideIndex = newSlideIndex;
        
        // Load current slide
        loadSlideImages(newSlideIndex);
        
        // Preload adjacent slides
        if (newSlideIndex > 0) {
            loadSlideImages(newSlideIndex - 1);
        }
        loadSlideImages(newSlideIndex + 1);
    };

    // Fallback for browsers without IntersectionObserver
    const loadAllImages = () => {
        const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');
        thumbnails.forEach(img => loadImage(img));
    };

    // Public API
    window.SZ.lazyLoad = {
        setupThumbnails,
        onSlideChange,
        loadAllImages
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        initLazyLoading();
    });
})();
