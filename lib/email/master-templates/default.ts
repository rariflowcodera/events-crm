import type { MasterTemplateStructure } from "@/server/db/schemas/email-master-template"

/**
 * Default master template structure configuration.
 */
export const defaultMasterTemplateStructure: MasterTemplateStructure = {
  showLogo: true,
  showAccentStrip: true,
  showEnglishSection: true,
  showArabicSection: true,
  showDivider: true,
  showFooter: false,
  showBannerFooter: true,
  sectionOrder: ["en", "ar"],
}

/**
 * Default master template HTML with Handlebars placeholders.
 *
 * Placeholders available:
 * - {{emailSubject}} - Email subject line
 * - {{preheaderText}} - Hidden preheader text
 * - {{logoUrl}} - Logo image URL
 * - {{logoAlt}} - Logo alt text (event name)
 * - {{accentStripColor}} - Accent strip background color
 * - {{accentStripHeight}} - Accent strip height (px)
 * - {{headingColor}} - Color for h1/h2 headings
 * - {{bodyTextColor}} - Body text color
 * - {{ctaButtonColor}} - CTA button background color
 * - {{ctaButtonTextColor}} - CTA button text color
 * - {{ctaBorderRadius}} - CTA button border radius
 * - {{contentBackgroundColor}} - Content area background color
 * - {{fontFamily}} - Font stack for English text
 * - {{arabicFontFamily}} - Font stack for Arabic text
 * - {{contentWidth}} - Content width (px, default 600)
 * - {{contentPadding}} - Content padding
 * - {{enContent}} - Rendered English content section
 * - {{arContent}} - Rendered Arabic content section
 * - {{footerText}} - Footer text
 * - {{bannerFooterImageUrl}} - Banner footer image URL
 *
 * Conditional flags:
 * - {{#if showLogo}}...{{/if}}
 * - {{#if showAccentStrip}}...{{/if}}
 * - {{#if showEnglishSection}}...{{/if}}
 * - {{#if showArabicSection}}...{{/if}}
 * - {{#if showDivider}}...{{/if}}
 * - {{#if showBannerFooter}}...{{/if}}
 * - {{#if showFooter}}...{{/if}}
 */
