import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

import { PDF_STYLES, PDF_CSS } from "./pdf-styles"
import type { PdfDocItem, PdfOptions, PdfGenerationProgress } from "./types"

interface TocEntry {
  title: string
  page: number
  level: number
}

interface Section {
  html: string
  isTitle: boolean
}

export class DocumentationPdfGenerator {
  private pdf: jsPDF
  private options: Required<PdfOptions>
  private currentPage: number = 1
  private currentYPos: number = 0
  private tocEntries: TocEntry[] = []
  private onProgress?: (progress: PdfGenerationProgress) => void
  private pageContentHeight: number

  constructor(
    options?: PdfOptions,
    onProgress?: (progress: PdfGenerationProgress) => void
  ) {
    this.options = {
      title: "Documentation",
      subtitle: "Events CRM",
      includeTableOfContents: true,
      includeCoverPage: true,
      pageSize: "a4",
      margins: PDF_STYLES.page.margins,
      ...options,
    }
    this.onProgress = onProgress
    this.pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: this.options.pageSize,
    })
    this.pageContentHeight =
      PDF_STYLES.page.height - this.options.margins.top - this.options.margins.bottom
  }

  async generate(docs: PdfDocItem[]): Promise<Blob> {
    this.tocEntries = []
    this.currentPage = 1
    this.currentYPos = this.options.margins.top

    // 1. Add cover page
    if (this.options.includeCoverPage) {
      this.addCoverPage()
    }

    // 2. Reserve pages for TOC (estimate based on doc count)
    const tocPageCount = this.options.includeTableOfContents
      ? Math.ceil(docs.length / 25)
      : 0
    const contentStartPage = this.currentPage + tocPageCount

    // Skip TOC pages for now
    if (tocPageCount > 0) {
      for (let i = 0; i < tocPageCount; i++) {
        this.pdf.addPage()
        this.currentPage++
      }
    }

    // 3. Render each doc
    for (let i = 0; i < docs.length; i++) {
      this.onProgress?.({
        stage: "generating",
        current: i + 1,
        total: docs.length,
        message: `Processing: ${docs[i].title}`,
      })

      // Record page for TOC
      this.tocEntries.push({
        title: docs[i].title,
        page: this.currentPage,
        level: docs[i].level,
      })

      await this.addDocumentPage(docs[i])
    }

    // 4. Go back and add TOC
    if (this.options.includeTableOfContents) {
      this.addTableOfContents(contentStartPage - tocPageCount)
    }

    // 5. Add page numbers
    this.addPageNumbers()

    return this.pdf.output("blob")
  }

  private addCoverPage(): void {
    const { width, height } = PDF_STYLES.page
    const centerX = width / 2

    this.pdf.setFontSize(PDF_STYLES.fonts.title.size)
    this.pdf.setTextColor(PDF_STYLES.colors.primary)
    this.pdf.text(this.options.title, centerX, height * 0.4, { align: "center" })

    this.pdf.setFontSize(PDF_STYLES.fonts.subtitle.size)
    this.pdf.setTextColor(PDF_STYLES.colors.secondary)
    this.pdf.text(this.options.subtitle, centerX, height * 0.46, {
      align: "center",
    })

    this.pdf.setDrawColor(PDF_STYLES.colors.border)
    this.pdf.setLineWidth(0.5)
    this.pdf.line(width * 0.3, height * 0.5, width * 0.7, height * 0.5)

    this.pdf.setFontSize(PDF_STYLES.fonts.body.size)
    this.pdf.setTextColor(PDF_STYLES.colors.muted)
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    this.pdf.text(`Generated: ${dateStr}`, centerX, height * 0.56, {
      align: "center",
    })

    this.pdf.addPage()
    this.currentPage++
    this.currentYPos = this.options.margins.top
  }

  private addTableOfContents(startPage: number): void {
    this.pdf.setPage(startPage)

    const { margins } = this.options
    const pageWidth = PDF_STYLES.page.width - margins.left - margins.right
    const maxYPos = PDF_STYLES.page.height - margins.bottom

    this.pdf.setFontSize(PDF_STYLES.fonts.heading1.size)
    this.pdf.setTextColor(PDF_STYLES.colors.primary)
    this.pdf.text("Table of Contents", margins.left, 70)

    let yPos = 110
    let currentTocPage = startPage

    for (const entry of this.tocEntries) {
      if (yPos > maxYPos - 20) {
        currentTocPage++
        this.pdf.setPage(currentTocPage)
        yPos = margins.top + 20
      }

      const indent = entry.level * 15
      const titleX = margins.left + indent
      const pageNumX = margins.left + pageWidth

      this.pdf.setFontSize(PDF_STYLES.fonts.tocItem.size)
      this.pdf.setTextColor(
        entry.level === 0
          ? PDF_STYLES.colors.primary
          : PDF_STYLES.colors.secondary
      )

      const maxTitleWidth = pageWidth - indent - 40
      let displayTitle = entry.title
      while (
        this.pdf.getTextWidth(displayTitle) > maxTitleWidth &&
        displayTitle.length > 3
      ) {
        displayTitle = displayTitle.slice(0, -4) + "..."
      }

      this.pdf.text(displayTitle, titleX, yPos)

      const titleWidth = this.pdf.getTextWidth(displayTitle)
      const dotsStartX = titleX + titleWidth + 4
      const dotsEndX = pageNumX - 25
      const dotWidth = this.pdf.getTextWidth(".")
      const dotsCount = Math.floor((dotsEndX - dotsStartX) / (dotWidth + 1))

      if (dotsCount > 0) {
        this.pdf.setTextColor(PDF_STYLES.colors.muted)
        this.pdf.text(".".repeat(dotsCount), dotsStartX, yPos)
      }

      this.pdf.setTextColor(PDF_STYLES.colors.secondary)
      this.pdf.text(entry.page.toString(), pageNumX, yPos, { align: "right" })

      yPos += PDF_STYLES.fonts.tocItem.lineHeight * PDF_STYLES.fonts.tocItem.size
    }
  }

  private async addDocumentPage(doc: PdfDocItem): Promise<void> {
    const { margins } = this.options
    const contentWidth = PDF_STYLES.page.contentWidth

    // Split content into sections (by headings)
    const sections = this.splitIntoSections(doc)

    for (const section of sections) {
      await this.addSection(section.html, contentWidth)
    }

    // Add some space after the document, or start new page for next doc
    this.currentYPos += 15
    if (this.currentYPos > PDF_STYLES.page.height - margins.bottom - 40) {
      this.pdf.addPage()
      this.currentPage++
      this.currentYPos = margins.top
    }
  }

  // Add a section to the PDF, splitting into sub-blocks if needed
  private async addSection(html: string, contentWidth: number): Promise<void> {
    const { margins } = this.options

    // First, try to render the whole section
    const canvas = await this.renderSectionToCanvas(html, contentWidth)
    const imgWidth = contentWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const spaceRemaining = PDF_STYLES.page.height - margins.bottom - this.currentYPos

    // Case 1: Section fits on current page - place it
    if (imgHeight <= spaceRemaining) {
      const imgData = canvas.toDataURL("image/png")
      this.pdf.addImage(imgData, "PNG", margins.left, this.currentYPos, imgWidth, imgHeight)
      this.currentYPos += imgHeight
      return
    }

    // Case 2: Section doesn't fit but is smaller than a full page - move to next page
    if (imgHeight <= this.pageContentHeight) {
      this.pdf.addPage()
      this.currentPage++
      this.currentYPos = margins.top

      const imgData = canvas.toDataURL("image/png")
      this.pdf.addImage(imgData, "PNG", margins.left, this.currentYPos, imgWidth, imgHeight)
      this.currentYPos += imgHeight
      return
    }

    // Case 3: Section is taller than a full page - split into blocks and place progressively
    const subBlocks = this.splitIntoBlocks(html)

    for (const block of subBlocks) {
      if (!block.trim()) continue

      const blockCanvas = await this.renderSectionToCanvas(block, contentWidth)
      const blockHeight = (blockCanvas.height * imgWidth) / blockCanvas.width
      const blockSpace = PDF_STYLES.page.height - margins.bottom - this.currentYPos

      // If block doesn't fit on current page, start new page
      if (blockHeight > blockSpace && this.currentYPos > margins.top) {
        this.pdf.addPage()
        this.currentPage++
        this.currentYPos = margins.top
      }

      // If a single block is STILL taller than a full page (very long code block),
      // we have no choice but to use canvas slicing as last resort
      const newSpace = PDF_STYLES.page.height - margins.bottom - this.currentYPos
      if (blockHeight > newSpace && blockHeight > this.pageContentHeight) {
        this.addSlicedSection(blockCanvas, imgWidth, blockHeight)
      } else {
        const blockImgData = blockCanvas.toDataURL("image/png")
        this.pdf.addImage(blockImgData, "PNG", margins.left, this.currentYPos, imgWidth, blockHeight)
        this.currentYPos += blockHeight
      }
    }
  }

  // Handle sections that don't fit by slicing across pages
  // This should only be used for blocks taller than a full page (e.g., very long code blocks)
  private addSlicedSection(
    canvas: HTMLCanvasElement,
    imgWidth: number,
    imgHeight: number
  ): void {
    const { margins } = this.options
    // Estimated line height in PDF points (for code blocks primarily)
    // This helps us slice at line boundaries rather than mid-line
    const LINE_HEIGHT_PT = 14 // ~9pt font with 1.5 line-height

    let remainingHeight = imgHeight
    let sourceY = 0

    while (remainingHeight > 0) {
      const spaceOnPage = PDF_STYLES.page.height - margins.bottom - this.currentYPos

      // Calculate how many whole lines fit on this page
      const linesPerPage = Math.floor(spaceOnPage / LINE_HEIGHT_PT)
      // Use whole lines to avoid cutting through text
      const sliceHeightPt = Math.min(remainingHeight, linesPerPage * LINE_HEIGHT_PT)

      if (sliceHeightPt < LINE_HEIGHT_PT) {
        // Not even one line fits - start new page
        this.pdf.addPage()
        this.currentPage++
        this.currentYPos = margins.top
        continue
      }

      const sourceHeight = (sliceHeightPt / imgWidth) * canvas.width

      // Create slice canvas
      const sliceCanvas = document.createElement("canvas")
      sliceCanvas.width = canvas.width
      sliceCanvas.height = Math.ceil(sourceHeight)

      const ctx = sliceCanvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        )
      }

      const imgData = sliceCanvas.toDataURL("image/png")
      this.pdf.addImage(
        imgData,
        "PNG",
        margins.left,
        this.currentYPos,
        imgWidth,
        sliceHeightPt
      )

      remainingHeight -= sliceHeightPt
      sourceY += sourceHeight
      this.currentYPos += sliceHeightPt

      // If more content remains, start new page
      if (remainingHeight > 0) {
        this.pdf.addPage()
        this.currentPage++
        this.currentYPos = margins.top
      }
    }
  }

  private splitIntoSections(doc: PdfDocItem): Section[] {
    const sections: Section[] = []

    // Create title HTML
    const titleHtml = `<h1>${this.escapeHtml(doc.title)}</h1>`
    const descHtml = doc.description
      ? `<p style="color: #666; margin-top: -8pt; margin-bottom: 16pt;">${this.escapeHtml(doc.description)}</p>`
      : ""

    // Split content by headings (h2, h3) to create logical sections
    const content = doc.htmlContent
    const headingRegex = /(<h[23][^>]*>)/gi
    const parts = content.split(headingRegex).filter((part) => part.trim())

    // Build sections from parts, combining heading tags with their content
    const contentSections: string[] = []
    let currentSection = ""

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      headingRegex.lastIndex = 0

      if (headingRegex.test(part)) {
        // This is a heading tag - push current section and start new one
        if (currentSection.trim()) {
          contentSections.push(currentSection)
        }
        currentSection = part
        headingRegex.lastIndex = 0
      } else {
        // This is content, add to current section
        currentSection += part
      }
    }

    // Push final section
    if (currentSection.trim()) {
      contentSections.push(currentSection)
    }

    // Always combine title with first content section to prevent orphan titles
    const firstSection = contentSections.length > 0 ? contentSections[0] : ""
    sections.push({
      html: titleHtml + descHtml + firstSection,
      isTitle: true
    })

    // Add remaining sections
    for (let i = 1; i < contentSections.length; i++) {
      sections.push({ html: contentSections[i], isTitle: false })
    }

    return sections
  }

  // Split HTML into atomic blocks (paragraphs, headings, lists, code blocks, etc.)
  // These blocks should never be sliced through - they move to next page as a unit
  private splitIntoBlocks(html: string): string[] {
    const blocks: string[] = []

    // Parse HTML to extract block-level elements
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = html

    const processNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const tagName = el.tagName.toLowerCase()

        // Block-level elements that should be kept together
        const blockTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "pre", "blockquote", "hr", "table"]

        if (blockTags.includes(tagName)) {
          blocks.push(el.outerHTML)
        } else if (tagName === "ul" || tagName === "ol") {
          // For lists, keep heading + first few items together, then split remaining items
          const listItems = el.querySelectorAll(":scope > li")
          if (listItems.length <= 5) {
            // Short list - keep together
            blocks.push(el.outerHTML)
          } else {
            // Long list - split into chunks of 5 items
            const listTag = tagName
            for (let i = 0; i < listItems.length; i += 5) {
              const chunk = Array.from(listItems).slice(i, i + 5)
              const chunkHtml = `<${listTag}>${chunk.map(li => li.outerHTML).join("")}</${listTag}>`
              blocks.push(chunkHtml)
            }
          }
        } else if (tagName === "div") {
          // Recursively process div contents
          Array.from(el.childNodes).forEach(processNode)
        } else {
          // Other elements - add as-is
          blocks.push(el.outerHTML)
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text) {
          blocks.push(`<p>${text}</p>`)
        }
      }
    }

    Array.from(tempDiv.childNodes).forEach(processNode)

    return blocks
  }

  private async renderSectionToCanvas(
    html: string,
    width: number
  ): Promise<HTMLCanvasElement> {
    const container = document.createElement("div")
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: ${width}px;
      background: white;
      padding: 0;
    `

    const styleEl = document.createElement("style")
    styleEl.textContent = PDF_CSS
    container.appendChild(styleEl)

    const contentDiv = document.createElement("div")
    contentDiv.className = "pdf-content pdf-section"
    contentDiv.innerHTML = html
    container.appendChild(contentDiv)

    document.body.appendChild(container)

    try {
      await this.waitForImages(container)

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: Math.ceil(width),
      })

      return canvas
    } finally {
      document.body.removeChild(container)
    }
  }

  private addPageNumbers(): void {
    const totalPages = this.pdf.getNumberOfPages()
    const { margins } = this.options

    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i)
      this.pdf.setFontSize(PDF_STYLES.fonts.pageNumber.size)
      this.pdf.setTextColor(PDF_STYLES.colors.muted)
      this.pdf.text(
        `Page ${i} of ${totalPages}`,
        PDF_STYLES.page.width / 2,
        PDF_STYLES.page.height - margins.bottom / 2,
        { align: "center" }
      )
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  private waitForImages(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll("img")
    if (images.length === 0) return Promise.resolve()

    const promises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
      })
    })

    return Promise.all(promises).then(() => {})
  }
}
