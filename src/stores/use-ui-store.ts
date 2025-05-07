import { create } from 'zustand';

interface UIState {
  isSlideOutOpen: boolean;
  currentSlideOutBeatId: string | number | null;
  openSlideOut: (beatId: string | number) => void;
  closeSlideOut: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSlideOutOpen: false,
  currentSlideOutBeatId: null,
  openSlideOut: (beatId) => set({ isSlideOutOpen: true, currentSlideOutBeatId: beatId }),
  closeSlideOut: () => set({ isSlideOutOpen: false, currentSlideOutBeatId: null }),
})); 