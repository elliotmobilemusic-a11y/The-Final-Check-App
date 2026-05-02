import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const config = {
  maxDuration: 60
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { html, filename = 'report.pdf' } = request.body ?? {};

  if (!html || typeof html !== 'string') {
    return response.status(400).json({ error: 'Missing or invalid html field.' });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    const safeFilename = String(filename)
      .replace(/[^\w\s\-().]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 120) || 'report.pdf';

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    response.setHeader('Content-Length', pdfBuffer.length);
    return response.status(200).end(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('[api/pdf] Error:', error?.message);
    return response.status(500).json({ error: 'PDF generation failed. Please try again.' });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}
