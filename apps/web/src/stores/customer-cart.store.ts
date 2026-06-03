import { create } from "zustand";

export interface CustomerCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantId?: string | null;
  variantName?: string | null;
  extraPrice?: number;
  notes: string;
  taxRate: number;
  categoryColor?: string;
}

interface CustomerCartState {
  selectedTableId: string | null;
  selectedTableLabel: string | null;
  selectedFloorName: string | null;
  cartItems: CustomerCartItem[];

  setSelectedTable: (
    tableId: string,
    tableLabel: string,
    floorName: string,
  ) => void;
  clearSelectedTable: () => void;

  addToCart: (
    item: Omit<CustomerCartItem, "quantity" | "notes"> & {
      quantity?: number;
      notes?: string;
    },
  ) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null | undefined,
    quantity: number,
  ) => void;
  removeItem: (productId: string, variantId: string | null | undefined) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotals: () => { subtotal: number; taxTotal: number; total: number };
}

export const useCustomerCartStore = create<CustomerCartState>((set, get) => ({
  selectedTableId: null,
  selectedTableLabel: null,
  selectedFloorName: null,
  cartItems: [],

  setSelectedTable: (tableId, tableLabel, floorName) =>
    set({
      selectedTableId: tableId,
      selectedTableLabel: tableLabel,
      selectedFloorName: floorName,
    }),

  clearSelectedTable: () =>
    set({
      selectedTableId: null,
      selectedTableLabel: null,
      selectedFloorName: null,
    }),

  addToCart: (item) =>
    set((state) => {
      const existingIndex = state.cartItems.findIndex(
        (i) => i.productId === item.productId && i.variantId === item.variantId,
      );

      const nextItems = [...state.cartItems];

      if (existingIndex > -1) {
        const existing = nextItems[existingIndex]!;
        nextItems[existingIndex] = {
          ...existing,
          quantity: existing.quantity + (item.quantity ?? 1),
          notes: item.notes ?? existing.notes,
        };
      } else {
        nextItems.push({
          ...item,
          quantity: item.quantity ?? 1,
          notes: item.notes ?? "",
        });
      }

      return { cartItems: nextItems };
    }),

  updateQuantity: (productId, variantId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return {
          cartItems: state.cartItems.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        };
      }
      return {
        cartItems: state.cartItems.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity }
            : i,
        ),
      };
    }),

  removeItem: (productId, variantId) =>
    set((state) => ({
      cartItems: state.cartItems.filter(
        (i) => !(i.productId === productId && i.variantId === variantId),
      ),
    })),

  clearCart: () =>
    set({
      cartItems: [],
    }),

  getItemCount: () =>
    get().cartItems.reduce((sum, item) => sum + item.quantity, 0),

  getTotals: () => {
    const items = get().cartItems;
    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const unitPrice = item.price + (item.extraPrice ?? 0);
      const lineTotal = unitPrice * item.quantity;
      const lineTax = lineTotal * (item.taxRate / 100);
      subtotal += lineTotal;
      taxTotal += lineTax;
    }

    return { subtotal, taxTotal, total: subtotal + taxTotal };
  },
}));
