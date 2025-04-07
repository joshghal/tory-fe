import { useRequest } from 'ahooks';
import {
  getLunarCrushAuthToken,
  getTokenTerminalAuthToken,
} from '@/services/auth';
import useTokenInfoStore from '@/hooks/useTokenInfoStore';
import { pingToryAgent } from '@/services/toryAgent';

const useAuth = () => {
  const { setTokenTerminalAuth, setToryApiStatus } = useTokenInfoStore();

  const { run: pingTory, loading: isPongToryLoading } = useRequest(
    pingToryAgent,
    {
      manual: true,
      onSuccess: (res) => {
        setToryApiStatus(res?.status);
      },
      onError: (err) => [console.error(err)],
    }
  );

  const { run: getTokenTerminalToken, loading: isGetTokenTerminalAuthLoading } =
    useRequest(getTokenTerminalAuthToken, {
      manual: true,
      onSuccess: (res) => {
        setTokenTerminalAuth({
          bearer: res?.bearer,
          jwt: res?.jwt,
        });
      },
      onError: (err) => {
        console.log(err);
      },
    });

  const {
    run: getLunarToken,
    data: lunarTokenResponse,
    loading: isGetLunarTokenLoading,
  } = useRequest(getLunarCrushAuthToken, {
    manual: true,
    onError: (err) => {
      console.log(err);
    },
  });

  return {
    getTokenTerminalToken,
    isGetTokenTerminalAuthLoading,
    getLunarToken,
    lunarTokenResponse,
    isGetLunarTokenLoading,
    pingTory,
    isPongToryLoading
  };
};

export default useAuth;
