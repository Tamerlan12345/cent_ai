import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Стор настроек интерфейса. Управляет «постепенным раскрытием» (progressive
// disclosure): по умолчанию прячет «профессиональную» обвязку IDE (git, квоты,
// агент-план) от новичков и показывает её только в режиме эксперта.
interface UiState {
  expertMode: boolean;
  toggleExpertMode: () => void;
  setExpertMode: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      expertMode: false,
      toggleExpertMode: () => set((state) => ({ expertMode: !state.expertMode })),
      setExpertMode: (v: boolean) => set({ expertMode: v }),
    }),
    { name: 'centras_ui_prefs' },
  ),
);
