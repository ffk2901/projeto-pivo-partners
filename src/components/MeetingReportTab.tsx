"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { FOLLOW_UP_STATUS_CONFIG, type FollowUpStatus } from "@/types";

interface ReportData {
  generated_at: string;
  project: {
    project_id: string;
    project_name: string;
    startup_name: string;
    status: string;
  };
  summary: {
    total_investors: number;
    stage_counts: Record<string, number>;
    active_conversations: number;
    advanced_conversations: number;
    on_hold: number;
    declined: number;
    overdue_follow_ups: number;
    due_soon_follow_ups: number;
    no_follow_up: number;
    stalled_investors: number;
  };
  pipeline_snapshot: Array<{ stage: string; count: number; investors: string[] }>;
  investor_table: Array<{
    investor_name: string;
    investor_type: string;
    stage: string;
    owner: string;
    last_interaction_date: string;
    last_interaction_type: string;
    next_step: string;
    follow_up_date: string;
    follow_up_status: FollowUpStatus;
    is_stalled: boolean;
    latest_update: string;
    upcoming_meeting: string;
    open_tasks_count: number;
    priority: string;
  }>;
  follow_up_focus: Array<{
    investor_name: string;
    investor_type: string;
    stage: string;
    owner: string;
    next_step: string;
    follow_up_date: string;
    follow_up_status: FollowUpStatus;
    is_stalled: boolean;
    latest_update: string;
    upcoming_meeting: string;
    open_tasks_count: number;
    priority: string;
  }>;
}

interface Props {
  projectId: string;
}

