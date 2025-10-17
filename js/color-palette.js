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

    const updateMainImageAndPalette = (imageUrl, clickedThumbnailWrapper) => {
        const mainImage = document.getElementById('main-image');
        const mainPaletteContainer = document.getElementById('main-palette-container');

        if (!imageUrl) return;
        mainImage.src = imageUrl;
        mainPaletteContainer.innerHTML = '';
        mainPaletteContainer.classList.remove('loaded');

        // Update active thumbnail border
        if (activeThumbnailWrapper) {
            activeThumbnailWrapper.classList.remove('active');
        }
        if (clickedThumbnailWrapper) {
            clickedThumbnailWrapper.classList.add('active');
            activeThumbnailWrapper = clickedThumbnailWrapper;
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
        updateMainImageAndPalette
    };

    document.addEventListener('DOMContentLoaded', () => {
        const thumbnailGrid = document.querySelector('.thumbnail-grid');
        const mainImage = document.getElementById('main-image');
        const imageModal = document.getElementById('image-modal');
        const modalImage = document.getElementById('modal-image');
        const closeModal = document.querySelector('.close-modal');

        // --- Event Listeners ---
        if (thumbnailGrid) {
            thumbnailGrid.addEventListener('click', (e) => {
                if (e.target && e.target.classList.contains('thumbnail-image')) {
                    const thumbnailWrapper = e.target.closest('.thumbnail-wrapper');
                    window.SZ.colorPalette.updateMainImageAndPalette(e.target.dataset.fullSrc, thumbnailWrapper);
                }
            });
        }

        if (mainImage) {
            mainImage.addEventListener('click', () => {
                imageModal.classList.add('visible'); 
                modalImage.src = mainImage.src;
            });
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => {
                imageModal.classList.remove('visible'); 
            });
        }

        if (imageModal) {
            imageModal.addEventListener('click', (e) => {
                if (e.target === imageModal) {
                     imageModal.classList.remove('visible'); 
                }
            });
        }
    });
})();