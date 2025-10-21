#!/usr/bin/env python3
"""
Sitemap Generator for Scene Still
Generates sitemap.xml with entries for all movies and people from CSV + TMDB

Usage: python generate-sitemap.py
Requirements: Python 3.6+, requests library
"""

import csv
import json
import urllib.parse
from datetime import datetime
from pathlib import Path
import time

try:
    import requests
except ImportError:
    print("❌ Error: 'requests' library not found")
    print("   Install it with: pip install requests")
    exit(1)

# Configuration
CSV_FILE = 'Scene still DB - Sheet1.csv'
SITEMAP_FILE = 'sitemap.xml'
BASE_URL = 'https://scenestill.com'
TODAY = datetime.now().strftime('%Y-%m-%d')

# TMDB API Configuration
TMDB_API_KEY = 'a1f4af351bf053ea8eea3e836abfd328'
TMDB_BASE_URL = 'https://api.themoviedb.org/3'


def parse_csv(csv_file):
    """Parse CSV file and return list of dictionaries."""
    movies = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            movies.append(row)
    return movies


def get_tmdb_movie_details(movie_id):
    """Fetch movie details including cast and crew from TMDB."""
    try:
        url = f'{TMDB_BASE_URL}/movie/{movie_id}'
        params = {
            'api_key': TMDB_API_KEY,
            'append_to_response': 'credits'
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            print('❌ Error: Invalid TMDB API key')
            return None
        else:
            print(f'⚠️  Warning: Could not fetch data for movie ID {movie_id} (status {response.status_code})')
            return None
            
    except requests.exceptions.RequestException as e:
        print(f'⚠️  Warning: Network error for movie ID {movie_id}: {e}')
        return None


def extract_people_from_tmdb(movie_ids):
    """Extract unique people from TMDB data for given movie IDs."""
    people = {}  # Use dict to store name -> role mapping
    movies_data = []
    
    print(f'🎬 Fetching data from TMDB for {len(movie_ids)} movies...')
    
    for idx, movie_id in enumerate(movie_ids, 1):
        print(f'   [{idx}/{len(movie_ids)}] Fetching movie ID: {movie_id}', end='\r')
        
        movie_data = get_tmdb_movie_details(movie_id)
        if not movie_data:
            continue
        
        movies_data.append({
            'id': movie_id,
            'title': movie_data.get('title', ''),
            'release_date': movie_data.get('release_date', '')
        })
        
        # Extract director
        if 'credits' in movie_data and 'crew' in movie_data['credits']:
            for crew_member in movie_data['credits']['crew']:
                if crew_member.get('job') == 'Director':
                    name = crew_member.get('name')
                    if name and name not in people:
                        people[name] = 'Director'
                elif crew_member.get('job') == 'Director of Photography':
                    name = crew_member.get('name')
                    if name and name not in people:
                        people[name] = 'Cinematographer'
        
        # Extract cast (top actors)
        if 'credits' in movie_data and 'cast' in movie_data['credits']:
            # Get top 10 cast members from each movie
            for cast_member in movie_data['credits']['cast'][:10]:
                name = cast_member.get('name')
                if name and name not in people:
                    people[name] = 'Actor'
        
        # Be respectful to TMDB API - small delay between requests
        time.sleep(0.25)
    
    print()  # New line after progress
    
    return movies_data, [{'name': name, 'role': role} for name, role in people.items()]


def generate_sitemap(movies, people):
    """Generate sitemap XML content."""
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    
    # Static pages (using clean URLs for GitHub Pages)
    static_pages = [
        {'loc': '/', 'priority': '1.0', 'changefreq': 'weekly'},
        {'loc': '/about', 'priority': '0.8', 'changefreq': 'monthly'},
        {'loc': '/color_extractor', 'priority': '0.8', 'changefreq': 'monthly'},
        {'loc': '/cast_crew', 'priority': '0.7', 'changefreq': 'weekly'},
    ]
    
    for page in static_pages:
        xml_lines.extend([
            '    <url>',
            f'        <loc>{BASE_URL}{page["loc"]}</loc>',
            f'        <lastmod>{TODAY}</lastmod>',
            f'        <changefreq>{page["changefreq"]}</changefreq>',
            f'        <priority>{page["priority"]}</priority>',
            '    </url>',
            '    ',
        ])
    
    # Movie pages
    xml_lines.append(f'    <!-- Film Pages ({len(movies)} total) -->')
    for movie in movies:
        movie_id = movie.get('movieId', '').strip()
        if not movie_id:
            continue
        
        xml_lines.extend([
            '    <url>',
            f'        <loc>{BASE_URL}/film.html?id={movie_id}</loc>',
            f'        <lastmod>{TODAY}</lastmod>',
            '        <changefreq>monthly</changefreq>',
            '        <priority>0.9</priority>',
            '    </url>',
        ])
    
    xml_lines.append('    ')
    
    # People pages
    xml_lines.append(f'    <!-- People Pages ({len(people)} total) -->')
    for person in people:
        encoded_name = urllib.parse.quote(person['name'])
        encoded_role = urllib.parse.quote(person['role'])
        
        xml_lines.extend([
            '    <url>',
            f'        <loc>{BASE_URL}/person.html?name={encoded_name}&amp;role={encoded_role}</loc>',
            f'        <lastmod>{TODAY}</lastmod>',
            '        <changefreq>monthly</changefreq>',
            '        <priority>0.7</priority>',
            '    </url>',
        ])
    
    xml_lines.append('</urlset>')
    
    return '\n'.join(xml_lines)


def main():
    """Main function."""
    print('🎬 Scene Still Sitemap Generator (TMDB Enhanced)\n')
    print('================================================\n')
    
    use_tmdb = True
    
    # Check if CSV file exists
    csv_path = Path(CSV_FILE)
    if not csv_path.exists():
        print(f'❌ Error: CSV file not found: {CSV_FILE}')
        print('   Make sure you run this script from the Scene-Still directory.')
        return 1
    
    print(f'📖 Reading CSV file: {CSV_FILE}')
    rows = parse_csv(CSV_FILE)
    print(f'✅ Found {len(rows)} entries in CSV\n')
    
    # Extract movie IDs
    movie_ids = [row.get('Movie ID', '').strip() for row in rows if row.get('Movie ID', '').strip()]
    print(f'🎥 Found {len(movie_ids)} movies with IDs\n')
    
    if use_tmdb and movie_ids:
        # Fetch data from TMDB
        movies_data, people = extract_people_from_tmdb(movie_ids)
        print(f'✅ Fetched {len(movies_data)} movies from TMDB')
        print(f'✅ Found {len(people)} unique people\n')
        
        # Use TMDB data for movies
        movies = [{'movieId': m['id']} for m in movies_data]
    else:
        # Fallback to CSV only
        movies = [{'movieId': row.get('Movie ID', '').strip()} for row in rows if row.get('Movie ID', '').strip()]
        people = []
        print('ℹ️  Using CSV data only (no TMDB integration)\n')
    
    # Generate sitemap
    print('📝 Generating sitemap XML...')
    sitemap_xml = generate_sitemap(movies, people)
    
    # Write sitemap file
    with open(SITEMAP_FILE, 'w', encoding='utf-8') as f:
        f.write(sitemap_xml)
    print(f'✅ Sitemap generated: {SITEMAP_FILE}\n')
    
    # Summary
    print('📊 Summary:')
    print('   =====================================')
    print(f'   Static pages:       4')
    print(f'   Film pages:         {len(movies)}')
    print(f'   People pages:       {len(people)}')
    print(f'   Total URLs:         {4 + len(movies) + len(people)}')
    print('   =====================================\n')
    
    print('⚠️  Remember to:')
    print(f'   1. Submit sitemap.xml to Google Search Console')
    if not use_tmdb:
        print('   2. Add your TMDB API key to fetch people data')
    print(f'\n✨ Done!\n')
    
    return 0


if __name__ == '__main__':
    try:
        exit(main())
    except Exception as e:
        print(f'❌ Error generating sitemap: {e}')
        exit(1)
