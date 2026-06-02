import type { Page } from 'playwright';

export async function extractDom(page: Page): Promise<string> {
  const elements = await page.evaluate(() => {
    const sel = [
      'a', 'button', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[role="tab"]',
      '[role="menuitem"]', '[role="combobox"]', '[role="searchbox"]',
    ].join(',');

    return Array.from(document.querySelectorAll(sel))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .slice(0, 60)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        type: (el as HTMLInputElement).type || null,
        id: el.id || null,
        name: el.getAttribute('name'),
        text: el.textContent?.trim().slice(0, 80) || null,
        placeholder: el.getAttribute('placeholder'),
        ariaLabel: el.getAttribute('aria-label'),
        testId: el.getAttribute('data-testid'),
        href: el instanceof HTMLAnchorElement ? el.href : null,
      }));
  });
  return JSON.stringify(elements, null, 2);
}
