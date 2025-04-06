import { ProjectMetric } from '@/app/api/token-terminal/financial-statement/route';
import axios from 'axios';

export const getFinancialStatement = async (
  slug: string,
  bearer: string,
  jwt: string
) => {
  const response = await axios.get(`/api/token-terminal/financial-statement?slug=${slug}&bearer=${bearer}&jwt=${jwt}`);
  const { data } = response;
  return data as {
    message: string;
    status: number;
    data: ProjectMetric[];
  };
};
