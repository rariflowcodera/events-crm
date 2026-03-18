import { ReactNode } from "react"

/**
 * Convert URLs and email addresses in text to clickable links
 * @param text - The text to parse and linkify
 * @returns React nodes with links for emails and URLs
 */
export function linkify(text: string): ReactNode[] {
  if (!text) return []

  // Combined pattern to match emails and URLs
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const urlPattern = /https?:\/\/[^\s<>]+/g

  // Find all matches with their positions
  const matches: Array<{ start: number; end: number; text: string; type: "email" | "url" }> = []

  let match: RegExpExecArray | null

  // Find emails
  while ((match = emailPattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      type: "email",
    })
  }

  // Find URLs
  while ((match = urlPattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
      type: "url",
    })
  }

  // If no matches, return the text as-is
  if (matches.length === 0) {
    return [text]
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start)

  // Build result with links
  const result: ReactNode[] = []
  let lastIndex = 0

  matches.forEach((m, index) => {
    // Add text before this match
    if (m.start > lastIndex) {
      result.push(text.slice(lastIndex, m.start))
    }

    // Add the link
    const href = m.type === "email" ? `mailto:${m.text}` : m.text
    result.push(
      <a
        key={`link-${index}`}
        href={href}
        target={m.type === "url" ? "_blank" : undefined}
        rel={m.type === "url" ? "noopener noreferrer" : undefined}
        className="underline text-current hover:opacity-80"
      >
        {m.text}
      </a>
    )

    lastIndex = m.end
  })

  // Add remaining text after last match
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result
}
