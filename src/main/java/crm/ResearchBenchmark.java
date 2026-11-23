package crm;

import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.*;
import org.apache.hadoop.hbase.util.Bytes;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;

/**
 * Academic & Systems Research Benchmark for HBase CRM Intelligence Architecture.
 *
 * Evaluates:
 * 1a. Hot In-Memory BlockCache Point Lookup (SLA: p50 &lt; 2.0ms, p99 &lt; 10.0ms)
 * 1b. Uniform Random Key Point Lookup
 * 2. Range Scan Throughput (SLA: &gt; 10,000 records/sec)
 * 3. Concurrent Multi-Threaded Read Scalability
 * 4. Batch Mutation / Ingestion Throughput
 */
public class ResearchBenchmark {

    private static final int WARMUP_ITERATIONS = 250;
    private static final int MEASURE_ITERATIONS = 1000;
    private static final int SCAN_LIMIT = 10000;
    private static final int CONCURRENT_THREADS = 4;
    private static final int OPS_PER_THREAD = 250;

    public static void main(String[] args) throws Exception {
        System.out.println("================================================================================");
        System.out.println("   HBase CRM Architecture - Research Systems Performance Benchmark Suite         ");
        System.out.println("================================================================================");

        try (Connection conn = HBaseUtil.connect()) {
            Admin admin = conn.getAdmin();

            // Verify cluster tables
            for (String tbl : Arrays.asList("crm_customer", "crm_orders", "crm_interaction")) {
                if (!admin.tableExists(TableName.valueOf(tbl))) {
                    System.err.println("Required HBase table not found: " + tbl);
                    System.exit(1);
                }
            }

            // 1. Collect sample keys for point lookups
            List<String> customerKeys = sampleKeys(conn, "crm_customer", 500);
            if (customerKeys.isEmpty()) {
                System.err.println("No customer records found in crm_customer table.");
                System.exit(1);
            }
            List<String> hotKeys = customerKeys.subList(0, Math.min(50, customerKeys.size()));
            System.out.printf("Initialized benchmark with %d sampled customer keys (%d hot working-set).%n",
                    customerKeys.size(), hotKeys.size());

            // JVM / JIT Warmup
            System.out.println("Warming up JVM JIT compiler and RPC buffers (500 warmup gets)...");
            warmupJvm(conn, "crm_customer", hotKeys);
            System.out.println("✓ Warmup complete.\n");

            // -------------------------------------------------------------------------
            // Benchmark 1a: Hot In-Memory BlockCache Point Lookup
            // -------------------------------------------------------------------------
            System.out.println("[Benchmark 1a/4] Hot Working-Set Point Lookup Latency (BlockCache hits)...");
            BenchmarkStats hotStats = benchmarkPointLookup(conn, "crm_customer", hotKeys, true);
            printStats("Hot Cache Point Lookup (crm_customer)", hotStats, "ms", 2.0, 10.0);

            // -------------------------------------------------------------------------
            // Benchmark 1b: Uniform Random Key Point Lookup
            // -------------------------------------------------------------------------
            System.out.println("\n[Benchmark 1b/4] Uniform Random Key Point Lookup Latency (crm_customer)...");
            BenchmarkStats uniformStats = benchmarkPointLookup(conn, "crm_customer", customerKeys, false);
            printStats("Uniform Random Point Lookup (crm_customer)", uniformStats, "ms", 5.0, 25.0);

            // -------------------------------------------------------------------------
            // Benchmark 2: Range Scan Throughput
            // -------------------------------------------------------------------------
            System.out.println("\n[Benchmark 2/4] Range Scan Throughput (crm_orders & crm_interaction)...");
            ScanStats ordersScan = benchmarkScan(conn, "crm_orders", SCAN_LIMIT);
            System.out.printf("  ✓ crm_orders:      %d rows scanned in %.2f ms -> %.1f rows/sec (%.2f MB/sec)%n",
                    ordersScan.rowsScanned, ordersScan.durationMs, ordersScan.rowsPerSec, ordersScan.mbPerSec);

            ScanStats interScan = benchmarkScan(conn, "crm_interaction", SCAN_LIMIT);
            System.out.printf("  ✓ crm_interaction: %d rows scanned in %.2f ms -> %.1f rows/sec (%.2f MB/sec)%n",
                    interScan.rowsScanned, interScan.durationMs, interScan.rowsPerSec, interScan.mbPerSec);

            // -------------------------------------------------------------------------
            // Benchmark 3: Multi-Threaded Concurrent Read Scalability
            // -------------------------------------------------------------------------
            System.out.println("\n[Benchmark 3/4] Concurrent Read Scalability (4 worker threads, 1000 total ops)...");
            ConcurrentStats concurrentStats = benchmarkConcurrency(conn, "crm_customer", customerKeys);
            System.out.printf("  ✓ Concurrent Throughput: %.1f ops/sec (p50: %.2f ms, p95: %.2f ms, p99: %.2f ms)%n",
                    concurrentStats.throughputQps, concurrentStats.p50, concurrentStats.p95, concurrentStats.p99);

            // -------------------------------------------------------------------------
            // Benchmark 4: Batch Mutation Ingestion Latency
            // -------------------------------------------------------------------------
            System.out.println("\n[Benchmark 4/4] Batch Ingestion Mutation Throughput (crm_interaction)...");
            BatchWriteStats writeStats = benchmarkBatchWrite(conn, "crm_interaction");
            System.out.printf("  ✓ Ingestion Rate: %.1f records/sec (Avg Batch Latency: %.2f ms for %d rows)%n",
                    writeStats.recordsPerSec, writeStats.avgBatchLatencyMs, writeStats.totalRecords);

            // -------------------------------------------------------------------------
            // Export Results JSON
            // -------------------------------------------------------------------------
            File dataDir = new File("data");
            if (!dataDir.exists()) dataDir.mkdirs();
            File outJson = new File("data/research_benchmark_hbase.json");
            writeJsonReport(outJson, hotStats, uniformStats, ordersScan, interScan, concurrentStats, writeStats);
            System.out.println("\n✓ Research benchmark metrics saved to: " + outJson.getAbsolutePath());
            System.out.println("================================================================================");
        }
    }

