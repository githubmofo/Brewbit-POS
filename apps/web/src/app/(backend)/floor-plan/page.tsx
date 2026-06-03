"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { trpc } from "@web/lib/trpc-client";
import {
  MapPin,
  Plus,
  Layers,
  Save,
  Loader2,
  Move,
  Layout,
  PlusCircle,
  AlertTriangle,
  Compass,
  Trash2,
  Edit2,
  Users,
} from "lucide-react";
import { createFloorSchema, createTableSchema, updateTableSchema } from "@pos/validators";
import { cn } from "@web/lib/utils";

interface TablePositionState {
  id: string;
  label: string;
  seats: number;
  positionX: number;
  positionY: number;
}

export default function FloorPlanPage() {
  const utils = trpc.useUtils();

  // ─── QUERY & MUTATIONS ──────────────────────────────────────────────────────
  const { data: floors = [], isLoading: loadingFloors } =
    trpc.floor.list.useQuery();

  const createFloorMutation = trpc.floor.create.useMutation({
    onSuccess: () => {
      utils.floor.list.invalidate();
      setIsFloorModalOpen(false);
      setFloorName("");
    },
    onError: (err) => setFormError(err.message),
  });

  const createTableMutation = trpc.table.create.useMutation({
    onSuccess: () => {
      utils.floor.list.invalidate();
      setIsTableModalOpen(false);
      resetTableForm();
    },
    onError: (err) => setFormError(err.message),
  });

  const updateTableMutation = trpc.table.update.useMutation();

  const deleteTableMutation = trpc.table.delete.useMutation({
    onSuccess: () => {
      utils.floor.list.invalidate();
    },
    onError: (err) => setFormError(err.message),
  });

  // ─── LOCAL STATE ────────────────────────────────────────────────────────────
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isEditingPositions, setIsEditingPositions] = useState(false);

  // Form states
  const [floorName, setFloorName] = useState("");
  const [tableForm, setTableForm] = useState({ id: "", label: "", seats: 4 });
  const [formError, setFormError] = useState<string | null>(null);

  // Drag states
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tempTables, setTempTables] = useState<TablePositionState[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [savingPositions, setSavingPositions] = useState(false);

  // Set default floor selection on fetch
  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0]?.id || null);
    }
  }, [floors, selectedFloorId]);

  // Sync tables to local drag states when selected floor changes
  const activeFloor = floors.find((f) => f.id === selectedFloorId);
  useEffect(() => {
    if (activeFloor?.tables) {
      setTempTables(
        activeFloor.tables.map((t) => ({
          id: t.id,
          label: t.label,
          seats: t.seats,
          positionX: t.positionX,
          positionY: t.positionY,
        })),
      );
    } else {
      setTempTables([]);
    }
  }, [activeFloor, selectedFloorId]);

  // ─── FORM SUBMISSIONS ───────────────────────────────────────────────────────
  const handleCreateFloor = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = { name: floorName, sortOrder: floors.length };
    const result = createFloorSchema.safeParse(payload);
    if (!result.success) {
      setFormError(result.error.errors[0]?.message || "Validation failed.");
      return;
    }

    createFloorMutation.mutate(payload);
  };

  const resetTableForm = () => {
    setTableForm({ id: "", label: "", seats: 4 });
    setFormError(null);
  };

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloorId) return;
    setFormError(null);

    if (tableForm.id) {
      // Editing existing table
      const payload = {
        id: tableForm.id,
        label: tableForm.label,
        seats: tableForm.seats,
      };
      
      const result = updateTableSchema.safeParse(payload);
      if (!result.success) {
        setFormError(result.error.errors[0]?.message || "Validation failed.");
        return;
      }
      
      updateTableMutation.mutate(payload, {
        onSuccess: () => {
          utils.floor.list.invalidate();
          setIsTableModalOpen(false);
          resetTableForm();
        },
        onError: (err) => setFormError(err.message),
      });
      return;
    }

    const payload = {
      floorId: selectedFloorId,
      label: tableForm.label,
      seats: tableForm.seats,
      // Place new table in center by default
      positionX: 50,
      positionY: 50,
    };

    const result = createTableSchema.safeParse(payload);
    if (!result.success) {
      setFormError(
        result.error.errors[0]?.message || "Validation check failed.",
      );
      return;
    }

    createTableMutation.mutate(payload);
  };

  const handleEditTable = (table: any) => {
    setTableForm({
      id: table.id,
      label: table.label,
      seats: table.seats,
    });
    setIsTableModalOpen(true);
  };

  const handleDeleteTable = (id: string) => {
    if (confirm("Are you sure you want to delete this table?")) {
      deleteTableMutation.mutate({ id });
    }
  };

  // ─── DRAG & DROP POSITIONING ────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (id: string) => {
      if (!isEditingPositions) return;
      setActiveDragId(id);
    },
    [isEditingPositions],
  );

  const dragFrameRef = useRef<number | null>(null);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeDragId || !canvasRef.current) return;

    if (dragFrameRef.current) {
      cancelAnimationFrame(dragFrameRef.current);
    }

    const clientX = e.clientX;
    const clientY = e.clientY;

    dragFrameRef.current = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();

      // Calculate cursor percentage coordinates inside canvas boundary
      let pctX = ((clientX - rect.left) / rect.width) * 100;
      let pctY = ((clientY - rect.top) / rect.height) * 100;

      // Constrain percentages to canvas bounds [5%, 95%] to keep tables within viewport
      pctX = Math.max(5, Math.min(95, pctX));
      pctY = Math.max(5, Math.min(95, pctY));

      setTempTables((prev) =>
        prev.map((t) =>
          t.id === activeDragId
            ? {
                ...t,
                positionX: Number(pctX.toFixed(2)),
                positionY: Number(pctY.toFixed(2)),
              }
            : t,
        ),
      );
    });
  };

  const handleDropOnCanvas = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData("tableId");
    if (!tableId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let pctX = ((e.clientX - rect.left) / rect.width) * 100;
    let pctY = ((e.clientY - rect.top) / rect.height) * 100;

    pctX = Math.max(5, Math.min(95, pctX));
    pctY = Math.max(5, Math.min(95, pctY));

    setTempTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              positionX: Number(pctX.toFixed(2)),
              positionY: Number(pctY.toFixed(2)),
            }
          : t,
      ),
    );
    setIsEditingPositions(true);
  };

  const handleBringToCenter = (tableId: string) => {
    setTempTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              positionX: 50,
              positionY: 50,
            }
          : t,
      ),
    );
    setIsEditingPositions(true);
  };

  const handleDragEnd = () => {
    if (dragFrameRef.current) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    setActiveDragId(null);
  };

  useEffect(() => {
    return () => {
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
      }
    };
  }, []);

  const handleSavePositions = async () => {
    setSavingPositions(true);
    try {
      // Save all updated table coordinates in parallel
      await Promise.all(
        tempTables.map((table) =>
          updateTableMutation.mutateAsync({
            id: table.id,
            positionX: table.positionX,
            positionY: table.positionY,
          }),
        ),
      );
      utils.floor.list.invalidate();
      setIsEditingPositions(false);
    } catch (err) {
      console.error("Failed to save layout coordinates:", err);
    } finally {
      setSavingPositions(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Board */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#2C2724] pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#EADED2]">
            Floor Plan setup
          </h2>
          <p className="text-sm text-[#8E7E72] mt-1">
            Configure layout maps, drag dining tables, and set seat numbers.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsFloorModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[#2C2724] bg-[#1E1A18] px-4 py-2.5 text-sm font-semibold text-[#CBB9A8] transition-all hover:bg-[#25201E] hover:text-[#EADED2] active:scale-98"
          >
            <Layers className="h-4 w-4 text-[#E28743]" />
            New Floor
          </button>

          {selectedFloorId && (
            <button
              onClick={() => {
                resetTableForm();
                setIsTableModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-[#2C2724] bg-[#1E1A18] px-4 py-2.5 text-sm font-semibold text-[#CBB9A8] transition-all hover:bg-[#25201E] hover:text-[#EADED2] active:scale-98"
            >
              <PlusCircle className="h-4 w-4 text-[#E28743]" />
              New Table
            </button>
          )}

          {tempTables.length > 0 && (
            <button
              onClick={() => {
                if (isEditingPositions) {
                  handleSavePositions();
                } else {
                  setIsEditingPositions(true);
                }
              }}
              disabled={savingPositions}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all active:scale-98 ${
                isEditingPositions
                  ? "bg-[#E28743] text-[#161312] shadow-lg shadow-[#E28743]/10"
                  : "border border-[#2C2724] bg-[#25201E] text-[#EADED2] hover:bg-[#2C2724]"
              }`}
            >
              {savingPositions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditingPositions ? (
                <Save className="h-4 w-4" />
              ) : (
                <Move className="h-4 w-4" />
              )}
              {isEditingPositions ? "Save Layout" : "Edit Positions"}
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Floor Selection Tabs */}
      {loadingFloors ? (
        <div className="flex h-10 w-64 items-center bg-[#161312] border border-[#2C2724] rounded-lg animate-pulse" />
      ) : floors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C2724] bg-[#161312] py-16 text-center">
          <Layout className="h-10 w-10 text-[#8E7E72] mb-3" />
          <h3 className="text-base font-semibold text-[#EADED2]">
            No Dining Floors Found
          </h3>
          <p className="text-sm text-[#8E7E72] mt-1">
            Get started by creating a new restaurant floor room layout (e.g.
            Ground Floor).
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 items-center border-b border-[#2C2724]/40 pb-4">
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => {
                setSelectedFloorId(floor.id);
                setIsEditingPositions(false); // reset edit state
              }}
              className={`rounded-xl px-4.5 py-2.5 text-sm font-semibold border transition-all ${
                selectedFloorId === floor.id
                  ? "bg-[#25201E] text-[#EADED2] border-[#E28743]/50 shadow-inner"
                  : "bg-[#1E1A18] text-[#8E7E72] border-[#2C2724] hover:text-[#CBB9A8]"
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>
      )}

      {/* ─── VISUAL 2D CAD CANVAS & LIST CARDS SIDE-BY-SIDE ─────────────────────────────── */}
      {selectedFloorId && floors.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* MAP VIEW */}
          <div className="flex-1 space-y-3">
            {isEditingPositions && (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E28743] bg-[#E28743]/5 border border-[#E28743]/15 rounded-xl px-4.5 py-3 w-fit animate-pulse">
                <Move className="h-4 w-4 shrink-0" />
                Interactive Drag Active: Left-click and hold tables to drag them
                across the canvas grid.
              </div>
            )}

            <div
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnCanvas}
              className={`relative h-[480px] w-full rounded-2xl border bg-[#141211] overflow-hidden shadow-2xl transition-all duration-300 ${
                isEditingPositions
                  ? "border-[#E28743]/35 cursor-crosshair"
                  : "border-[#2C2724]"
              }`}
              style={{
                backgroundImage:
                  "radial-gradient(#2C2724 1.2px, transparent 1.2px)",
                backgroundSize: "24px 24px",
              }}
            >
              {tempTables.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/20">
                  <MapPin className="h-8 w-8 text-[#8E7E72] mb-2 opacity-50" />
                  <h4 className="text-sm font-bold text-[#EADED2]">
                    Empty Floor Map
                  </h4>
                  <p className="text-xs text-[#8E7E72] mt-1 max-w-xs">
                    Taps &quot;New Table&quot; above to place tables on this
                    blueprint.
                  </p>
                </div>
              ) : (
                tempTables.map((table) => (
                  <MemoizedTable
                    key={table.id}
                    table={table}
                    isEditingPositions={isEditingPositions}
                    isActiveDrag={table.id === activeDragId}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
            </div>
          </div>

          {/* LIST CARDS SIDEBAR */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 overflow-y-auto max-h-[480px] pr-2 custom-scrollbar">
            <div className="text-3xs font-extrabold text-[#8E7E72] uppercase tracking-widest bg-[#1E1A18] px-3 py-2 rounded-lg border border-[#2C2724]/40">
              💡 Drag & drop any table below onto the map!
            </div>
            {tempTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C2724] bg-[#161312] py-20 text-center">
                <Layout className="h-10 w-10 text-[#8E7E72] mb-3" />
                <h3 className="text-base font-semibold text-[#EADED2]">
                  No Dining Tables Placed
                </h3>
                <p className="text-sm text-[#8E7E72] mt-1 max-w-xs">
                  Click &quot;New Table&quot; to add tables to this floor.
                </p>
              </div>
            ) : (
              tempTables.map((table) => {
                const isOffScreen =
                  table.positionX < 0 ||
                  table.positionX > 100 ||
                  table.positionY < 0 ||
                  table.positionY > 100;

                return (
                  <div
                    key={table.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("tableId", table.id);
                    }}
                    className={cn(
                      "relative rounded-2xl border bg-[#161312] p-4 flex flex-col justify-between transition-all duration-200 border-[#2C2724] hover:border-[#E28743]/40 hover:shadow-lg cursor-grab active:cursor-grabbing",
                      isOffScreen && "border-amber-500/20 bg-[#1A1814]"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-black text-[#EADED2]">
                          {table.label}
                        </h3>
                        {isOffScreen && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Off-Map
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[#8E7E72] font-semibold text-3xs uppercase tracking-wider">
                        <Users className="h-3 w-3 text-[#8E7E72]/60" />
                        {table.seats} Seats
                      </div>
                      <div className="flex items-center gap-1.5 text-[#8E7E72] font-semibold text-4xs uppercase tracking-wider mt-2">
                        X: {Math.round(table.positionX)}% | Y: {Math.round(table.positionY)}%
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#2C2724]/40 pt-3">
                      <div>
                        {isOffScreen ? (
                          <button
                            onClick={() => handleBringToCenter(table.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[#E28743] hover:bg-[#F49753] text-[9px] font-bold text-[#161312] transition-colors"
                          >
                            <Move className="w-2.5 h-2.5" />
                            Place at Center
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBringToCenter(table.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded border border-[#2C2724] hover:bg-[#25201E] text-[9px] font-bold text-[#CBB9A8] transition-colors"
                            title="Recenter Table"
                          >
                            Recenter
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditTable(table)}
                          className="p-1.5 rounded-lg text-[#8E7E72] hover:text-[#EADED2] hover:bg-[#25201E] transition-colors"
                          title="Edit Table"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete Table"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: ADD FLOOR ───────────────────────────────────────────── */}
      {isFloorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-[#EADED2] flex items-center gap-2 pb-4 border-b border-[#2C2724]/60">
              <Layers className="h-5 w-5 text-[#E28743]" />
              New Dining Floor Room
            </h3>

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-medium text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateFloor} className="mt-5 space-y-4">
              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Floor Room Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ground Floor, Rooftop Terrace"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#2C2724]/40">
                <button
                  type="button"
                  onClick={() => setIsFloorModalOpen(false)}
                  className="rounded-xl border border-[#2C2724] px-4 py-2.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFloorMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-[#E28743] px-5 py-2.5 text-xs font-semibold text-[#161312] hover:bg-[#F49753] transition-colors disabled:opacity-50"
                >
                  {createFloorMutation.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Create Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADD / EDIT TABLE ───────────────────────────────────────────── */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C2724] bg-[#161312] p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-[#EADED2] flex items-center gap-2 pb-4 border-b border-[#2C2724]/60">
              <MapPin className="h-5 w-5 text-[#E28743]" />
              {tableForm.id ? "Edit Dining Table" : "New Dining Table"}
            </h3>

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-medium text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTable} className="mt-5 space-y-4">
              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Table Label / Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 01, Lounge T2"
                  value={tableForm.label}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, label: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] placeholder-[#8E7E72] focus:border-[#E28743] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-[#8E7E72] block mb-1.5">
                  Number of Seats
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={tableForm.seats}
                  onChange={(e) =>
                    setTableForm({
                      ...tableForm,
                      seats: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-[#2C2724] bg-[#1E1A18] px-3.5 py-2.5 text-sm text-[#EADED2] focus:border-[#E28743] focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#2C2724]/40">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="rounded-xl border border-[#2C2724] px-4 py-2.5 text-xs font-semibold text-[#8E7E72] hover:text-[#CBB9A8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTableMutation.isPending || updateTableMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-[#E28743] px-5 py-2.5 text-xs font-semibold text-[#161312] hover:bg-[#F49753] transition-colors disabled:opacity-50"
                >
                  {(createTableMutation.isPending || updateTableMutation.isPending) && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {tableForm.id ? "Save Changes" : "Place Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface MemoizedTableProps {
  table: TablePositionState;
  isEditingPositions: boolean;
  isActiveDrag: boolean;
  onDragStart: (id: string) => void;
}

const MemoizedTable = memo(function MemoizedTable({
  table,
  isEditingPositions,
  isActiveDrag,
  onDragStart,
}: MemoizedTableProps) {
  return (
    <div
      onMouseDown={() => onDragStart(table.id)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl flex flex-col items-center justify-center p-3 text-center border transition-all duration-200 select-none shadow-md ${
        isEditingPositions
          ? "cursor-grab active:cursor-grabbing hover:scale-105"
          : ""
      } ${
        isActiveDrag
          ? "border-[#E28743] bg-[#E28743]/10 scale-110 shadow-lg shadow-[#E28743]/10 z-30"
          : "border-[#2C2724] bg-[#1E1A18] hover:border-[#8E7E72]"
      }`}
      style={{
        left: `${table.positionX}%`,
        top: `${table.positionY}%`,
        width: `${64 + table.seats * 8}px`,
        height: `${64 + table.seats * 8}px`,
      }}
    >
      <span className="text-xs font-extrabold text-[#EADED2]">
        {table.label}
      </span>
      <span className="text-3xs font-semibold text-[#8E7E72] uppercase tracking-wider mt-0.5">
        {table.seats} Seats
      </span>
      {isEditingPositions && (
        <span className="absolute -bottom-6 bg-[#161312] border border-[#2C2724] rounded px-1.5 py-0.5 text-4xs font-semibold text-[#8E7E72] uppercase tracking-widest whitespace-nowrap">
          x: {Math.round(table.positionX)}% y: {Math.round(table.positionY)}%
        </span>
      )}
    </div>
  );
});
