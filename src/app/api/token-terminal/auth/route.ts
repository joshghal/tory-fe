import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface LoginResponse {
  token: string;
}

async function getAuthTokens() {
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const tokens: { bearer?: string; jwt?: string } = {};

    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const headers = request.headers();
      if (headers['authorization']) {
        tokens.bearer = headers['authorization'].replace('Bearer ', '');
      }
      if (headers['x-tt-terminal-jwt']) {
        tokens.jwt = headers['x-tt-terminal-jwt'];
      }
      request.continue();
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
    );

    await page.setCacheEnabled(false);

    await page.goto('https://tokenterminal.com', {
      waitUntil: 'networkidle0',
    });

    return tokens;
  } finally {
    await browser.close();
  }
}

export async function GET() {
  try {
    const tokens = await getAuthTokens();

    const loginResponse = await fetch(
      'https://api.tokenterminal.com/v1/login',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
          origin: 'https://tokenterminal.com',
          referer: 'https://tokenterminal.com/explorer/auth/login',
          'sec-ch-ua':
            '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        },
        body: JSON.stringify({
          email: process.env.TT_EMAIL,
          password: process.env.TT_PASSWORD,
        }),
      }
    );

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} ${errorText}`);
    }

    const loginData = (await loginResponse.json()) as LoginResponse;

    if (!tokens.bearer && !tokens.jwt) {
      throw new Error('Failed to get authentication tokens');
    }

    return NextResponse.json({
      message: 'SUCCESS',
      status: 200,
      bearer: loginData.token || '',
      jwt: tokens.jwt || '',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      message:
        error instanceof Error ? error.message : 'Failed to get auth tokens',
      status: 500,
      bearer: '',
      jwt: '',
    });
  }
}
