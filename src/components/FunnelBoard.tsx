"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import type { ProjectInvestor, Investor } from "@/types";
import Modal from "./Modal";
import InvestorPicker from "./InvestorPicker";

interface Props {
  projectId: string;
  links: ProjectInvestor[];
  investors: Investor[];
  stages: string[];
  onRefresh: () => Promise<void> | void;
}

// ── Sortable Card ──
function InvestorCard({
  link,
  investor,
  stages,
  onOpenDetail,
  onChangeStage,
}: {
  link: ProjectInvestor;
  investor?: Investor;
  stages: string[];
  onOpenDetail: (link: ProjectInvestor) => void;
  onChangeStage: (linkId: string, stage: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.link_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-surface-0 border border-brand-200/60 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-brand-400 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <p
          className="text-sm font-medium text-ink-800 cursor-pointer hover:text-brand-600 transition-colors"
          onClick={(e) => { e.stopPropagation(); onOpenDetail(link); }}
        >
          {investor?.investor_name || link.investor_id}
        </p>
      </div>
      {investor?.tags && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {investor.tags.split(";").filter(Boolean).slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md font-medium">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}
      {link.next_action && (
        <p className="text-xs text-brand-500 mt-1.5 truncate">Next: {link.next_action}</p>
      )}
      {link.last_update && (
        <p className="text-[10px] text-ink-400 mt-1">Updated {link.last_update}</p>
      )}
      <select
        value={link.stage}
        onChange={(e) => { e.stopPropagation(); onChangeStage(link.link_id, e.target.value); }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-2 w-full text-[10px] border border-brand-200 rounded-lg px-1.5 py-1 text-ink-600 bg-surface-50 hover:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-brand-500/40 cursor-pointer"
      >
        {stages.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

// ── Droppable Column ──
function StageColumn({
  stage,
  cards,
  investors,
  stages,
  isOver,
  onOpenDetail,
  onChangeStage,
}: {
  stage: string;
  cards: ProjectInvestor[];
  investors: Investor[];
  stages: string[];
  isOver: boolean;
  onOpenDetail: (link: ProjectInvestor) => void;
  onChangeStage: (linkId: string, stage: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `stage:${stage}` });
  const getInvestor = (id: string) => investors.find((i) => i.investor_id === id);

  // Stage-specific accent colors for column headers
  const stageAccent: Record<string, string> = {
    "Pipeline": "bg-brand-300/40 text-brand-700",
    "On Hold": "bg-amber-100 text-amber-700",
    "Trying to reach": "bg-blue-100 text-blue-700",
    "Active": "bg-emerald-100 text-emerald-700",
    "Advanced": "bg-purple-100 text-purple-700",
    "Declined": "bg-red-100 text-red-700",
  };

  return (
    <div
      className={`flex-shrink-0 w-64 rounded-2xl border transition-colors ${
        isOver ? "border-brand-500 bg-brand-100/40" : "border-brand-200/60 bg-surface-50"
      }`}
    >
      <div className="px-3.5 py-3 border-b border-brand-200/40">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${stageAccent[stage] || "bg-brand-100 text-brand-700"}`}>
            {stage}
          </span>
          <span className="text-xs text-ink-400 font-medium">{cards.length}</span>
        </div>
      </div>
      <div ref={setNodeRef} className="p-2 space-y-2 min-h-[120px]">
        <SortableContext items={cards.map((c) => c.link_id)} strategy={verticalListSortingStrategy}>
          {cards.map((link) => (
            <InvestorCard
              key={link.link_id}
              link={link}
              investor={getInvestor(link.investor_id)}
              stages={stages}
              onOpenDetail={onOpenDetail}
              onChangeStage={onChangeStage}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-ink-300 italic">Drop investors here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Overlay Card (while dragging) ──
function DragOverlayCard({ link, investor }: { link: ProjectInvestor; investor?: Investor }) {
  return (
    <div className="bg-surface-0 border-2 border-brand-500 rounded-xl p-3 shadow-lg w-64 opacity-90">
      <p className="text-sm font-medium text-ink-800">{investor?.investor_name || link.investor_id}</p>
      {investor?.tags && (
        <div className="flex flex-wrap gap-1 mt-1">
          {investor.tags.split(";").filter(Boolean).slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-md">{tag.trim()}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── helpers ──
function resolveOverToStage(overId: string, links: ProjectInvestor[]): string | undefined {
  if (typeof overId === "string" && overId.startsWith("stage:")) return overId.replace("stage:", "");
  return links.find((l) => l.link_id === overId)?.stage;
}

function applyStageMove(links: ProjectInvestor[], linkId: string, newStage: string): ProjectInvestor[] {
  const stageCards = links.filter((l) => l.stage === newStage && l.link_id !== linkId);
  const maxPos = stageCards.reduce((max, l) => Math.max(max, l.position_index), -1);
  return links.map((l) =>
    l.link_id === linkId
      ? { ...l, stage: newStage, position_index: maxPos + 1, last_update: new Date().toISOString().split("T")[0] }
      : l
  );
}

// ── Main FunnelBoard ──
export default function FunnelBoard({ projectId, links, investors, stages, onRefresh }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editNextAction, setEditNextAction] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Optimistic state — kept until next props arrive with fresh data
  const [optimisticLinks, setOptimisticLinks] = useState<ProjectInvestor[] | null>(null);
  const displayLinks = optimisticLinks || links;

  // Track pending background saves to avoid clearing optimistic state prematurely
  const pendingSaves = useRef(0);

  // When parent provides new links (from onRefresh), clear optimistic state if no saves pending
  const prevLinksRef = useRef(links);
  if (links !== prevLinksRef.current) {
    prevLinksRef.current = links;
    if (pendingSaves.current === 0) {
      // Fresh data arrived and nothing pending — trust server data
      if (optimisticLinks !== null) setOptimisticLinks(null);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const getInvestor = (id: string) => investors.find((i) => i.investor_id === id);

  const cardsByStage = useMemo(() => {
    return stages.map((stage) => ({
      stage,
      cards: displayLinks
        .filter((l) => l.stage === stage)
        .sort((a, b) => a.position_index - b.position_index),
    }));
  }, [stages, displayLinks]);

  const [overStage, setOverStage] = useState<string | null>(null);

  // Fire-and-forget: persist change to server + background refresh. Revert on error.
  const persistStageChange = useCallback((linkId: string, newStage: string, positionIndex: number, snapshotBeforeChange: ProjectInvestor[]) => {
    pendingSaves.current += 1;
    api()
      .updateProjectInvestor({ link_id: linkId, stage: newStage, position_index: positionIndex })
      .then(() => onRefresh())
      .catch((err) => {
        console.error("Failed to update stage:", err);
        // Revert to snapshot before this change
        setOptimisticLinks(snapshotBeforeChange);
      })
      .finally(() => {
        pendingSaves.current -= 1;
      });
  }, [onRefresh]);

  const persistReorder = useCallback((linkId: string, newIndex: number, snapshotBeforeChange: ProjectInvestor[]) => {
    pendingSaves.current += 1;
    api()
      .updateProjectInvestor({ link_id: linkId, position_index: newIndex })
      .then(() => onRefresh())
      .catch((err) => {
        console.error("Failed to reorder:", err);
        setOptimisticLinks(snapshotBeforeChange);
      })
      .finally(() => {
        pendingSaves.current -= 1;
      });
  }, [onRefresh]);

  // Stage change via dropdown (on card or in detail modal)
  const changeStage = useCallback((linkId: string, newStage: string) => {
    const currentLinks = optimisticLinks || links;
    const link = currentLinks.find((l) => l.link_id === linkId);
    if (!link || link.stage === newStage) return;

    const snapshotBeforeChange = currentLinks;
    const updated = applyStageMove(currentLinks, linkId, newStage);
    setOptimisticLinks(updated);

    const movedCard = updated.find((l) => l.link_id === linkId)!;
    persistStageChange(linkId, newStage, movedCard.position_index, snapshotBeforeChange);
  }, [links, optimisticLinks, persistStageChange]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) { setOverStage(null); return; }

    const currentLinks = optimisticLinks || links;
    const targetStage = resolveOverToStage(over.id as string, currentLinks);
    setOverStage(targetStage || null);

    if (!targetStage) return;

    const activeLink = currentLinks.find((l) => l.link_id === active.id);
    if (!activeLink || activeLink.stage === targetStage) return;

    // Optimistically move the card to the target column during the drag
    const updated = applyStageMove(currentLinks, active.id as string, targetStage);
    setOptimisticLinks(updated);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverStage(null);

    if (!over) return;

    const currentLinks = optimisticLinks || links;
    const activeLink = currentLinks.find((l) => l.link_id === active.id);
    if (!activeLink) return;

    const targetStage = resolveOverToStage(over.id as string, currentLinks) || activeLink.stage;

    // The card was already moved optimistically during handleDragOver if cross-column.
    // We need to check if the card's current (optimistic) stage matches the final target.
    const snapshotBeforeChange = links; // original server state for revert

    if (activeLink.stage === targetStage) {
      // Same-column drop: check for reorder
      const overIsCard = !String(over.id).startsWith("stage:");
      if (!overIsCard) return; // dropped on column background, no reorder

      const stageCards = currentLinks
        .filter((l) => l.stage === targetStage)
        .sort((a, b) => a.position_index - b.position_index);

      const oldIndex = stageCards.findIndex((c) => c.link_id === active.id);
      const newIndex = stageCards.findIndex((c) => c.link_id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(stageCards, oldIndex, newIndex);
        const updated = currentLinks.map((l) => {
          if (l.stage !== targetStage) return l;
          const idx = reordered.findIndex((c) => c.link_id === l.link_id);
          return idx >= 0 ? { ...l, position_index: idx } : l;
        });
        setOptimisticLinks(updated);
        persistReorder(active.id as string, newIndex, snapshotBeforeChange);
      }
    } else {
      // Cross-column: card was already moved during dragOver, just persist
      const movedCard = currentLinks.find((l) => l.link_id === active.id);
      if (movedCard) {
        persistStageChange(active.id as string, targetStage, movedCard.position_index, snapshotBeforeChange);
      }
    }
  };

  const [addError, setAddError] = useState<string | null>(null);

  const handleAddInvestor = async (investorId: string) => {
    setAddError(null);

    // Optimistic: immediately add a card in the first stage
    const tempLinkId = `temp_${Date.now()}`;
    const firstStage = stages[0] || "Pipeline";
    const currentLinks = optimisticLinks || links;
    const stageCards = currentLinks.filter((l) => l.stage === firstStage);
    const maxPos = stageCards.reduce((max, l) => Math.max(max, l.position_index), -1);
    const optimisticLink: ProjectInvestor = {
      link_id: tempLinkId,
      project_id: projectId,
      investor_id: investorId,
      stage: firstStage,
      position_index: maxPos + 1,
      last_update: new Date().toISOString().split("T")[0],
      next_action: "",
      notes: "",
    };
    setOptimisticLinks([...currentLinks, optimisticLink]);

    try {
      pendingSaves.current += 1;
      await api().createProjectInvestor({ project_id: projectId, investor_id: investorId });
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add investor";
      setAddError(message);
      setOptimisticLinks(null);
      throw err;
    } finally {
      pendingSaves.current -= 1;
      setOptimisticLinks(null);
    }
  };

  const openDetail = (link: ProjectInvestor) => {
    setShowDetail(link.link_id);
    setEditNotes(link.notes);
    setEditNextAction(link.next_action);
    setConfirmRemove(false);
  };

  const saveDetail = async () => {
    if (!showDetail) return;
    await api().updateProjectInvestor({ link_id: showDetail, notes: editNotes, next_action: editNextAction });
    setShowDetail(null);
    onRefresh();
  };

  const [confirmRemove, setConfirmRemove] = useState(false);

  const removeInvestor = useCallback(async (linkId: string) => {
    const currentLinks = optimisticLinks || links;
    const snapshotBeforeChange = currentLinks;

    // Optimistic: remove immediately
    setOptimisticLinks(currentLinks.filter((l) => l.link_id !== linkId));
    setShowDetail(null);
    setConfirmRemove(false);

    pendingSaves.current += 1;
    try {
      await api().deleteProjectInvestor(linkId);
      // Delete succeeded — try refreshing data but never revert on refresh failure
      try {
        await onRefresh();
      } catch (refreshErr) {
        console.warn("Refresh after remove failed (investor was deleted):", refreshErr);
      }
      // Clear optimistic state so we show server data
      setOptimisticLinks(null);
    } catch (err) {
      // Only revert if the DELETE itself failed
      console.error("Failed to remove investor:", err);
      setOptimisticLinks(snapshotBeforeChange);
    } finally {
      pendingSaves.current -= 1;
    }
  }, [links, optimisticLinks, onRefresh]);

  const detailLink = displayLinks.find((l) => l.link_id === showDetail);
  const detailInvestor = detailLink ? getInvestor(detailLink.investor_id) : null;
  const activeLink = activeId ? displayLinks.find((l) => l.link_id === activeId) : null;
  const activeInvestor = activeLink ? getInvestor(activeLink.investor_id) : null;
  const existingInvestorIds = useMemo(() => new Set(displayLinks.map((l) => l.investor_id)), [displayLinks]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">
          {displayLinks.length} investor{displayLinks.length !== 1 ? "s" : ""} in funnel
        </p>
        <button
          onClick={() => setShowPicker(true)}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
        >
          + Add Investor
        </button>
      </div>

      {addError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{addError}</p>
          <button onClick={() => setAddError(null)} className="text-red-400 hover:text-red-600 text-xs font-medium ml-4">Dismiss</button>
        </div>
      )}

      {/* Kanban board with dnd-kit */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 funnel-scroll">
          {cardsByStage.map(({ stage, cards }) => (
            <StageColumn
              key={stage}
              stage={stage}
              cards={cards}
              investors={investors}
              stages={stages}
              isOver={overStage === stage}
              onOpenDetail={openDetail}
              onChangeStage={changeStage}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLink && (
            <DragOverlayCard link={activeLink} investor={activeInvestor || undefined} />
          )}
        </DragOverlay>
      </DndContext>

      {displayLinks.length === 0 && (
        <div className="mt-4 text-center py-12 bg-surface-50 rounded-2xl border border-dashed border-brand-300">
          <p className="text-ink-400 text-sm mb-2">No investors yet</p>
          <button
            onClick={() => setShowPicker(true)}
            className="text-sm text-brand-500 hover:text-brand-700 font-medium transition-colors"
          >
            Add from directory
          </button>
        </div>
      )}

      {/* Investor Picker */}
      <InvestorPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        investors={investors}
        excludeIds={existingInvestorIds}
        onSelect={handleAddInvestor}
      />

      {/* Detail modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={detailInvestor?.investor_name || "Investor Details"}>
        {detailLink && detailInvestor && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Stage</p>
              <select
                value={detailLink.stage}
                onChange={(e) => { changeStage(detailLink.link_id, e.target.value); }}
                className="w-full border border-brand-200 rounded-xl px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {stages.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {detailInvestor.tags && (
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {detailInvestor.tags.split(";").filter(Boolean).map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-brand-100 text-brand-600 rounded-lg">{tag.trim()}</span>
                  ))}
                </div>
              </div>
            )}
            {detailInvestor.email && (
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm text-ink-700">{detailInvestor.email}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">Last Updated</p>
              <p className="text-sm text-ink-700">{detailLink.last_update || "N/A"}</p>
            </div>
            <div>
              <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Next Action</label>
              <input
                type="text"
                value={editNextAction}
                onChange={(e) => setEditNextAction(e.target.value)}
                className="w-full border border-brand-200 rounded-xl px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="e.g. Send follow-up email"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-400 uppercase tracking-wide mb-1">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full border border-brand-200 rounded-xl px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-brand-200/40">
              {!confirmRemove ? (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Remove from funnel
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Are you sure?</span>
                  <button
                    onClick={() => removeInvestor(detailLink.link_id)}
                    className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Yes, remove
                  </button>
                  <button
                    onClick={() => setConfirmRemove(false)}
                    className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-700 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowDetail(null); setConfirmRemove(false); }} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">Cancel</button>
                <button onClick={saveDetail} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium">Save</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
