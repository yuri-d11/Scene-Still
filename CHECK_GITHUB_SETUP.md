# GitHub Pages Clean URLs Checklist

## ✅ Current Status:

1. **CNAME File**: ✅ Created with `scenestill.com`
2. **Canonical URLs**: ✅ All use clean URLs (no .html)
3. **Internal Links**: ✅ Use relative paths with .html (works locally and on GitHub)
4. **Sitemap**: ✅ Uses clean URLs

## 🔧 GitHub Repository Settings Required:

### Step 1: Enable GitHub Pages
1. Go to your repository: https://github.com/yuri-d11/Scene-Still
2. Click **Settings** → **Pages**
3. Under "Source", select branch: `main` (root)
4. Click **Save**

### Step 2: Configure Custom Domain
1. Still in **Settings** → **Pages**
2. Under "Custom domain", enter: `scenestill.com`
3. Click **Save**
4. ✅ Check "Enforce HTTPS" (after DNS propagates)

### Step 3: Verify DNS Settings in Porkbun

Add these DNS records in Porkbun:

```
Type: A     | Host: @   | Answer: 185.199.108.153 | TTL: 600
Type: A     | Host: @   | Answer: 185.199.109.153 | TTL: 600
Type: A     | Host: @   | Answer: 185.199.110.153 | TTL: 600
Type: A     | Host: @   | Answer: 185.199.111.153 | TTL: 600
Type: CNAME | Host: www | Answer: yuri-d11.github.io | TTL: 600
```

### Step 4: Wait for DNS Propagation
- Can take 24-48 hours
- Check status: https://dnschecker.org/#A/scenestill.com

## 🧪 Test Clean URLs:

Once DNS is propagated and GitHub Pages is configured:

1. Visit: `https://scenestill.com/about.html`
   - Should redirect to: `https://scenestill.com/about`

2. Visit: `https://scenestill.com/about`
   - Should load without showing `.html` in URL bar

3. Click navigation links
   - URL bar should show clean URLs

## ⚠️ Common Issues:

### Issue: Still seeing `.html` in URLs
**Solution:**
- Clear browser cache (Ctrl + Shift + Delete)
- Try incognito/private mode
- Wait for DNS propagation
- Verify custom domain is saved in GitHub Pages settings

### Issue: "There isn't a GitHub Pages site here"
**Solution:**
- Check that CNAME file is in repository root
- Verify GitHub Pages is enabled in repository settings
- Check DNS records are correct

### Issue: URLs work but show .html
**Solution:**
- GitHub Pages clean URLs only work with custom domains
- Make sure custom domain is configured in Settings → Pages
- Not just CNAME file, but also the GitHub Pages setting

## 📝 Current File Structure:

```
✅ CNAME (contains: scenestill.com)
✅ index.html (canonical: https://scenestill.com/)
✅ about.html (canonical: https://scenestill.com/about)
✅ film.html (query params preserved)
✅ person.html (query params preserved)
✅ cast_crew.html
✅ color_extractor.html
✅ sitemap.xml (all clean URLs)
✅ robots.txt
```

## 🎯 What Happens on GitHub Pages:

When a user visits your site:
1. User types: `scenestill.com/about`
2. GitHub serves: `about.html`
3. URL bar shows: `scenestill.com/about` (no .html)
4. Internal link: `<a href="about.html">` → Browser loads `about.html` but displays `scenestill.com/about`

This is automatic once custom domain is configured!
