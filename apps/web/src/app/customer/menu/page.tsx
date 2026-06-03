"use client";

import { trpc } from "@web/lib/trpc-client";
import { useCustomerCartStore } from "@web/stores/customer-cart.store";
import { useState, useEffect } from "react";
import { Loader2, Plus, Minus, ShoppingBag, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CustomerMenuPage() {
  const router = useRouter();
  const { data: categories, isLoading: catLoading } =
    trpc.product.listCategories.useQuery();
  const { data: products, isLoading: prodLoading } =
    trpc.product.list.useQuery();
  const addToCart = useCustomerCartStore((s) => s.addToCart);
  const cartItems = useCustomerCartStore((s) => s.cartItems);
  const getTotals = useCustomerCartStore((s) => s.getTotals);
  const selectedTableLabel = useCustomerCartStore((s) => s.selectedTableLabel);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  // Default category to the first one once loaded
  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const isLoading = catLoading || prodLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2
          className="h-7 w-7 animate-spin"
          style={{ color: "oklch(65% 0.18 75)" }}
        />
      </div>
    );
  }

  const filteredProducts = activeCategory
    ? (products?.filter((p) => p.categoryId === activeCategory) ?? [])
    : (products ?? []);

  const totals = getTotals();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleAdd = (product: any, variant?: any) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      variantId: variant?.id ?? null,
      variantName: variant
        ? `${variant.attributeName}: ${variant.attributeValue}`
        : null,
      extraPrice: variant ? parseFloat(variant.extraPrice) : 0,
      taxRate: parseFloat(product.taxRate),
      categoryColor: product.category?.color ?? "#E28743",
    });

    setAddedFeedback(product.id + (variant?.id ?? ""));
    setTimeout(() => setAddedFeedback(null), 800);
  };

  // Get quantity of a specific product in cart
  const getCartQty = (productId: string, variantId?: string | null): number => {
    return (
      cartItems.find(
        (i) => i.productId === productId && i.variantId === (variantId ?? null),
      )?.quantity ?? 0
    );
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Table indicator */}
      {selectedTableLabel && (
        <div
          className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs font-semibold"
          style={{
            background: "oklch(65% 0.18 75 / 0.06)",
            borderBottom: "1px solid oklch(65% 0.18 75 / 0.1)",
            color: "oklch(65% 0.18 75)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "oklch(65% 0.18 75)" }}
          />
          Table {selectedTableLabel} selected
        </div>
      )}

      {/* Category Chips */}
      <div
        className="flex items-center gap-2 px-4 sm:px-6 py-3 overflow-x-auto shrink-0"
        style={{ borderBottom: "1px solid oklch(18% 0.008 75)" }}
      >

        {categories?.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
            style={{
              background:
                activeCategory === cat.id ? cat.color : "oklch(18% 0.01 75)",
              color: activeCategory === cat.id ? "white" : "#8E7E72",
              border: `1px solid ${activeCategory === cat.id ? cat.color : "oklch(22% 0.01 75)"}`,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <p className="text-sm" style={{ color: "#8E7E72" }}>
              No items in this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const price = parseFloat(product.price);
              const hasVariants =
                product.variants && product.variants.length > 0;
              const feedbackKey = product.id;
              const firstVariantId = hasVariants ? product.variants[0]?.id : null;
              const qty = getCartQty(product.id, firstVariantId);

              return (
                <div
                  key={product.id}
                  className="flex gap-3 rounded-xl p-3.5 transition-all duration-200"
                  style={{
                    background: "oklch(13% 0.008 75)",
                    border: "1px solid oklch(22% 0.01 75)",
                  }}
                >
                  {/* Color accent stripe */}
                  <div
                    className="w-1 shrink-0 rounded-full self-stretch"
                    style={{ background: product.category?.color ?? "#E28743" }}
                  />

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-sm font-bold truncate"
                      style={{ color: "#EADED2" }}
                    >
                      {product.name}
                    </h3>
                    {product.description && (
                      <p
                        className="text-[10px] mt-0.5 line-clamp-2"
                        style={{ color: "#8E7E72" }}
                      >
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-sm font-bold"
                        style={{ color: "oklch(65% 0.18 75)" }}
                      >
                        ₹{price.toFixed(2)}
                      </span>
                      {product.category && (
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wider rounded-full px-1.5 py-0.5"
                          style={{
                            background: `${product.category.color}15`,
                            color: product.category.color,
                          }}
                        >
                          {product.category.name}
                        </span>
                      )}
                    </div>

                    {/* Variant buttons */}
                    {hasVariants && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {product.variants.map((v: any) => {
                          const vQty = getCartQty(product.id, v.id);
                          const vFeedback = addedFeedback === product.id + v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleAdd(product, v)}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all duration-200"
                              style={{
                                background: vFeedback
                                  ? "oklch(70% 0.18 155 / 0.15)"
                                  : "oklch(18% 0.01 75)",
                                border: `1px solid ${vFeedback ? "oklch(70% 0.18 155 / 0.3)" : "oklch(25% 0.01 75)"}`,
                                color: vFeedback
                                  ? "oklch(70% 0.18 155)"
                                  : "#CBB9A8",
                              }}
                            >
                              {v.attributeValue}
                              {parseFloat(v.extraPrice) > 0 && (
                                <span style={{ color: "#8E7E72" }}>
                                  +₹{parseFloat(v.extraPrice).toFixed(0)}
                                </span>
                              )}
                              {vQty > 0 && (
                                <span
                                  className="ml-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white px-0.5"
                                  style={{ background: "oklch(65% 0.18 75)" }}
                                >
                                  {vQty}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add button / Quantity stepper */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    {qty > 0 ? (
                      <div
                        className="flex items-center gap-1 rounded-lg"
                        style={{
                          background: "oklch(18% 0.01 75)",
                          border: "1px solid oklch(25% 0.01 75)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            useCustomerCartStore
                              .getState()
                              .updateQuantity(product.id, firstVariantId, qty - 1);
                          }}
                          className="p-1.5 transition-colors"
                          style={{ color: "#8E7E72" }}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span
                          className="text-xs font-bold min-w-5 text-center"
                          style={{ color: "#EADED2" }}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdd(product, hasVariants ? product.variants[0] : undefined)}
                          className="p-1.5 transition-colors"
                          style={{ color: "oklch(65% 0.18 75)" }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(product, hasVariants ? product.variants[0] : undefined)}
                        className="flex items-center justify-center rounded-lg p-2.5 transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{
                          background:
                            addedFeedback === (hasVariants ? (product.id + product.variants[0].id) : feedbackKey)
                              ? "oklch(70% 0.18 155 / 0.15)"
                              : "oklch(65% 0.18 75 / 0.1)",
                          border: `1px solid ${
                            addedFeedback === (hasVariants ? (product.id + product.variants[0].id) : feedbackKey)
                              ? "oklch(70% 0.18 155 / 0.3)"
                              : "oklch(65% 0.18 75 / 0.2)"
                          }`,
                          color:
                            addedFeedback === (hasVariants ? (product.id + product.variants[0].id) : feedbackKey)
                              ? "oklch(70% 0.18 155)"
                              : "oklch(65% 0.18 75)",
                        }}
                      >
                        <Plus className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Summary Bar */}
      {itemCount > 0 && (
        <div className="sticky bottom-16 sm:bottom-18 z-30 mx-4 sm:mx-6 mb-2">
          <button
            type="button"
            onClick={() => router.push("/customer/cart")}
            className="flex w-full items-center justify-between rounded-xl px-5 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, oklch(65% 0.18 75), oklch(55% 0.16 75))",
              boxShadow: "0 8px 28px oklch(65% 0.18 75 / 0.35)",
            }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="flex items-center gap-1">
              ₹{totals.total.toFixed(2)}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
