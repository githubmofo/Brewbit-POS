"use client";

import { useState, useEffect } from "react";
import { trpc } from "@web/lib/trpc-client";
import { useParams, useRouter } from "next/navigation";
import { useCartStore, type CartItem } from "@web/stores/cart.store";
import { useSessionStore } from "@web/stores/session.store";
import {
  Coffee,
  Search,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  CreditCard,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@web/lib/utils";

export default function PosOrderPage() {
  const params = useParams();
  const router = useRouter();

  // Extract tableId safely in Next.js 15 App Router
  const tableId = params.tableId as string;

  // ─── STATE STORES ───────────────────────────────────────────────────────────
  const { activeSession } = useSessionStore();
  const {
    cartItems,
    addToCart,
    updateQuantity,
    updateItemNotes,
    clearCart,
    getTotals,
  } = useCartStore();

  // ─── LOCAL STATE ────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Variant modifiers overlays
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<
    any | null
  >(null);
  const [chosenVariantId, setChosenVariantId] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState("");

  const [syncingOrder, setSyncingOrder] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // ─── QUERIES & MUTATIONS ────────────────────────────────────────────────────
  const { data: tableDetails } = trpc.table.getById.useQuery({ id: tableId });
  const { data: categories = [] } = trpc.product.listCategories.useQuery();
  const { data: products = [] } = trpc.product.list.useQuery();

  // Fetch existing active order for this table
  const { data: activeOrder, isLoading: loadingActiveOrder } =
    trpc.order.getByTable.useQuery({ tableId });

  const createOrderMutation = trpc.order.create.useMutation();
  const addOrderItemMutation = trpc.order.addItem.useMutation();

  // ─── SYNC SERVER CART ON MOUNT ──────────────────────────────────────────────
  useEffect(() => {
    if (activeOrder) {
      clearCart();
      // Pre-populate Zustand cart with database order items
      activeOrder.items.forEach((item: any) => {
        addToCart({
          productId: item.productId,
          name: item.product.name,
          price: parseFloat(item.product.price),
          quantity: item.quantity,
          variantId: item.variantId,
          variantName: item.variant?.attributeValue || null,
          extraPrice: item.variant ? parseFloat(item.variant.extraPrice) : 0,
          taxRate: parseFloat(item.product.taxRate),
        });
        if (item.notes) {
          updateItemNotes(item.productId, item.variantId, item.notes);
        }
      });
    } else if (!loadingActiveOrder) {
      clearCart(); // clean slate for fresh table
    }
  }, [activeOrder, loadingActiveOrder]);

  // ─── ADD TO CART FLOW ───────────────────────────────────────────────────────
  const handleProductClick = (product: any) => {
    // If product has active custom modifiers/variants, open selections drawer
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product);
      setChosenVariantId(product.variants[0]?.id || null);
      setItemNotes("");
    } else {
      // Add standard product straight to cart
      addToCart({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.price),
        taxRate: parseFloat(product.taxRate),
      });
    }
  };

  const handleConfirmVariantAdd = () => {
    if (!selectedProductForVariant) return;

    const variant = selectedProductForVariant.variants.find(
      (v: any) => v.id === chosenVariantId,
    );

    addToCart({
      productId: selectedProductForVariant.id,
      name: selectedProductForVariant.name,
      price: parseFloat(selectedProductForVariant.price),
      variantId: variant?.id || null,
      variantName: variant?.attributeValue || null,
      extraPrice: variant ? parseFloat(variant.extraPrice) : 0,
      taxRate: parseFloat(selectedProductForVariant.taxRate),
    });

    if (itemNotes) {
      updateItemNotes(selectedProductForVariant.id, variant?.id, itemNotes);
    }

    setSelectedProductForVariant(null);
  };

  // ─── PLACE ORDER & SYNC ─────────────────────────────────────────────────────
  const handleProceedToPayment = async () => {
    if (cartItems.length === 0 || !activeSession) return;
    setSyncingOrder(true);
    setSyncError(null);

    try {
      // 1. Create or retrieve active register draft ticket
      const order = await createOrderMutation.mutateAsync({
        tableId,
        sessionId: activeSession.id,
      });

      // 2. Clear out older order items in DB if we are modifying, and push fresh aggregations
      // Call add item in parallel for all cart rows
      await Promise.all(
        cartItems.map((item) =>
          addOrderItemMutation.mutateAsync({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId || undefined,
            quantity: item.quantity,
            notes: item.notes || undefined,
          }),
        ),
      );

      // 3. Route cashier to payment screen
      router.push(`/payment/${order.id}`);
    } catch (err: any) {
      setSyncError(err.message || "Failed to sync order context.");
    } finally {
      setSyncingOrder(false);
    }
  };

  // ─── MENU CALCULATIONS ──────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      !selectedCategory || p.categoryId === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false);
    return matchesCategory && matchesSearch;
  });

  const { subtotal, taxTotal, total } = getTotals();

  // Helper render method to keep cart contents DRY
  const renderCartPanel = (isMobileView = false) => {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        {/* Cart Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#2C2724] shrink-0">
          <h2 className="text-sm font-black tracking-wider uppercase text-[#EADED2]">
            Dining Cart
          </h2>
          {isMobileView && (
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-[#8E7E72] hover:text-[#EADED2] transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Sync Error Board */}
        {syncError && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs font-semibold text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {syncError}
          </div>
        )}

        {/* Cart Item list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 min-h-0">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
              <Coffee className="h-8 w-8 text-[#8E7E72] mb-2" />
              <h4 className="text-xs font-bold text-[#EADED2]">
                Cart is Empty
              </h4>
              <p className="text-4xs text-[#8E7E72]">
                Select items from menu catalog.
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemUnitPrice = item.price + (item.extraPrice ?? 0);
              const lineTotal = itemUnitPrice * item.quantity;

              return (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="group space-y-2 rounded-xl bg-[#1E1A18]/50 border border-[#2C2724]/40 p-3.5 transition-colors hover:border-[#2C2724]"
                >
                  {/* Name and Pricing */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-[#EADED2] truncate">
                        {item.name}
                      </h4>
                      {item.variantName && (
                        <span className="text-4xs font-bold text-[#E28743] uppercase tracking-wider block mt-0.5">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-[#EADED2]">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>

                  {/* Item Instruction Box */}
                  <div className="relative">
                    <MessageSquare className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#8E7E72]/60" />
                    <input
                      type="text"
                      placeholder="Add kitchen note..."
                      value={item.notes || ""}
                      onChange={(e) =>
                        updateItemNotes(
                          item.productId,
                          item.variantId,
                          e.target.value,
                        )
                      }
                      className="w-full rounded bg-[#161312] border border-[#2C2724]/60 pl-8 pr-2 py-1 text-4xs text-[#CBB9A8] placeholder-[#8E7E72]/60 focus:border-[#E28743]/50 focus:outline-none"
                    />
                  </div>

                  {/* Quantity modifiers */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-4xs text-[#8E7E72] font-semibold">
                      {formatCurrency(itemUnitPrice)} / unit
                    </span>

                    <div className="flex items-center rounded-lg border border-[#2C2724] bg-[#161312] overflow-hidden">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.variantId,
                            item.quantity - 1,
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center hover:bg-[#25201E] text-[#8E7E72] hover:text-[#EADED2] transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-extrabold text-[#EADED2]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.variantId,
                            item.quantity + 1,
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center hover:bg-[#25201E] text-[#8E7E72] hover:text-[#EADED2] transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Invoice summary footer */}
        <div className="border-t border-[#2C2724] p-4 bg-[#1E1A18]/25 space-y-4 shrink-0">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-[#8E7E72]">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#8E7E72]">
              <span>Taxes (GST)</span>
              <span className="font-semibold">{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between text-[#EADED2] font-extrabold pt-2.5 border-t border-[#2C2724]/40 text-sm">
              <span>Total Bill</span>
              <span className="text-[#E28743]">{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            onClick={handleProceedToPayment}
            disabled={cartItems.length === 0 || syncingOrder}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E28743] hover:bg-[#F49753] py-3.5 text-xs font-black text-[#161312] shadow-lg shadow-[#E28743]/10 transition-all active:scale-98 disabled:opacity-30 disabled:pointer-events-none"
          >
            {syncingOrder ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#161312]" />
            ) : (
              <CreditCard className="h-4 w-4 text-[#161312]" />
            )}
            Proceed to Payment
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-[#12100F] flex-col lg:flex-row pb-20 lg:pb-0">
      {/* ─── LEFT PANEL: PRODUCT SELECTOR ────────────────────────────────────── */}
      <section className="flex-1 flex flex-col min-w-0 border-r border-[#2C2724] px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {/* Header Board */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/floor")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2C2724] bg-[#1E1A18] text-[#8E7E72] hover:text-[#EADED2] transition-colors"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-[#EADED2]">
                Order Entry — {tableDetails?.label || "Table"}
              </h2>
              <span className="text-3xs text-[#8E7E72] uppercase font-bold tracking-wider">
                {tableDetails?.seats || 2} Seats · Dine-In
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8E7E72]" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#2C2724] bg-[#161312] pl-9 pr-3.5 py-1.5 text-xs text-[#EADED2] focus:border-[#E28743] focus:outline-none"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-bold transition-all whitespace-nowrap border",
              !selectedCategory
                ? "bg-[#E28743] text-[#161312] border-[#E28743]"
                : "bg-[#1E1A18] text-[#8E7E72] border-[#2C2724] hover:text-[#CBB9A8]",
            )}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all whitespace-nowrap border",
                selectedCategory === cat.id
                  ? "bg-[#25201E] text-[#EADED2] border-[#E28743]/50"
                  : "bg-[#1E1A18] text-[#8E7E72] border-[#2C2724] hover:text-[#CBB9A8]",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-[#161312] rounded-2xl border border-[#2C2724]">
              <Coffee className="h-8 w-8 text-[#8E7E72] mb-2 opacity-50" />
              <h4 className="text-xs font-bold text-[#EADED2]">
                No Menu Items
              </h4>
              <p className="text-4xs text-[#8E7E72] mt-0.5">
                Category or search filters did not match any active items.
              </p>
            </div>
          ) : (
            <div className="grid gap-4.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product: any) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="rounded-xl border border-[#2C2724] bg-[#161312] p-4 flex flex-col justify-between min-h-32 cursor-pointer hover:border-[#8E7E72] hover:shadow-lg transition-all duration-200 select-none active:scale-98"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-[#EADED2] line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-4xs text-[#8E7E72] line-clamp-2 leading-relaxed">
                      {product.description || "Freshly brewed selection."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#2C2724]/20 flex items-center justify-between">
                    <span className="text-xs font-black text-[#E28743]">
                      ₹{parseFloat(product.price).toFixed(2)}
                    </span>
                    {product.variants && product.variants.length > 0 && (
                      <span className="text-4xs font-bold uppercase tracking-widest text-[#8E7E72]">
                        + Modifiers
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── RIGHT PANEL: CART SIDEBAR (Desktop) ─────────────────────────────── */}
      <section className="hidden lg:flex w-88 flex-col bg-[#161312] shrink-0 border-l border-[#2C2724]">
        {renderCartPanel(false)}
      </section>

      {/* ─── MOBILE CART DRAWER OVERLAY (Mobile/Tablet) ───────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in">
          <section className="w-full sm:max-w-md h-full flex flex-col bg-[#161312] animate-slide-in shadow-2xl">
            {renderCartPanel(true)}
          </section>
        </div>
      )}

      {/* ─── BOTTOM FLOATING BAR (Mobile/Tablet) ─────────────────────────────── */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex w-full items-center justify-between gap-2 rounded-2xl bg-[#E28743] hover:bg-[#F49753] px-6 py-4 text-xs font-black text-[#161312] shadow-xl shadow-black/40 transition-all active:scale-98"
          >
            <span className="flex items-center gap-2">
              <Coffee className="h-4.5 w-4.5 text-[#161312]" />
              <span>
                View Order Cart (
                {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)} items)
              </span>
            </span>
            <span className="font-extrabold">{formatCurrency(total)}</span>
          </button>
        </div>
      )}

      {/* ─── DRINK VARIANT MODIFIER MODAL ────────────────────────────────────── */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-base font-black text-[#EADED2] flex items-center gap-2 pb-4 border-b border-[#2C2724]/60">
              <Sparkles className="h-4.5 w-4.5 text-[#E28743]" />
              Select Options: {selectedProductForVariant.name}
            </h3>

            <div className="mt-5 space-y-4">
              {/* Variant Modifiers Selector */}
              <div>
                <label className="text-3xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-2">
                  Modifiers / Size
                </label>
                <div className="space-y-2">
                  {selectedProductForVariant.variants.map((v: any) => (
                    <label
                      key={v.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all duration-200 select-none",
                        chosenVariantId === v.id
                          ? "border-[#E28743] bg-[#E28743]/5 text-[#EADED2]"
                          : "border-[#2C2724] bg-[#1E1A18] text-[#8E7E72] hover:text-[#CBB9A8]",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="variant-select"
                          checked={chosenVariantId === v.id}
                          onChange={() => setChosenVariantId(v.id)}
                          className="h-4 w-4 accent-[#E28743] bg-[#161312] border-[#2C2724] text-[#E28743]"
                        />
                        <span className="text-xs font-bold">
                          {v.attributeValue}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#E28743]">
                        +₹{parseFloat(v.extraPrice).toFixed(0)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Modifier Notes */}
              <div>
                <label className="text-3xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Special Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra hot, no sugar..."
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-2 text-xs text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2C2724]/40">
                <button
                  type="button"
                  onClick={() => setSelectedProductForVariant(null)}
                  className="rounded-xl border border-[#2C2724] px-4 py-2.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVariantAdd}
                  className="rounded-xl bg-[#E28743] hover:bg-[#F49753] px-5 py-2.5 text-xs font-bold text-[#161312] transition-colors"
                >
                  Add Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export type PosOrderPage = typeof PosOrderPage;
