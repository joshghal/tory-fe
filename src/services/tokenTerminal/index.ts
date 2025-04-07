import axios from 'axios';

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

export const getFinancialStatement = async (
  slug: string,
  bearer: string,
  jwt: string
) => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_TORY_FE_API_URL}/api/token-terminal/financial-statement?slug=${slug}&bearer=${bearer}&jwt=${jwt}`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    data: ProjectMetric[];
  };
};
