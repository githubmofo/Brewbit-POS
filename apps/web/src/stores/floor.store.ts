import { create } from "zustand";

interface FloorState {
  selectedFloorId: string | null;
  selectedTableId: string | null;
  setSelectedFloorId: (id: string | null) => void;
  setSelectedTableId: (id: string | null) => void;
}

export const useFloorStore = create<FloorState>((set) => ({
  selectedFloorId: null,
  selectedTableId: null,

  // Set current dining floor filter
  setSelectedFloorId: (id) => set({ selectedFloorId: id }),

  // Set current selected dining table
  setSelectedTableId: (id) => set({ selectedTableId: id }),
}));
export type UseFloorStore = typeof useFloorStore;
