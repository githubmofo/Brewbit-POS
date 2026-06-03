"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Filter,
  RefreshCw,
  Download,
  Printer,
  User,
  Clock,
  ShoppingBag,
  Calendar,
} from "lucide-react";
import { cn } from "@web/lib/utils";

interface DropdownOption {
  id: string;
  name?: string;
  label?: string;
}

interface ReportFiltersProps {
  cashiers: DropdownOption[];
  sessions: { id: string; label: string }[];
  products: DropdownOption[];
}

export function ReportFilters({
  cashiers,
  sessions,
  products,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state initialized from URL parameters
  const [userId, setUserId] = useState(searchParams.get("userId") || "");
  const [sessionId, setSessionId] = useState(
    searchParams.get("sessionId") || "",
  );
  const [productId, setProductId] = useState(
    searchParams.get("productId") || "",
  );
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || "",
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  // Apply filters by pushing them onto the URL query string
  const handleApplyFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      if (sessionId) params.set("sessionId", sessionId);
      if (productId) params.set("productId", productId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      router.push(`?${params.toString()}`);
    });
  };

  // Clear all query parameter filters
  const handleClearFilters = () => {
    setUserId("");
    setSessionId("");
    setProductId("");
    setStartDate("");
    setEndDate("");

    startTransition(() => {
      router.push("?");
    });
  };

  // Zero-dependency table scraper to export filtered grids as Excel-compatible CSV sheets
  const handleExportCSV = () => {
    const tables = document.querySelectorAll("table");
    if (!tables.length) {
      alert("No data available to export.");
      return;
    }

    let csvContent = "";

    tables.forEach((table, index) => {
      const titleElement = table
        .closest("div")
        ?.previousElementSibling?.querySelector("h3");
      const title = titleElement?.textContent || `Report Section ${index + 1}`;

      csvContent += `"${title.toUpperCase()}"\n`;

      const rows = table.querySelectorAll("tr");
      rows.forEach((row) => {
        const line: string[] = [];
        const cells = row.querySelectorAll("th, td");

        cells.forEach((cell) => {
          let text = cell.textContent || "";
          // Strip currency symbols, commas, and excess whitespace
          text = text.replace(/₹/g, "INR ").replace(/"/g, '""').trim();
          line.push(`"${text}"`);
        });

        csvContent += line.join(",") + "\n";
      });
      csvContent += "\n\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `brewbit_pos_ledger_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger high-fidelity browser-native print formatting
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="rounded-2xl border border-[#2C2724] bg-[#161312] p-5 shadow-lg space-y-4 print:hidden select-none">
      {/* Label and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#2C2724]/60 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4.5 w-4.5 text-[#E28743]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#EADED2]">
            Filter Analytics
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-1.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors cursor-pointer"
            title="Download CSV Spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-[#E28743]" />
            Export XLS
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-1.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors cursor-pointer"
            title="Print PDF Report"
          >
            <Printer className="w-3.5 h-3.5 text-[#E28743]" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters Form Row */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 pt-1">
        {/* Cashier Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72] flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#E28743]/60" />
            Cashier
          </label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-2 text-xs text-[#EADED2] focus:border-[#E28743] focus:outline-none cursor-pointer"
          >
            <option value="">All Cashiers</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sessions Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72] flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#E28743]/60" />
            Shift Drawer
          </label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-2 text-xs text-[#EADED2] focus:border-[#E28743] focus:outline-none cursor-pointer"
          >
            <option value="">All Shifts</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Product Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72] flex items-center gap-1.5">
            <ShoppingBag className="w-3 h-3 text-[#E28743]/60" />
            Contains Menu Item
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-2 text-xs text-[#EADED2] focus:border-[#E28743] focus:outline-none cursor-pointer"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72] flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#E28743]/60" />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-1.5 text-xs text-[#EADED2] focus:border-[#E28743] focus:outline-none cursor-pointer scheme-dark"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E7E72] flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#E28743]/60" />
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3 py-1.5 text-xs text-[#EADED2] focus:border-[#E28743] focus:outline-none cursor-pointer scheme-dark"
          />
        </div>
      </div>

      {/* Actions row */}
      <div className="flex justify-end gap-2.5 pt-2">
        <button
          onClick={handleClearFilters}
          className="rounded-lg border border-[#2C2724] px-4 py-2 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors cursor-pointer"
        >
          Reset Filters
        </button>
        <button
          onClick={handleApplyFilters}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[#E28743] px-5 py-2 text-xs font-bold text-[#161312] hover:bg-[#F49753] transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-[#E28743]/10"
        >
          {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          Apply Filters
        </button>
      </div>
    </div>
  );
}
