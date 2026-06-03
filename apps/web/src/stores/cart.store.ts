import { create } from "zustand";

export interface CartItem {
  productId: string;
  name: string;
  price: number; // Base product price
  quantity: number;
  variantId?: string | null;
  variantName?: string | null;
  extraPrice?: number; // Variant extra price
  notes: string;
  taxRate: number; // Product tax rate
}

interface CartState {
  cartItems: CartItem[];
  addToCart: (
    item: Omit<CartItem, "quantity" | "notes"> & {
      quantity?: number;
      notes?: string;
    },
  ) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null | undefined,
    quantity: number,
  ) => void;
  updateItemNotes: (
    productId: string,
    variantId: string | null | undefined,
    notes: string,
  ) => void;
  clearCart: () => void;
  getTotals: () => { subtotal: number; taxTotal: number; total: number };
}

export const useCartStore = create<CartState>((set, get) => ({
  cartItems: [],

  // Adds an item to the shopping cart, aggregating quantity if identical product + variant matches
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

  // Sets quantity, or removes the item if quantity drops to 0
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

  // Add kitchen instructions or customer notes to individual items
  updateItemNotes: (productId, variantId, notes) =>
    set((state) => ({
      cartItems: state.cartItems.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, notes }
          : i,
      ),
    })),

  // Clear cart contents entirely
  clearCart: () => set({ cartItems: [] }),

  // Computes invoice summary sums
  getTotals: () => {
    const items = get().cartItems;
    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const itemUnitPrice = item.price + (item.extraPrice ?? 0);
      const lineTotal = itemUnitPrice * item.quantity;
      const lineTax = lineTotal * (item.taxRate / 100);

      subtotal += lineTotal;
      taxTotal += lineTax;
    }

    return {
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
    };
  },
}));
export type UseCartStore = typeof useCartStore;
