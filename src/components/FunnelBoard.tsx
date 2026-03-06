"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
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
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-surface-0 border border-brand-200/60 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-brand-400 hover:shadow-sm transition-colors group"
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
      className={`flex-shrink-0 w-64 rounded-2xl border transition-colors duration-200 ${
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

// ── Main FunnelBoard ──
export default function FunnelBoard({ projectId, links, investors, stages, onRefresh }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editNextAction, setEditNextAction] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // ── LOCAL STATE: the single source of truth for the board ──
  // Initialized from props. Updated locally on drag/drop. Synced to server in background.
  const [localLinks, setLocalLinks] = useState<ProjectInvestor[]>(links);
  const busyRef = useRef(false); // true during drag or pending add/remove

  // Sync from props ONLY on initial load or when data structurally changes
  // (e.g. new investors added externally). Never during active operations.
  useEffect(() => {
    if (!busyRef.current) {
      setLocalLinks(links);
    }
  }, [links]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const getInvestor = (id: string) => investors.find((i) => i.investor_id === id);

  const cardsByStage = useMemo(() => {
    return stages.map((stage) => ({
      stage,
      cards: localLinks
        .filter((l) => l.stage === stage)
        .sort((a, b) => a.position_index - b.position_index),
    }));
  }, [stages, localLinks]);

  // ── Persist a single card update to the server (fire-and-forget, no refresh) ──
  const persistToServer = useCallback((linkId: string, fields: Partial<ProjectInvestor>) => {
    api()
      .updateProjectInvestor({ link_id: linkId, ...fields })
      .catch((err) => {
        console.error("Failed to persist funnel change:", err);
      });
  }, []);

  // ── Stage change (dropdown or drag) ──
  const changeStage = useCallback((linkId: string, newStage: string) => {
    setLocalLinks((prev) => {
      const link = prev.find((l) => l.link_id === linkId);
      if (!link || link.stage === newStage) return prev;

      const targetCards = prev.filter((l) => l.stage === newStage && l.link_id !== linkId);
      const maxPos = targetCards.reduce((max, l) => Math.max(max, l.position_index), -1);
      const newPos = maxPos + 1;
      const today = new Date().toISOString().split("T")[0];

      // Persist to server
      persistToServer(linkId, { stage: newStage, position_index: newPos });

      return prev.map((l) =>
        l.link_id === linkId
          ? { ...l, stage: newStage, position_index: newPos, last_update: today }
          : l
      );
    });
  }, [persistToServer]);

  // ── DRAG HANDLERS ──

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    busyRef.current = true;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) { setOverStage(null); return; }

    const targetStage = resolveOverToStage(over.id as string, localLinks);
    setOverStage(targetStage || null);
    if (!targetStage) return;

    const activeLink = localLinks.find((l) => l.link_id === active.id);
    if (!activeLink || activeLink.stage === targetStage) return;

    // Cross-column move: move card to new column immediately
    setLocalLinks((prev) => {
      // Guard: check again inside updater to avoid stale state
      const current = prev.find((l) => l.link_id === active.id);
      if (!current || current.stage === targetStage) return prev;

      const targetCards = prev.filter((l) => l.stage === targetStage && l.link_id !== (active.id as string));
      const maxPos = targetCards.reduce((max, l) => Math.max(max, l.position_index), -1);
      return prev.map((l) =>
        l.link_id === active.id
          ? { ...l, stage: targetStage, position_index: maxPos + 1, last_update: new Date().toISOString().split("T")[0] }
          : l
      );
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverStage(null);
    busyRef.current = false;

    if (!over) return;

    const activeLink = localLinks.find((l) => l.link_id === active.id);
    if (!activeLink) return;

    const targetStage = resolveOverToStage(over.id as string, localLinks) || activeLink.stage;
    const overIsCard = !String(over.id).startsWith("stage:");

    // Same-column reorder
    if (overIsCard && active.id !== over.id) {
      const stageCards = localLinks
        .filter((l) => l.stage === targetStage)
        .sort((a, b) => a.position_index - b.position_index);

      const oldIndex = stageCards.findIndex((c) => c.link_id === active.id);
      const newIndex = stageCards.findIndex((c) => c.link_id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(stageCards, oldIndex, newIndex);

        setLocalLinks((prev) => prev.map((l) => {
          if (l.stage !== targetStage) return l;
          const idx = reordered.findIndex((c) => c.link_id === l.link_id);
          return idx >= 0 ? { ...l, position_index: idx } : l;
        }));

        // Persist the moved card's new position
        persistToServer(active.id as string, { position_index: newIndex });
        return;
      }
    }

    // Cross-column: already moved in handleDragOver — just persist
    // Find the card in current localLinks to get the final stage and position
    const movedCard = localLinks.find((l) => l.link_id === active.id);
    if (movedCard) {
      // Check if stage actually changed from original props
      const originalLink = links.find((l) => l.link_id === active.id);
      if (originalLink && originalLink.stage !== movedCard.stage) {
        persistToServer(active.id as string, {
          stage: movedCard.stage,
          position_index: movedCard.position_index,
        });
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverStage(null);
    busyRef.current = false;
    // Revert to server state
    setLocalLinks(links);
  };

  // ── Add investor ──
  const handleAddInvestor = async (investorId: string) => {
    setAddError(null);
    busyRef.current = true;

    const tempLinkId = `temp_${Date.now()}`;
    const firstStage = stages[0] || "Pipeline";
    const stageCards = localLinks.filter((l) => l.stage === firstStage);
    const maxPos = stageCards.reduce((max, l) => Math.max(max, l.position_index), -1);
    const tempLink: ProjectInvestor = {
      link_id: tempLinkId,
      project_id: projectId,
      investor_id: investorId,
      stage: firstStage,
      position_index: maxPos + 1,
      last_update: new Date().toISOString().split("T")[0],
      next_action: "",
      notes: "",
    };
    setLocalLinks((prev) => [...prev, tempLink]);

    try {
      const created = await api().createProjectInvestor({ project_id: projectId, investor_id: investorId });
      // Replace temp card with real server card
      setLocalLinks((prev) => prev.map((l) => l.link_id === tempLinkId ? created : l));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add investor";
      setAddError(message);
      // Remove temp card
      setLocalLinks((prev) => prev.filter((l) => l.link_id !== tempLinkId));
      throw err;
    } finally {
      busyRef.current = false;
    }
  };

  // ── Detail modal ──
  const openDetail = (link: ProjectInvestor) => {
    setShowDetail(link.link_id);
    setEditNotes(link.notes);
    setEditNextAction(link.next_action);
    setConfirmRemove(false);
  };

  const saveDetail = async () => {
    if (!showDetail) return;
    try {
      await api().updateProjectInvestor({ link_id: showDetail, notes: editNotes, next_action: editNextAction });
      setLocalLinks((prev) => prev.map((l) =>
        l.link_id === showDetail ? { ...l, notes: editNotes, next_action: editNextAction } : l
      ));
    } catch (err) {
      console.error("Failed to save detail:", err);
    }
    setShowDetail(null);
  };

  // ── Remove investor ──
  const removeInvestor = useCallback(async (linkId: string) => {
    busyRef.current = true;
    const backup = localLinks;

    setLocalLinks((prev) => prev.filter((l) => l.link_id !== linkId));
    setShowDetail(null);
    setConfirmRemove(false);

    try {
      await api().deleteProjectInvestor(linkId);
    } catch (err) {
      console.error("Failed to remove investor:", err);
      setLocalLinks(backup);
    } finally {
      busyRef.current = false;
    }
  }, [localLinks]);

  const detailLink = localLinks.find((l) => l.link_id === showDetail);
  const detailInvestor = detailLink ? getInvestor(detailLink.investor_id) : null;
  const activeLink = activeId ? localLinks.find((l) => l.link_id === activeId) : null;
  const activeInvestor = activeLink ? getInvestor(activeLink.investor_id) : null;
  const existingInvestorIds = useMemo(() => new Set(localLinks.map((l) => l.investor_id)), [localLinks]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">
          {localLinks.length} investor{localLinks.length !== 1 ? "s" : ""} in funnel
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}>
          {activeLink && (
            <DragOverlayCard link={activeLink} investor={activeInvestor || undefined} />
          )}
        </DragOverlay>
      </DndContext>

      {localLinks.length === 0 && (
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

      <InvestorPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        investors={investors}
        excludeIds={existingInvestorIds}
        onSelect={handleAddInvestor}
      />

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
