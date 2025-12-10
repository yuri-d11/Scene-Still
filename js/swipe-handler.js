(function () {
    window.SZ = window.SZ || {};
    let sliderCustomRows = null;

    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const SWIPE_THRESHOLD = 50; // Minimum distance for a swipe
    const VERTICAL_THRESHOLD = 100; // Maximum vertical movement to still count as horizontal swipe

    let allImages = []; // Array to store all full-res image URLs
    let currentImageIndex = 0; // Current image being displayed
    let indicatorsClicked = false; // Track if user has clicked the indicators
    let mouseLeftImage = false; // Track if mouse has left the image
    const _preloadedUrls = new Set(); // track preloaded URLs to avoid duplicate loads
    const MAX_PRELOAD_CACHE = 50; // Limit cache size to prevent memory issues

    const preloadUrl = (url) => {
        if (!url) return;
        if (_preloadedUrls.has(url)) return;
        
        // Clear old entries if cache is too large
        if (_preloadedUrls.size >= MAX_PRELOAD_CACHE) {
            const iterator = _preloadedUrls.values();
            for (let i = 0; i < 10; i++) {
                const value = iterator.next().value;
                if (value) _preloadedUrls.delete(value);
            }
        }
        
        try {
            const img = new Image();
            img.onload = () => {
                _preloadedUrls.add(url);
                img.onload = null;
                img.onerror = null;
            };
            img.onerror = () => {
                // still mark as attempted to avoid repeated errors
                _preloadedUrls.add(url);
                img.onload = null;
                img.onerror = null;
            };
            img.src = url;
        } catch (e) {
            _preloadedUrls.add(url);
        }
    };

    const canPreloadFull = () => {
        try {
            const nav = navigator && navigator.connection;
            if (!nav) return true;
            // Avoid preloading on 2g/slow-2g or when Save-Data is enabled
            const slowTypes = ['slow-2g', '2g', '3g'];
            if (nav.effectiveType && slowTypes.includes(nav.effectiveType)) return false;
            if (nav.saveData) return false;
            return true;
        } catch (e) {
            return true;
        }
    };

    const preloadCurrentFullIfAllowed = (index) => {
        if (!canPreloadFull()) return;
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        if (!thumbnailGrid) return;
        const thumbnails = Array.from(thumbnailGrid.querySelectorAll('.thumbnail-wrapper'));
        if (!thumbnails || thumbnails.length === 0) return;
        const target = thumbnails[index];
        const thumbImg = target ? target.querySelector('.thumbnail-image') : null;
        const full = (thumbImg && (thumbImg.dataset.fullSrc || thumbImg.dataset.webpSrc)) || allImages[index] || '';
        if (full) preloadUrl(full);
    };

    const preloadAdjacentImages = (index) => {
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        if (!thumbnailGrid) return;
        const thumbnails = Array.from(thumbnailGrid.querySelectorAll('.thumbnail-wrapper'));
        if (!thumbnails || thumbnails.length === 0) return;
        const total = thumbnails.length;
        const nextIndex = (index + 1) % total;
        const prevIndex = (index - 1 + total) % total;

        [prevIndex, nextIndex].forEach(i => {
            const thumb = thumbnails[i];
            if (!thumb) return;
            const thumbImg = thumb.querySelector('.thumbnail-image');
            if (!thumbImg) return;
            const gridHasWebp = thumbnailGrid?.dataset?.hasWebp === '1';
            let urlToPreload = null;
            if (gridHasWebp) {
                urlToPreload = thumbImg.dataset.webpSrc || thumbImg.dataset.lazySrc || thumbImg.dataset.fullSrc || thumbImg.src;
            } else {
                urlToPreload = thumbImg.dataset.fullSrc || thumbImg.dataset.lazySrc || thumbImg.src;
            }
            preloadUrl(urlToPreload);
        });
    };

    const initializeSwipe = (images, customRowsPerSlide) => {
        allImages = images;
        // Store optional CSV override for rows per slide so other functions can use it
        sliderCustomRows = (typeof customRowsPerSlide === 'number' && customRowsPerSlide > 0) ? customRowsPerSlide : null;
        const mainImage = document.getElementById('main-image');
        const mainImageContainer = document.querySelector('.main-image-container');
        const clickIndicators = document.querySelector('.image-click-indicators');
        
        if (!mainImage) return;

        // Add touch event listeners for mobile
        mainImage.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainImage.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Add click event for desktop on the container (to work with indicators)
        if (mainImageContainer) {
            mainImageContainer.addEventListener('click', (e) => {
                handleDesktopClick(e);
                // Hide indicators after first click
                if (clickIndicators && !indicatorsClicked) {
                    indicatorsClicked = true;
                    clickIndicators.classList.add('clicked');
                }
            });
            
            // Track when mouse leaves the image
            mainImageContainer.addEventListener('mouseleave', () => {
                mouseLeftImage = true;
            });
            
            // When mouse re-enters, reset indicators if they were clicked before
            mainImageContainer.addEventListener('mouseenter', () => {
                if (indicatorsClicked && mouseLeftImage && clickIndicators) {
                    clickIndicators.classList.remove('clicked');
                    indicatorsClicked = false;
                    mouseLeftImage = false;
                }
            });
        } else {
            mainImage.addEventListener('click', handleDesktopClick);
        }
        
        // Set appropriate cursor style
        mainImage.style.cursor = 'pointer';

        // Ensure currentImageIndex is valid (start at 0)
        currentImageIndex = 0;
        
        // Show swipe tutorial on mobile when image loads (only once per session)
        // Wait for the main image to actually load
        if (mainImage.complete && mainImage.naturalHeight !== 0) {
            // Image already loaded
            showSwipeTutorial();
        }

        // Listen for main image load events for tutorial only
        // Removed aggressive preloading to avoid bandwidth competition with user-initiated loads
        mainImage.addEventListener('load', () => {
            showSwipeTutorial();
        });
    };

    const showSwipeTutorial = () => {
        // Check if tutorial has been shown in this session
        const tutorialShown = sessionStorage.getItem('swipeTutorialShown');
        
        // Only show on touch devices and if not shown before
        if (!tutorialShown && isTouchDevice()) {
            const swipeTutorial = document.getElementById('swipe-tutorial');
            if (swipeTutorial) {
                swipeTutorial.classList.add('active');
                
                // Mark tutorial as shown
                sessionStorage.setItem('swipeTutorialShown', 'true');
                
                // Remove tutorial after animation completes
                setTimeout(() => {
                    swipeTutorial.classList.remove('active');
                }, 4000);
            }
        }
    };

    // Zoom loading indicator helpers
    const showZoomLoading = (compact = false) => {
        const loader = document.getElementById('zoom-loading');
        if (loader) {
            if (compact) loader.classList.add('compact'); else loader.classList.remove('compact');
            loader.classList.add('visible');
            loader.setAttribute('aria-hidden', 'false');
        }
    };

    const hideZoomLoading = () => {
        const loader = document.getElementById('zoom-loading');
        if (loader) {
            loader.classList.remove('visible');
            loader.classList.remove('compact');
            loader.setAttribute('aria-hidden', 'true');
        }
    };

    // Main-image small loader helpers (centered over main image)
    const showMainLoading = () => {
        // Do not show the small main-image loader if the zoom overlay is visible
        const zoomOverlay = document.getElementById('zoom-overlay');
        if (zoomOverlay && zoomOverlay.classList.contains('visible')) return;
        const loader = document.getElementById('main-loading');
        if (loader) {
            loader.classList.add('visible');
            loader.setAttribute('aria-hidden', 'false');
        }
    };

    const hideMainLoading = () => {
        const loader = document.getElementById('main-loading');
        if (loader) {
            loader.classList.remove('visible');
            loader.setAttribute('aria-hidden', 'true');
        }
    };

    // Keep a reference to the current zoom preload to ignore stale callbacks
    let _currentZoomPreload = null;

    const isTouchDevice = () => {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    };

    const handleTouchStart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    };

    const handleDesktopClick = (e) => {
        // Get the main image element
        const mainImage = document.getElementById('main-image');
        if (!mainImage) return;
        
        // Get click position relative to the image
        const rect = mainImage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const imageWidth = rect.width;
        
        // Divide image into thirds
        const leftThird = imageWidth / 3;
        const rightThird = (imageWidth * 2) / 3;
        
        // Click on left third = previous image
        if (clickX < leftThird) {
            goToPreviousImage();
        } 
        // Click on middle third = zoom/enlarge image
        else if (clickX >= leftThird && clickX <= rightThird) {
            toggleImageZoom();
        }
        // Click on right third = next image
        else {
            goToNextImage();
        }
    };

    const toggleImageZoom = () => {
        const mainImage = document.getElementById('main-image');
        const zoomOverlay = document.getElementById('zoom-overlay');
        const zoomedImage = document.getElementById('zoomed-image');
        
        if (!mainImage || !zoomOverlay || !zoomedImage) return;
        // Find the thumbnail corresponding to the current image index
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        const allThumbnails = thumbnailGrid ? Array.from(thumbnailGrid.querySelectorAll('.thumbnail-wrapper')) : [];
        const targetThumbnail = allThumbnails[currentImageIndex];

        // Determine sources
        const thumbImg = targetThumbnail ? targetThumbnail.querySelector('.thumbnail-image') : null;
        const fullSrc = (thumbImg && thumbImg.dataset.fullSrc) || mainImage.dataset.fullSrc || allImages[currentImageIndex] || '';
        const webpPreview = (thumbImg && thumbImg.dataset.webpSrc) || thumbImg?.src || mainImage.src;

        // Hide small main-image loader if visible (avoid double indicators)
        if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();

        // Show overlay using webp or thumbnail as a quick preview
        zoomedImage.src = webpPreview || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        zoomedImage.alt = mainImage.alt || '';
        zoomedImage.classList.add('full-loaded'); // Show the webp preview immediately
        zoomOverlay.classList.add('visible');
        
        // Focus overlay so keyboard events (arrow keys) work
        setTimeout(() => {
            zoomOverlay.focus();
        }, 50);

        // Load full-resolution image only when user opens zoom
        if (fullSrc && fullSrc !== webpPreview) {
            // Show loading indicator while upgrading to full-res
            showZoomLoading();
            
            // Wait a tiny moment to ensure webp is visible, then start loading full-res
            setTimeout(() => {
                zoomedImage.classList.remove('full-loaded'); // Will hide during full-res load
                _currentZoomPreload = fullSrc;
                
                // Set src directly for faster progressive loading
                zoomedImage.src = fullSrc;
            
                // Set src directly for faster progressive loading
                zoomedImage.src = fullSrc;
            
                // Hide loading spinner when image finishes
                const handleLoad = () => {
                    if (_currentZoomPreload !== fullSrc) return;
                    zoomedImage.classList.add('full-loaded');
                    hideZoomLoading();
                    _currentZoomPreload = null;
                };
                const handleError = () => {
                    if (_currentZoomPreload !== fullSrc) return;
                    console.warn('Failed to load full-resolution image for zoom:', fullSrc);
                    zoomedImage.classList.add('full-loaded'); // Show webp preview on error
                    hideZoomLoading();
                    _currentZoomPreload = null;
                };
                
                zoomedImage.addEventListener('load', handleLoad, { once: true });
                zoomedImage.addEventListener('error', handleError, { once: true });
            }, 100);
        } else {
            // Ensure loader is hidden if nothing to load
            hideZoomLoading();
        }
    };

    const closeZoom = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        if (zoomOverlay) {
            zoomOverlay.classList.remove('visible');
            // ensure loading indicator is hidden when overlay is closed
            hideZoomLoading();
            // cancel any pending zoom preload so stale callbacks are ignored
            _currentZoomPreload = null;
        }
    };

    const handleSwipe = () => {
        const horizontalDistance = touchEndX - touchStartX;
        const verticalDistance = Math.abs(touchEndY - touchStartY);
        
        // Only process horizontal swipes (ignore if too much vertical movement)
        if (verticalDistance > VERTICAL_THRESHOLD) {
            return;
        }

        // Swipe left (next image)
        if (horizontalDistance < -SWIPE_THRESHOLD) {
            goToNextImage();
        }
        // Swipe right (previous image)
        else if (horizontalDistance > SWIPE_THRESHOLD) {
            goToPreviousImage();
        }
    };

    const goToNextImage = () => {
        if (allImages.length === 0) return;
        
        currentImageIndex = (currentImageIndex + 1) % allImages.length;
        updateImageAndThumbnail(currentImageIndex);
    };

    const goToPreviousImage = () => {
        if (allImages.length === 0) return;
        
        currentImageIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
        updateImageAndThumbnail(currentImageIndex);
    };

    const updateImageAndThumbnail = (index) => {
        const imageUrl = allImages[index];
        
        // Find the corresponding thumbnail wrapper
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        if (!thumbnailGrid) return;
        
        // Get all thumbnail wrappers (works for both grid and slider layouts)
        const allThumbnails = Array.from(thumbnailGrid.querySelectorAll('.thumbnail-wrapper'));
        // Try to locate thumbnail by matching known image URLs (full, webp, lazy or current src)
        let targetThumbnail = null;
        if (imageUrl) {
            for (const t of allThumbnails) {
                const img = t.querySelector('.thumbnail-image');
                if (!img) continue;
                const candidates = [img.dataset.fullSrc, img.dataset.webpSrc, img.dataset.lazySrc, img.src];
                for (const c of candidates) {
                    if (!c) continue;
                    // Compare normalized URLs
                    if (c === imageUrl || c.endsWith(imageUrl) || imageUrl.endsWith(c)) {
                        targetThumbnail = t;
                        break;
                    }
                }
                if (targetThumbnail) break;
            }
        }
        // Fallback to using index-based lookup if matching fails
        if (!targetThumbnail) targetThumbnail = allThumbnails[index];
        if (!targetThumbnail) return;
        
        // Determine a preview URL for the main image (webp intermediate, compressed thumbnail, or full if no webp)
        const thumbnailImage = targetThumbnail.querySelector('.thumbnail-image');
        const hasWebp = thumbnailGrid?.dataset?.hasWebp === '1';
        let previewUrl;
        if (!hasWebp) {
            // No webp available for this movie — show full-resolution as the main image
            previewUrl = (thumbnailImage && (thumbnailImage.dataset.fullSrc || thumbnailImage.dataset.lazySrc || thumbnailImage.src)) || imageUrl;
        } else {
            previewUrl = (thumbnailImage && (thumbnailImage.dataset.webpSrc || thumbnailImage.dataset.lazySrc || thumbnailImage.src)) || imageUrl;
        }

        // Update main image and palette (use previewUrl determined above)
        try {
            const mainImage = document.getElementById('main-image');
            const webpSrc = thumbnailImage?.dataset?.webpSrc;
            const fullSrc = thumbnailImage?.dataset?.fullSrc;

            if (hasWebp && webpSrc && mainImage && mainImage.src !== webpSrc) {
                // Preload webp preview and show small main-image loader
                if (window.SZ?.mainLoader?.show) window.SZ.mainLoader.show();
                const tmp = new Image();
                tmp.onload = () => {
                    if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                    if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                        window.SZ.colorPalette.updateMainImageAndPalette(webpSrc, targetThumbnail, false);
                    }
                };
                tmp.onerror = () => {
                    if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                    if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                        window.SZ.colorPalette.updateMainImageAndPalette(previewUrl, targetThumbnail, false);
                    }
                };
                tmp.src = webpSrc;
            } else if (!hasWebp && fullSrc && mainImage && mainImage.src !== fullSrc) {
                // For movies without webp, preload full-res and show loader
                if (window.SZ?.mainLoader?.show) window.SZ.mainLoader.show();
                const tmpFull = new Image();
                tmpFull.onload = () => {
                    if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                    if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                        window.SZ.colorPalette.updateMainImageAndPalette(fullSrc, targetThumbnail, false);
                    }
                };
                tmpFull.onerror = () => {
                    if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                    if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                        window.SZ.colorPalette.updateMainImageAndPalette(previewUrl, targetThumbnail, false);
                    }
                };
                tmpFull.src = fullSrc;
            } else {
                if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                    window.SZ.colorPalette.updateMainImageAndPalette(previewUrl, targetThumbnail, false);
                }
            }
        } catch (e) {
            // On error, fallback to immediate update
            if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                window.SZ.colorPalette.updateMainImageAndPalette(previewUrl, targetThumbnail, false);
            }
        }
        
        // If slider is enabled, check if we need to change slides
        if (window.SZ?.thumbnailSlider?.isEnabled && window.SZ.thumbnailSlider.isEnabled()) {
            updateSliderIfNeeded(index, allThumbnails.length);
        }
    };

    const updateSliderIfNeeded = (imageIndex, totalImages) => {
        // Calculate which slide this image is on
        const IMAGES_PER_ROW = 4;
        const ROWS_THRESHOLD = 4;
        const MIN_IMAGES_FOR_SLIDER = IMAGES_PER_ROW * ROWS_THRESHOLD;
        
        if (totalImages <= MIN_IMAGES_FOR_SLIDER) return;
        
        // Calculate images per slide (matching thumbnail-slider.js logic)
        const totalRows = Math.ceil(totalImages / IMAGES_PER_ROW);
        const imagesPerSlide = sliderCustomRows 
            ? sliderCustomRows * IMAGES_PER_ROW 
            : Math.min(Math.ceil(totalRows / Math.ceil(totalRows / ROWS_THRESHOLD)) * IMAGES_PER_ROW, totalImages);
        
        // Calculate which slide this image is on
        const targetSlide = Math.floor(imageIndex / imagesPerSlide);
        
        // Get current slide by reading the data-slide attribute from the active indicator
        const indicators = document.querySelectorAll('.slider-indicator');
        let currentSlide = 0;
        indicators.forEach((indicator) => {
            if (indicator.classList.contains('active')) {
                currentSlide = parseInt(indicator.getAttribute('data-slide'), 10) || 0;
            }
        });
        
        // If we're on a different slide, navigate to it
        if (targetSlide !== currentSlide && window.SZ?.thumbnailSlider?.goToSlide) {
            window.SZ.thumbnailSlider.goToSlide(targetSlide);
        }
    };

    const setCurrentImageIndex = (index) => {
        currentImageIndex = index;
    };

    let zoomTouchStartX = 0;
    let zoomTouchEndX = 0;

    const goToNextImageInZoom = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        if (!zoomOverlay || !zoomOverlay.classList.contains('visible')) return;
        
        // Move to next image
        goToNextImage();
        
        // Update the zoomed image to show the new full-resolution image
        const mainImage = document.getElementById('main-image');
        const zoomedImage = document.getElementById('zoomed-image');
        if (!mainImage || !zoomedImage) return;
        
        // Find thumbnail for current index
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        const allThumbnails = thumbnailGrid ? Array.from(thumbnailGrid.querySelectorAll('.thumbnail-wrapper')) : [];
        const targetThumbnail = allThumbnails[currentImageIndex];
        
        // Get full-res source
        const thumbImg = targetThumbnail ? targetThumbnail.querySelector('.thumbnail-image') : null;
        const fullSrc = (thumbImg && thumbImg.dataset.fullSrc) || mainImage.dataset.fullSrc || allImages[currentImageIndex] || '';
        const webpPreview = (thumbImg && thumbImg.dataset.webpSrc) || thumbImg?.src || mainImage.src || '';
        
        if (fullSrc) {
                // Show webp preview immediately
                zoomedImage.src = webpPreview;
                zoomedImage.classList.add('full-loaded');
                
                // Ensure small main loader is hidden while zoom overlay is visible
                if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();

                // Determine URL to load (use allImages fallback if thumbnail dataset is not yet populated)
                const urlToLoad = fullSrc || allImages[currentImageIndex] || mainImage.dataset.fullSrc || '';
                if (!urlToLoad) {
                    hideZoomLoading();
                } else if (urlToLoad === webpPreview) {
                    // For movies without webp, still show loading indicator
                    showZoomLoading();
                    setTimeout(() => {
                        zoomedImage.src = urlToLoad;
                        _currentZoomPreload = urlToLoad;
                        
                        const handleLoad = () => {
                            if (_currentZoomPreload !== urlToLoad) return;
                            zoomedImage.classList.add('full-loaded');
                            hideZoomLoading();
                            _currentZoomPreload = null;
                        };
                        const handleError = () => {
                            if (_currentZoomPreload !== urlToLoad) return;
                            console.warn('Failed to load full-resolution image in zoom:', urlToLoad);
                            zoomedImage.classList.add('full-loaded');
                            hideZoomLoading();
                            _currentZoomPreload = null;
                        };
                        
                        zoomedImage.addEventListener('load', handleLoad, { once: true });
                        zoomedImage.addEventListener('error', handleError, { once: true });
                    }, 50);
                } else {
                    // Load full-res after showing webp preview
                    setTimeout(() => {
                        zoomedImage.classList.remove('full-loaded');
                        showZoomLoading();
                        
                        // Set src directly for faster progressive loading
                        zoomedImage.src = urlToLoad;
                        _currentZoomPreload = urlToLoad;
                    
                        const handleLoad = () => {
                            if (_currentZoomPreload !== urlToLoad) return;
                            zoomedImage.classList.add('full-loaded');
                            hideZoomLoading();
                            _currentZoomPreload = null;
                        };
                        const handleError = () => {
                            if (_currentZoomPreload !== urlToLoad) return;
                            console.warn('Failed to load full-resolution image in zoom:', urlToLoad);
                            zoomedImage.classList.add('full-loaded');
                            hideZoomLoading();
                            _currentZoomPreload = null;
                        };
                        
                        zoomedImage.addEventListener('load', handleLoad, { once: true });
                        zoomedImage.addEventListener('error', handleError, { once: true });
                    }, 100);
                }
        }
        
        // Update alt text
        zoomedImage.alt = mainImage.alt || '';
    };

    const goToPreviousImageInZoom = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        if (!zoomOverlay || !zoomOverlay.classList.contains('visible')) return;
        
        // Move to previous image
        goToPreviousImage();
        
        // Update the zoomed image to show the new full-resolution image
        const mainImage = document.getElementById('main-image');
        const zoomedImage = document.getElementById('zoomed-image');
        if (!mainImage || !zoomedImage) return;
        
        // Find thumbnail for current index
        const thumbnailGrid = document.getElementById('thumbnail-grid');
        const allThumbnails = thumbnailGrid ? Array.from(thumbnailGrid.querySelectorAll('.thumbnail-wrapper')) : [];
        const targetThumbnail = allThumbnails[currentImageIndex];
        
        // Get full-res source
        const thumbImg = targetThumbnail ? targetThumbnail.querySelector('.thumbnail-image') : null;
        const fullSrc = (thumbImg && thumbImg.dataset.fullSrc) || mainImage.dataset.fullSrc || allImages[currentImageIndex] || '';
        const webpPreview = (thumbImg && thumbImg.dataset.webpSrc) || thumbImg?.src || mainImage.src || '';
        
        if (fullSrc) {
                // Show webp preview immediately
                zoomedImage.src = webpPreview;
                zoomedImage.classList.add('full-loaded');
                
                // Ensure small main loader is hidden while zoom overlay is visible
                if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();

                // Determine URL to load (use allImages fallback if thumbnail dataset is not yet populated)
                const urlToLoad = fullSrc || allImages[currentImageIndex] || mainImage.dataset.fullSrc || '';
                if (!urlToLoad) {
                    hideZoomLoading();
                } else if (urlToLoad === webpPreview) {
                    // For movies without webp, still show loading indicator
                    showZoomLoading();
                    setTimeout(() => {
                        zoomedImage.src = urlToLoad;
                        _currentZoomPreload = urlToLoad;
                        
                        const handleLoad = () => {
                            if (_currentZoomPreload !== urlToLoad) return;
                            zoomedImage.classList.add('full-loaded');
                            hideZoomLoading();
                            _currentZoomPreload = null;
                        };
                        const handleError = () => {
                            if (_currentZoomPreload !== urlToLoad) return;
                            console.warn('Failed to load full-resolution image in zoom:', urlToLoad);
                            zoomedImage.classList.add('full-loaded');
                            hideZoomLoading();
                            _currentZoomPreload = null;
                        };
                        
                        zoomedImage.addEventListener('load', handleLoad, { once: true });
                        zoomedImage.addEventListener('error', handleError, { once: true });
                    }, 50);
                } else {
                    // Load full-res after showing webp preview
                    setTimeout(() => {
                        zoomedImage.classList.remove('full-loaded');
                        showZoomLoading();
                        
                        // Set src directly for faster progressive loading
                        zoomedImage.src = urlToLoad;
                        _currentZoomPreload = urlToLoad;
                    
                        const handleLoad = () => {
                            if (_currentZoomPreload !== urlToLoad) return;
                            zoomedImage.classList.add('full-loaded');
                            hideZoomLoading();
                            _currentZoomPreload = null;
                        };
                        const handleError = () => {
                            if (_currentZoomPreload !== urlToLoad) return;
                            console.warn('Failed to load full-resolution image in zoom:', urlToLoad);
                            zoomedImage.classList.add('full-loaded');
                            hideZoomLoading();
                            _currentZoomPreload = null;
                        };
                        
                        zoomedImage.addEventListener('load', handleLoad, { once: true });
                        zoomedImage.addEventListener('error', handleError, { once: true });
                    }, 100);
                }
        }
        
        // Update alt text
        zoomedImage.alt = mainImage.alt || '';
    };

    const initializeZoomOverlay = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        const closeButton = document.querySelector('.close-zoom');
        const prevButton = document.getElementById('zoom-nav-prev');
        const nextButton = document.getElementById('zoom-nav-next');
        const zoomedImage = document.getElementById('zoomed-image');
        
        if (closeButton) {
            closeButton.addEventListener('click', closeZoom);
        }
        
        if (prevButton) {
            prevButton.addEventListener('click', (e) => {
                e.stopPropagation();
                goToPreviousImageInZoom();
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', (e) => {
                e.stopPropagation();
                goToNextImageInZoom();
            });
        }
        
        if (zoomOverlay) {
            zoomOverlay.addEventListener('click', (e) => {
                if (e.target === zoomOverlay) {
                    closeZoom();
                }
            });
            
            // Add keyboard navigation for next/prev in lightbox
            zoomOverlay.addEventListener('keydown', (e) => {
                if (!zoomOverlay.classList.contains('visible')) return;
                
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    goToNextImageInZoom();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    goToPreviousImageInZoom();
                } else if (e.key === 'Escape') {
                    closeZoom();
                }
            });
            
            // Add touch swipe support in lightbox
            zoomOverlay.addEventListener('touchstart', (e) => {
                zoomTouchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            
            zoomOverlay.addEventListener('touchend', (e) => {
                zoomTouchEndX = e.changedTouches[0].screenX;
                const horizontalDistance = zoomTouchEndX - zoomTouchStartX;
                
                // Only process if lightbox is visible
                if (!zoomOverlay.classList.contains('visible')) return;
                
                // Swipe left (next image)
                if (horizontalDistance < -SWIPE_THRESHOLD) {
                    goToNextImageInZoom();
                }
                // Swipe right (previous image)
                else if (horizontalDistance > SWIPE_THRESHOLD) {
                    goToPreviousImageInZoom();
                }
            }, { passive: true });
            
            // Allow focus on overlay so keyboard events work
            zoomOverlay.setAttribute('tabindex', '-1');
        }
        
        // Focus overlay when it becomes visible so keyboard nav works
        const originalCloseZoom = closeZoom;
        window.closeZoomAndFocus = () => {
            if (zoomOverlay && zoomOverlay.classList.contains('visible')) {
                zoomOverlay.focus();
            }
        };
    };

    // Initialize zoom overlay on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeZoomOverlay);
    } else {
        initializeZoomOverlay();
    }

    window.SZ.swipeHandler = {
        initializeSwipe,
        setCurrentImageIndex,
        goToNextImage,
        goToPreviousImage
    };
    // Expose the zoom loading API so other modules can show a compact loader
    window.SZ.zoomLoader = {
        show: showZoomLoading,
        hide: hideZoomLoading
    };
    // Expose main image loader for thumbnail-triggered preview loads
    window.SZ.mainLoader = {
        show: showMainLoading,
        hide: hideMainLoading
    };
})();
