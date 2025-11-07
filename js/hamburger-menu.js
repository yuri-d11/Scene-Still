// Hamburger menu toggle functionality
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const hamburger = document.querySelector('.hamburger-menu');
        const navList = document.querySelector('.nav-list');
        
        if (!hamburger || !navList) return;
        
        // Toggle menu on hamburger click
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            hamburger.classList.toggle('active');
            navList.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navList.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove('active');
                navList.classList.remove('active');
            }
        });
        
        // Close menu when clicking a nav link
        const navLinks = navList.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navList.classList.remove('active');
            });
        });
        
        // Prevent clicks inside nav from closing it
        navList.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
})();