    private static List<String> sampleKeys(Connection conn, String tableName, int limit) throws IOException {
        List<String> keys = new ArrayList<>(limit);
        try (Table table = conn.getTable(TableName.valueOf(tableName));
             ResultScanner scanner = table.getScanner(new Scan().setCaching(100).setLimit(limit))) {
            for (Result r : scanner) {
                keys.add(Bytes.toString(r.getRow()));
            }
        }
        return keys;
    }

    private static void warmupJvm(Connection conn, String tableName, List<String> keys) throws IOException {
        try (Table table = conn.getTable(TableName.valueOf(tableName))) {
            Random rng = new Random(42);
            for (int i = 0; i < 500; i++) {
                String k = keys.get(rng.nextInt(keys.size()));
                Get get = new Get(Bytes.toBytes(k));
                get.setCacheBlocks(true);
                table.get(get);
            }
        }
    }

    private static BenchmarkStats benchmarkPointLookup(Connection conn, String tableName, List<String> keys, boolean isHot) throws IOException {
        try (Table table = conn.getTable(TableName.valueOf(tableName))) {
            Random rng = new Random(42);

            // Warmup
            int warmupCount = isHot ? WARMUP_ITERATIONS * 2 : WARMUP_ITERATIONS;
            for (int i = 0; i < warmupCount; i++) {
                String k = keys.get(rng.nextInt(keys.size()));
                Get get = new Get(Bytes.toBytes(k));
                get.setCacheBlocks(true);
                table.get(get);
            }

            // Measurement
            double[] latenciesMs = new double[MEASURE_ITERATIONS];
            long totalNanos = 0;
            for (int i = 0; i < MEASURE_ITERATIONS; i++) {
                String k = keys.get(rng.nextInt(keys.size()));
                Get get = new Get(Bytes.toBytes(k));
                get.setCacheBlocks(true);
                long start = System.nanoTime();
                table.get(get);
                long duration = System.nanoTime() - start;
                latenciesMs[i] = duration / 1_000_000.0;
                totalNanos += duration;
            }

            Arrays.sort(latenciesMs);
            double mean = (totalNanos / 1_000_000.0) / MEASURE_ITERATIONS;
            double p50 = percentile(latenciesMs, 50.0);
            double p90 = percentile(latenciesMs, 90.0);
            double p95 = percentile(latenciesMs, 95.0);
            double p99 = percentile(latenciesMs, 99.0);
            double min = latenciesMs[0];
            double max = latenciesMs[latenciesMs.length - 1];
            double opsPerSec = 1000.0 / mean;

            return new BenchmarkStats(mean, min, max, p50, p90, p95, p99, opsPerSec, MEASURE_ITERATIONS);
        }
    }

