import { useRequest } from 'ahooks';
import { getLunarCrushAuthToken, getTokenTerminalAuthToken } from '@/services/auth';
import useTokenInfoStore from '@/hooks/useTokenInfoStore';

const useAuth = () => {
  const {
    setTokenTerminalAuth
  } = useTokenInfoStore();
  
  const { run: getTokenTerminalToken, loading: isGetTokenTerminalAuthLoading } = useRequest(getTokenTerminalAuthToken, {
      manual: true,
      onSuccess: (res) => {
        setTokenTerminalAuth({
          bearer: res?.bearer,
          jwt: res?.jwt
        })
      },
      onError: (err) => {
        console.log(err);
      }
    })
  
    const { run: getLunarToken, data: lunarTokenResponse, loading: isGetLunarTokenLoading } = useRequest(getLunarCrushAuthToken, {
      manual: true,
      onError: (err) => {
        console.log(err);
      }
    })

  return {
    getTokenTerminalToken,
    isGetTokenTerminalAuthLoading,
    getLunarToken,
    lunarTokenResponse,
    isGetLunarTokenLoading,
  };
};

export default useAuth;