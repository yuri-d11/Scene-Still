/**
 * Clean URLs - Remove .html from URL bar on GitHub Pages
 * Automatically redirects from .html URLs to clean URLs
 */
(function() {
    // Only run on production (not localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return;
    }

    const currentUrl = window.location.href;
    
    // Check if URL contains .html
    if (currentUrl.includes('.html')) {
        // Remove .html from the URL
        const cleanUrl = currentUrl.replace('.html', '');
        
        // Use replaceState to change URL without reloading the page
        window.history.replaceState({}, document.title, cleanUrl);
    }
})();