    private static ScanStats benchmarkScan(Connection conn, String tableName, int maxRows) throws IOException {
        try (Table table = conn.getTable(TableName.valueOf(tableName))) {
            Scan scan = new Scan();
            scan.setCaching(500);
            scan.setLimit(maxRows);

            long totalBytes = 0;
            long rowCount = 0;
            long start = System.nanoTime();

            try (ResultScanner scanner = table.getScanner(scan)) {
                for (Result r : scanner) {
                    rowCount++;
                    totalBytes += r.value() != null ? r.value().length : 32;
                }
            }
            long nanos = System.nanoTime() - start;
            double durationMs = nanos / 1_000_000.0;
            double rowsPerSec = rowCount > 0 ? (rowCount / (durationMs / 1000.0)) : 0;
            double mbPerSec = (totalBytes / (1024.0 * 1024.0)) / (durationMs / 1000.0);

            return new ScanStats(rowCount, durationMs, rowsPerSec, mbPerSec);
        }
    }

    private static ConcurrentStats benchmarkConcurrency(Connection conn, String tableName, List<String> keys)
            throws InterruptedException, ExecutionException {
        ExecutorService pool = Executors.newFixedThreadPool(CONCURRENT_THREADS);
        List<Future<List<Double>>> futures = new ArrayList<>();
        long start = System.nanoTime();

        for (int t = 0; t < CONCURRENT_THREADS; t++) {
            futures.add(pool.submit(() -> {
                List<Double> lats = new ArrayList<>(OPS_PER_THREAD);
                Random r = new Random(System.currentTimeMillis() + Thread.currentThread().getId());
                try (Table table = conn.getTable(TableName.valueOf(tableName))) {
                    for (int i = 0; i < OPS_PER_THREAD; i++) {
                        String k = keys.get(r.nextInt(keys.size()));
                        Get get = new Get(Bytes.toBytes(k));
                        get.setCacheBlocks(true);
                        long s = System.nanoTime();
                        table.get(get);
                        lats.add((System.nanoTime() - s) / 1_000_000.0);
                    }
                }
                return lats;
            }));
        }

        List<Double> allLatencies = new ArrayList<>();
        for (Future<List<Double>> f : futures) {
            allLatencies.addAll(f.get());
        }
        pool.shutdown();

        long elapsedNanos = System.nanoTime() - start;
        double durationMs = elapsedNanos / 1_000_000.0;
        int totalOps = allLatencies.size();
        double throughputQps = (totalOps / (durationMs / 1000.0));

        Collections.sort(allLatencies);
        double[] arr = allLatencies.stream().mapToDouble(Double::doubleValue).toArray();

        return new ConcurrentStats(throughputQps, percentile(arr, 50.0), percentile(arr, 95.0), percentile(arr, 99.0));
    }

