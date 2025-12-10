(function () {
    window.SZ = window.SZ || {};

    const IMAGES_PER_ROW = 4;
    const ROWS_THRESHOLD = 4;
    const MIN_IMAGES_FOR_SLIDER = IMAGES_PER_ROW * ROWS_THRESHOLD; // 16 images

    // Helper to read rows-per-slide override from DOM (set by thumbnail-slider)
    const getRowsPerSlide = () => {
        const grid = document.getElementById('thumbnail-grid');
        const rowsAttr = grid?.getAttribute('data-rows-per-slide');
        const parsed = rowsAttr ? parseInt(rowsAttr, 10) : NaN;
        return (!isNaN(parsed) && parsed > 0) ? parsed : ROWS_THRESHOLD;
    };

    const getImagesPerSlide = () => getRowsPerSlide() * IMAGES_PER_ROW;

    let observer = null;
    let currentSlideIndex = 0;
    let isSliderMode = false;
    let loadingQueue = []; // Queue for sequential loading
    let isLoadingFullRes = false; // Flag to prevent concurrent full-res loading

    // Initialize Intersection Observer for lazy loading
    const initLazyLoading = () => {
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        loadThumbnail(img);
                        obs.unobserve(img);
                    }
                });
            }, {
                root: null,
                rootMargin: '100px', // Start loading slightly before entering viewport
                threshold: 0.01
            });
        }
    };

    // Load thumbnail (compressed version)
    const loadThumbnail = (img) => {
        const src = img.dataset.lazySrc;
        if (src && !img.src.includes(src) && img.src.includes('data:image')) {
            img.src = src;
            img.classList.add('thumbnail-loaded');
            
            // Remove srcset after loading to prevent browser from loading higher resolution
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
        }
    };

    // Load full resolution image
    const loadFullResolution = (img) => {
        const fullSrc = img.dataset.fullSrc;
        const currentSrc = img.src;
        
        // Only load if we have a full resolution URL and it's different from current
        if (fullSrc && fullSrc !== currentSrc && !currentSrc.includes('data:image')) {
            return new Promise((resolve) => {
                const fullImg = new Image();
                fullImg.onload = () => {
                    img.src = fullSrc;
                    img.classList.add('full-loaded');
                    resolve();
                };
                fullImg.onerror = () => {
                    console.warn('Failed to load full resolution image:', fullSrc);
                    resolve(); // Resolve anyway to continue the queue
                };
                fullImg.src = fullSrc;
            });
        }
        return Promise.resolve();
    };

    // Process the full-resolution loading queue
    const processFullResQueue = async () => {
        if (isLoadingFullRes || loadingQueue.length === 0) return;
        
        isLoadingFullRes = true;
        
        while (loadingQueue.length > 0) {
            const img = loadingQueue.shift();
            await loadFullResolution(img);
        }
        
        isLoadingFullRes = false;
    };

    // Add image to full-res loading queue
    const queueFullResolution = (img) => {
        // Don't queue if already loaded or already in queue
        if (img.classList.contains('full-loaded') || loadingQueue.includes(img)) {
            return;
        }
        
        loadingQueue.push(img);
        processFullResQueue();
    };

    // Setup lazy loading for thumbnails with prioritized loading strategy
    const setupThumbnails = (thumbnailCount) => {
        isSliderMode = thumbnailCount > MIN_IMAGES_FOR_SLIDER;
        
        if (!observer) {
            initLazyLoading();
        }

        const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');
        const isMobile = window.innerWidth < 768; // Bootstrap md breakpoint
        
        // PRIORITY 1: Main image is already loading in HTML with actual src
        
        // PRIORITY 2: Load all visible thumbnail images (compressed versions)
        if (isMobile) {
            // Mobile: Load visible thumbnails (first ~6-8 images)
            const visibleCount = Math.min(8, thumbnailCount);
            thumbnails.forEach((img, index) => {
                if (index < visibleCount) {
                    loadThumbnail(img);
                } else if (observer) {
                    // Lazy load remaining thumbnails when scrolled into view
                    observer.observe(img);
                }
            });
        } else if (isSliderMode) {
                // Desktop slider mode: Load first slide thumbnails (compressed)
                const imagesPerSlide = getImagesPerSlide();
                thumbnails.forEach((img, index) => {
                    const slideIndex = Math.floor(index / imagesPerSlide);
                    if (slideIndex === 0) {
                        loadThumbnail(img);
                    }
                    // Don't observe slider images yet - they'll load on slide change
                });
        } else {
            // Desktop grid mode: Load all visible thumbnails (compressed)
            thumbnails.forEach((img, index) => {
                if (index < MIN_IMAGES_FOR_SLIDER) {
                    // Load first 16 thumbnails immediately
                    loadThumbnail(img);
                } else if (observer) {
                    // Lazy load remaining thumbnails
                    observer.observe(img);
                }
            });
        }

        // PRIORITY 3: After thumbnails load, start loading intermediate webp versions
        // Wait a bit to ensure thumbnails are rendered first
        setTimeout(() => {
                // If the CSV indicates this movie has webp intermediates, upgrade to webp.
                // Otherwise (no webp available), upgrade visible thumbnails directly to full-resolution
                // so the final images shown are the full stills for those movies.
                try {
                    const grid = document.getElementById('thumbnail-grid');
                    const hasWebp = grid?.dataset?.hasWebp === '1';
                    if (hasWebp) {
                        loadWebpImages(thumbnailCount, isMobile);
                    } else {
                        upgradeToFullResolution(thumbnailCount, isMobile);
                    }
                } catch (e) {
                    // Fallback to attempting webp upgrade if anything goes wrong
                    loadWebpImages(thumbnailCount, isMobile);
                }
        }, 500);
    };

    // Load intermediate webp images (slightly compressed) in priority order
    const loadWebpImages = (thumbnailCount, isMobile) => {
        const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');

        const loadWebpForIndex = (img) => {
            const webpSrc = img.dataset.webpSrc;
            if (!webpSrc) return;
            // Only replace if different from current
            if (img.src && img.src.includes(webpSrc)) return;

            const tmp = new Image();
            tmp.onload = () => {
                img.src = webpSrc;
                img.classList.add('webp-loaded');
                tmp.onload = null;
                tmp.onerror = null;
            };
            tmp.onerror = () => {
                // silently ignore and keep thumbnail
                tmp.onload = null;
                tmp.onerror = null;
            };
            tmp.src = webpSrc;
        };

        if (isMobile) {
            // Mobile: Upgrade visible thumbnails to webp only (first ~4-6)
            const visibleCount = Math.min(4, thumbnailCount);
            thumbnails.forEach((img, index) => {
                if (index < visibleCount) {
                    setTimeout(() => loadWebpForIndex(img), index * 150);
                }
            });
        } else if (isSliderMode) {
            // Desktop slider mode: ONLY upgrade first slide thumbnails (visible on screen)
            const imagesPerSlide = getImagesPerSlide();
            let loadedCount = 0;
            thumbnails.forEach((img, index) => {
                const slideIndex = Math.floor(index / imagesPerSlide);
                if (slideIndex === 0) {
                    setTimeout(() => loadWebpForIndex(img), loadedCount * 100);
                    loadedCount++;
                }
            });
        } else {
            // Desktop grid mode: Upgrade first visible thumbnails only
            const loadCount = Math.min(12, thumbnailCount);
            thumbnails.forEach((img, index) => {
                if (index < loadCount) {
                    setTimeout(() => loadWebpForIndex(img), index * 80);
                }
            });
        }
    };

    // If no intermediate webp images are available for this movie, upgrade visible
    // thumbnails to the full-resolution stills so the final image shown is the full still.
    const upgradeToFullResolution = (thumbnailCount, isMobile) => {
        const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');

        const upgradeImg = (img) => {
            const fullSrc = img.dataset.fullSrc;
            if (!fullSrc) return;
            // Skip if already showing the full src
            if (img.src && img.src === fullSrc) return;

            const tmp = new Image();
            tmp.onload = () => {
                img.src = fullSrc;
                img.classList.add('full-loaded');
            };
            tmp.onerror = () => {
                // keep the thumbnail if full resolution fails
            };
            tmp.src = fullSrc;
        };

        if (isMobile) {
            const visibleCount = Math.min(6, thumbnailCount);
            thumbnails.forEach((img, index) => {
                if (index < visibleCount) {
                    upgradeImg(img);
                }
            });
        } else if (isSliderMode) {
            const imagesPerSlide = getImagesPerSlide();
            thumbnails.forEach((img, index) => {
                const slideIndex = Math.floor(index / imagesPerSlide);
                if (slideIndex === 0) {
                    upgradeImg(img);
                }
            });
        } else {
            thumbnails.forEach((img, index) => {
                if (index < MIN_IMAGES_FOR_SLIDER) {
                    upgradeImg(img);
                }
            });
        }
    };

    // Load images in a specific slide (thumbnails + intermediate webp)
    const loadSlideImages = (slideIndex) => {
        const imagesPerSlide = getImagesPerSlide();
        const startIndex = slideIndex * imagesPerSlide;
        const endIndex = startIndex + imagesPerSlide;
        
        const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');
        
        // First load all thumbnails (compressed) for the slide
        for (let i = startIndex; i < Math.min(endIndex, thumbnails.length); i++) {
            loadThumbnail(thumbnails[i]);
        }
        
        // Then upgrade to intermediate webp versions (if available)
        setTimeout(() => {
            for (let i = startIndex; i < Math.min(endIndex, thumbnails.length); i++) {
                const img = thumbnails[i];
                const webp = img.dataset.webpSrc;
                if (webp) {
                    const tmp = new Image();
                    tmp.onload = () => {
                        img.src = webp;
                        img.classList.add('webp-loaded');
                    };
                    tmp.onerror = () => {};
                    tmp.src = webp;
                }
            }
        }, 300);
    };

    // Handle slide change - load new slide images
    const onSlideChange = (newSlideIndex) => {
        if (currentSlideIndex === newSlideIndex) return;
        currentSlideIndex = newSlideIndex;
        
        // Load current slide (thumbnails first, then full-res)
        loadSlideImages(newSlideIndex);
        
        // If this movie does NOT have webp intermediates, start queuing
        // full-resolution loads for images in the newly active slide so
        // the full images begin loading immediately after the slide switch.
        try {
            const grid = document.getElementById('thumbnail-grid');
            const hasWebp = grid?.dataset?.hasWebp === '1';
            if (!hasWebp) {
                const imagesPerSlide = getImagesPerSlide();
                const startIndex = newSlideIndex * imagesPerSlide;
                const endIndex = startIndex + imagesPerSlide;
                const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');
                for (let i = startIndex; i < Math.min(endIndex, thumbnails.length); i++) {
                    const img = thumbnails[i];
                    // Ensure thumbnail is at least loaded (compressed) before queuing full-res
                    loadThumbnail(img);
                    // Queue full resolution swap (will be processed sequentially)
                    queueFullResolution(img);
                }
            }
        } catch (e) {
            // Non-fatal - if anything goes wrong, we simply won't queue full-res here
            console.warn('Error while queuing full-res on slide change', e);
        }
        
        // Optionally preload adjacent slides (thumbnails only, no full-res yet)
        setTimeout(() => {
            const imagesPerSlide = getImagesPerSlide();
            const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');
            
            // Preload next slide thumbnails
            const nextStartIndex = (newSlideIndex + 1) * imagesPerSlide;
            const nextEndIndex = nextStartIndex + imagesPerSlide;
            for (let i = nextStartIndex; i < Math.min(nextEndIndex, thumbnails.length); i++) {
                loadThumbnail(thumbnails[i]);
            }
            
            // Preload previous slide thumbnails
            if (newSlideIndex > 0) {
                const prevStartIndex = (newSlideIndex - 1) * imagesPerSlide;
                const prevEndIndex = prevStartIndex + imagesPerSlide;
                for (let i = prevStartIndex; i < Math.min(prevEndIndex, thumbnails.length); i++) {
                    loadThumbnail(thumbnails[i]);
                }
            }
        }, 1000);
    };

    // Fallback for browsers without IntersectionObserver
    const loadAllImages = () => {
        const thumbnails = document.querySelectorAll('.thumbnail-image[data-lazy-src]');
        thumbnails.forEach(img => {
            loadThumbnail(img);
            queueFullResolution(img);
        });
    };

    // Public API
    window.SZ.lazyLoad = {
        setupThumbnails,
        onSlideChange,
        loadAllImages,
        queueFullResolution // Export for use when switching main image
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        initLazyLoading();
    });
})();
