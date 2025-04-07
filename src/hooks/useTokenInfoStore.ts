import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IUseTokenInfoStore {
  tokenTerminalAuth: { [key: string]: string };
  toryApiStatus: boolean;
  setTokenTerminalAuth: (tokenTerminalAuth: { [key: string]: string }) => void;
  setToryApiStatus: (status: boolean) => void;
}

const useAccountStore = create<IUseTokenInfoStore>()(
  persist(
    (set) => ({
      tokenTerminalAuth: {},
      toryApiStatus: false,
      setTokenTerminalAuth: (tokenTerminalAuth: { [key: string]: string }) => {
        set({ tokenTerminalAuth });
      },
      setToryApiStatus: (toryApiStatus: boolean) => {
        set({ toryApiStatus });
      },
    }),
    {
      name: 'token-info-storage',
    }
  )
);

export default useAccountStore;