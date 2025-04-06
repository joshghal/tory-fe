import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

async function getCMCTokens() {
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const tokens: { cmcToken?: string } = {};

    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const headers = request.headers();
      if (headers['x-csrf-token']) {
        tokens.cmcToken = headers['x-csrf-token'];
      }
      request.continue();
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
    );

    await page.setCacheEnabled(false);

    await page.goto('https://coinmarketcap.com/', {
      waitUntil: 'networkidle0',
    });

    return tokens;
  } finally {
    await browser.close();
  }
}

export async function GET() {
  try {
    const tokens = await getCMCTokens();
    return NextResponse.json({ cmcToken: tokens.cmcToken });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get auth token from CMC',
      },
      { status: 500 }
    );
  }
}
