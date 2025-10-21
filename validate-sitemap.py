#!/usr/bin/env python3
"""
Sitemap Validator for Scene Still
Validates the generated sitemap.xml for common issues

Usage: python validate-sitemap.py
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

SITEMAP_FILE = 'sitemap.xml'


def validate_sitemap():
    """Validate sitemap.xml for common issues."""
    print('🔍 Sitemap Validator\n')
    print('================================\n')
    
    # Check if file exists
    sitemap_path = Path(SITEMAP_FILE)
    if not sitemap_path.exists():
        print(f'❌ Error: Sitemap file not found: {SITEMAP_FILE}')
        print('   Run generate-sitemap.py first.')
        return False
    
    print(f'📖 Reading sitemap: {SITEMAP_FILE}')
    
    try:
        # Parse XML
        tree = ET.parse(SITEMAP_FILE)
        root = tree.getroot()
        
        # Check namespace
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall('ns:url', namespace)
        
        print(f'✅ Valid XML structure')
        print(f'✅ Found {len(urls)} URL entries\n')
        
        # Validate each URL
        issues = []
        warnings = []
        url_set = set()
        
        for i, url in enumerate(urls, 1):
            loc = url.find('ns:loc', namespace)
            lastmod = url.find('ns:lastmod', namespace)
            priority = url.find('ns:priority', namespace)
            changefreq = url.find('ns:changefreq', namespace)
            
            if loc is None:
                issues.append(f'URL #{i}: Missing <loc> element')
                continue
            
            url_text = loc.text
            
            # Check for duplicates
            if url_text in url_set:
                issues.append(f'URL #{i}: Duplicate URL: {url_text}')
            url_set.add(url_text)
            
            # Validate URL format
            parsed = urlparse(url_text)
            if not parsed.scheme or not parsed.netloc:
                issues.append(f'URL #{i}: Invalid URL format: {url_text}')
            
            # Check for placeholder domain
            if 'yourdomain.com' in url_text:
                warnings.append(f'URL #{i}: Contains placeholder domain "yourdomain.com"')
            
            # Validate priority
            if priority is not None:
                try:
                    p_val = float(priority.text)
                    if not (0.0 <= p_val <= 1.0):
                        issues.append(f'URL #{i}: Priority must be between 0.0 and 1.0')
                except ValueError:
                    issues.append(f'URL #{i}: Invalid priority value')
        
        # Print results
        print('📊 Validation Results:')
        print('   =====================================')
        print(f'   Total URLs:         {len(urls)}')
        print(f'   Unique URLs:        {len(url_set)}')
        print(f'   Issues found:       {len(issues)}')
        print(f'   Warnings:           {len(warnings)}')
        print('   =====================================\n')
        
        if issues:
            print('❌ Issues Found:\n')
            for issue in issues[:10]:  # Show first 10
                print(f'   • {issue}')
            if len(issues) > 10:
                print(f'   ... and {len(issues) - 10} more')
            print()
        
        if warnings:
            print('⚠️  Warnings:\n')
            for warning in warnings[:5]:  # Show first 5
                print(f'   • {warning}')
            if len(warnings) > 5:
                print(f'   ... and {len(warnings) - 5} more')
            print()
        
        if not issues and not warnings:
            print('✅ Sitemap is valid and ready to submit!\n')
            print('📝 Next Steps:')
            print('   1. Update BASE_URL in generate-sitemap.py')
            print('   2. Re-generate sitemap with your domain')
            print('   3. Submit to Google Search Console')
            print('   4. Submit to Bing Webmaster Tools\n')
            return True
        elif not issues:
            print('✅ Sitemap structure is valid\n')
            print('⚠️  Please address warnings before submitting\n')
            return True
        else:
            print('❌ Please fix issues before submitting\n')
            return False
            
    except ET.ParseError as e:
        print(f'❌ XML Parse Error: {e}')
        print('   Sitemap file is not valid XML')
        return False
    except Exception as e:
        print(f'❌ Validation Error: {e}')
        return False


if __name__ == '__main__':
    try:
        success = validate_sitemap()
        exit(0 if success else 1)
    except Exception as e:
        print(f'❌ Error: {e}')
        exit(1)
