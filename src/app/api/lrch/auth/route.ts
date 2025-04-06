import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

async function getLrchToken() {
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    let token = '';

    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const headers = request.headers();

      if (headers['authorization']) {
        token = headers['authorization'].replace('Bearer ', '');
        // console.log('[🔑 Token Captured from Headers]', token);
      }

      request.continue();
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
    );
    await page.setCacheEnabled(false);

    await page.goto('https://lunarcrush.com/discover/bitcoin', {
      waitUntil: 'networkidle0',
    });

    return token;
  } finally {
    await browser.close();
  }
}

export async function GET() {
  try {
    const token = await getLrchToken();

    return NextResponse.json({
      message: 'SUCCESS',
      status: 200,
      bearer: token,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      message:
        error instanceof Error
          ? error.message
          : 'Failed to get auth tokens from lunarcrush',
      status: 500,
      bearer: '',
    });
  }
}