export default function MeetingReportTab({ projectId }: Props) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api().getMeetingReport(projectId);
      setReport(data as unknown as ReportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/meeting-report/export?project_id=${projectId}`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || "pipeline_report.xlsx";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return iso; }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-brand-200/40 rounded w-48"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-brand-200/40 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-brand-200/40 rounded-2xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4">
        <p className="text-sm text-red-700 mb-2">{error}</p>
        <button onClick={loadReport} className="text-sm text-red-600 hover:text-red-800 font-medium">Retry</button>
      </div>
    );
  }

  if (!report) return null;

  const { summary, pipeline_snapshot, investor_table, follow_up_focus } = report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink-800">Meeting Report</h2>
          <p className="text-xs text-ink-400 mt-0.5">
            {report.project.project_name} &middot; {report.project.startup_name} &middot; Generated {formatDate(report.generated_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReport} className="px-3 py-2 text-xs text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 font-medium transition-colors">
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-xs bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export Spreadsheet"}
          </button>
        </div>
      </div>

      {/* A) Executive Summary */}
      <section>
        <h3 className="text-sm font-semibold text-ink-700 mb-3">Executive Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Investors" value={summary.total_investors} />
          <MetricCard label="Active Conversations" value={summary.active_conversations} accent="emerald" />
          <MetricCard label="Advanced" value={summary.advanced_conversations} accent="purple" />
          <MetricCard label="On Hold" value={summary.on_hold} accent="amber" />
          <MetricCard label="Declined" value={summary.declined} accent="red" />
          <MetricCard label="Overdue Follow-ups" value={summary.overdue_follow_ups} accent={summary.overdue_follow_ups > 0 ? "red" : undefined} />
          <MetricCard label="Due Soon" value={summary.due_soon_follow_ups} accent={summary.due_soon_follow_ups > 0 ? "amber" : undefined} />
          <MetricCard label="Stalled" value={summary.stalled_investors} accent={summary.stalled_investors > 0 ? "orange" : undefined} />
        </div>
      </section>

      {/* B) Pipeline Snapshot */}
      <section>
        <h3 className="text-sm font-semibold text-ink-700 mb-3">Pipeline Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {pipeline_snapshot.map((snap) => (
            <div key={snap.stage} className="bg-surface-0 border border-brand-200/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-ink-700">{snap.stage}</span>
                <span className="text-sm font-bold text-ink-800">{snap.count}</span>
              </div>
              <div className="space-y-0.5">
                {snap.investors.slice(0, 5).map((name) => (
                  <p key={name} className="text-[10px] text-ink-500 truncate">{name}</p>
                ))}
                {snap.investors.length > 5 && (
                  <p className="text-[10px] text-ink-400 italic">+{snap.investors.length - 5} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* C) Detailed Investor Table */}
      <section>
        <h3 className="text-sm font-semibold text-ink-700 mb-3">Detailed Pipeline</h3>
        <div className="overflow-x-auto border border-brand-200/60 rounded-2xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-brand-200/40">
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide whitespace-nowrap">Investor</th>
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Type</th>
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Stage</th>
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Owner</th>
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide whitespace-nowrap">Last Interaction</th>
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide whitespace-nowrap">Next Step</th>
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide whitespace-nowrap">Follow-up</th>
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Status</th>
                <th className="text-left px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Update</th>
                <th className="text-center px-3 py-2.5 text-ink-400 font-medium uppercase tracking-wide">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {investor_table.map((row, idx) => {
                const statusInfo = FOLLOW_UP_STATUS_CONFIG[row.follow_up_status];
                return (
                  <tr key={idx} className="border-b border-brand-100/40 hover:bg-brand-50/30">
                    <td className="px-3 py-2.5 text-ink-700 font-medium whitespace-nowrap">
                      {row.investor_name}
                      {row.priority === "high" && <span className="ml-1 text-[8px] px-1 py-0.5 bg-red-100 text-red-600 rounded font-bold">HIGH</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-500">{row.investor_type || "—"}</td>
                    <td className="px-3 py-2.5 text-ink-600">{row.stage}</td>
                    <td className="px-3 py-2.5 text-ink-500">{row.owner || "—"}</td>
                    <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap">
                      {row.last_interaction_date ? formatDate(row.last_interaction_date) : "—"}
                      {row.last_interaction_type && <span className="text-ink-300 ml-1">({row.last_interaction_type})</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-600 max-w-[160px] truncate">{row.next_step || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.follow_up_date ? formatDate(row.follow_up_date) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                        {row.is_stalled ? "Stalled" : statusInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-500 max-w-[180px] truncate">{row.latest_update || "—"}</td>
                    <td className="px-3 py-2.5 text-center text-ink-500">{row.open_tasks_count || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* D) Action / Follow-up Focus */}
      {follow_up_focus.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-ink-700 mb-3">
            Action Required
            <span className="ml-2 text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
              {follow_up_focus.length} investor{follow_up_focus.length !== 1 ? "s" : ""}
            </span>
          </h3>
          <div className="overflow-x-auto border border-red-200/60 rounded-2xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-red-50/50 border-b border-red-200/40">
                  <th className="text-left px-3 py-2.5 text-red-700 font-medium uppercase tracking-wide">Investor</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-medium uppercase tracking-wide">Stage</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-medium uppercase tracking-wide">Owner</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-medium uppercase tracking-wide">Next Step</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-medium uppercase tracking-wide">Follow-up</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-medium uppercase tracking-wide">Reason</th>
                  <th className="text-left px-3 py-2.5 text-red-700 font-medium uppercase tracking-wide">Update</th>
                </tr>
              </thead>
              <tbody>
                {follow_up_focus.map((row, idx) => {
                  const reasons: string[] = [];
                  if (row.follow_up_status === "overdue") reasons.push("Overdue");
                  if (row.follow_up_status === "due_soon") reasons.push("Due Soon");
                  if (row.follow_up_status === "no_follow_up") reasons.push("No Follow-up");
                  if (row.is_stalled) reasons.push("Stalled");
                  if (row.priority === "high") reasons.push("High Priority");

                  return (
                    <tr key={idx} className="border-b border-red-100/40 hover:bg-red-50/30">
                      <td className="px-3 py-2.5 text-ink-700 font-medium">{row.investor_name}</td>
                      <td className="px-3 py-2.5 text-ink-600">{row.stage}</td>
                      <td className="px-3 py-2.5 text-ink-500">{row.owner || "—"}</td>
                      <td className="px-3 py-2.5 text-ink-600 max-w-[160px] truncate">{row.next_step || "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{row.follow_up_date ? formatDate(row.follow_up_date) : "—"}</td>
                      <td className="px-3 py-2.5">
                        {reasons.map((r) => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md font-medium mr-1">
                            {r}
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-ink-500 max-w-[160px] truncate">{row.latest_update || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const accentColors: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50/50",
    purple: "border-purple-200 bg-purple-50/50",
    amber: "border-amber-200 bg-amber-50/50",
    red: "border-red-200 bg-red-50/50",
    orange: "border-orange-200 bg-orange-50/50",
  };
  const textColors: Record<string, string> = {
    emerald: "text-emerald-700",
    purple: "text-purple-700",
    amber: "text-amber-700",
    red: "text-red-700",
    orange: "text-orange-700",
  };

  return (
    <div className={`rounded-xl border p-3 ${accent ? accentColors[accent] || "" : "border-brand-200/60 bg-surface-0"}`}>
      <p className={`text-xl font-bold ${accent ? textColors[accent] || "text-ink-800" : "text-ink-800"}`}>{value}</p>
      <p className="text-[10px] text-ink-400 font-medium mt-0.5">{label}</p>
    </div>
  );
}
