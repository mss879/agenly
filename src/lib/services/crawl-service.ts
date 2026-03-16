import * as cheerio from "cheerio";

export interface CrawledPage {
  url: string;
  title: string;
  textContent: string;
}

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  sameDomainOnly?: boolean;
}

const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_DEPTH = 3;

// Elements to strip before extracting text
const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "nav",
  "footer",
  "header",
  ".cookie-banner",
  ".cookie-consent",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
];

/**
 * Extract the hostname from a URL for same-domain checking.
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Normalize a URL by removing fragments, trailing slashes, and sorting query params.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // Remove trailing slash from pathname (except for root)
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Check if a URL is likely a page (not a file like .pdf, .zip, .jpg, etc.)
 */
function isPageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const skipExtensions = [
      ".pdf", ".zip", ".tar", ".gz", ".rar",
      ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
      ".mp3", ".mp4", ".wav", ".avi", ".mov",
      ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
      ".css", ".js", ".json", ".xml", ".rss",
    ];
    return !skipExtensions.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Fetch a page with timeout and basic error handling.
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Agenly-Crawler/1.0 (Knowledge Base Indexer)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    return await res.text();
  } catch (e) {
    console.log(`[Crawl] Failed to fetch ${url}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/**
 * Extract clean text content from HTML using cheerio.
 */
function extractText($: cheerio.CheerioAPI): string {
  // Remove unwanted elements
  STRIP_SELECTORS.forEach((sel) => $(sel).remove());

  // Get the main content area if it exists, otherwise use body
  const mainContent = $("main, article, [role='main'], .content, .post-content, #content")
    .first();

  const root = mainContent.length > 0 ? mainContent : $("body");

  // Extract text and clean it up
  let text = root.text();

  // Clean up whitespace
  text = text
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text.trim();
}

/**
 * Extract same-domain links from a page.
 */
function extractLinks(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  targetHostname: string
): string[] {
  const links: Set<string> = new Set();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    // Skip javascript:, mailto:, tel:, #
    if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href === "#") {
      return;
    }

    try {
      const absoluteUrl = new URL(href, baseUrl).toString();
      const normalized = normalizeUrl(absoluteUrl);

      // Same-domain check
      if (getHostname(normalized) === targetHostname && isPageUrl(normalized)) {
        links.add(normalized);
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return Array.from(links);
}

/**
 * Crawl a website starting from rootUrl using BFS.
 * Returns an array of crawled pages with their text content.
 */
export async function crawlWebsite(
  rootUrl: string,
  options?: CrawlOptions
): Promise<CrawledPage[]> {
  const maxPages = options?.maxPages || DEFAULT_MAX_PAGES;
  const maxDepth = options?.maxDepth || DEFAULT_MAX_DEPTH;

  const normalizedRoot = normalizeUrl(rootUrl);
  const targetHostname = getHostname(normalizedRoot);

  if (!targetHostname) {
    throw new Error("Invalid URL provided");
  }

  console.log(`[Crawl] Starting crawl of ${normalizedRoot} (max ${maxPages} pages, depth ${maxDepth})`);

  const visited = new Set<string>();
  const pages: CrawledPage[] = [];

  // BFS queue: [url, depth]
  const queue: [string, number][] = [[normalizedRoot, 0]];

  while (queue.length > 0 && pages.length < maxPages) {
    const [currentUrl, depth] = queue.shift()!;

    // Skip if already visited
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    console.log(`[Crawl] (${pages.length + 1}/${maxPages}) Fetching: ${currentUrl} (depth ${depth})`);

    // Fetch page
    const html = await fetchPage(currentUrl);
    if (!html) continue;

    // Parse HTML
    const $ = cheerio.load(html);

    // Extract title
    const title = $("title").text().trim() ||
      $("h1").first().text().trim() ||
      currentUrl;

    // Extract text content
    const textContent = extractText($);

    // Only add pages that have meaningful content
    if (textContent.length > 50) {
      pages.push({
        url: currentUrl,
        title,
        textContent,
      });
      console.log(`[Crawl] ✓ ${title} — ${textContent.length} chars`);
    } else {
      console.log(`[Crawl] ✗ Skipping ${currentUrl} — too little content (${textContent.length} chars)`);
    }

    // Discover links (only if we haven't hit max depth)
    if (depth < maxDepth) {
      // Re-load since extractText modifies the DOM
      const $fresh = cheerio.load(html);
      const links = extractLinks($fresh, currentUrl, targetHostname);

      for (const link of links) {
        if (!visited.has(link) && pages.length < maxPages) {
          queue.push([link, depth + 1]);
        }
      }
    }

    // Small delay to be respectful
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`[Crawl] Finished: ${pages.length} pages crawled from ${normalizedRoot}`);
  return pages;
}