export const defaultMasterTemplate = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>{{emailSubject}}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #F5F5F5;
    }

    .email-container {
      max-width: {{contentWidth}}px;
      margin: 0 auto;
    }

    .heading-primary {
      color: {{headingColor}};
      font-family: {{{fontFamily}}};
      font-weight: 600;
      font-size: 24px;
      line-height: 1.3;
      margin: 0;
    }

    .heading-secondary {
      color: {{headingColor}};
      font-family: {{{fontFamily}}};
      font-weight: 500;
      font-size: 18px;
      line-height: 1.4;
      margin: 0;
    }

    .body-text {
      color: {{bodyTextColor}};
      font-family: {{{fontFamily}}};
      font-weight: 400;
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }

    .arabic-text {
      font-family: {{{arabicFontFamily}}};
      direction: rtl;
      text-align: right;
    }

    .btn-primary {
      background-color: {{ctaButtonColor}};
      color: {{ctaButtonTextColor}} !important;
      font-family: {{{fontFamily}}};
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: {{ctaBorderRadius}};
      display: inline-block;
    }

    .btn-primary-ar {
      background-color: {{ctaButtonColor}};
      color: {{ctaButtonTextColor}} !important;
      font-family: {{{arabicFontFamily}}};
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: {{ctaBorderRadius}};
      display: inline-block;
    }

    .divider {
      border: none;
      border-top: 1px solid #D1D5DB;
      margin: 32px 0;
    }

    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-padding { padding: 24px 20px !important; }
      .heading-primary { font-size: 22px !important; }
      .heading-secondary { font-size: 16px !important; }
      .body-text { font-size: 15px !important; }
    }

    /* Gmail dark mode override */
    [data-ogsc] .body-text,
    [data-ogsc] .heading-primary,
    [data-ogsc] .heading-secondary {
      color: inherit !important;
    }
    u + .body .body-text,
    u + .body .heading-primary,
    u + .body .heading-secondary {
      color: inherit !important;
    }

    /* Gmail dark mode fix - blend modes */
    u + .body .gmail-blend-screen { background:#000; mix-blend-mode:screen; }
    u + .body .gmail-blend-difference { background:#000; mix-blend-mode:difference; }
    u + .body .gmail-blend-difference .body-text,
    u + .body .gmail-blend-difference .heading-primary,
    u + .body .gmail-blend-difference .heading-secondary,
    u + .body .gmail-blend-difference p,
    u + .body .gmail-blend-difference h1,
    u + .body .gmail-blend-difference h2 {
      color: #FFFFFF !important;
    }
    /* Exclude images from blend mode effect */
    u + .body .gmail-blend-screen img,
    u + .body .gmail-blend-difference img {
      isolation: isolate;
    }
  </style>
</head>
<body class="body" style="margin: 0; padding: 0; background-color: #F5F5F5; min-height: 100vh;" bgcolor="#F5F5F5">

  <!-- Preheader Text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    {{preheaderText}}
  </div>

  <center style="width: 100%; background-color: #F5F5F5;" bgcolor="#F5F5F5">

    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container" style="margin: 0 auto; max-width: {{contentWidth}}px; width: 100%;">

      <!-- Spacer -->
      <tr>
        <td style="height: 24px;"></td>
      </tr>

      <!-- Main Card -->
      <tr>
        <td>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

            {{#if showAccentStrip}}
            <!-- Gold Accent Strip -->
            <tr>
              <td style="background-color: {{accentStripColor}}; height: {{accentStripHeight}};" bgcolor="{{accentStripColor}}"></td>
            </tr>
            {{/if}}

            <!-- Content Area -->
            <tr>
              <td style="background-color: {{contentBackgroundColor}}; background-image: linear-gradient({{contentBackgroundColor}}, {{contentBackgroundColor}});" bgcolor="{{contentBackgroundColor}}">
                <div class="gmail-blend-screen">
                <div class="gmail-blend-difference">

                {{#if showLogo}}
                <!-- Logo Section -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 40px 48px 0 48px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-bottom: 32px;">
                        <tr>
                          <td align="center">
                            {{#if logoUrl}}
                            <img src="{{logoUrl}}" alt="{{logoAlt}}" width="200" style="max-width: 200px; max-height: 140px; width: auto; height: auto;">
                            {{else}}
                            <div style="width: 120px; height: 60px; background-color: #F3F4F6; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                              <span style="color: #9CA3AF; font-size: 12px; font-family: sans-serif;">LOGO</span>
                            </div>
                            {{/if}}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                {{/if}}

                {{#if showEnglishSection}}
                <!-- English Content Section -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td class="content-padding" style="padding: {{#if showLogo}}0 48px 24px 48px{{else}}40px 48px 24px 48px{{/if}};">
                      {{{enContent}}}
                    </td>
                  </tr>
                </table>

                {{#if showBannerFooter}}
                {{#if bannerFooterImageUrl}}
                <!-- English Section Banner - Full Width -->
                <img src="{{bannerFooterImageUrl}}" alt="" style="width: 100%; height: auto; display: block;" />
                {{/if}}
                {{/if}}
                {{/if}}

                {{#if showDivider}}
                {{#if showEnglishSection}}
                {{#if showArabicSection}}
                <!-- Divider Section -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 24px 48px;">
                      <hr class="divider" style="border: none; border-top: 1px solid #D1D5DB; margin: 0;">
                    </td>
                  </tr>
                </table>
                {{/if}}
                {{/if}}
                {{/if}}

                {{#if showArabicSection}}
                <!-- Arabic Content Section -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td class="content-padding" style="padding: {{#if showDivider}}0 48px 24px 48px{{else}}40px 48px 24px 48px{{/if}};">
                      {{{arContent}}}
                    </td>
                  </tr>
                </table>

                {{#if showBannerFooter}}
                {{#if bannerFooterImageUrl}}
                <!-- Arabic Section Banner - Full Width -->
                <img src="{{bannerFooterImageUrl}}" alt="" style="width: 100%; height: auto; display: block;" />
                {{/if}}
                {{/if}}
                {{/if}}

                {{#unless showBannerFooter}}
                <!-- Bottom padding when no banner -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 16px 0 0 0;"></td>
                  </tr>
                </table>
                {{/unless}}

                </div>
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      {{#if showFooter}}
      <!-- Footer -->
      <tr>
        <td style="padding: 24px 16px; text-align: center;">
          <p style="color: #6B7280; font-family: {{{fontFamily}}}; font-size: 12px; line-height: 1.5; margin: 0;">
            {{footerText}}
          </p>
        </td>
      </tr>
      {{/if}}

    </table>

  </center>

</body>
</html>`

/**
 * Template for rendering English content section.
 * Uses structured content fields.
 */
export const englishContentSectionTemplate = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;" dir="ltr">

  {{#if greeting}}
  <tr>
    <td style="padding-bottom: 24px;">
      <p class="body-text" style="color: {{bodyTextColor}}; -webkit-text-fill-color: {{bodyTextColor}}; font-family: {{{fontFamily}}}; font-size: 16px; line-height: 1.6; margin: 0;">
        {{{greeting}}}
      </p>
    </td>
  </tr>
  {{/if}}

  {{#if heading}}
  <tr>
    <td style="padding-bottom: 16px;">
      <h1 class="heading-primary" style="color: {{headingColor}}; -webkit-text-fill-color: {{headingColor}}; font-family: {{{fontFamily}}}; font-weight: 600; font-size: 24px; line-height: 1.3; margin: 0;">
        {{{heading}}}
      </h1>
    </td>
  </tr>
  {{/if}}

  {{#if subheading}}
  <tr>
    <td style="padding-bottom: 24px;">
      <h2 class="heading-secondary" style="color: {{headingColor}}; -webkit-text-fill-color: {{headingColor}}; font-family: {{{fontFamily}}}; font-weight: 500; font-size: 18px; line-height: 1.4; margin: 0;">
        {{{subheading}}}
      </h2>
    </td>
  </tr>
  {{/if}}

  {{#each bodyParagraphs}}
  <tr>
    <td style="padding-bottom: {{#if @last}}32px{{else}}16px{{/if}};{{#if this.alignment}} text-align: {{this.alignment}};{{/if}}">
      <p class="body-text" style="color: {{../bodyTextColor}}; -webkit-text-fill-color: {{../bodyTextColor}}; font-family: {{{../fontFamily}}}; font-size: {{this.fontSize}}; line-height: 1.6; margin: 0;{{#if this.alignment}} text-align: {{this.alignment}};{{/if}}">
        {{{this.content}}}
      </p>
    </td>
  </tr>
  {{/each}}

  {{#if cta}}
  <tr>
    <td align="center" style="padding-bottom: 16px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{cta.url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="10%" strokecolor="{{ctaButtonColor}}" fillcolor="{{ctaButtonColor}}">
        <w:anchorlock/>
        <center style="color:{{ctaButtonTextColor}};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">{{{cta.text}}}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="{{cta.url}}" class="btn-primary" style="background-color: {{ctaButtonColor}}; color: {{ctaButtonTextColor}}; font-family: {{{fontFamily}}}; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: {{ctaBorderRadius}}; display: inline-block;">
        {{{cta.text}}}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
  {{/if}}

  {{#if postCtaText}}
  <tr>
    <td style="padding-top: 16px;">
      <p class="body-text" style="color: {{bodyTextColor}}; -webkit-text-fill-color: {{bodyTextColor}}; font-family: {{{fontFamily}}}; font-size: 16px; line-height: 1.6; margin: 0;">
        {{{postCtaText}}}
      </p>
    </td>
  </tr>
  {{/if}}

</table>`

/**
 * Template for rendering Arabic content section (RTL).
 * Uses structured content fields.
 */
export const arabicContentSectionTemplate = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;" dir="rtl">

  {{#if greeting}}
  <tr>
    <td style="padding-bottom: 24px; text-align: right;">
      <p class="body-text arabic-text" style="color: {{bodyTextColor}}; -webkit-text-fill-color: {{bodyTextColor}}; font-family: {{{arabicFontFamily}}}; font-size: 16px; line-height: 1.8; margin: 0; direction: rtl; text-align: right;">
        {{{greeting}}}
      </p>
    </td>
  </tr>
  {{/if}}

  {{#if heading}}
  <tr>
    <td style="padding-bottom: 16px; text-align: right;">
      <h1 class="heading-primary arabic-text" style="color: {{headingColor}}; -webkit-text-fill-color: {{headingColor}}; font-family: {{{arabicFontFamily}}}; font-weight: 600; font-size: 24px; line-height: 1.4; margin: 0; direction: rtl; text-align: right;">
        {{{heading}}}
      </h1>
    </td>
  </tr>
  {{/if}}

  {{#if subheading}}
  <tr>
    <td style="padding-bottom: 24px; text-align: right;">
      <h2 class="heading-secondary arabic-text" style="color: {{headingColor}}; -webkit-text-fill-color: {{headingColor}}; font-family: {{{arabicFontFamily}}}; font-weight: 500; font-size: 18px; line-height: 1.5; margin: 0; direction: rtl; text-align: right;">
        {{{subheading}}}
      </h2>
    </td>
  </tr>
  {{/if}}

  {{#each bodyParagraphs}}
  <tr>
    <td style="padding-bottom: {{#if @last}}32px{{else}}16px{{/if}}; text-align: {{#if this.alignment}}{{this.alignment}}{{else}}right{{/if}};">
      <p class="body-text arabic-text" style="color: {{../bodyTextColor}}; -webkit-text-fill-color: {{../bodyTextColor}}; font-family: {{{../arabicFontFamily}}}; font-size: {{this.fontSize}}; line-height: 1.8; margin: 0; direction: rtl; text-align: {{#if this.alignment}}{{this.alignment}}{{else}}right{{/if}};">
        {{{this.content}}}
      </p>
    </td>
  </tr>
  {{/each}}

  {{#if cta}}
  <tr>
    <td align="center" style="padding-bottom: 16px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{cta.url}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="10%" strokecolor="{{ctaButtonColor}}" fillcolor="{{ctaButtonColor}}">
        <w:anchorlock/>
        <center style="color:{{ctaButtonTextColor}};font-family:Tahoma,Arial,sans-serif;font-size:16px;font-weight:bold;">{{{cta.text}}}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="{{cta.url}}" class="btn-primary-ar" style="background-color: {{ctaButtonColor}}; color: {{ctaButtonTextColor}}; font-family: {{{arabicFontFamily}}}; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: {{ctaBorderRadius}}; display: inline-block;">
        {{{cta.text}}}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
  {{/if}}

  {{#if postCtaText}}
  <tr>
    <td style="padding-top: 16px; text-align: right;">
      <p class="body-text arabic-text" style="color: {{bodyTextColor}}; -webkit-text-fill-color: {{bodyTextColor}}; font-family: {{{arabicFontFamily}}}; font-size: 16px; line-height: 1.8; margin: 0; direction: rtl; text-align: right;">
        {{{postCtaText}}}
      </p>
    </td>
  </tr>
  {{/if}}

</table>`
