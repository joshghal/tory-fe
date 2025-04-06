import { NextRequest, NextResponse } from 'next/server';

export interface ProjectMetric {
  timestamp: string;
  timestamp_label_heading: string;
  timestamp_label_subheading: string;
  timestamp_granularity: 'week';
  project_name: string;
  section: string;
  metric_id: string;
  value: number;
  pop_change: number;
  definition: string | null;
}

async function getMetricsConfig(bearer?: string, jwt?: string, slug?: string) {
  if (!bearer || !jwt || !slug) {
    throw new Error('Either bearer token, JWT, or slug is missing');
  }

  const response = await fetch(
    `https://api.tokenterminal.com/v2/internal/projects/${slug}/financial-statement?timestamp_granularity=month`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        Accept: 'application/json',
        Origin: 'https://tokenterminal.com',
        Referer: `https://tokenterminal.com/explorer/projects/${slug}/financial-statement`,
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(jwt ? { 'x-tt-terminal-jwt': jwt } : {}),
        'x-app-path': `/explorer/projects/${slug}/financial-statement`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error('API Error:', response.status, text);
    throw new Error(
      `Failed to fetch metrics config: ${response.status} ${text}`
    );
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bearer = searchParams.get('bearer') || undefined;
    const jwt = searchParams.get('jwt') || undefined;
    const slug = searchParams.get('slug') || undefined;

    const data = await getMetricsConfig(bearer, jwt, slug);
    return NextResponse.json({
      message: 'SUCCESS',
      status: 200,
      data: data.data as ProjectMetric[],
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      message: 'Failed to fetch metrics config',
      status: 500,
      data: [],
    });
  }
}
