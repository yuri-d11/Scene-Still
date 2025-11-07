// Hamburger menu toggle functionality
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const hamburger = document.querySelector('.hamburger-menu');
        const navList = document.querySelector('.nav-list');
        
        if (!hamburger || !navList) return;
        
        // Create a placeholder element to maintain layout
        const placeholder = document.createElement('div');
        placeholder.className = 'hamburger-placeholder';
        // Copy exact dimensions and spacing from hamburger
        const hamburgerStyles = window.getComputedStyle(hamburger);
        placeholder.style.width = hamburgerStyles.width;
        placeholder.style.height = hamburgerStyles.height;
        placeholder.style.padding = hamburgerStyles.padding;
        placeholder.style.margin = hamburgerStyles.margin;
        placeholder.style.flexShrink = '0';
        placeholder.style.display = 'none';
        placeholder.style.visibility = 'hidden';
        hamburger.parentNode.insertBefore(placeholder, hamburger);
        
        // Toggle menu on hamburger click
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            const isActive = hamburger.classList.toggle('active');
            navList.classList.toggle('active');
            
            // Toggle placeholder visibility to prevent layout shift
            placeholder.style.display = isActive ? 'flex' : 'none';
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navList.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove('active');
                navList.classList.remove('active');
                placeholder.style.display = 'none';
            }
        });
        
        // Close menu when clicking a nav link
        const navLinks = navList.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navList.classList.remove('active');
                placeholder.style.display = 'none';
            });
        });
        
        // Prevent clicks inside nav from closing it
        navList.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
})();