    private static BatchWriteStats benchmarkBatchWrite(Connection conn, String tableName) throws IOException {
        int batches = 10;
        int batchSize = 50;
        int total = batches * batchSize;
        List<Long> batchDurations = new ArrayList<>();
        List<Delete> deletes = new ArrayList<>();

        try (Table table = conn.getTable(TableName.valueOf(tableName))) {
            long totalNanos = 0;
            for (int b = 0; b < batches; b++) {
                List<Put> puts = new ArrayList<>(batchSize);
                for (int i = 0; i < batchSize; i++) {
                    String rk = String.format("BENCH_C%05d_%d_%d", b * batchSize + i, System.currentTimeMillis(), i);
                    Put p = new Put(Bytes.toBytes(rk));
                    p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("type"), Bytes.toBytes("benchmark"));
                    p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("amount"), Bytes.toBytes("99.99"));
                    p.addColumn(Bytes.toBytes("activity"), Bytes.toBytes("campaign"), Bytes.toBytes("BENCH"));
                    puts.add(p);
                    deletes.add(new Delete(Bytes.toBytes(rk)));
                }

                long s = System.nanoTime();
                table.put(puts);
                long dur = System.nanoTime() - s;
                totalNanos += dur;
                batchDurations.add(dur);
            }

            // Cleanup benchmark records
            table.delete(deletes);

            double totalMs = totalNanos / 1_000_000.0;
            double recordsPerSec = total / (totalMs / 1000.0);
            double avgBatchLatency = totalMs / batches;

