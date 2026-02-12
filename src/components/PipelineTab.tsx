"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import type { StartupInvestor, Investor } from "@/types";
import Modal from "./Modal";

interface Props {
  startupId: string;
  links: StartupInvestor[];
  investors: Investor[];
  stages: string[];
  onRefresh: () => void;
}

export default function PipelineTab({
  startupId,
  links,
  investors,
  stages,
  onRefresh,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editNextAction, setEditNextAction] = useState("");
  const dragOverStage = useRef<string | null>(null);

  // Add investor form state
  const [selectedInvestorId, setSelectedInvestorId] = useState("");
  const [newInvestorName, setNewInvestorName] = useState("");
  const [newInvestorTags, setNewInvestorTags] = useState("");
  const [newInvestorEmail, setNewInvestorEmail] = useState("");

  const getInvestor = (id: string) =>
    investors.find((i) => i.investor_id === id);

  const investorsByStage = stages.map((stage) => ({
    stage,
    cards: links.filter((l) => l.stage === stage),
  }));

  const handleDragStart = (linkId: string) => {
    setDraggingId(linkId);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    dragOverStage.current = stage;
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggingId) return;

    const link = links.find((l) => l.link_id === draggingId);
    if (!link || link.stage === targetStage) {
      setDraggingId(null);
      return;
    }

    try {
      await api().updateStartupInvestor({
        link_id: draggingId,
        stage: targetStage,
      });
      onRefresh();
    } catch (err) {
      console.error("Failed to update stage:", err);
    }
    setDraggingId(null);
  };

  const handleAddInvestor = async () => {
    let investorId = selectedInvestorId;

    if (!investorId && newInvestorName.trim()) {
      const inv = await api().createInvestor({
        investor_name: newInvestorName.trim(),
        tags: newInvestorTags,
        email: newInvestorEmail,
      });
      investorId = inv.investor_id;
    }

    if (!investorId) return;

    await api().createStartupInvestor({
      startup_id: startupId,
      investor_id: investorId,
    });

    setShowAdd(false);
    setSelectedInvestorId("");
    setNewInvestorName("");
    setNewInvestorTags("");
    setNewInvestorEmail("");
    onRefresh();
  };

  const openDetail = (link: StartupInvestor) => {
    setShowDetail(link.link_id);
    setEditNotes(link.notes);
    setEditNextAction(link.next_action);
  };

  const saveDetail = async () => {
    if (!showDetail) return;
    await api().updateStartupInvestor({
      link_id: showDetail,
      notes: editNotes,
      next_action: editNextAction,
    });
    setShowDetail(null);
    onRefresh();
  };

  const detailLink = links.find((l) => l.link_id === showDetail);
  const detailInvestor = detailLink
    ? getInvestor(detailLink.investor_id)
    : null;

  // Investors not yet in this startup's pipeline
  const existingInvestorIds = new Set(links.map((l) => l.investor_id));
  const availableInvestors = investors.filter(
    (i) => !existingInvestorIds.has(i.investor_id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {links.length} investor{links.length !== 1 ? "s" : ""} in pipeline
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Investor
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {investorsByStage.map(({ stage, cards }) => (
          <div
            key={stage}
            className={`flex-shrink-0 w-56 bg-gray-50 rounded-lg border border-gray-200 ${
              draggingId && dragOverStage.current === stage
                ? "border-blue-300 bg-blue-50"
                : ""
            }`}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="px-3 py-2.5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {stage}
                </h4>
                <span className="text-xs text-gray-400">{cards.length}</span>
              </div>
            </div>
            <div className="p-2 space-y-2 min-h-[100px]">
              {cards.map((link) => {
                const inv = getInvestor(link.investor_id);
                return (
                  <div
                    key={link.link_id}
                    draggable
                    onDragStart={() => handleDragStart(link.link_id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => openDetail(link)}
                    className={`bg-white border border-gray-200 rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors ${
                      draggingId === link.link_id ? "opacity-50" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {inv?.investor_name || link.investor_id}
                    </p>
                    {inv?.tags && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inv.tags.split(";").map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    {link.next_action && (
                      <p className="text-xs text-blue-500 mt-1.5 truncate">
                        Next: {link.next_action}
                      </p>
                    )}
                    {link.last_update && (
                      <p className="text-[10px] text-gray-300 mt-1">
                        Updated: {link.last_update}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add investor modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Investor to Pipeline"
      >
        <div className="space-y-4">
          {availableInvestors.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choose existing investor
              </label>
              <select
                value={selectedInvestorId}
                onChange={(e) => {
                  setSelectedInvestorId(e.target.value);
                  if (e.target.value) setNewInvestorName("");
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select --</option>
                {availableInvestors.map((i) => (
                  <option key={i.investor_id} value={i.investor_id}>
                    {i.investor_name}
                    {i.tags ? ` (${i.tags})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-center text-xs text-gray-400">
            {availableInvestors.length > 0
              ? "OR create a new investor"
              : "Create a new investor"}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Investor Name
            </label>
            <input
              type="text"
              value={newInvestorName}
              onChange={(e) => {
                setNewInvestorName(e.target.value);
                if (e.target.value) setSelectedInvestorId("");
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Sequoia Capital"
            />
          </div>

          {newInvestorName && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (semicolon-separated)
                </label>
                <input
                  type="text"
                  value={newInvestorTags}
                  onChange={(e) => setNewInvestorTags(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. VC;Series A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newInvestorEmail}
                  onChange={(e) => setNewInvestorEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="partner@fund.com"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleAddInvestor}
              disabled={!selectedInvestorId && !newInvestorName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Add to Pipeline
            </button>
          </div>
        </div>
      </Modal>

      {/* Investor detail side panel */}
      <Modal
        open={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={detailInvestor?.investor_name || "Investor Details"}
      >
        {detailLink && detailInvestor && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Stage
              </p>
              <p className="text-sm font-medium text-gray-800">
                {detailLink.stage}
              </p>
            </div>

            {detailInvestor.tags && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {detailInvestor.tags.split(";").map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailInvestor.email && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Email
                </p>
                <p className="text-sm text-gray-700">{detailInvestor.email}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Last Updated
              </p>
              <p className="text-sm text-gray-700">
                {detailLink.last_update || "N/A"}
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
                Next Action
              </label>
              <input
                type="text"
                value={editNextAction}
                onChange={(e) => setEditNextAction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Send follow-up email"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
                Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Internal notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDetail(null)}
                className="px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveDetail}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
