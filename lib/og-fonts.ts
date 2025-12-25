/**
 * Font caching for OG image generation
 *
 * Fonts are fetched from Google Fonts and cached in memory.
 * Uses Inter for Latin text and Noto Sans Arabic for Arabic text.
 */

interface FontCache {
  inter?: ArrayBuffer
  notoSansArabic?: ArrayBuffer
}

let fontCache: FontCache = {}

/**
 * Load fonts for OG image generation
 * Caches fonts in memory after first load
 */
export async function loadOgFonts(): Promise<{
  inter: ArrayBuffer
  notoSansArabic: ArrayBuffer
}> {
  // Return cached fonts if available
  if (fontCache.inter && fontCache.notoSansArabic) {
    return fontCache as Required<FontCache>
  }

  // Fetch fonts in parallel
  const [inter, notoSansArabic] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2"
    ).then((res) => res.arrayBuffer()),
    fetch(
      "https://fonts.gstatic.com/s/notosansarabic/v28/nwpCtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyG2vu3CBFQLaig.woff2"
    ).then((res) => res.arrayBuffer()),
  ])

  // Cache fonts
  fontCache = { inter, notoSansArabic }

  return { inter, notoSansArabic }
}

/**
 * Clear the font cache
 * Useful for testing or memory management
 */
export function clearFontCache(): void {
  fontCache = {}
}
