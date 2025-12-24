import { NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer"

export const dynamic = "force-dynamic"
export const maxDuration = 30 // 30 seconds timeout for PDF generation

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get("token")
  const locale = searchParams.get("locale") || "en"

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 })
  }

  let browser = null

  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    })

    const page = await browser.newPage()

    // Set viewport for consistent rendering (high DPI for quality)
    await page.setViewport({
      width: 800,
      height: 1200,
      deviceScaleFactor: 3,
    })

    // Navigate to the VAPP voucher page (with print=true to hide buttons)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const vappUrl = `${baseUrl}/${locale}/vapp/${token}?print=true`

    await page.goto(vappUrl, {
      waitUntil: "networkidle0",
      timeout: 15000,
    })

    // Wait for the voucher element to be ready
    await page.waitForSelector("#vapp-voucher", { timeout: 10000 })

    // Inject CSS to scale the voucher to fill the A4 page, remove shadow, and hide dev indicators
    await page.addStyleTag({
      content: `
        #vapp-voucher {
          max-width: 100% !important;
          width: 180mm !important;
          margin: 0 auto;
          box-shadow: none !important;
        }
        /* Hide TailwindIndicator and any other fixed dev tools */
        .fixed.bottom-1.left-1,
        [class*="tailwind-indicator"] {
          display: none !important;
        }
      `,
    })

    // Small delay to ensure all images/fonts are loaded
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Generate PDF with the voucher centered on A4
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
    })

    await browser.close()
    browser = null

    // Convert Uint8Array to Buffer for NextResponse
    const pdf = Buffer.from(pdfBuffer)

    // Return PDF with appropriate headers
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vapp-${token}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("PDF generation failed:", error)

    // Ensure browser is closed on error
    if (browser) {
      await browser.close()
    }

    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
