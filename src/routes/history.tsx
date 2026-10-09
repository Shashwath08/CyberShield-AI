import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ResultPanel } from "@/components/ResultPanel";
import { RiskBadge } from "@/components/risk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RiskLevel, ScanType } from "@/lib/engine/types";
import { clearHistory, deleteScan, queryHistory, useHistory } from "@/services/history";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Scan History — CyberShield AI" },
      { name: "description", content: "Review, search and delete the scans saved in this browser." },
      { property: "og:title", content: "Scan History — CyberShield AI" },
      { property: "og:description", content: "Review, search and delete the scans saved in this browser." },
    ],
  }),
  component: HistoryPage,
});

const selectClass = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

export function HistoryPage() {
  const records = useHistory();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ScanType | "all">("all");
  const [level, setLevel] = useState<RiskLevel | "all">("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const view = useMemo(() => queryHistory(records, { search, type, level, page }), [records, search, type, level, page]);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  return (
    <>
      <PageHeader eyebrow="Records" title="Scan History">Stored only in this browser. Message scans keep a short preview, not the full text.</PageHeader>

      <div role="search" className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1">
          <Label htmlFor="h-search">Search</Label>
          <Input id="h-search" className="h-11" value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} placeholder="Search scans…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="h-type">Type</Label>
          <select id="h-type" className={selectClass} value={type} onChange={(e) => resetPage(setType)(e.target.value as ScanType | "all")}>
            <option value="all">All types</option><option value="url">Links</option><option value="message">Messages</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="h-level">Risk</Label>
          <select id="h-level" className={selectClass} value={level} onChange={(e) => resetPage(setLevel)(e.target.value as RiskLevel | "all")}>
            <option value="all">All levels</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p aria-live="polite" className="text-sm text-muted-foreground">{view.total} scan{view.total === 1 ? "" : "s"}</p>
        {records.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => { if (window.confirm("Delete all saved scans from this browser?")) clearHistory(); }}>
            <Trash2 aria-hidden="true" /> Delete all history
          </Button>
        )}
      </div>

      {view.total === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {records.length === 0 ? "No scans saved yet." : "No scans match these filters."}
        </p>
      ) : (
        <ul className="space-y-2">
          {view.items.map((r) => (
            <li key={r.id} className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 p-3">
                <button type="button" aria-expanded={open === r.id} aria-controls={`d-${r.id}`} onClick={() => setOpen(open === r.id ? null : r.id)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded text-left">
                  <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open === r.id ? "rotate-180" : ""}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm">{r.preview}</span>
                    <span className="text-xs text-muted-foreground">{r.type === "url" ? "Link" : "Message"} · {new Date(r.createdAt).toLocaleString()} · score {r.score}</span>
                  </span>
                  <RiskBadge level={r.level} className="hidden shrink-0 sm:inline-flex" />
                </button>
                <Button variant="ghost" size="icon" className="size-11" aria-label={`Delete scan: ${r.preview.slice(0, 40)}`} onClick={() => deleteScan(r.id)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              {open === r.id && <div id={`d-${r.id}`} className="border-t p-3"><ResultPanel result={r.result} /></div>}
            </li>
          ))}
        </ul>
      )}

      {view.pages > 1 && (
        <nav aria-label="History pages" className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={view.page <= 1} onClick={() => setPage(view.page - 1)}>Previous</Button>
          <span className="text-sm">Page {view.page} of {view.pages}</span>
          <Button variant="outline" disabled={view.page >= view.pages} onClick={() => setPage(view.page + 1)}>Next</Button>
        </nav>
      )}
    </>
  );
}
