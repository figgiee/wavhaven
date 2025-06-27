import { create } from 'zustand';

interface UIState {
  isSlideOutOpen: boolean;
  currentSlideOutBeatId: string | number | null;
  activeSlideOutTab: string | null;
  openSlideOut: (beatId: string | number, tab?: string) => void;
  closeSlideOut: () => void;

  // New state and actions for Global Search Modal
  isSearchModalOpen: boolean;
  openSearchModal: () => void;
  closeSearchModal: () => void;

  // Filter Panel state and actions
  isFilterPanelOpen: boolean;
  openFilterPanel: () => void;
  closeFilterPanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSlideOutOpen: false,
  currentSlideOutBeatId: null,
  activeSlideOutTab: null,
  openSlideOut: (beatId, tab) => set({
    isSlideOutOpen: true,
    currentSlideOutBeatId: beatId,
    activeSlideOutTab: tab || 'overview',
  }),
  closeSlideOut: () => set({
    isSlideOutOpen: false,
    currentSlideOutBeatId: null,
    activeSlideOutTab: null,
  }),

  // Initial state and implementation for Global Search Modal
  isSearchModalOpen: false,
  openSearchModal: () => set({ isSearchModalOpen: true }),
  closeSearchModal: () => set({ isSearchModalOpen: false }),

  // Filter Panel state and implementation
  isFilterPanelOpen: false,
  openFilterPanel: () => set({ isFilterPanelOpen: true }),
  closeFilterPanel: () => set({ isFilterPanelOpen: false }),
})); 