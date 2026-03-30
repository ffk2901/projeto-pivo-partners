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
import type { ProjectInvestor, Investor, TeamMember, ProjectNote, Task, Meeting } from "@/types";
import { getFollowUpStatus, FOLLOW_UP_STATUS_CONFIG, getStalledStatus } from "@/types";
import InvestorPicker from "./InvestorPicker";
import { useToast } from "./ToastProvider";

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
  readOnly?: boolean;
  apiPrefix?: string;
}

function getInvestorType(tags: string): string {
  const t = tags.toLowerCase();
  if (t.includes("venture") || t.includes("vc")) return "Venture Capital";
  if (t.includes("private equity") || t.includes("pe")) return "Private Equity";
  if (t.includes("family office") || t.includes("fo")) return "Family Office";
  if (t.includes("angel")) return "Angel Investor";
  if (t.includes("fund")) return "Fund";
  return "";
}

function getTypeShortBadge(tags: string): string {
  const t = tags.toLowerCase();
  if (t.includes("fund") || t.includes("venture") || t.includes("vc")) return "FUND";
  if (t.includes("private equity") || t.includes("pe")) return "PE";
  if (t.includes("family office") || t.includes("fo")) return "FO";
  if (t.includes("angel")) return "PF";
  return "";
}

// ── Avatar component ──
function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const sizeClass = size === "md" ? "w-7 h-7 text-[10px]" : "w-6 h-6 text-[9px]";
  return (
    <div className={`${sizeClass} rounded-full bg-md-primary_container text-md-on_primary font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Sortable Card (Redesigned) ──
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
  const investorType = investor?.tags ? getInvestorType(investor.tags) : "";
  const typeBadge = investor?.tags ? getTypeShortBadge(investor.tags) : "";

  const tags = investor?.tags?.split(";").filter(Boolean).map((t) => t.trim()) || [];
  const visibleTags = tags.slice(0, 2);
  const extraTagCount = tags.length - 2;

  // Status dot color
  const statusDotColor =
    followUpStatus === "overdue" || link.priority === "high" ? "bg-md-error" :
    isStalled ? "bg-amber-400" :
    followUpStatus === "due_soon" ? "bg-amber-400" :
    "bg-emerald-400";

  // Follow-up display
  const getFollowUpDisplay = () => {
    if (!link.follow_up_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fDate = new Date(link.follow_up_date + "T00:00:00");
    const diffDays = Math.ceil((fDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Overdue ${Math.abs(diffDays)}d`, className: "text-md-error font-medium" };
    if (diffDays === 0) return { text: "Due Today", className: "text-md-primary_container font-medium" };
    if (diffDays <= 3) return { text: `Due in ${diffDays}d`, className: "text-amber-600 font-medium" };
    return { text: link.follow_up_date, className: "text-md-on_surface_variant" };
  };

  const followUpDisplay = getFollowUpDisplay();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-md-surface_container_lowest rounded-2xl p-4 cursor-grab active:cursor-grabbing hover:shadow-ambient transition-all group"
    >
      <div
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onOpenDrawer(link); }}
      >
        {/* Top row: type badge + status dot */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {typeBadge && (
              <span className="label-sm px-2 py-0.5 bg-md-surface_container_high text-md-on_surface_variant rounded-lg text-[10px]">
                {typeBadge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Three dot menu (visible on hover) */}
            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-md-on_surface_variant hover:text-md-on_surface">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {(followUpStatus !== "no_follow_up" || isStalled || link.priority === "high") && (
              <div className={`w-2 h-2 rounded-full ${statusDotColor}`} />
            )}
          </div>
        </div>

        {/* Investor name + subtitle */}
        <p className="body-md font-semibold text-md-on_surface hover:text-md-primary transition-colors leading-tight">
          {investor?.investor_name || link.investor_id}
        </p>
        {investorType && (
          <p className="body-sm text-md-on_surface_variant mt-0.5">{investorType}</p>
        )}

        {/* Next step */}
        {(link.next_step || link.next_action) && (
          <div className="mt-2 bg-md-surface_container_low rounded-xl px-3 py-2">
            <p className="text-[10px] text-md-on_surface_variant">
              <span className="font-semibold text-md-primary">Next:</span>{" "}
              {link.next_step || link.next_action}
            </p>
          </div>
        )}

        {/* Bottom row: owner + date + indicators */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {owner && <Avatar name={owner.name} />}
            {/* Activity indicators */}
            {noteCount > 0 && (
              <span className="text-[10px] text-md-on_surface_variant flex items-center gap-0.5" title={`${noteCount} note(s)`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {noteCount}
              </span>
            )}
            {taskCount > 0 && (
              <span className="text-[10px] text-md-on_surface_variant flex items-center gap-0.5" title={`${taskCount} task(s)`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {taskCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {followUpDisplay && (
              <span className={`text-[10px] ${followUpDisplay.className}`}>
                {followUpDisplay.text}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {visibleTags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {visibleTags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-[#f0ebe5] text-md-on_surface rounded-lg font-medium" style={{ border: "1px solid rgba(211, 196, 185, 0.3)" }}>
                {tag.toUpperCase()}
              </span>
            ))}
            {extraTagCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-md-surface_container text-md-on_surface_variant/60 rounded-md font-medium">+{extraTagCount}</span>
            )}
          </div>
        )}

        {/* Origin + Wave badges */}
        {(investor?.origin || link.wave) && (
          <div className="flex items-center gap-1.5 mt-2">
            {investor?.origin === "br" && (
              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg font-semibold" style={{ border: "1px solid rgb(167, 243, 208)" }}>BR</span>
            )}
            {investor?.origin === "intl" && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg font-semibold" style={{ border: "1px solid rgb(191, 219, 254)" }}>INTL</span>
            )}
            {link.wave && (
              <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${
                { "1": "bg-violet-100 text-violet-800", "2": "bg-sky-100 text-sky-800", "3": "bg-orange-100 text-orange-800", "4": "bg-pink-100 text-pink-800" }[link.wave] || "bg-violet-100 text-violet-800"
              }`} style={{ border: "1px solid rgba(196, 181, 253, 0.5)" }}>
                W{link.wave}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stage dot colors ──
const STAGE_DOT_COLORS: Record<string, string> = {
  "Pipeline": "bg-md-on_surface_variant",
  "Trying to reach": "bg-amber-400",
  "Active": "bg-emerald-500",
  "Advanced": "bg-violet-500",
  "On Hold": "bg-amber-500",
  "Declined": "bg-md-error",
};

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
  expanded,
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
  expanded?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `stage:${stage}` });
  const getInvestor = (id: string) => investors.find((i) => i.investor_id === id);

  return (
    <div
      className={`flex-shrink-0 w-72 rounded-2xl transition-colors duration-200 ${
        isOver ? "bg-md-primary_container/10" : "bg-md-surface_container_low"
      }`}
    >
      {/* Column header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${STAGE_DOT_COLORS[stage] || "bg-md-primary_container"}`} />
          <span className="label-md text-md-on_surface">{stage}</span>
          <span className="text-xs px-2 py-0.5 bg-md-surface_container_high text-md-on_surface_variant rounded-lg font-medium">
            {cards.length}
          </span>
        </div>
        <button className="text-md-on_surface_variant hover:text-md-on_surface transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>

      <div ref={setNodeRef} className="px-2 pb-3 space-y-3 min-h-[120px]">
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
          <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-md-outline_variant/40 rounded-2xl">
            <svg className="w-5 h-5 text-md-on_surface_variant/40 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
            <p className="label-sm text-md-on_surface_variant/40 text-[10px]">DROP HERE TO UPDATE STAGE</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Overlay Card (while dragging) ──
function DragOverlayCard({ link, investor }: { link: ProjectInvestor; investor?: Investor }) {
  return (
    <div className="bg-md-surface_container_lowest rounded-2xl p-4 shadow-ambient-lg w-72 opacity-95 rotate-[2deg] scale-105 border-2 border-md-primary_container">
      <p className="body-md font-semibold text-md-on_surface">{investor?.investor_name || link.investor_id}</p>
      {investor?.tags && (
        <span className="text-[10px] text-md-primary_container font-medium">
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
export default function FunnelBoard({ projectId, links, investors, stages, team, notes, tasks, meetings, onRefresh, onOpenDrawer, readOnly, apiPrefix }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { addToast } = useToast();

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
    useSensor(PointerSensor, { activationConstraint: { distance: readOnly ? 99999 : 8 } }),
    useSensor(KeyboardSensor)
  );

  const getInvestor = (id: string) => investors.find((i) => i.investor_id === id);

  // ── Filter state ──
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterOrigin, setFilterOrigin] = useState<string>("");
  const [filterWave, setFilterWave] = useState<string>("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tagDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
        setTagSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tagDropdownOpen]);

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

  const persistStageChange = useCallback((linkId: string, newStage: string, positionIndex: number, snapshotBeforeChange: ProjectInvestor[], investorName: string) => {
    pendingSaves.current += 1;
    api(apiPrefix)
      .updateProjectInvestor({ link_id: linkId, stage: newStage, position_index: positionIndex })
      .then(() => {
        addToast({
          type: "success",
          title: "Investor Moved",
          message: investorName + " moved to " + newStage,
          undoAction: () => {
            const original = snapshotBeforeChange.find((l) => l.link_id === linkId);
            if (original) {
              api(apiPrefix).updateProjectInvestor({ link_id: linkId, stage: original.stage, position_index: original.position_index }).then(() => onRefresh());
            }
          },
        });
        onRefresh();
      })
      .catch((err) => {
        console.error("Failed to update stage:", err);
        setOptimisticLinks(snapshotBeforeChange);
        addToast({ type: "error", title: "Failed to move investor", message: err.message });
      })
      .finally(() => {
        pendingSaves.current -= 1;
      });
  }, [onRefresh, addToast, apiPrefix]);

  const persistReorder = useCallback((linkId: string, newIndex: number, snapshotBeforeChange: ProjectInvestor[]) => {
    pendingSaves.current += 1;
    api(apiPrefix)
      .updateProjectInvestor({ link_id: linkId, position_index: newIndex })
      .then(() => onRefresh())
      .catch((err) => {
        console.error("Failed to reorder:", err);
        setOptimisticLinks(snapshotBeforeChange);
      })
      .finally(() => {
        pendingSaves.current -= 1;
      });
  }, [onRefresh, apiPrefix]);

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
      const investorName = getInvestor(activeLink.investor_id)?.investor_name || "Investor";
      if (movedCard) {
        persistStageChange(active.id as string, targetStage, movedCard.position_index, snapshotBeforeChange, investorName);
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
      await api(apiPrefix).createProjectInvestor({ project_id: projectId, investor_id: investorId });
      const inv = getInvestor(investorId);
      addToast({ type: "success", title: "Investor Added", message: `${inv?.investor_name || "Investor"} added to pipeline` });
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add investor";
      setAddError(message);
      setOptimisticLinks(null);
      addToast({ type: "error", title: "Failed to add investor", message });
      throw err;
    } finally {
      pendingSaves.current -= 1;
      setOptimisticLinks(null);
    }
  };

  const existingInvestorIds = useMemo(() => new Set(displayLinks.map((l) => l.investor_id)), [displayLinks]);
  const activeLink = activeId ? displayLinks.find((l) => l.link_id === activeId) : null;
  const activeInvestor = activeLink ? getInvestor(activeLink.investor_id) : null;

  // Stage summary metrics
  const stageSummary = useMemo(() => {
    const total = filteredLinks.length;
    const active = filteredLinks.filter((l) => l.stage === "Active" || l.stage === "Trying to reach").length;
    const advanced = filteredLinks.filter((l) => l.stage === "Advanced").length;
    const overdue = filteredLinks.filter((l) => getFollowUpStatus(l) === "overdue").length;
    return { total, active, advanced, overdue };
  }, [filteredLinks]);

  const content = (
    <>
      {/* Filter bar */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        {/* Origin segmented control */}
        <div className="flex bg-md-surface_container_lowest rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}>
          {[
            { value: "", label: "All Origins" },
            { value: "br", label: "BR" },
            { value: "intl", label: "INTL" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterOrigin(opt.value)}
              className={`px-3.5 py-2 text-xs font-medium transition-colors ${
                filterOrigin === opt.value
                  ? "bg-md-surface_container_highest text-md-on_surface"
                  : "text-md-on_surface_variant hover:bg-md-surface_container_low"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Wave filter pill */}
        <select
          value={filterWave}
          onChange={(e) => setFilterWave(e.target.value)}
          className="text-xs px-3.5 py-2 rounded-2xl text-md-on_surface_variant bg-md-surface_container_lowest focus:outline-none focus:ring-2 focus:ring-md-primary_container/40"
          style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}
        >
          <option value="">All Waves</option>
          <option value="1">Wave 1 (Seed)</option>
          <option value="2">Wave 2</option>
          <option value="3">Wave 3</option>
          <option value="4">Wave 4</option>
        </select>

        {/* Tag multi-select dropdown */}
        {availableTags.length > 0 && (
          <div className="relative" ref={tagDropdownRef}>
            <button
              onClick={() => { setTagDropdownOpen((v) => !v); setTagSearch(""); }}
              className={`text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-md-primary_container/40 ${
                filterTags.length > 0
                  ? "bg-md-primary_container/10 text-md-primary"
                  : "bg-md-surface_container_lowest text-md-on_surface_variant"
              }`}
              style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              Tags{filterTags.length > 0 ? ` (${filterTags.length})` : ""}
              <svg className={`w-3 h-3 transition-transform ${tagDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {tagDropdownOpen && (
              <div className="absolute z-50 mt-1 w-56 bg-md-surface_container_lowest rounded-2xl shadow-ambient-lg overflow-hidden" style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}>
                <div className="p-2">
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Search tags..."
                    className="w-full text-xs px-3 py-2 rounded-xl bg-md-surface_container_highest text-md-on_surface placeholder-md-on_surface_variant/50 focus:outline-none focus:ring-1 focus:ring-md-primary_container/40"
                    autoFocus
                  />
                </div>
                <div className="max-h-[250px] overflow-y-auto p-1">
                  {availableTags
                    .filter((tag) => tag.toLowerCase().includes(tagSearch.toLowerCase()))
                    .map((tag) => {
                      const isActive = filterTags.includes(tag);
                      return (
                        <label
                          key={tag}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-md-surface_container_low cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => {
                              setFilterTags((prev) =>
                                isActive ? prev.filter((t) => t !== tag) : [...prev, tag]
                              );
                            }}
                            className="w-3.5 h-3.5 rounded accent-md-primary"
                          />
                          <span className="text-xs text-md-on_surface truncate">{tag}</span>
                        </label>
                      );
                    })}
                  {availableTags.filter((tag) => tag.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                    <p className="text-xs text-md-on_surface_variant px-3 py-3 text-center italic">No tags found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clear filters */}
        {filtersActive && (
          <button
            onClick={() => { setFilterTags([]); setFilterOrigin(""); setFilterWave(""); }}
            className="text-xs px-3 py-1.5 text-md-on_surface_variant hover:text-md-on_surface rounded-xl transition-colors"
            style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}
          >
            Clear filters
          </button>
        )}

        <div className="flex-1" />

        {/* Summary count */}
        <span className="text-xs text-md-on_surface_variant">
          {stageSummary.total} investor{stageSummary.total !== 1 ? "s" : ""}
          {stageSummary.overdue > 0 && (
            <span className="text-md-error ml-2">{stageSummary.overdue} overdue</span>
          )}
        </span>

        {/* Fullscreen button */}
        <button onClick={() => setIsFullscreen(true)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-2xl text-md-on_surface_variant hover:bg-md-surface_container_high transition-colors" style={{ border: "1px solid rgba(211, 196, 185, 0.2)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          Fullscreen
        </button>

        {!readOnly && (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-2xl font-medium text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity shadow-ambient"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            + Add Investor
          </button>
        )}
      </div>

      {addError && (
        <div className="mb-4 bg-md-error_container rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-md-error">{addError}</p>
          <button onClick={() => setAddError(null)} className="text-md-error/60 hover:text-md-error text-xs font-medium ml-4">Dismiss</button>
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
        <div className={`flex gap-3 pb-4 funnel-scroll ${isFullscreen ? "overflow-y-auto" : "overflow-x-auto"}`}>
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
              expanded={isFullscreen}
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
        <div className="mt-4 text-center py-12 bg-md-surface_container_low rounded-2xl border-2 border-dashed border-md-outline_variant/40">
          <p className="text-md-on_surface_variant text-sm mb-2">No investors yet</p>
          {!readOnly && (
            <button
              onClick={() => setShowPicker(true)}
              className="text-sm text-md-primary hover:text-md-primary_container font-medium transition-colors"
            >
              Add from directory
            </button>
          )}
        </div>
      )}

      <InvestorPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        investors={investors}
        excludeIds={existingInvestorIds}
        onSelect={handleAddInvestor}
      />
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-100 flex flex-col overflow-hidden">
        {/* Fullscreen header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-brand-200/60 bg-surface-50 flex-shrink-0">
          <h2 className="text-sm font-semibold text-ink-700">Pipeline — Fullscreen</h2>
          <button
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-500 hover:text-ink-700 hover:bg-brand-100 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
            Exit Fullscreen
          </button>
        </div>
        {/* Fullscreen content */}
        <div className="flex-1 overflow-auto p-6">
          {content}
        </div>
      </div>
    );
  }

  return <div>{content}</div>;
}
