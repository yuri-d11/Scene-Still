(function () {
    window.SZ = window.SZ || {};

    const rgbToHex = (r, g, b) => {
        const toHex = c => ('0' + Math.max(0, Math.min(255, c)).toString(16)).slice(-2);
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    };

    const copyToClipboard = (text) => {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        try {
            document.execCommand('copy');
            return true;
        } catch (err) {
            console.error('Fallback: Unable to copy', err);
            return false;
        } finally {
            document.body.removeChild(el);
        }
    };

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
    const loadImageWithRetry = (url, maxRetries = 3, initialTimeout = 7000) => {
        return new Promise((resolve, reject) => {
            let attempt = 0;
            
            const tryLoad = () => {
                attempt++;
                const img = new Image();
                let loadCompleted = false;
                
                // Progressive timeouts: 7s, 10s, 15s (normal) or 14s, 20s, 30s (slow)
                const isSlow = hasSlowConnection();
                const baseTimeouts = [7000, 10000, 15000];
                const slowTimeouts = [14000, 20000, 30000];
                const timeouts = isSlow ? slowTimeouts : baseTimeouts;
                const timeoutDuration = timeouts[attempt - 1] || (isSlow ? 30000 : 15000);
                
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

    const displayPalette = (colors, container) => {
        container.innerHTML = '';
        container.classList.remove('loaded');
        if (!colors || colors.length === 0) return;

        colors.forEach(color => {
            const [r, g, b] = color.map(Math.round);
            const hexValue = rgbToHex(r, g, b);
            const swatchContainer = document.createElement('div');
            swatchContainer.className = 'col'; // Bootstrap column for grid layout
            
            const swatchDiv = document.createElement('div');
            const isLight = (r * 0.299 + g * 0.587 + b * 0.114) > 160;
            const textColorClass = isLight ? 'text-dark' : 'text-white'; // Use Bootstrap text colors
            
            swatchDiv.className = `palette-swatch ${textColorClass}`;
            swatchDiv.style.backgroundColor = hexValue;
            swatchDiv.title = `Click to copy ${hexValue}`;

            const hexCodeSpan = document.createElement('span');
            hexCodeSpan.className = 'hex-code';
            hexCodeSpan.textContent = hexValue;

            const copyPromptSpan = document.createElement('span');
            copyPromptSpan.className = 'copy-prompt';
            copyPromptSpan.textContent = 'Copy';
            
            swatchDiv.appendChild(hexCodeSpan);
            swatchDiv.appendChild(copyPromptSpan);

            swatchDiv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (copyToClipboard(hexValue)) {
                    copyPromptSpan.textContent = 'Copied!';
                    setTimeout(() => {
                        copyPromptSpan.textContent = 'Copy';
                    }, 1500);
                }
            });
            swatchContainer.appendChild(swatchDiv);
            container.appendChild(swatchContainer);
        });
        
        setTimeout(() => container.classList.add('loaded'), 50);
    };

    const getPureJSPalette = (imgElement, numColors) => {
        const colorMap = new Map();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const QUANTIZATION_FACTOR = 32;
        const ANALYSIS_SIZE = 150;
        const ratio = Math.min(1, ANALYSIS_SIZE / imgElement.naturalWidth, ANALYSIS_SIZE / imgElement.naturalHeight);
        canvas.width = imgElement.naturalWidth * ratio;
        canvas.height = imgElement.naturalHeight * ratio;

        try {
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const totalPixels = canvas.width * canvas.height;
            const MAX_SAMPLES = 5000;
            const sampleStep = Math.max(1, Math.floor(totalPixels / MAX_SAMPLES));

            for (let i = 0; i < totalPixels * 4; i += sampleStep * 4) {
                const [r, g, b, a] = [imageData[i], imageData[i + 1], imageData[i + 2], imageData[i + 3]];
                if (a < 128) continue;
                const BLACK_THRESHOLD = 15;
                if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD) continue;
                const qR = Math.floor(r / QUANTIZATION_FACTOR) * QUANTIZATION_FACTOR;
                const qG = Math.floor(g / QUANTIZATION_FACTOR) * QUANTIZATION_FACTOR;
                const qB = Math.floor(b / QUANTIZATION_FACTOR) * QUANTIZATION_FACTOR;
                const key = `${qR},${qG},${qB}`;
                colorMap.set(key, (colorMap.get(key) || 0) + 1);
            }
        } catch (e) {
            console.error("Canvas Pixel Reading Failed:", e);
            return [];
        }

        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([key]) => {
                const [r, g, b] = key.split(',').map(Number);
                const halfQuant = QUANTIZATION_FACTOR / 2;
                return [r + halfQuant, g + halfQuant, b + halfQuant];
            });

        if (sortedColors.length === 0) return [];
        
        const finalPalette = [];
        const colorDistance = (c1, c2) => Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2));
        const SIMILARITY_THRESHOLD = 50;
        finalPalette.push(sortedColors[0]);

        for (const color of sortedColors) {
            if (finalPalette.length >= numColors) break;
            const isSimilar = finalPalette.some(finalColor => colorDistance(color, finalColor) < SIMILARITY_THRESHOLD);
            if (!isSimilar) {
                finalPalette.push(color);
            }
        }
        return finalPalette;
    };
    
    let activeThumbnailWrapper = null;

    const scrollToMainImageOnMobile = () => {
        // Check if on mobile (viewport width <= 768px)
        if (window.innerWidth <= 768) {
            const mainImage = document.getElementById('main-image');
            if (mainImage) {
                // Get the position of the main image
                const mainImageRect = mainImage.getBoundingClientRect();
                const absoluteTop = window.pageYOffset + mainImageRect.top;
                
                // Calculate scroll position to center the image
                const windowHeight = window.innerHeight;
                const imageHeight = mainImageRect.height;
                const scrollTo = absoluteTop - (windowHeight / 2) + (imageHeight / 2);
                
                // Smooth scroll to center the main image
                window.scrollTo({
                    top: Math.max(0, scrollTo),
                    behavior: 'smooth'
                });
            }
        }
    };

    const updateMainImageAndPalette = (imageUrl, clickedThumbnailWrapper, shouldScroll = false) => {
        const mainImage = document.getElementById('main-image');
        const mainPaletteContainer = document.getElementById('main-palette-container');

        if (!imageUrl) return;
        mainImage.src = imageUrl;
        // Ensure the main image knows the full-resolution URL for zoom/navigation.
        try {
            const thumbImg = clickedThumbnailWrapper ? clickedThumbnailWrapper.querySelector('.thumbnail-image') : null;
            // Prefer the thumbnail's fullSrc if available, otherwise set to the provided imageUrl
            if (thumbImg && thumbImg.dataset && thumbImg.dataset.fullSrc) {
                mainImage.dataset.fullSrc = thumbImg.dataset.fullSrc;
            } else {
                mainImage.dataset.fullSrc = imageUrl || '';
            }
        } catch (e) {
            mainImage.dataset.fullSrc = imageUrl || '';
        }
        // (No background preloads here — avoid bulk full-res downloads when users click many thumbnails)
        mainPaletteContainer.innerHTML = '';
        mainPaletteContainer.classList.remove('loaded');

        // Update alt text from clicked thumbnail
        if (clickedThumbnailWrapper) {
            const thumbnailImage = clickedThumbnailWrapper.querySelector('.thumbnail-image');
            if (thumbnailImage && thumbnailImage.alt) {
                mainImage.alt = thumbnailImage.alt;
            }
        }

        // Update active thumbnail border
        if (activeThumbnailWrapper) {
            activeThumbnailWrapper.classList.remove('active');
        }
        if (clickedThumbnailWrapper) {
            clickedThumbnailWrapper.classList.add('active');
            activeThumbnailWrapper = clickedThumbnailWrapper;
            
            // Update current image index for swipe handler
            if (window.SZ?.swipeHandler?.setCurrentImageIndex) {
                const thumbnailGrid = document.getElementById('thumbnail-grid');
                if (thumbnailGrid) {
                    const allThumbnails = Array.from(thumbnailGrid.querySelectorAll('.thumbnail-wrapper'));
                    const currentIndex = allThumbnails.indexOf(clickedThumbnailWrapper);
                    if (currentIndex !== -1) {
                        window.SZ.swipeHandler.setCurrentImageIndex(currentIndex);
                    }
                }
            }
        }

        // Scroll to main image on mobile only if explicitly requested
        if (shouldScroll) {
            scrollToMainImageOnMobile();
        }

        const analysisImg = new Image();
        analysisImg.crossOrigin = "Anonymous"; // Keep for potential future TMDb images or other origins
        analysisImg.onload = () => {
            const colors = getPureJSPalette(analysisImg, 5);
            displayPalette(colors, mainPaletteContainer);
        };
        analysisImg.onerror = () => {
            console.error(`Could not load image for analysis: ${imageUrl}.`);
        };
        analysisImg.src = imageUrl;
    };

    window.SZ.colorPalette = {
        updateMainImageAndPalette,
        loadImageWithRetry // Export for use in initial page load
    };

    document.addEventListener('DOMContentLoaded', () => {
        const thumbnailGrid = document.querySelector('.thumbnail-grid');

        // --- Event Listeners ---
        if (thumbnailGrid) {
            // Use event delegation to handle both grid and slider layouts
            thumbnailGrid.addEventListener('click', (e) => {
                const thumbnailImage = e.target.closest('.thumbnail-image');
                if (thumbnailImage) {
                    const thumbnailWrapper = thumbnailImage.closest('.thumbnail-wrapper');
                    // Decide whether to use full-resolution or preview based on CSV-provided marker
                    const thumbnailGridEl = document.getElementById('thumbnail-grid');
                    const hasWebp = thumbnailGridEl?.dataset?.hasWebp === '1';
                    let previewSrc;
                    if (!hasWebp) {
                        // No intermediate webp available for this movie — use full-res for main image
                        previewSrc = thumbnailImage.dataset.fullSrc || thumbnailImage.dataset.lazySrc || thumbnailImage.src;
                    } else {
                        // Prefer webp intermediate, then compressed thumbnail, then full as fallback
                        previewSrc = thumbnailImage.dataset.webpSrc || thumbnailImage.dataset.lazySrc || thumbnailImage.src || thumbnailImage.dataset.fullSrc;
                    }

                    // If preview is a webp that isn't already the main image, preload it
                    // and show a small spinner over the main image while it downloads.
                    const mainImage = document.getElementById('main-image');
                    const webpSrc = thumbnailImage.dataset.webpSrc;
                    const willUseWebp = hasWebp && webpSrc && previewSrc === webpSrc;

                    if (willUseWebp && mainImage && mainImage.src !== webpSrc) {
                        if (window.SZ?.mainLoader?.show) window.SZ.mainLoader.show();
                        
                        loadImageWithRetry(webpSrc)
                            .then(() => {
                                if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                                window.SZ.colorPalette.updateMainImageAndPalette(webpSrc, thumbnailWrapper, true);
                            })
                            .catch(() => {
                                if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                                // Fallback to whatever previewSrc is available
                                window.SZ.colorPalette.updateMainImageAndPalette(previewSrc, thumbnailWrapper, true);
                            });
                    } else if (!hasWebp) {
                        // For movies without webp, preload the full-res thumbnail (if different)
                        const fullSrc = thumbnailImage.dataset.fullSrc;
                        if (fullSrc && mainImage && mainImage.src !== fullSrc) {
                            if (window.SZ?.mainLoader?.show) window.SZ.mainLoader.show();
                            
                            loadImageWithRetry(fullSrc)
                                .then(() => {
                                    if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                                    window.SZ.colorPalette.updateMainImageAndPalette(fullSrc, thumbnailWrapper, true);
                                })
                                .catch(() => {
                                    if (window.SZ?.mainLoader?.hide) window.SZ.mainLoader.hide();
                                    window.SZ.colorPalette.updateMainImageAndPalette(previewSrc, thumbnailWrapper, true);
                                });
                        } else {
                            window.SZ.colorPalette.updateMainImageAndPalette(previewSrc, thumbnailWrapper, true);
                        }
                    } else {
                        window.SZ.colorPalette.updateMainImageAndPalette(previewSrc, thumbnailWrapper, true);
                    }
                }
            });
        }
    });
})();