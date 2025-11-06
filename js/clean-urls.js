
(function() {
    // Only run on production (not localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return;
    }

    let currentUrl = window.location.href;
    let needsUpdate = false;
    
    if (currentUrl.includes('index.html')) {
        currentUrl = currentUrl.replace('index.html', '');
        needsUpdate = true;
    }
    
    // Remove /index from the URL (but not if it's part of a query string)
    if (currentUrl.match(/\/index(?:\?|$)/)) {
        currentUrl = currentUrl.replace(/\/index(\?|$)/, '/$1');
        needsUpdate = true;
    }
    
    // Remove .html from the URL
    if (currentUrl.includes('.html')) {
        currentUrl = currentUrl.replace('.html', '');
        needsUpdate = true;
    }
    
    // Update the URL if changes were made
    if (needsUpdate) {
        window.history.replaceState({}, document.title, currentUrl);
    }
})();
