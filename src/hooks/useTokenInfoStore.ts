import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IUseTokenInfoStore {
  tokenTerminalAuth: { [key: string]: string };
  setTokenTerminalAuth: (tokenTerminalAuth: { [key: string]: string }) => void;
}

const useAccountStore = create<IUseTokenInfoStore>()(
  persist(
    (set) => ({
      tokenTerminalAuth: {},
      setTokenTerminalAuth: (tokenTerminalAuth: { [key: string]: string }) => {
        set({ tokenTerminalAuth });
      },
    }),
    {
      name: 'token-info-storage',
    }
  )
);

export default useAccountStore;