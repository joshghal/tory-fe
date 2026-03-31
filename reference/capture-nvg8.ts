import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  console.log('Loading nvg8.io...');
  await page.goto('https://nvg8.io/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Screenshot 1: Hero / above the fold
  console.log('Capturing hero...');
  await page.screenshot({ path: path.join(OUT, 'nvg8-01-hero.png'), fullPage: false });

  // Get page height for scrolling
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 900;
  const scrollSteps = Math.ceil(pageHeight / (viewportHeight * 0.7));

  console.log(`Page height: ${pageHeight}px, taking ${scrollSteps} scroll captures...`);

  // Scroll slowly and capture at each position
  for (let i = 1; i <= Math.min(scrollSteps, 15); i++) {
    const scrollTo = Math.min(i * viewportHeight * 0.7, pageHeight - viewportHeight);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollTo);
    await page.waitForTimeout(1500); // let animations trigger
    const idx = String(i + 1).padStart(2, '0');
    await page.screenshot({ path: path.join(OUT, `nvg8-${idx}-scroll.png`), fullPage: false });
    console.log(`  Captured scroll position ${i}/${scrollSteps} (y=${Math.round(scrollTo)})`);
  }

  // Full page screenshot
  console.log('Capturing full page...');
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'nvg8-full.png'), fullPage: true });

  // Extract page source
  console.log('Extracting page source...');
  const html = await page.content();
  fs.writeFileSync(path.join(OUT, 'nvg8-source.html'), html);

  // Extract computed styles and structure
  const structure = await page.evaluate(() => {
    const sections: any[] = [];
    const allSections = document.querySelectorAll('section, [class*="section"], main > div, header, footer, nav');

    allSections.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      sections.push({
        tag: el.tagName.toLowerCase(),
        classes: el.className?.toString().substring(0, 200) || '',
        id: el.id || '',
        y: Math.round(rect.top + window.scrollY),
        height: Math.round(rect.height),
        bg: styles.backgroundColor,
        children: el.children.length,
        textPreview: el.textContent?.substring(0, 150)?.trim() || '',
      });
    });

    // Extract all visible text blocks
    const textBlocks: string[] = [];
    document.querySelectorAll('h1, h2, h3, h4, p, span, a, button, li').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 2 && text.length < 200) {
        textBlocks.push(`<${el.tagName.toLowerCase()}> ${text}`);
      }
    });

    // Extract fonts
    const fonts = new Set<string>();
    document.querySelectorAll('*').forEach(el => {
      const ff = window.getComputedStyle(el).fontFamily;
      if (ff) fonts.add(ff.split(',')[0].trim().replace(/['"]/g, ''));
    });

    // Extract colors
    const colors = new Set<string>();
    document.querySelectorAll('*').forEach(el => {
      const s = window.getComputedStyle(el);
      [s.color, s.backgroundColor, s.borderColor].forEach(c => {
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') colors.add(c);
      });
    });

    // Extract CSS variables from :root
    const cssVars: Record<string, string> = {};
    const rootStyles = document.documentElement.style;
    for (let i = 0; i < rootStyles.length; i++) {
      const prop = rootStyles[i];
      if (prop.startsWith('--')) {
        cssVars[prop] = rootStyles.getPropertyValue(prop);
      }
    }
    // Also try computed style
    const computed = getComputedStyle(document.documentElement);
    const sheets = document.styleSheets;
    try {
      for (const sheet of sheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
              for (let i = 0; i < rule.style.length; i++) {
                const prop = rule.style[i];
                if (prop.startsWith('--')) {
                  cssVars[prop] = rule.style.getPropertyValue(prop);
                }
              }
            }
          }
        } catch { /* cross-origin */ }
      }
    } catch { /* */ }

    return {
      title: document.title,
      sections: sections.slice(0, 30),
      uniqueText: [...new Set(textBlocks)].slice(0, 100),
      fonts: [...fonts].slice(0, 15),
      colors: [...colors].slice(0, 30),
      cssVars,
      totalHeight: document.body.scrollHeight,
    };
  });

  fs.writeFileSync(path.join(OUT, 'nvg8-structure.json'), JSON.stringify(structure, null, 2));

  console.log(`\nDone! Files saved to ${OUT}`);
  console.log(`  - ${scrollSteps + 2} screenshots`);
  console.log(`  - Page source (${(html.length / 1024).toFixed(0)}KB)`);
  console.log(`  - Structure analysis`);
  console.log(`\nFonts found: ${structure.fonts.join(', ')}`);
  console.log(`Sections found: ${structure.sections.length}`);

  await browser.close();
})();
