"use client";

import { useState, useMemo } from "react";
import type { Investor } from "@/types";
import Modal from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  investors: Investor[];
  excludeIds: Set<string>;
  onSelect: (investorId: string) => Promise<void>;
}

export default function InvestorPicker({ open, onClose, investors, excludeIds, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(() => {
    return investors.filter((i) => !excludeIds.has(i.investor_id));
  }, [investors, excludeIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (i) =>
        i.investor_name.toLowerCase().includes(q) ||
        i.tags.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q)
    );
  }, [available, search]);

  const handleSelect = async (investorId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onSelect(investorId);
      setSearch("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add investor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setSearch("");
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Investor to Funnel">
      <div className="space-y-4">
        {error && (
          <div className="bg-md-error_container rounded-2xl px-4 py-3 text-sm text-md-error">
            {error}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search investors by name, tags, or email..."
            autoFocus
            disabled={loading}
            className="w-full rounded-2xl px-4 py-3 text-sm bg-md-surface_container_highest text-md-on_surface focus:outline-none focus:ring-2 focus:ring-md-primary_container/40 placeholder:text-md-on_surface_variant/50 disabled:opacity-50"
          />
        </div>

        <p className="text-xs text-md-on_surface_variant">
          {filtered.length} investor{filtered.length !== 1 ? "s" : ""} available
          {excludeIds.size > 0 && ` (${excludeIds.size} already in funnel)`}
        </p>

        <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-5 h-5 border-2 border-md-outline_variant border-t-md-primary_container rounded-full animate-spin mb-2"></div>
              <p className="text-sm text-md-on_surface_variant">Adding investor...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-md-on_surface_variant">
                {available.length === 0
                  ? "All investors are already in this funnel."
                  : "No investors match your search."}
              </p>
            </div>
          ) : (
            filtered.map((inv) => (
              <button
                key={inv.investor_id}
                onClick={() => handleSelect(inv.investor_id)}
                disabled={loading}
                className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-md-surface_container_low transition-colors group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-md-on_surface group-hover:text-md-primary">
                      {inv.investor_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {inv.tags && (
                        <div className="flex flex-wrap gap-1">
                          {inv.tags.split(";").filter(Boolean).slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-md-surface_container_high text-md-on_surface_variant rounded-lg">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {inv.email && (
                        <span className="text-[10px] text-md-on_surface_variant">{inv.email}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-md-primary_container opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Add
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
