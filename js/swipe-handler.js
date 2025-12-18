(function () {
    window.SZ = window.SZ || {};
    let sliderCustomRows = null;

    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const SWIPE_THRESHOLD = 50; // Minimum distance for a swipe
    const VERTICAL_THRESHOLD = 100; // Maximum vertical movement to still count as horizontal swipe

    // Show slow loading notification to user
    const showSlowLoadingNotification = () => {
        let notification = document.getElementById('slow-loading-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'slow-loading-notification';
            notification.className = 'slow-loading-notification';
            notification.innerHTML = '<span class="notification-icon">⚠️</span> <span class="notification-text">Image host is responding slowly, retrying...</span>';
            document.body.appendChild(notification);
        }
        notification.classList.add('visible');
    };
    
    // Hide slow loading notification
    const hideSlowLoadingNotification = () => {
        const notification = document.getElementById('slow-loading-notification');
        if (notification) {
            notification.classList.remove('visible');
        }
    };

    // Detect if user has slow internet connection
    const hasSlowConnection = () => {
        try {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (!connection) return false;
            
            // Check for slow connection types
            const slowTypes = ['slow-2g', '2g', '3g'];
            if (connection.effectiveType && slowTypes.includes(connection.effectiveType)) {
                return true;
            }
            
            // Check if Save-Data mode is enabled
            if (connection.saveData) {
                return true;
            }
            
            // Check downlink speed (< 1.5 Mbps is considered slow)
            if (connection.downlink && connection.downlink < 1.5) {
                return true;
            }
            
            return false;
        } catch (e) {
            return false; // Default to normal timeouts if detection fails
        }
    };

    // Helper function to load image with automatic retry
    const loadImageWithRetry = (url, maxRetries = 3, customTimeouts = null) => {
        return new Promise((resolve, reject) => {
            let attempt = 0;
            
            const tryLoad = () => {
                attempt++;
                const img = new Image();
                let loadCompleted = false;
                
                // Use custom timeouts if provided, otherwise use standard timeouts
                let timeoutDuration;
                if (customTimeouts && customTimeouts[attempt - 1]) {
                    timeoutDuration = customTimeouts[attempt - 1];
                } else {
                    // Progressive timeouts: 7s, 10s, 15s (normal) or 14s, 20s, 30s (slow)
                    const isSlow = hasSlowConnection();
                    const baseTimeouts = [7000, 10000, 15000];
                    const slowTimeouts = [14000, 20000, 30000];
                    const timeouts = isSlow ? slowTimeouts : baseTimeouts;
                    timeoutDuration = timeouts[attempt - 1] || (isSlow ? 30000 : 15000);
                }
                
                const timeoutId = setTimeout(() => {
                    if (!loadCompleted) {
                        loadCompleted = true;
                        img.src = ''; // Stop the pending load
                        
                        if (attempt < maxRetries) {
                            console.log(`Image load timeout (attempt ${attempt}/${maxRetries}), retrying:`, url);
                            // Show notification on first retry to inform user
                            if (attempt === 1) {
                                showSlowLoadingNotification();
                            }
                            setTimeout(() => tryLoad(), 500); // Brief delay before retry
                        } else {
                            console.warn(`Image load failed after ${maxRetries} attempts:`, url);
                            hideSlowLoadingNotification();
                            reject(new Error('Max retries exceeded'));
                        }
                    }
                }, timeoutDuration);
                
                img.onload = () => {
                    if (!loadCompleted) {
                        loadCompleted = true;
                        clearTimeout(timeoutId);
                        hideSlowLoadingNotification();
                        resolve(url);
                    }
                };
                
                img.onerror = () => {
                    if (!loadCompleted) {
                        loadCompleted = true;
                        clearTimeout(timeoutId);
                        
                        if (attempt < maxRetries) {
                            console.log(`Image load error (attempt ${attempt}/${maxRetries}), retrying:`, url);
                            // Show notification on first retry to inform user
                            if (attempt === 1) {
                                showSlowLoadingNotification();
                            }
                            setTimeout(() => tryLoad(), 500);
                        } else {
                            console.warn(`Image load failed after ${maxRetries} attempts:`, url);
                            hideSlowLoadingNotification();
                            reject(new Error('Max retries exceeded'));
                        }
                    }
                };
                
                img.src = url;
            };
            
            tryLoad();
        });
    };

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
            let loadCompleted = false;
            
            // Add 10-second timeout for preload operations
            const timeoutId = setTimeout(() => {
                if (!loadCompleted) {
                    loadCompleted = true;
                    // Still mark as attempted to avoid repeated timeouts
                    _preloadedUrls.add(url);
                    img.onload = null;
                    img.onerror = null;
                    img.src = ''; // Stop the pending load
                }
            }, 10000);
            
            img.onload = () => {
                if (!loadCompleted) {
                    loadCompleted = true;
                    clearTimeout(timeoutId);
                    _preloadedUrls.add(url);
                    img.onload = null;
                    img.onerror = null;
                }
            };
            img.onerror = () => {
                if (!loadCompleted) {
                    loadCompleted = true;
                    clearTimeout(timeoutId);
                    // still mark as attempted to avoid repeated errors
                    _preloadedUrls.add(url);
                    img.onload = null;
                    img.onerror = null;
                }
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
    
    // Keep a reference to ongoing download to cancel it if needed
    let _currentDownloadController = null;

    // Helper function to get file extension from URL
    const getFileExtension = (url) => {
        if (!url) return '';
        const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
        return match ? match[1].toUpperCase() : '';
    };

    // Helper function to format file size
    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    // Helper function to fetch file size from URL with timeout and caching
    const fileSizeCache = new Map();
    const fetchFileSize = async (url) => {
        // Check cache first
        if (fileSizeCache.has(url)) {
            return fileSizeCache.get(url);
        }
        
        try {
            // Add timeout to prevent slow requests from blocking
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(url, { 
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const contentLength = response.headers.get('Content-Length');
            const size = contentLength ? parseInt(contentLength, 10) : null;
            
            // Cache the result
            if (size) {
                fileSizeCache.set(url, size);
            }
            
            return size;
        } catch (error) {
            // Don't log timeout errors as warnings, they're expected for slow servers
            if (error.name !== 'AbortError') {
                console.warn('Failed to fetch file size for:', url, error);
            }
            return null;
        }
    };

    // Update button text with file format and size
    const updateZoomButtonText = async (fullSrc) => {
        const loadBtn = document.getElementById('load-full-size-btn');
        const downloadBtn = document.getElementById('download-full-size-btn');
        
        if (!loadBtn || !downloadBtn || !fullSrc) return;
        
        const extension = getFileExtension(fullSrc);
        const format = extension || 'Image';
        
        // Disable buttons and show loading state immediately
        loadBtn.disabled = true;
        downloadBtn.disabled = true;
        loadBtn.classList.add('fetching');
        downloadBtn.classList.add('fetching');
        loadBtn.querySelector('.btn-text').textContent = `Loading ${format} info...`;
        downloadBtn.querySelector('.btn-text').textContent = `Loading ${format} info...`;
        
        // Fetch size asynchronously and update when available
        try {
            const fileSize = await fetchFileSize(fullSrc);
            
            // Check if elements still exist and haven't been changed by user action
            const currentLoadBtn = document.getElementById('load-full-size-btn');
            const currentDownloadBtn = document.getElementById('download-full-size-btn');
            
            if (currentLoadBtn && currentLoadBtn.classList.contains('fetching')) {
                currentLoadBtn.classList.remove('fetching');
                // Only enable if not already loaded
                if (!currentLoadBtn.classList.contains('loaded')) {
                    currentLoadBtn.disabled = false;
                }
                
                if (fileSize) {
                    const sizeText = formatFileSize(fileSize);
                    currentLoadBtn.querySelector('.btn-text').textContent = `Load Full Size ${format} (${sizeText})`;
                } else {
                    currentLoadBtn.querySelector('.btn-text').textContent = `Load Full Size ${format}`;
                }
            }
            
            if (currentDownloadBtn && currentDownloadBtn.classList.contains('fetching')) {
                currentDownloadBtn.classList.remove('fetching');
                currentDownloadBtn.disabled = false;
                
                if (fileSize) {
                    const sizeText = formatFileSize(fileSize);
                    currentDownloadBtn.querySelector('.btn-text').textContent = `Download Full Size ${format} (${sizeText})`;
                } else {
                    currentDownloadBtn.querySelector('.btn-text').textContent = `Download Full Size ${format}`;
                }
            }
        } catch (error) {
            // Re-enable buttons even on error
            const currentLoadBtn = document.getElementById('load-full-size-btn');
            const currentDownloadBtn = document.getElementById('download-full-size-btn');
            
            if (currentLoadBtn && currentLoadBtn.classList.contains('fetching')) {
                currentLoadBtn.classList.remove('fetching');
                if (!currentLoadBtn.classList.contains('loaded')) {
                    currentLoadBtn.disabled = false;
                }
                currentLoadBtn.querySelector('.btn-text').textContent = `Load Full Size ${format}`;
            }
            
            if (currentDownloadBtn && currentDownloadBtn.classList.contains('fetching')) {
                currentDownloadBtn.classList.remove('fetching');
                currentDownloadBtn.disabled = false;
                currentDownloadBtn.querySelector('.btn-text').textContent = `Download Full Size ${format}`;
            }
        }
    };

    // Load full size image when button is clicked
    const loadFullSizeImage = () => {
        const zoomedImage = document.getElementById('zoomed-image');
        const loadBtn = document.getElementById('load-full-size-btn');
        
        if (!zoomedImage) return;
        
        const fullSrc = zoomedImage.dataset.fullSrc;
        const isLoaded = zoomedImage.dataset.isFullSizeLoaded === 'true';
        
        // If already loaded, do nothing
        if (isLoaded || !fullSrc) return;
        
        // Show loading indicator
        showZoomLoading();
        zoomedImage.classList.remove('full-loaded');
        
        // Load the full size image with retry (1.5x longer timeouts for larger files)
        // Fast connection: 10.5s, 15s, 22.5s | Slow connection: 21s, 30s, 45s
        _currentZoomPreload = fullSrc;
        
        const isSlow = hasSlowConnection();
        const fullSizeTimeouts = isSlow 
            ? [21000, 30000, 45000]  // 1.5x slow connection times
            : [10500, 15000, 22500]; // 1.5x fast connection times
        
        loadImageWithRetry(fullSrc, 3, fullSizeTimeouts)
            .then(() => {
                if (_currentZoomPreload !== fullSrc) return;
                
                zoomedImage.src = fullSrc;
                zoomedImage.classList.add('full-loaded');
                zoomedImage.dataset.isFullSizeLoaded = 'true';
                hideZoomLoading();
                _currentZoomPreload = null;
                
                // Update button to show loaded state
                if (loadBtn) {
                    loadBtn.disabled = true;
                    loadBtn.classList.add('loaded');
                    loadBtn.querySelector('.btn-text').textContent = 'Full Size Image Loaded';
                }
            })
            .catch(() => {
                if (_currentZoomPreload !== fullSrc) return;
                
                console.warn('Failed to load full-resolution image after retries:', fullSrc);
                zoomedImage.classList.add('full-loaded');
                hideZoomLoading();
                _currentZoomPreload = null;
                alert('Failed to load full-size image after multiple attempts. The image host may be unavailable.');
            });
    };

    // Download full size image without loading it first
    const downloadFullSizeImage = async () => {
        const zoomedImage = document.getElementById('zoomed-image');
        if (!zoomedImage) return;
        
        const fullSrc = zoomedImage.dataset.fullSrc;
        if (!fullSrc) return;
        
        // Cancel any ongoing download
        if (_currentDownloadController) {
            _currentDownloadController.abort();
        }
        
        // Create new AbortController for this download
        _currentDownloadController = new AbortController();
        const controller = _currentDownloadController;
        
        try {
            // Show a brief loading state
            const downloadBtn = document.getElementById('download-full-size-btn');
            const originalText = downloadBtn ? downloadBtn.querySelector('.btn-text').textContent : '';
            if (downloadBtn) {
                downloadBtn.querySelector('.btn-text').textContent = 'Downloading...';
                downloadBtn.disabled = true;
            }
            
            // Fetch the image as a blob with abort signal
            const response = await fetch(fullSrc, { signal: controller.signal });
            if (!response.ok) throw new Error('Failed to download image');
            
            const blob = await response.blob();
            
            // Create a download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Extract filename from URL or use default
            const urlParts = fullSrc.split('/');
            const filename = urlParts[urlParts.length - 1].split('?')[0] || 'film-still.' + getFileExtension(fullSrc).toLowerCase();
            a.download = filename;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up
            window.URL.revokeObjectURL(url);
            
            // Clear controller reference
            if (_currentDownloadController === controller) {
                _currentDownloadController = null;
            }
            
            // Restore button state
            if (downloadBtn) {
                downloadBtn.querySelector('.btn-text').textContent = originalText;
                downloadBtn.disabled = false;
            }
        } catch (error) {
            // Clear controller reference
            if (_currentDownloadController === controller) {
                _currentDownloadController = null;
            }
            
            // Don't show error for aborted downloads
            if (error.name === 'AbortError') {
                return;
            }
            
            console.error('Download failed:', error);
            alert('Failed to download image. Please try again.');
            
            // Restore button state on error
            const downloadBtn = document.getElementById('download-full-size-btn');
            if (downloadBtn) {
                const extension = getFileExtension(fullSrc);
                const format = extension || 'Image';
                downloadBtn.querySelector('.btn-text').textContent = `Download Full Size ${format}`;
                downloadBtn.disabled = false;
            }
        }
    };

    // Update zoom image after navigation (next/previous)
    const updateZoomImageAfterNavigation = () => {
        const mainImage = document.getElementById('main-image');
        const zoomedImage = document.getElementById('zoomed-image');
        if (!mainImage || !zoomedImage) return;
        
        // Cancel any ongoing image load
        _currentZoomPreload = null;
        
        // Cancel any ongoing download
        if (_currentDownloadController) {
            _currentDownloadController.abort();
            _currentDownloadController = null;
        }
        
        // Hide loading indicator if visible
        hideZoomLoading();
        
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
            zoomedImage.dataset.fullSrc = fullSrc;
            zoomedImage.dataset.isFullSizeLoaded = 'false';
            
            // Ensure small main loader is hidden while zoom overlay is visible
            if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
            
            // Reset load button to default state
            const loadBtn = document.getElementById('load-full-size-btn');
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.classList.remove('loaded');
            }
            
            // Reset download button to default state
            const downloadBtn = document.getElementById('download-full-size-btn');
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
            
            // Show zoom controls if different from webp
            const zoomControls = document.getElementById('zoom-controls');
            if (zoomControls && fullSrc !== webpPreview) {
                zoomControls.classList.add('visible');
                updateZoomButtonText(fullSrc);
            } else if (zoomControls) {
                zoomControls.classList.remove('visible');
            }
            
            hideZoomLoading();
        }
        
        // Update alt text
        zoomedImage.alt = mainImage.alt || '';
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
        
        // Store full size URL in dataset for later use
        zoomedImage.dataset.fullSrc = fullSrc;
        zoomedImage.dataset.isFullSizeLoaded = 'false';
        
        // Reset load button to default state
        const loadBtn = document.getElementById('load-full-size-btn');
        if (loadBtn) {
            loadBtn.disabled = false;
            loadBtn.classList.remove('loaded');
        }
        
        // Show zoom controls if webp preview is different from full size
        const zoomControls = document.getElementById('zoom-controls');
        if (zoomControls && fullSrc && fullSrc !== webpPreview) {
            zoomControls.classList.add('visible');
            // Update button text with format and prepare for size
            updateZoomButtonText(fullSrc);
        } else if (zoomControls) {
            zoomControls.classList.remove('visible');
        }
        
        // Focus overlay so keyboard events (arrow keys) work
        setTimeout(() => {
            zoomOverlay.focus();
        }, 50);

        // DO NOT automatically load full-resolution image
        // User must click "Load Full Size" button
        hideZoomLoading();
    };

    const closeZoom = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        const zoomControls = document.getElementById('zoom-controls');
        const loadBtn = document.getElementById('load-full-size-btn');
        const downloadBtn = document.getElementById('download-full-size-btn');
        
        if (zoomOverlay) {
            zoomOverlay.classList.remove('visible');
            // ensure loading indicator is hidden when overlay is closed
            hideZoomLoading();
            // hide controls when closing
            if (zoomControls) {
                zoomControls.classList.remove('visible');
            }
            // reset load button state
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.classList.remove('loaded');
            }
            // reset download button state
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
            // cancel any pending zoom preload so stale callbacks are ignored
            _currentZoomPreload = null;
            // cancel any ongoing download
            if (_currentDownloadController) {
                _currentDownloadController.abort();
                _currentDownloadController = null;
            }
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
                
                loadImageWithRetry(webpSrc)
                    .then(() => {
                        if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                        if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                            window.SZ.colorPalette.updateMainImageAndPalette(webpSrc, targetThumbnail, false);
                        }
                    })
                    .catch(() => {
                        if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                        if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                            window.SZ.colorPalette.updateMainImageAndPalette(previewUrl, targetThumbnail, false);
                        }
                    });
            } else if (!hasWebp && fullSrc && mainImage && mainImage.src !== fullSrc) {
                // For movies without webp, preload full-res and show loader
                if (window.SZ?.mainLoader?.show) window.SZ.mainLoader.show();
                
                loadImageWithRetry(fullSrc)
                    .then(() => {
                        if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                        if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                            window.SZ.colorPalette.updateMainImageAndPalette(fullSrc, targetThumbnail, false);
                        }
                    })
                    .catch(() => {
                        if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                        if (window.SZ?.colorPalette?.updateMainImageAndPalette) {
                            window.SZ.colorPalette.updateMainImageAndPalette(previewUrl, targetThumbnail, false);
                        }
                    });
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
        updateZoomImageAfterNavigation();
    };

    const goToPreviousImageInZoom = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        if (!zoomOverlay || !zoomOverlay.classList.contains('visible')) return;
        
        // Move to previous image
        goToPreviousImage();
        
        // Update the zoomed image to show the new full-resolution image
        updateZoomImageAfterNavigation();
    };

    const initializeZoomOverlay = () => {
        const zoomOverlay = document.getElementById('zoom-overlay');
        const closeButton = document.querySelector('.close-zoom');
        const prevButton = document.getElementById('zoom-nav-prev');
        const nextButton = document.getElementById('zoom-nav-next');
        const zoomedImage = document.getElementById('zoomed-image');
        const loadFullSizeBtn = document.getElementById('load-full-size-btn');
        const downloadFullSizeBtn = document.getElementById('download-full-size-btn');
        
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
        
        // Add event listeners for load and download buttons
        if (loadFullSizeBtn) {
            loadFullSizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadFullSizeImage();
            });
        }
        
        if (downloadFullSizeBtn) {
            downloadFullSizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadFullSizeImage();
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
