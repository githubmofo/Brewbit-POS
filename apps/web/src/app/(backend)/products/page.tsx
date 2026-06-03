"use client";

import { useState } from "react";
import { trpc } from "@web/lib/trpc-client";
import {
  Plus,
  Search,
  Coffee,
  Settings,
  Check,
  Eye,
  EyeOff,
  Tag,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  createCategorySchema,
  createProductSchema,
  createVariantSchema,
} from "@pos/validators";

export default function ProductsAdminPage() {
  // ─── LOCAL STATE ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"products" | "categories">(
    "products",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);

  // Modal Control States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [targetProductForVariant, setTargetProductForVariant] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Form States & Local Validation Errors
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    color: "#E28743",
    sortOrder: 0,
  });
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    price: 0,
    unit: "pcs",
    taxRate: 5,
    imageUrl: "",
  });
  const [variantForm, setVariantForm] = useState({
    attributeName: "Size",
    attributeValue: "Large",
    extraPrice: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // ─── TRPC QUERIES & MUTATIONS ───────────────────────────────────────────────
  const utils = trpc.useUtils();

  const { data: categories = [], isLoading: loadingCategories } =
    trpc.product.listCategories.useQuery();
  const { data: products = [], isLoading: loadingProducts } =
    trpc.product.list.useQuery();

  const createCategoryMutation = trpc.product.createCategory.useMutation({
    onSuccess: () => {
      utils.product.listCategories.invalidate();
      setIsCategoryModalOpen(false);
      resetCategoryForm();
    },
    onError: (err) => setFormError(err.message),
  });

  const createProductMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      setIsProductModalOpen(false);
      resetProductForm();
    },
    onError: (err) => setFormError(err.message),
  });

  const updateProductMutation = trpc.product.update.useMutation({
    onSuccess: () => utils.product.list.invalidate(),
  });

  const updateCategoryMutation = trpc.product.updateCategory.useMutation({
    onSuccess: () => {
      utils.product.listCategories.invalidate();
      utils.product.list.invalidate();
    },
  });

  const createVariantMutation = trpc.product.createVariant.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      setIsVariantModalOpen(false);
      resetVariantForm();
    },
    onError: (err) => setFormError(err.message),
  });

  // ─── FORM ACTIONS ───────────────────────────────────────────────────────────
  const resetCategoryForm = () => {
    setCategoryForm({ name: "", color: "#E28743", sortOrder: 0 });
    setFormError(null);
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      categoryId: categories[0]?.id || "",
      price: 0,
      unit: "pcs",
      taxRate: 5,
      imageUrl: "",
    });
    setFormError(null);
  };

  const resetVariantForm = () => {
    setVariantForm({
      attributeName: "Size",
      attributeValue: "Large",
      extraPrice: 0,
    });
    setFormError(null);
    setTargetProductForVariant(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = createCategorySchema.safeParse(categoryForm);
    if (!result.success) {
      setFormError(result.error.errors[0]?.message || "Validation failed.");
      return;
    }

    createCategoryMutation.mutate(categoryForm);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Drizzle requires decimals, schema takes numeric floats
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      taxRate: Number(productForm.taxRate),
    };

    const result = createProductSchema.safeParse(payload);
    if (!result.success) {
      setFormError(result.error.errors[0]?.message || "Validation failed.");
      return;
    }

    createProductMutation.mutate(payload);
  };

  const handleCreateVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForVariant) return;
    setFormError(null);

    const payload = {
      productId: targetProductForVariant.id,
      ...variantForm,
      extraPrice: Number(variantForm.extraPrice),
    };

    const result = createVariantSchema.safeParse(payload);
    if (!result.success) {
      setFormError(result.error.errors[0]?.message || "Validation failed.");
      return;
    }

    createVariantMutation.mutate(payload);
  };

  const toggleProductActive = (id: string, currentStatus: boolean) => {
    updateProductMutation.mutate({
      id,
      isActive: !currentStatus,
    });
  };

  const toggleCategoryActive = (id: string, currentStatus: boolean) => {
    updateCategoryMutation.mutate({
      id,
      isActive: !currentStatus,
    });
  };

  // ─── FILTER CALCULATIONS ───────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false);
    const matchesCategory =
      !selectedCategoryFilter || p.categoryId === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Header Board */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#2C2724] pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#EADED2]">
            Product Management
          </h2>
          <p className="text-sm text-[#8E7E72] mt-1">
            Configure cafe menus, category filters, and drink modifiers.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              resetCategoryForm();
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-[#2C2724] bg-[#1E1A18] px-4 py-2.5 text-sm font-semibold text-[#CBB9A8] transition-all hover:bg-[#25201E] hover:text-[#EADED2] active:scale-98"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
          <button
            onClick={() => {
              resetProductForm();
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#E28743] px-5 py-2.5 text-sm font-semibold text-[#161312] shadow-lg shadow-[#E28743]/15 transition-all hover:bg-[#F49753] hover:shadow-[#E28743]/20 active:scale-98"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#2C2724]/40">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-6 py-3.5 text-sm font-semibold transition-all relative ${
            activeTab === "products"
              ? "text-[#EADED2]"
              : "text-[#8E7E72] hover:text-[#CBB9A8]"
          }`}
        >
          Products
          {activeTab === "products" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E28743] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-6 py-3.5 text-sm font-semibold transition-all relative ${
            activeTab === "categories"
              ? "text-[#EADED2]"
              : "text-[#8E7E72] hover:text-[#CBB9A8]"
          }`}
        >
          Categories
          {activeTab === "categories" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E28743] rounded-full" />
          )}
        </button>
      </div>

      {/* ─── TAB 1: PRODUCTS DISPLAY ────────────────────────────────────────── */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#8E7E72]" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#2C2724] bg-[#161312] pl-11 pr-4 py-3 text-sm text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none"
              />
            </div>

            {/* Category Filter Badges */}
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setSelectedCategoryFilter(null)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  !selectedCategoryFilter
                    ? "bg-[#E28743] text-[#161312]"
                    : "bg-[#1E1A18] text-[#8E7E72] border border-[#2C2724] hover:text-[#CBB9A8]"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all border ${
                    selectedCategoryFilter === cat.id
                      ? "bg-[#25201E] text-[#EADED2]"
                      : "bg-[#1E1A18] text-[#8E7E72] border-[#2C2724] hover:text-[#CBB9A8]"
                  }`}
                  style={
                    selectedCategoryFilter === cat.id
                      ? { borderColor: cat.color ?? "#E28743" }
                      : {}
                  }
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: cat.color ?? "#E28743" }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Skeleton Loaders */}
          {loadingProducts ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl bg-[#161312] border border-[#2C2724] animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C2724] bg-[#161312] py-16 text-center">
              <Coffee className="h-10 w-10 text-[#8E7E72] mb-3" />
              <h3 className="text-base font-semibold text-[#EADED2]">
                No Products Found
              </h3>
              <p className="text-sm text-[#8E7E72] mt-1">
                Get started by creating a new beverage menu item.
              </p>
            </div>
          ) : (
            /* Products Grid list */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`relative rounded-2xl border bg-[#161312] p-5 transition-all duration-300 hover:shadow-lg hover:shadow-[#E28743]/5 group ${
                    product.isActive
                      ? "border-[#2C2724]"
                      : "border-[#2C2724]/40 opacity-70"
                  }`}
                >
                  {/* Category accent tag */}
                  <span
                    className="absolute top-0 left-6 h-1 w-16 rounded-b-full"
                    style={{
                      backgroundColor: product.category?.color ?? "#E28743",
                    }}
                  />

                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#8E7E72] block">
                          {product.category?.name ?? "Menu"}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#EADED2] truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-[#8E7E72] line-clamp-2 min-h-8">
                        {product.description || "No description provided."}
                      </p>
                    </div>

                    {/* Image Placeholder or URL */}
                    <div className="h-14 w-14 rounded-xl border border-[#2C2724] bg-[#1E1A18] flex items-center justify-center overflow-hidden shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Coffee className="h-6 w-6 text-[#8E7E72] opacity-40" />
                      )}
                    </div>
                  </div>

                  {/* Price, active and modifiers grid */}
                  <div className="mt-5 pt-4 border-t border-[#2C2724]/40 flex items-center justify-between">
                    <div>
                      <span className="text-2xs font-semibold uppercase tracking-widest text-[#8E7E72] block">
                        Price
                      </span>
                      <span className="text-base font-extrabold text-[#E28743]">
                        ₹{parseFloat(product.price).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Modifier Setup Trigger */}
                      <button
                        onClick={() => {
                          setTargetProductForVariant({
                            id: product.id,
                            name: product.name,
                          });
                          setIsVariantModalOpen(true);
                        }}
                        className="flex h-9 items-center gap-1.5 rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 text-xs font-semibold text-[#CBB9A8] transition-colors hover:bg-[#25201E] hover:text-[#EADED2]"
                        title="Add Modifiers"
                      >
                        <Settings className="h-3.5 w-3.5 text-[#E28743]" />
                        Modify
                      </button>

                      {/* Toggle switch */}
                      <button
                        onClick={() =>
                          toggleProductActive(product.id, product.isActive)
                        }
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                          product.isActive
                            ? "border-[#E28743]/20 bg-[#E28743]/5 text-[#E28743] hover:bg-[#E28743]/10"
                            : "border-[#2C2724] bg-[#1E1A18] text-[#8E7E72] hover:text-[#EADED2]"
                        }`}
                        title={
                          product.isActive ? "Hide Product" : "Show Product"
                        }
                      >
                        {product.isActive ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Render modifiers if present */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-[#2C2724]/10">
                      {product.variants.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1 rounded bg-[#1C1816] px-2 py-0.5 text-3xs font-semibold text-[#A39284] border border-[#2C2724]/40"
                        >
                          {v.attributeValue} (+₹
                          {parseFloat(v.extraPrice).toFixed(0)})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: CATEGORIES DISPLAY ──────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          {loadingCategories ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-[#161312] border border-[#2C2724] animate-pulse"
                />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C2724] bg-[#161312] py-16 text-center">
              <Tag className="h-10 w-10 text-[#8E7E72] mb-3" />
              <h3 className="text-base font-semibold text-[#EADED2]">
                No Categories Found
              </h3>
              <p className="text-sm text-[#8E7E72] mt-1">
                Get started by creating a new product category group.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`rounded-2xl border bg-[#161312] p-5 flex items-center justify-between transition-all duration-200 ${
                    cat.isActive
                      ? "border-[#2C2724]"
                      : "border-[#2C2724]/40 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        border: `1px solid ${cat.color}`,
                      }}
                    >
                      <Tag className="h-4 w-4" style={{ color: cat.color }} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#EADED2]">
                        {cat.name}
                      </h4>
                      <span className="text-3xs font-semibold text-[#8E7E72] uppercase tracking-wider block mt-0.5">
                        Order: {cat.sortOrder}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleCategoryActive(cat.id, cat.isActive)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                      cat.isActive
                        ? "border-[#E28743]/20 bg-[#E28743]/5 text-[#E28743] hover:bg-[#E28743]/10"
                        : "border-[#2C2724] bg-[#1E1A18] text-[#8E7E72] hover:text-[#EADED2]"
                    }`}
                  >
                    {cat.isActive ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: ADD CATEGORY ─────────────────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-[#EADED2] flex items-center gap-2 pb-4 border-b border-[#2C2724]/60">
              <Plus className="h-5 w-5 text-[#E28743]" />
              New Product Category
            </h3>

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-medium text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="mt-5 space-y-4">
              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hot Coffees"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.sortOrder}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        sortOrder: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Theme Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          color: e.target.value,
                        })
                      }
                      className="h-[38px] w-12 rounded-lg border border-[#2C2724] bg-[#1E1A18] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={categoryForm.color}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          color: e.target.value,
                        })
                      }
                      className="flex-1 rounded-lg border border-[#2C2724] bg-[#1E1A18] px-2 text-center text-xs font-semibold text-[#EADED2] focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#2C2724]/40">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="rounded-xl border border-[#2C2724] px-4 py-2.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-[#E28743] px-5 py-2.5 text-xs font-semibold text-[#161312] hover:bg-[#F49753] transition-colors disabled:opacity-50"
                >
                  {createCategoryMutation.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADD PRODUCT ──────────────────────────────────────────── */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-[#EADED2] flex items-center gap-2 pb-4 border-b border-[#2C2724]/60">
              <Plus className="h-5 w-5 text-[#E28743]" />
              New Cafe Product
            </h3>

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-medium text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat White Cappuccino"
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({ ...productForm, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Description
                  </label>
                  <textarea
                    placeholder="Brief description of notes and flavors..."
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Category Group
                  </label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        categoryId: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#CBB9A8] focus:border-[#E28743] focus:outline-none"
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Unit Base
                  </label>
                  <input
                    type="text"
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unit: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={productForm.price || ""}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        price: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    GST Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={productForm.taxRate}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        taxRate: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                    Product Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={productForm.imageUrl}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        imageUrl: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#2C2724]/40">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="rounded-xl border border-[#2C2724] px-4 py-2.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-[#E28743] px-5 py-2.5 text-xs font-semibold text-[#161312] hover:bg-[#F49753] transition-colors disabled:opacity-50"
                >
                  {createProductMutation.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: ADD VARIANT MODIFIER ─────────────────────────────────── */}
      {isVariantModalOpen && targetProductForVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-[#EADED2] flex items-center gap-2 pb-4 border-b border-[#2C2724]/60">
              <Sparkles className="h-5 w-5 text-[#E28743]" />
              Modifiers: {targetProductForVariant.name}
            </h3>

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-medium text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateVariant} className="mt-5 space-y-4">
              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Attribute Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Size, Milk, Extra"
                  value={variantForm.attributeName}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      attributeName: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Attribute Value
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Large, Almond Milk, Double Shot"
                  value={variantForm.attributeValue}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      attributeValue: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Extra Charge Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={variantForm.extraPrice || ""}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      extraPrice: parseFloat(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#2C2724]/40">
                <button
                  type="button"
                  onClick={() => setIsVariantModalOpen(false)}
                  className="rounded-xl border border-[#2C2724] px-4 py-2.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVariantMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-[#E28743] px-5 py-2.5 text-xs font-semibold text-[#161312] hover:bg-[#F49753] transition-colors disabled:opacity-50"
                >
                  {createVariantMutation.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Add Modifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
