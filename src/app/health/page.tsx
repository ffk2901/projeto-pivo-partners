"use client";

import { useEffect, useState } from "react";

interface HealthData {
  connected: boolean;
  counts: Record<string, number>;
  error?: string;
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setData)
      .catch((err) =>
        setData({ connected: false, counts: {}, error: err.message })
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">System Health</h1>

      {loading && <p className="text-gray-500">Checking connection...</p>}

      {data && (
        <div className="space-y-4">
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border ${
              data.connected
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                data.connected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-medium">
              {data.connected
                ? "Connected to Google Sheets"
                : "Connection Failed"}
            </span>
          </div>

          {data.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-1 font-mono">
                {data.error}
              </p>
            </div>
          )}

          {data.connected && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">
                  Row Counts
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {Object.entries(data.counts).map(([tab, count]) => (
                  <div
                    key={tab}
                    className="flex justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="text-gray-600 capitalize">{tab}</span>
                    <span className="font-mono font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
