# Sitemap Generator Scripts

These scripts automatically generate a `sitemap.xml` file for Scene Still, including all movie and people pages by fetching data from TMDB.

## Available Scripts

### Python Script (Recommended) - TMDB Enhanced
- **File**: `generate-sitemap.py`
- **Requirements**: Python 3.6+, requests library
- **Features**: Fetches movie titles and cast/crew from TMDB
- **Usage**:
  ```bash
  python generate-sitemap.py
  ```
- **First time setup**:
  ```bash
  python -m pip install requests
  ```

### Node.js Script
- **File**: `generate-sitemap.js`
- **Requirements**: Node.js 12+
- **Usage**:
  ```bash
  node generate-sitemap.js
  ```

## What Gets Generated

The script automatically creates sitemap entries for:

1. **Static Pages** (5 entries):
   - Homepage (`/` and `/index.html`)
   - About page
   - Color Extractor page
   - Cast & Crew page

2. **Film Pages** (Dynamic - from CSV + TMDB):
   - One entry per movie with Movie ID from CSV
   - Movie titles fetched from TMDB
   - Format: `/film.html?id={MOVIE_ID}`

3. **People Pages** (Dynamic - from TMDB):
   - Directors, Cinematographers, and Actors (top 10 per film)
   - Data fetched from TMDB credits for each movie
   - Format: `/person.html?name={NAME}&role={ROLE}`
   - Automatically extracts unique people across all movies

## Output

The script generates a `sitemap.xml` file with:
- ✅ All valid movie pages
- ✅ Proper priority settings (higher for movie pages)
- ✅ Change frequency hints for search engines
- ✅ Current date as last modification date

Example output:
```
🎬 Scene Still Sitemap Generator (TMDB Enhanced)
================================================
📖 Reading CSV file: Scene still DB - Sheet1.csv
✅ Found 14 entries in CSV
🎥 Found 14 movies with IDs

🎬 Fetching data from TMDB for 14 movies...
   [14/14] Fetching movie ID: 279
✅ Fetched 14 movies from TMDB
✅ Found 160 unique people

📝 Generating sitemap XML...
✅ Sitemap generated: sitemap.xml

📊 Summary:
   Static pages:       5
   Film pages:         14
   People pages:       160
   Total URLs:         179
```

## Configuration

The scripts are already configured with the production domain:

**In `generate-sitemap.py`:**
```python
BASE_URL = 'https://scenestill.com'
```

**In `generate-sitemap.js`:**
```javascript
const BASE_URL = 'https://scenestill.com';
```

## When to Run

Run the sitemap generator:
- ✅ After adding new movies to your CSV
- ✅ After removing movies from your CSV
- ✅ Before submitting to Google Search Console
- ✅ Monthly (recommended for keeping content fresh)

## After Generation

1. **Update robots.txt** (already configured):
   ```
   Sitemap: https://scenestill.com/sitemap.xml
   ```

2. **Submit to Google Search Console**:
   - Go to: https://search.google.com/search-console
   - Navigate to: Sitemaps > Add a new sitemap
   - Enter: `sitemap.xml`
   - Click Submit

3. **Submit to Bing Webmaster Tools**:
   - Go to: https://www.bing.com/webmasters
   - Navigate to: Sitemaps > Submit sitemap
   - Enter: `https://scenestill.com/sitemap.xml`

## Automation (Optional)

### GitHub Actions (if using GitHub)
You can automate sitemap generation on every commit. Create `.github/workflows/generate-sitemap.yml`:

```yaml
name: Generate Sitemap
on:
  push:
    paths:
      - 'Scene still DB - Sheet1.csv'
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate sitemap
        run: python generate-sitemap.py
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add sitemap.xml
          git commit -m "Auto-update sitemap" || exit 0
          git push
```

### Local Automation (Windows)
Create a batch file to run automatically:

**`update-sitemap.bat`:**
```batch
@echo off
cd /d "%~dp0"
python generate-sitemap.py
echo Sitemap updated!
pause
```

Double-click to run anytime you update your CSV.

## Troubleshooting

**Error: "CSV file not found"**
- Make sure you're running the script from the `Scene-Still` directory
- Check that `Scene still DB - Sheet1.csv` exists

**No movies found**
- Check that your CSV has a "Movie ID" column
- Ensure movie IDs are not empty

**Script won't run**
- Python: Install Python 3.6+ from python.org
- Node.js: Install Node.js from nodejs.org

## SEO Benefits

✅ **Search Engine Discovery**: All pages are discoverable  
✅ **Crawl Efficiency**: Search engines know what to index  
✅ **Priority Signals**: Important pages ranked higher  
✅ **Fresh Content**: Regular updates show site is active  

## Questions?

Contact: yuri@dandashi.de  
Twitter: @YuriDandashi
