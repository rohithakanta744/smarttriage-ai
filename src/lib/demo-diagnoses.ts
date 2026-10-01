import type { Diagnosis } from "@/lib/diagnose.functions";

export type SampleIncident = {
  id: string;
  label: string;
  service: string;
  log: string;
  diagnosis: Diagnosis;
};

export const SAMPLE_INCIDENTS: SampleIncident[] = [
  {
    id: "gateway-timeout",
    label: "Gateway timeout",
    service: "batch-ingestor",
    log: `[2026-10-01T04:12:55Z] ERROR gateway: 504 Gateway Timeout
service=batch-ingestor upstream=data-hub route=POST /v2/batches
request_id=7f31c0ab-2c99-4f0b duration_ms=30001 retries=3
upstream_error: read timeout after 30000ms
stack:
  at HttpClient.post (client.py:214)
  at BatchIngestor.flush (ingestor.py:88)`,
    diagnosis: {
      severity: "HIGH",
      root_cause:
        "The batch-ingestor exhausted all three retries because the data-hub upstream did not respond within the 30-second read timeout.",
      recommended_action:
        "Check data-hub latency and saturation first. Temporarily reduce batch size or increase the upstream timeout, then replay the failed batch using request ID 7f31c0ab-2c99-4f0b.",
    },
  },
  {
    id: "database-pool",
    label: "Database pool exhausted",
    service: "checkout-api",
    log: `[2026-10-01T09:44:18Z] CRITICAL checkout-api database unavailable
route=POST /checkout region=eu-west-1 active_connections=100 pool_size=100
sqlstate=53300 message="remaining connection slots are reserved"
queue_wait_ms=8124 pending_requests=347
at OrderRepository.create (orders.ts:142)`,
    diagnosis: {
      severity: "CRITICAL",
      root_cause:
        "The checkout database connection pool is fully exhausted, causing new order requests to queue and fail.",
      recommended_action:
        "Reduce incoming checkout traffic or scale the database pool immediately. Inspect long-running queries and connection leaks before raising the pool limit, then verify queued orders were not duplicated.",
    },
  },
  {
    id: "memory-pressure",
    label: "Container memory pressure",
    service: "recommendation-worker",
    log: `[2026-10-01T11:03:07Z] WARN kubernetes pod restarted
namespace=production pod=recommendation-worker-7c8d9f4b6-k2mwp
reason=OOMKilled exit_code=137 restarts=5 memory_limit=512Mi
last_rss=509Mi queue_depth=1842 model_cache_entries=428`,
    diagnosis: {
      severity: "HIGH",
      root_cause:
        "The recommendation worker exceeded its 512 MiB memory limit, likely due to an unbounded model cache while the queue was elevated.",
      recommended_action:
        "Cap or evict model cache entries, temporarily increase the worker memory limit, and scale consumers until queue depth returns to normal. Compare heap growth across recent deployments.",
    },
  },
  {
    id: "auth-token",
    label: "Expired service token",
    service: "billing-sync",
    log: `2026-10-01T13:20:41.881Z ERROR billing-sync request rejected
provider=ledger-api endpoint=/v1/invoices status=401
response={"error":"invalid_token","error_description":"access token expired"}
token_age_seconds=3724 refresh_attempted=false jobs_delayed=26`,
    diagnosis: {
      severity: "MEDIUM",
      root_cause:
        "The billing-sync worker reused an expired access token and did not attempt the configured refresh flow.",
      recommended_action:
        "Refresh the service credential and retry the 26 delayed jobs. Add proactive token renewal before expiry and alert when refresh is skipped or rejected.",
    },
  },
  {
    id: "disk-capacity",
    label: "Disk capacity warning",
    service: "search-indexer",
    log: `[2026-10-01 15:58:02] WARN search-indexer write latency elevated
node=search-03 disk_used_pct=91.7 disk_free_gb=18.4
segment_merge_queue=12 write_latency_p95_ms=842
threshold=90 status=degraded`,
    diagnosis: {
      severity: "MEDIUM",
      root_cause:
        "Search node search-03 crossed the disk-capacity threshold, slowing segment merges and increasing write latency.",
      recommended_action:
        "Add disk capacity or remove obsolete indices before usage reaches the critical threshold. Rebalance shards away from search-03 and confirm merge backlog is falling.",
    },
  },
];

export function diagnoseInDemo(errorLog: string): Diagnosis {
  const exact = SAMPLE_INCIDENTS.find((sample) => sample.log.trim() === errorLog.trim());
  if (exact) return exact.diagnosis;

  const normalized = errorLog.toLowerCase();
  if (normalized.includes("outofmemory") || normalized.includes("oomkilled")) {
    return SAMPLE_INCIDENTS.find((sample) => sample.id === "memory-pressure")?.diagnosis ?? fallbackDiagnosis;
  }
  if (normalized.includes("401") || normalized.includes("token expired")) {
    return SAMPLE_INCIDENTS.find((sample) => sample.id === "auth-token")?.diagnosis ?? fallbackDiagnosis;
  }
  if (normalized.includes("database") || normalized.includes("connection pool")) {
    return SAMPLE_INCIDENTS.find((sample) => sample.id === "database-pool")?.diagnosis ?? fallbackDiagnosis;
  }
  if (normalized.includes("504") || normalized.includes("timeout")) {
    return SAMPLE_INCIDENTS.find((sample) => sample.id === "gateway-timeout")?.diagnosis ?? fallbackDiagnosis;
  }

  return fallbackDiagnosis;
}

const fallbackDiagnosis: Diagnosis = {
  severity: "MEDIUM",
  root_cause:
    "The log indicates a production service failure, but the demo analyzer cannot confirm a single infrastructure cause from the available context.",
  recommended_action:
    "Correlate the timestamp and request identifiers with service metrics, inspect the first error in the chain, and compare the event with the most recent deployment before retrying.",
};