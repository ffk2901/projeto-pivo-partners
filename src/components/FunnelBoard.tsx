"use client";

import { useState, useMemo, useRef, useCallback } from "react";
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
import type { ProjectInvestor, Investor, TeamMember, ProjectNote, Task, Meeting } from "@/types";
import { getFollowUpStatus, FOLLOW_UP_STATUS_CONFIG, getStalledStatus } from "@/types";
import InvestorPicker from "./InvestorPicker";

interface Props {
  projectId: string;
  links: ProjectInvestor[];
  investors: Investor[];
  stages: string[];
  team: TeamMember[];
  notes: ProjectNote[];
  tasks: Task[];
  meetings: Meeting[];
  onRefresh: () => Promise<void> | void;
  onOpenDrawer: (link: ProjectInvestor) => void;
}

// ── Sortable Card (Clean Design) ──
function InvestorCard({
  link,
  investor,
  team,
  noteCount,
  taskCount,
  meetingCount,
  onOpenDrawer,
}: {
  link: ProjectInvestor;
  investor?: Investor;
  team: TeamMember[];
  noteCount: number;
  taskCount: number;
  meetingCount: number;
  onOpenDrawer: (link: ProjectInvestor) => void;
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
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0 : 1,
  };

  const followUpStatus = getFollowUpStatus(link);
  const isStalled = getStalledStatus(link);
  const statusConfig = FOLLOW_UP_STATUS_CONFIG[followUpStatus];
  const owner = team.find((m) => m.team_id === link.owner_id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-surface-0 border border-brand-200/60 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-brand-400 hover:shadow-sm transition-colors group"
    >
      {/* Click target for opening drawer */}
      <div
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onOpenDrawer(link); }}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-ink-800 hover:text-brand-600 transition-colors">
            {investor?.investor_name || link.investor_id}
          </p>
          {link.priority === "high" && (
            <span className="text-[8px] px-1 py-0.5 bg-red-100 text-red-600 rounded font-bold flex-shrink-0 ml-1">HIGH</span>
          )}
        </div>

        {/* Tags + Origin + Wave badges */}
        <div className="flex items-center gap-1 flex-wrap mt-0.5">
          {investor?.tags && (
            <span className="text-[10px] text-brand-500 font-medium">
              {investor.tags.split(";").filter(Boolean)[0]?.trim()}
            </span>
          )}
          {investor?.origin === "br" && (
            <span className="text-[8px] px-1 py-0.5 bg-green-100 text-green-700 rounded font-semibold">BR</span>
          )}
          {investor?.origin === "intl" && (
            <span className="text-[8px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">INTL</span>
          )}
          {link.wave && (() => {
            const waveColors: Record<string, string> = {
              "1": "bg-brand-100 text-brand-600",
              "2": "bg-blue-100 text-blue-600",
              "3": "bg-purple-100 text-purple-600",
              "4": "bg-amber-100 text-amber-600",
            };
            return (
              <span className={`text-[8px] px-1 py-0.5 rounded font-semibold ${waveColors[link.wave] || "bg-brand-100 text-brand-600"}`}>
                W{link.wave}
              </span>
            );
          })()}
        </div>

        {/* Owner */}
        {owner && (
          <p className="text-[10px] text-ink-400 mt-1">{owner.name}</p>
        )}

        {/* Next step */}
        {(link.next_step || link.next_action) && (
          <p className="text-[10px] text-brand-500 mt-1 truncate">
            Next: {link.next_step || link.next_action}
          </p>
        )}

        {/* Follow-up date and status badge */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {link.follow_up_date && (
            <span className="text-[10px] text-ink-400">{link.follow_up_date}</span>
          )}
          {(followUpStatus !== "no_follow_up" || isStalled) && (
            <span className={`text-[8px] px-1 py-0.5 rounded font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
              {isStalled ? "STALLED" : statusConfig.label.toUpperCase()}
            </span>
          )}
        </div>

        {/* Compact activity indicators */}
        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-brand-100/60">
          {taskCount > 0 && (
            <span className="text-[10px] text-ink-400 flex items-center gap-0.5" title={`${taskCount} task(s)`}>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {taskCount}
            </span>
          )}
          {noteCount > 0 && (
            <span className="text-[10px] text-ink-400 flex items-center gap-0.5" title={`${noteCount} note(s)`}>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {noteCount}
            </span>
          )}
          {meetingCount > 0 && (
            <span className="text-[10px] text-ink-400 flex items-center gap-0.5" title={`${meetingCount} meeting(s)`}>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {meetingCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Droppable Column ──
function StageColumn({
  stage,
  cards,
  investors,
  team,
  notes,
  tasks,
  meetings,
  isOver,
  onOpenDrawer,
}: {
  stage: string;
  cards: ProjectInvestor[];
  investors: Investor[];
  team: TeamMember[];
  notes: ProjectNote[];
  tasks: Task[];
  meetings: Meeting[];
  isOver: boolean;
  onOpenDrawer: (link: ProjectInvestor) => void;
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
          {cards.map((link) => {
            const noteCount = notes.filter((n) => n.investor_id === link.investor_id).length;
            const taskCount = tasks.filter((t) => t.investor_id === link.investor_id).length;
            const meetingCount = meetings.filter((m) => m.investor_id === link.investor_id).length;
            return (
              <InvestorCard
                key={link.link_id}
                link={link}
                investor={getInvestor(link.investor_id)}
                team={team}
                noteCount={noteCount}
                taskCount={taskCount}
                meetingCount={meetingCount}
                onOpenDrawer={onOpenDrawer}
              />
            );
          })}
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
    <div className="bg-surface-0 border-2 border-brand-500 rounded-xl p-3 shadow-lg w-64 opacity-90 rotate-[2deg] scale-105 transition-transform">
      <p className="text-sm font-medium text-ink-800">{investor?.investor_name || link.investor_id}</p>
      {investor?.tags && (
        <span className="text-[10px] text-brand-500 font-medium">
          {investor.tags.split(";").filter(Boolean)[0]?.trim()}
        </span>
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
export default function FunnelBoard({ projectId, links, investors, stages, team, notes, tasks, meetings, onRefresh, onOpenDrawer }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [optimisticLinks, setOptimisticLinks] = useState<ProjectInvestor[] | null>(null);
  const displayLinks = optimisticLinks || links;

  const pendingSaves = useRef(0);
  const isDragging = useRef(false);

  const prevLinksRef = useRef(links);
  if (links !== prevLinksRef.current) {
    prevLinksRef.current = links;
    if (pendingSaves.current === 0 && !isDragging.current) {
      if (optimisticLinks !== null) setOptimisticLinks(null);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const getInvestor = (id: string) => investors.find((i) => i.investor_id === id);

  // ── Filter state ──
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterOrigin, setFilterOrigin] = useState<string>("");
  const [filterWave, setFilterWave] = useState<string>("");

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    displayLinks.forEach((link) => {
      const inv = investors.find((i) => i.investor_id === link.investor_id);
      inv?.tags?.split(";").filter(Boolean).forEach((t) => tagSet.add(t.trim()));
    });
    return Array.from(tagSet).sort();
  }, [displayLinks, investors]);

  const filtersActive = filterTags.length > 0 || filterOrigin !== "" || filterWave !== "";

  const filteredLinks = useMemo(() => {
    if (!filtersActive) return displayLinks;
    return displayLinks.filter((link) => {
      const investor = investors.find((i) => i.investor_id === link.investor_id);
      if (filterOrigin && investor?.origin !== filterOrigin) return false;
      if (filterWave && link.wave !== filterWave) return false;
      if (filterTags.length > 0) {
        const investorTags = investor?.tags?.split(";").map((t) => t.trim().toLowerCase()) || [];
        if (!filterTags.some((ft) => investorTags.includes(ft.toLowerCase()))) return false;
      }
      return true;
    });
  }, [displayLinks, investors, filterOrigin, filterWave, filterTags, filtersActive]);

  const cardsByStage = useMemo(() => {
    return stages.map((stage) => ({
      stage,
      cards: filteredLinks
        .filter((l) => l.stage === stage)
        .sort((a, b) => a.position_index - b.position_index),
    }));
  }, [stages, filteredLinks]);

  const [overStage, setOverStage] = useState<string | null>(null);

  const persistStageChange = useCallback((linkId: string, newStage: string, positionIndex: number, snapshotBeforeChange: ProjectInvestor[]) => {
    pendingSaves.current += 1;
    api()
      .updateProjectInvestor({ link_id: linkId, stage: newStage, position_index: positionIndex })
      .then(() => onRefresh())
      .catch((err) => {
        console.error("Failed to update stage:", err);
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    isDragging.current = true;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) { setOverStage(null); return; }

    const currentLinks = optimisticLinks || links;
    const targetStage = resolveOverToStage(over.id as string, currentLinks);
    setOverStage(targetStage || null);

    if (!targetStage) return;

    const activeLink = currentLinks.find((l) => l.link_id === active.id);
    if (!activeLink) return;

    if (activeLink.stage !== targetStage) {
      const updated = applyStageMove(currentLinks, active.id as string, targetStage);
      setOptimisticLinks(updated);
      return;
    }

    const overIsCard = !String(over.id).startsWith("stage:");
    if (!overIsCard || active.id === over.id) return;

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
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverStage(null);
    isDragging.current = false;

    if (!over) {
      setOptimisticLinks(null);
      return;
    }

    const currentLinks = optimisticLinks || links;
    const activeLink = currentLinks.find((l) => l.link_id === active.id);
    if (!activeLink) return;

    const targetStage = resolveOverToStage(over.id as string, currentLinks) || activeLink.stage;

    const snapshotBeforeChange = links;
    const originalLink = links.find((l) => l.link_id === active.id);
    const wasMovedCrossColumn = originalLink && originalLink.stage !== targetStage;

    if (wasMovedCrossColumn) {
      const movedCard = currentLinks.find((l) => l.link_id === active.id);
      if (movedCard) {
        persistStageChange(active.id as string, targetStage, movedCard.position_index, snapshotBeforeChange);
      }
    } else {
      const stageCards = currentLinks
        .filter((l) => l.stage === targetStage)
        .sort((a, b) => a.position_index - b.position_index);
      const newIndex = stageCards.findIndex((c) => c.link_id === active.id);
      const originalIndex = links
        .filter((l) => l.stage === targetStage)
        .sort((a, b) => a.position_index - b.position_index)
        .findIndex((c) => c.link_id === active.id);

      if (newIndex !== -1 && newIndex !== originalIndex) {
        persistReorder(active.id as string, newIndex, snapshotBeforeChange);
      } else {
        if (pendingSaves.current === 0) {
          setOptimisticLinks(null);
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverStage(null);
    isDragging.current = false;
    if (pendingSaves.current === 0) {
      setOptimisticLinks(null);
    }
  };

  const [addError, setAddError] = useState<string | null>(null);

  const handleAddInvestor = async (investorId: string) => {
    setAddError(null);

    const tempLinkId = `temp_${Date.now()}`;
    const firstStage = stages[0] || "Pipeline";
    const currentLinks = optimisticLinks || links;
    const stageCards = currentLinks.filter((l) => l.stage === firstStage);
    const maxPos = stageCards.reduce((max, l) => Math.max(max, l.position_index), -1);
    const now = new Date().toISOString();
    const optimisticLink: ProjectInvestor = {
      link_id: tempLinkId,
      project_id: projectId,
      investor_id: investorId,
      stage: firstStage,
      position_index: maxPos + 1,
      owner_id: "",
      priority: "",
      last_interaction_date: "",
      last_interaction_type: "",
      next_step: "",
      follow_up_date: "",
      latest_update: "",
      fit_summary: "",
      source: "",
      last_update: now.split("T")[0],
      next_action: "",
      notes: "",
      wave: "",
      created_at: now,
      updated_at: now,
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

  const existingInvestorIds = useMemo(() => new Set(displayLinks.map((l) => l.investor_id)), [displayLinks]);
  const activeLink = activeId ? displayLinks.find((l) => l.link_id === activeId) : null;
  const activeInvestor = activeLink ? getInvestor(activeLink.investor_id) : null;

  // Stage summary metrics (filtered view)
  const stageSummary = useMemo(() => {
    const total = filteredLinks.length;
    const active = filteredLinks.filter((l) => l.stage === "Active" || l.stage === "Trying to reach").length;
    const advanced = filteredLinks.filter((l) => l.stage === "Advanced").length;
    const overdue = filteredLinks.filter((l) => getFollowUpStatus(l) === "overdue").length;
    return { total, active, advanced, overdue };
  }, [filteredLinks]);

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-ink-500">
            {stageSummary.total} investor{stageSummary.total !== 1 ? "s" : ""}
          </p>
          {stageSummary.active > 0 && (
            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
              {stageSummary.active} active
            </span>
          )}
          {stageSummary.advanced > 0 && (
            <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
              {stageSummary.advanced} advanced
            </span>
          )}
          {stageSummary.overdue > 0 && (
            <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
              {stageSummary.overdue} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium shadow-sm"
        >
          + Add Investor
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {/* Origin filter */}
        <select
          value={filterOrigin}
          onChange={(e) => setFilterOrigin(e.target.value)}
          className="text-xs border border-brand-200 rounded-lg px-2.5 py-1.5 text-ink-700 bg-surface-0 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
        >
          <option value="">All Origins</option>
          <option value="br">Brasileiro</option>
          <option value="intl">Internacional</option>
        </select>

        {/* Wave filter */}
        <select
          value={filterWave}
          onChange={(e) => setFilterWave(e.target.value)}
          className="text-xs border border-brand-200 rounded-lg px-2.5 py-1.5 text-ink-700 bg-surface-0 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
        >
          <option value="">All Waves</option>
          <option value="1">1a Onda</option>
          <option value="2">2a Onda</option>
          <option value="3">3a Onda</option>
          <option value="4">4a Onda</option>
        </select>

        {/* Tag chips */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {availableTags.map((tag) => {
              const isActive = filterTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    setFilterTags((prev) =>
                      isActive ? prev.filter((t) => t !== tag) : [...prev, tag]
                    );
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-brand-500 text-white"
                      : "bg-brand-100 text-brand-600 hover:bg-brand-200"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}

        {/* Clear filters + count */}
        {filtersActive && (
          <>
            <button
              onClick={() => { setFilterTags([]); setFilterOrigin(""); setFilterWave(""); }}
              className="text-[10px] px-2 py-0.5 text-ink-500 hover:text-ink-700 border border-brand-200 rounded-lg transition-colors"
            >
              Clear filters
            </button>
            <span className="text-[10px] text-ink-400">
              Showing {filteredLinks.length} of {displayLinks.length} investors
            </span>
          </>
        )}
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
              team={team}
              notes={notes}
              tasks={tasks}
              meetings={meetings}
              isOver={overStage === stage}
              onOpenDrawer={onOpenDrawer}
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

      <InvestorPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        investors={investors}
        excludeIds={existingInvestorIds}
        onSelect={handleAddInvestor}
      />
    </div>
  );
}
