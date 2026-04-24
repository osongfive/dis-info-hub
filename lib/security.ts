import DOMPurify from "isomorphic-dompurify";

/**
 * Basic text sanitization to prevent common injection characters
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>{}]/g, "");
}

/**
 * Standardized HTML sanitization configuration for the project.
 * Used for AI-generated content and admin descriptions.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "strong", "em", "ul", "ol", "li", "br", "span", "a", 
      "h1", "h2", "h3", "h4", "blockquote", "code", "pre"
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
  });
}

/**
 * SSRF Protection: Validates that a URL is safe to fetch from the server side.
 * Blocks localhost and private IP ranges.
 */
export function isUrlSafe(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();

    // Block localhost and private IP ranges
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local / Cloud metadata
      /^0\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    return !privatePatterns.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}
