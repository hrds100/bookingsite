import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useNfsHospitableConnections,
  useNfsHospitableSyncedProperties,
  useNfsHospitableConnect,
  useNfsHospitableImport,
  useNfsHospitableDisconnect,
} from "@/hooks/useNfsHospitable";

const MAX_AUTO_CHECKS = 10;

export default function OperatorIntegrations() {
  const navigate = useNavigate();
  const { operatorId } = useAuth();

  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [disconnectConfirmId, setDisconnectConfirmId] = useState<string | null>(null);
  const [autoCheckCount, setAutoCheckCount] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enrichingRef = useRef(false);

  const { data: hospConnections = [], isLoading: hospLoading, refetch: refetchConnections } = useNfsHospitableConnections();
  const activeConnections = hospConnections.filter(c => c.is_active && c.status === "connected");
  const isHospConnected = activeConnections.length > 0;

  const { data: syncedProperties, isLoading: propsLoading, refetch: refetchSyncedProps } =
    useNfsHospitableSyncedProperties(operatorId, isHospConnected);

  const { connecting, error: connectError, initiateConnect, triggerResync, triggerEnrich } = useNfsHospitableConnect();
  const importMutation = useNfsHospitableImport();
  const disconnectMutation = useNfsHospitableDisconnect();

  const activeConnectionsRef = useRef(activeConnections);
  useEffect(() => { activeConnectionsRef.current = activeConnections; });

  // Auto-enrich when sync_status is 'enriching'
  const enrichingConnection = activeConnections.find(c => c.sync_status === "enriching");

  const runEnrichBatch = useCallback(async () => {
    if (enrichingRef.current || !enrichingConnection) return;
    enrichingRef.current = true;
    try {
      const result = await triggerEnrich(enrichingConnection.id);
      if (result && (result.remaining > 0 || result.discovered > 0)) {
        // More batches needed OR new listings discovered from Hospitable — keep going
        await refetchConnections();
        await refetchSyncedProps();
        setTimeout(() => { enrichingRef.current = false; }, 500);
      } else {
        // Done enriching
        await refetchConnections();
        await refetchSyncedProps();
        enrichingRef.current = false;
      }
    } catch {
      enrichingRef.current = false;
    }
  }, [enrichingConnection, triggerEnrich, refetchConnections, refetchSyncedProps]);

  // Auto-trigger enrichment batches
  useEffect(() => {
    if (!enrichingConnection) return;
    // Start first batch immediately
    runEnrichBatch();
    // Then poll every 5s to continue batches
    const interval = setInterval(() => {
      if (!enrichingRef.current) runEnrichBatch();
    }, 5000);
    return () => clearInterval(interval);
  }, [enrichingConnection?.id, runEnrichBatch]);

  // Auto-poll when connected but no listings yet
  const noListingsYet = isHospConnected && (syncedProperties ?? []).length === 0 && !propsLoading && !enrichingConnection;
  useEffect(() => {
    if (!noListingsYet || autoCheckCount >= MAX_AUTO_CHECKS) {
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      return;
    }
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      setAutoCheckCount(c => c + 1);
      for (const conn of activeConnectionsRef.current) {
        triggerResync(conn.id).catch(() => {});
      }
      setTimeout(() => refetchSyncedProps(), 4000);
    }, 30_000);
    return () => { if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; } };
  }, [noListingsYet, autoCheckCount, triggerResync, refetchSyncedProps]);

  useEffect(() => { setAutoCheckCount(0); }, [isHospConnected]);

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  };

  const importableProperties = (syncedProperties || []).filter((p) => p.status !== "listed");
  const alreadyImported = (syncedProperties || []).filter((p) => p.status === "listed");
  const selectedImportable = [...selectedPropertyIds].filter((id) =>
    importableProperties.some((p) => p.id === id)
  );

  const handleImportSelected = async () => {
    if (!selectedImportable.length) return;
    try {
      await importMutation.mutateAsync(selectedImportable);
      setSelectedPropertyIds(new Set());
      toast({ title: "Properties imported", description: `${selectedImportable.length} properties are now listed.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    }
  };

  const handleResync = async (connectionId?: string) => {
    const ok = await triggerResync(connectionId);
    if (ok) {
      toast({ title: "Sync triggered", description: "Properties are being refreshed from Airbnb." });
      setTimeout(() => refetchSyncedProps(), 2000);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await disconnectMutation.mutateAsync(connectionId);
      setDisconnectConfirmId(null);
      toast({ title: "Disconnected", description: "Airbnb account has been removed." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to disconnect";
      toast({ title: "Disconnect failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <div data-feature="NFSTAY__OP_INTEGRATIONS" className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect external platforms to sync your listings automatically.</p>
      </div>

      {/* ── Airbnb / Hospitable Section ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Airbnb</h2>
        <p className="text-sm text-muted-foreground">
          Import and sync your Airbnb listings via Hospitable. Properties, images, pricing, and calendar availability are kept in sync automatically.
        </p>

        {hospLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Connected accounts */}
            {activeConnections.map((conn) => (
              <div key={conn.id} className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Connected to Airbnb</p>
                      <p className="text-xs text-muted-foreground">
                        {conn.total_properties ?? 0} properties synced
                        {conn.last_sync_at ? ` · ${new Date(conn.last_sync_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                    onClick={() => setDisconnectConfirmId(conn.id)}
                  >
                    <X className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>

                {/* Sync progress bar */}
                {(conn.sync_status === "syncing" || conn.sync_status === "enriching") && (
                  <div className="space-y-2 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {conn.sync_status === "syncing"
                          ? "Syncing properties from Airbnb..."
                          : conn.sync_progress?.total
                            ? `Enriching properties: ${conn.sync_progress.enriched ?? 0}/${conn.sync_progress.total} (images & pricing)`
                            : "Enriching properties with images & pricing..."}
                      </p>
                    </div>
                    {conn.sync_progress?.total ? (
                      <Progress
                        value={Math.round(((conn.sync_progress.enriched ?? 0) / conn.sync_progress.total) * 100)}
                        className="h-2"
                      />
                    ) : null}
                    {conn.sync_progress?.failed ? (
                      <p className="text-xs text-amber-600">{conn.sync_progress.failed} properties failed to enrich</p>
                    ) : null}
                  </div>
                )}

                {propsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading properties...</span>
                  </div>
                ) : (syncedProperties || []).length === 0 && conn.sync_status !== "syncing" && conn.sync_status !== "enriching" ? (
                  <div className="py-6 text-center space-y-3">
                    {conn.connected_platforms?.length === 0 ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
                        <p className="text-sm font-medium text-amber-700">Airbnb not linked in Hospitable</p>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                          Your Hospitable account is connected but no Airbnb channel is linked yet.
                          Click Reconnect below — when Hospitable opens, add your Airbnb account there.
                        </p>
                        <Button
                          size="sm"
                          className="rounded-lg"
                          onClick={() => initiateConnect()}
                          disabled={connecting}
                        >
                          {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                          Reconnect &amp; Link Airbnb
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-2">
                          {autoCheckCount < MAX_AUTO_CHECKS ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <p className="text-sm text-muted-foreground">
                            {autoCheckCount < MAX_AUTO_CHECKS
                              ? "Importing listings from Airbnb — this can take a few minutes."
                              : "No listings found. Make sure your Airbnb listings are active."}
                          </p>
                        </div>
                        {autoCheckCount < MAX_AUTO_CHECKS && (
                          <p className="text-xs text-muted-foreground">
                            Checking automatically every 30s (attempt {autoCheckCount + 1}/{MAX_AUTO_CHECKS})
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => { setAutoCheckCount(0); handleResync(conn.id); }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" /> Check Now
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">Select properties to import:</p>

                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {alreadyImported.map((prop) => (
                        <div key={prop.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/40">
                          {prop.images?.[0]?.url ? (
                            <img src={prop.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              No img
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{prop.public_title || "Untitled property"}</p>
                            <p className="text-xs text-muted-foreground">{[prop.city, prop.country].filter(Boolean).join(", ") || "No location"}</p>
                          </div>
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium whitespace-nowrap">
                            <CheckCircle className="w-3.5 h-3.5" /> Imported
                          </span>
                        </div>
                      ))}

                      {importableProperties.map((prop) => (
                        <label
                          key={prop.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/10 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedPropertyIds.has(prop.id)}
                            onCheckedChange={() => togglePropertySelection(prop.id)}
                          />
                          {prop.images?.[0]?.url ? (
                            <img src={prop.images[0].url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              No img
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{prop.public_title || "Untitled property"}</p>
                            <p className="text-xs text-muted-foreground">{[prop.city, prop.country].filter(Boolean).join(", ") || "No location"}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {prop.property_type || "Property"}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        onClick={handleImportSelected}
                        disabled={!selectedImportable.length || importMutation.isPending}
                        className="rounded-lg"
                      >
                        {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Import Selected{selectedImportable.length > 0 ? ` (${selectedImportable.length})` : ""}
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => handleResync(conn.id)}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Connect account */}
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
                {isHospConnected ? <Plus className="w-6 h-6 text-muted-foreground" /> : <WifiOff className="w-6 h-6 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {isHospConnected ? "Connect another Airbnb account" : "Connect your Airbnb account"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Import your listings automatically from Airbnb via Hospitable.
                </p>
              </div>

              {connectError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {connectError}
                </div>
              )}

              <Button onClick={initiateConnect} disabled={connecting} className="w-full max-w-xs rounded-lg">
                {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                {connecting ? "Connecting..." : isHospConnected ? "Connect Another" : "Connect Airbnb"}
              </Button>

              {hospConnections.some(c => c.status === "failed" && c.last_error) && (
                <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg text-left">
                  <p className="font-medium">Previous connection failed:</p>
                  {hospConnections.filter(c => c.status === "failed").map(c => (
                    <p key={c.id}>
                      {typeof c.last_error === "object" && c.last_error !== null
                        ? (c.last_error as Record<string, unknown>).message as string || "Unknown error"
                        : String(c.last_error ?? "Unknown error")}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Disconnect confirmation */}
            <Dialog open={!!disconnectConfirmId} onOpenChange={() => setDisconnectConfirmId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove Airbnb account?</DialogTitle>
                  <DialogDescription>
                    This will disconnect the Airbnb account from NFStay. Your imported properties will remain but will no longer sync automatically.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDisconnectConfirmId(null)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => disconnectConfirmId && handleDisconnect(disconnectConfirmId)}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Remove
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