            return new BatchWriteStats(total, totalMs, avgBatchLatency, recordsPerSec);
        }
    }

    private static double percentile(double[] sorted, double pct) {
        if (sorted.length == 0) return 0.0;
        int index = (int) Math.ceil((pct / 100.0) * sorted.length) - 1;
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }

    private static void printStats(String title, BenchmarkStats s, String unit, double p50Sla, double p99Sla) {
        boolean p50Pass = s.p50 <= p50Sla;
        boolean p99Pass = s.p99 <= p99Sla;
        System.out.printf("  ✓ Samples:   %d ops%n", s.count);
        System.out.printf("  ✓ Mean:      %.3f %s (Throughput: %.1f ops/sec)%n", s.mean, unit, s.opsPerSec);
        System.out.printf("  ✓ p50:       %.3f %s [SLA < %.1f %s: %s]%n", s.p50, unit, p50Sla, unit, p50Pass ? "PASS" : "FAIL");
        System.out.printf("  ✓ p90:       %.3f %s%n", s.p90, unit);
        System.out.printf("  ✓ p95:       %.3f %s%n", s.p95, unit);
        System.out.printf("  ✓ p99:       %.3f %s [SLA < %.1f %s: %s]%n", s.p99, unit, p99Sla, unit, p99Pass ? "PASS" : "FAIL");
        System.out.printf("  ✓ Min/Max:   %.3f / %.3f %s%n", s.min, s.max, unit);
    }

    private static void writeJsonReport(File file, BenchmarkStats hot, BenchmarkStats uniform,
                                        ScanStats orders, ScanStats inter,
                                        ConcurrentStats conc, BatchWriteStats write) throws IOException {
        String json = String.format(Locale.US, "{\n" +
                "  \"timestamp\": \"%s\",\n" +
                "  \"hotCachePointLookup\": {\n" +
                "    \"samples\": %d,\n" +
                "    \"meanMs\": %.3f,\n" +
                "    \"p50Ms\": %.3f,\n" +
                "    \"p90Ms\": %.3f,\n" +
                "    \"p95Ms\": %.3f,\n" +
                "    \"p99Ms\": %.3f,\n" +
                "    \"minMs\": %.3f,\n" +
                "    \"maxMs\": %.3f,\n" +
                "    \"throughputOpsPerSec\": %.1f,\n" +
                "    \"slaPassP50\": %b,\n" +
                "    \"slaPassP99\": %b\n" +
                "  },\n" +
                "  \"uniformPointLookup\": {\n" +
                "    \"samples\": %d,\n" +
                "    \"meanMs\": %.3f,\n" +
                "    \"p50Ms\": %.3f,\n" +
                "    \"p90Ms\": %.3f,\n" +
                "    \"p95Ms\": %.3f,\n" +
                "    \"p99Ms\": %.3f,\n" +
                "    \"throughputOpsPerSec\": %.1f\n" +
                "  },\n" +
                "  \"scanThroughput\": {\n" +
                "    \"orders\": {\"rows\": %d, \"durationMs\": %.2f, \"rowsPerSec\": %.1f, \"mbPerSec\": %.2f},\n" +
                "    \"interaction\": {\"rows\": %d, \"durationMs\": %.2f, \"rowsPerSec\": %.1f, \"mbPerSec\": %.2f}\n" +
                "  },\n" +
                "  \"concurrency\": {\n" +
                "    \"threads\": %d,\n" +
                "    \"throughputQps\": %.1f,\n" +
                "    \"p50Ms\": %.2f,\n" +
                "    \"p95Ms\": %.2f,\n" +
                "    \"p99Ms\": %.2f\n" +
                "  },\n" +
                "  \"batchIngestion\": {\n" +
                "    \"totalRecords\": %d,\n" +
                "    \"durationMs\": %.2f,\n" +
                "    \"avgBatchLatencyMs\": %.2f,\n" +
                "    \"recordsPerSec\": %.1f\n" +
                "  }\n" +
                "}\n",
                new Date().toString(),
                hot.count, hot.mean, hot.p50, hot.p90, hot.p95, hot.p99, hot.min, hot.max, hot.opsPerSec,
                hot.p50 <= 2.0, hot.p99 <= 10.0,
                uniform.count, uniform.mean, uniform.p50, uniform.p90, uniform.p95, uniform.p99, uniform.opsPerSec,
                orders.rowsScanned, orders.durationMs, orders.rowsPerSec, orders.mbPerSec,
                inter.rowsScanned, inter.durationMs, inter.rowsPerSec, inter.mbPerSec,
                CONCURRENT_THREADS, conc.throughputQps, conc.p50, conc.p95, conc.p99,
                write.totalRecords, write.durationMs, write.avgBatchLatencyMs, write.recordsPerSec);

        try (FileWriter fw = new FileWriter(file)) {
            fw.write(json);
        }
    }

    // Benchmark POJOs
    public static class BenchmarkStats {
        public final double mean, min, max, p50, p90, p95, p99, opsPerSec;
        public final int count;
        public BenchmarkStats(double mean, double min, double max, double p50, double p90, double p95, double p99, double opsPerSec, int count) {
            this.mean = mean; this.min = min; this.max = max; this.p50 = p50; this.p90 = p90; this.p95 = p95; this.p99 = p99; this.opsPerSec = opsPerSec; this.count = count;
        }
    }

    public static class ScanStats {
        public final long rowsScanned;
        public final double durationMs, rowsPerSec, mbPerSec;
        public ScanStats(long rowsScanned, double durationMs, double rowsPerSec, double mbPerSec) {
            this.rowsScanned = rowsScanned; this.durationMs = durationMs; this.rowsPerSec = rowsPerSec; this.mbPerSec = mbPerSec;
        }
    }

    public static class ConcurrentStats {
        public final double throughputQps, p50, p95, p99;
        public ConcurrentStats(double throughputQps, double p50, double p95, double p99) {
            this.throughputQps = throughputQps; this.p50 = p50; this.p95 = p95; this.p99 = p99;
        }
    }

    public static class BatchWriteStats {
        public final int totalRecords;
        public final double durationMs, avgBatchLatencyMs, recordsPerSec;
        public BatchWriteStats(int totalRecords, double durationMs, double avgBatchLatencyMs, double recordsPerSec) {
            this.totalRecords = totalRecords; this.durationMs = durationMs; this.avgBatchLatencyMs = avgBatchLatencyMs; this.recordsPerSec = recordsPerSec;
        }
    }
}
