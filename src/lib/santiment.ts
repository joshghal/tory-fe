export interface SantimentDataPoint {
  datetime: string;
  value: number;
}

export interface SantimentSocialData {
  sentimentPositive: SantimentDataPoint[];
  sentimentNegative: SantimentDataPoint[];
  socialVolume: SantimentDataPoint[];
}

const SANTIMENT_API = 'https://api.santiment.net/graphql';

async function queryMetric(
  metric: string,
  slug: string,
  from: string,
  to: string
): Promise<SantimentDataPoint[]> {
  const query = `{
    getMetric(metric: "${metric}") {
      timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
        datetime
        value
      }
    }
  }`;

  const res = await fetch(SANTIMENT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return [];

  const json = await res.json();
  return json?.data?.getMetric?.timeseriesData || [];
}

/**
 * Fetch social sentiment data from Santiment for a given token slug.
 * Santiment free tier covers approximately the last year of data.
 */
export async function getSantimentSocialData(
  slug: string,
  fromDate?: string,
  toDate?: string
): Promise<SantimentSocialData> {
  const to = toDate || new Date().toISOString().split('T')[0];
  const from = fromDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [sentimentPositive, sentimentNegative, socialVolume] = await Promise.all([
    queryMetric('sentiment_positive_total', slug, from, to),
    queryMetric('sentiment_negative_total', slug, from, to),
    queryMetric('social_volume_total', slug, from, to),
  ]);

  return { sentimentPositive, sentimentNegative, socialVolume };
}
