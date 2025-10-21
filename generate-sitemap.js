/**
 * Sitemap Generator for Scene Still
 * Generates sitemap.xml with entries for all movies and people from CSV
 * 
 * Usage: node generate-sitemap.js
 * Requirements: Node.js installed
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CSV_FILE = 'Scene still DB - Sheet1.csv';
const SITEMAP_FILE = 'sitemap.xml';
const BASE_URL = 'https://www.scenestill.com';
const TODAY = new Date().toISOString().split('T')[0];

/**
 * Parse CSV file into array of objects
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        // Handle commas within quoted fields
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        return row;
    });
}

/**
 * Extract unique people (directors, cinematographers, actors) from CSV
 */
function extractPeople(rows) {
    const peopleSet = new Map(); // Use Map to store name -> role mapping
    
    rows.forEach(row => {
        const movieId = row['Movie ID'];
        if (!movieId) return;
        
        // Add director
        const director = row['Director'];
        if (director && director.trim()) {
            if (!peopleSet.has(director)) {
                peopleSet.set(director, 'Director');
            }
        }
        
        // Add cinematographer
        const cinematographer = row['Cinematographer'];
        if (cinematographer && cinematographer.trim()) {
            if (!peopleSet.has(cinematographer)) {
                peopleSet.set(cinematographer, 'Cinematographer');
            }
        }
        
        // Add cast members
        const cast = row['Cast'];
        if (cast && cast.trim()) {
            const castMembers = cast.split('|').map(c => c.trim()).filter(c => c);
            castMembers.forEach(actor => {
                if (!peopleSet.has(actor)) {
                    peopleSet.set(actor, 'Actor');
                }
            });
        }
    });
    
    return Array.from(peopleSet.entries()).map(([name, role]) => ({ name, role }));
}

/**
 * Generate sitemap XML content
 */
function generateSitemap(movies, people) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Static pages (using clean URLs for GitHub Pages)
    const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'weekly' },
        { loc: '/about', priority: '0.8', changefreq: 'monthly' },
        { loc: '/color_extractor', priority: '0.8', changefreq: 'monthly' },
        { loc: '/cast_crew', priority: '0.7', changefreq: 'weekly' }
    ];
    
    staticPages.forEach(page => {
        xml += `    <url>\n`;
        xml += `        <loc>${BASE_URL}${page.loc}</loc>\n`;
        xml += `        <lastmod>${TODAY}</lastmod>\n`;
        xml += `        <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `        <priority>${page.priority}</priority>\n`;
        xml += `    </url>\n`;
        xml += `    \n`;
    });
    
    // Movie pages
    xml += `    <!-- Film Pages (${movies.length} total) -->\n`;
    movies.forEach(movie => {
        if (!movie.movieId) return;
        
        xml += `    <url>\n`;
        xml += `        <loc>${BASE_URL}/film?id=${movie.movieId}</loc>\n`;
        xml += `        <lastmod>${TODAY}</lastmod>\n`;
        xml += `        <changefreq>monthly</changefreq>\n`;
        xml += `        <priority>0.9</priority>\n`;
        xml += `    </url>\n`;
    });
    xml += `    \n`;
    
    // People pages
    xml += `    <!-- People Pages (${people.length} total) -->\n`;
    people.forEach(person => {
        const encodedName = encodeURIComponent(person.name);
        const encodedRole = encodeURIComponent(person.role);
        
        xml += `    <url>\n`;
        xml += `        <loc>${BASE_URL}/person?name=${encodedName}&amp;role=${encodedRole}</loc>\n`;
        xml += `        <lastmod>${TODAY}</lastmod>\n`;
        xml += `        <changefreq>monthly</changefreq>\n`;
        xml += `        <priority>0.7</priority>\n`;
        xml += `    </url>\n`;
    });
    
    xml += '</urlset>';
    
    return xml;
}

/**
 * Main function
 */
function main() {
    console.log('🎬 Scene Still Sitemap Generator\n');
    console.log('================================\n');
    
    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`❌ Error: CSV file not found: ${CSV_FILE}`);
        console.error('   Make sure you run this script from the Scene-Still directory.');
        process.exit(1);
    }
    
    console.log(`📖 Reading CSV file: ${CSV_FILE}`);
    const csvText = fs.readFileSync(CSV_FILE, 'utf-8');
    const rows = parseCSV(csvText);
    
    console.log(`✅ Found ${rows.length} movies in CSV\n`);
    
    // Extract movies
    const movies = rows.map(row => ({
        movieId: row['Movie ID'],
        movieName: row['Movie Name']
    })).filter(movie => movie.movieId);
    
    console.log(`🎥 Processing ${movies.length} movie entries`);
    
    // Extract people
    console.log(`👥 Extracting people (directors, cinematographers, actors)...`);
    const people = extractPeople(rows);
    console.log(`✅ Found ${people.length} unique people\n`);
    
    // Generate sitemap
    console.log(`📝 Generating sitemap XML...`);
    const sitemapXml = generateSitemap(movies, people);
    
    // Write sitemap file
    fs.writeFileSync(SITEMAP_FILE, sitemapXml, 'utf-8');
    console.log(`✅ Sitemap generated: ${SITEMAP_FILE}\n`);
    
    // Summary
    console.log('📊 Summary:');
    console.log('   =====================================');
    console.log(`   Static pages:       4`);
    console.log(`   Film pages:         ${movies.length}`);
    console.log(`   People pages:       ${people.length}`);
    console.log(`   Total URLs:         ${4 + movies.length + people.length}`);
    console.log('   =====================================\n');
    
    console.log('⚠️  Remember to:');
    console.log('   1. Submit sitemap.xml to Google Search Console\n');
    
    console.log('✨ Done!\n');
}

// Run the script
try {
    main();
} catch (error) {
    console.error('❌ Error generating sitemap:', error.message);
    process.exit(1);
}
