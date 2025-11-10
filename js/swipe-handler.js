(function () {
    window.SZ = window.SZ || {};

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

    const initializeSwipe = (images) => {
        allImages = images;
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
        
        // Show swipe tutorial on mobile when image loads (only once per session)
        // Wait for the main image to actually load
        if (mainImage.complete && mainImage.naturalHeight !== 0) {
            // Image already loaded
            showSwipeTutorial();
        } else {
            // Wait for image to load
            mainImage.addEventListener('load', showSwipeTutorial, { once: true });
        }
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
        
        // Set the zoomed image source and show overlay
        zoomedImage.src = mainImage.src;
        zoomedImage.alt = mainImage.alt;
        zoomOverlay.classList.add('visible');
    };

    const closeZoom = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        if (zoomOverlay) {
            zoomOverlay.classList.remove('visible');
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
        const targetThumbnail = allThumbnails[index];
        
        if (!targetThumbnail) return;
        
        // Queue full resolution loading for the thumbnail if not already loaded
        const thumbnailImage = targetThumbnail.querySelector('.thumbnail-image');
        if (thumbnailImage && window.SZ?.lazyLoad?.queueFullResolution && !thumbnailImage.classList.contains('full-loaded')) {
            window.SZ.lazyLoad.queueFullResolution(thumbnailImage);
        }
        
        // Update main image and palette using existing function
        if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
            window.SZ.colorPalette.updateMainImageAndPalette(imageUrl, targetThumbnail, false);
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
        const targetRowsPerSlide = Math.ceil(totalRows / Math.ceil(totalRows / ROWS_THRESHOLD));
        const imagesPerSlide = Math.min(targetRowsPerSlide * IMAGES_PER_ROW, totalImages);
        
        // Calculate which slide this image is on
        const targetSlide = Math.floor(imageIndex / imagesPerSlide);
        
        // Get current slide
        const indicators = document.querySelectorAll('.slider-indicator');
        let currentSlide = 0;
        indicators.forEach((indicator, idx) => {
            if (indicator.classList.contains('active')) {
                currentSlide = idx;
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

    const initializeZoomOverlay = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        const closeButton = document.querySelector('.close-zoom');
        
        if (closeButton) {
            closeButton.addEventListener('click', closeZoom);
        }
        
        if (zoomOverlay) {
            zoomOverlay.addEventListener('click', (e) => {
                if (e.target === zoomOverlay) {
                    closeZoom();
                }
            });
        }
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
})();
