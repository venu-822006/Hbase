package crm.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class MlService {

    private static final Logger log = LoggerFactory.getLogger(MlService.class);

    private final CrmDataRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile Map<String, Object> cachedParams = null;

    @Autowired
    public MlService(CrmDataRepository repository) {
        this.repository = repository;
    }

    public Map<String, Object> getOverview() {
        Map<String, Object> metrics = repository.getMlMetrics();
        List<Map<String, Object>> customers = repository.getAllCustomers();

        Map<String, Long> segmentCounts = new LinkedHashMap<>();
        segmentCounts.put("Low value", 0L);
        segmentCounts.put("Regular", 0L);
        segmentCounts.put("Loyal", 0L);
        segmentCounts.put("Premium", 0L);

        long highRisk = 0;
        long mediumRisk = 0;
        long lowRisk = 0;

        for (Map<String, Object> c : customers) {
            String seg = String.valueOf(c.getOrDefault("segment", "Regular"));
            segmentCounts.merge(seg, 1L, Long::sum);

            double churn = ((Number) c.getOrDefault("churnProb", 0.0)).doubleValue();
            if (churn >= 0.6) highRisk++;
            else if (churn >= 0.3) mediumRisk++;
            else lowRisk++;
        }

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("auc", metrics.getOrDefault("auc", 0.778));
        overview.put("r2", metrics.getOrDefault("r2", 0.274));
        overview.put("customersScored", customers.size());
        overview.put("cutoffDate", metrics.getOrDefault("cutoffDate", "2011-11-14"));
        overview.put("segmentDistribution", segmentCounts);
        overview.put("highRiskCount", highRisk);
        overview.put("mediumRiskCount", mediumRisk);
        overview.put("lowRiskCount", lowRisk);

        return overview;
    }

    public List<Map<String, Object>> getSegments() {
        List<Map<String, Object>> customers = repository.getAllCustomers();

        String[] segNames = {"Low value", "Regular", "Loyal", "Premium"};
        String[] descriptions = {
                "Infrequent or lower-spend buyers, sensitive to churn.",
                "Consistent repeat customers forming the baseline revenue stream.",
                "High engagement with above-average purchase frequency.",
                "Top tier contributors with exceptional lifetime value and volume."
        };
        String[] colors = {"#94a3b8", "#0284c7", "#6366f1", "#f59e0b"};

        List<Map<String, Object>> result = new ArrayList<>();

        for (int i = 0; i < segNames.length; i++) {
            String name = segNames[i];
            List<Map<String, Object>> matching = customers.stream()
                    .filter(c -> name.equalsIgnoreCase(String.valueOf(c.get("segment"))))
                    .collect(Collectors.toList());

            long count = matching.size();
            double totalMonetary = 0;
            double totalChurn = 0;
            double totalRecency = 0;
            double totalClv = 0;

            for (Map<String, Object> m : matching) {
                totalMonetary += ((Number) m.getOrDefault("monetary", 0.0)).doubleValue();
                totalChurn += ((Number) m.getOrDefault("churnProb", 0.0)).doubleValue();
                totalRecency += ((Number) m.getOrDefault("recency", 0.0)).doubleValue();
                totalClv += ((Number) m.getOrDefault("clvPred", 0.0)).doubleValue();
            }

            Map<String, Object> seg = new LinkedHashMap<>();
            seg.put("name", name);
            seg.put("count", count);
            seg.put("color", colors[i]);
            seg.put("description", descriptions[i]);
            seg.put("avgMonetary", count > 0 ? Math.round(totalMonetary / count) : 0);
            seg.put("avgChurnProb", count > 0 ? BigDecimal.valueOf(totalChurn / count).setScale(3, RoundingMode.HALF_UP) : 0);
            seg.put("avgRecencyDays", count > 0 ? Math.round(totalRecency / count) : 0);
            seg.put("avgPredictedSpend", count > 0 ? Math.round(totalClv / count) : 0);

            result.add(seg);
        }

        return result;
    }

    public List<Map<String, Object>> getTopChurnRisk(int limit) {
        return repository.getAllCustomers().stream()
                .filter(c -> ((Number) c.getOrDefault("churnProb", 0.0)).doubleValue() >= 0.5)
                .sorted((a, b) -> {
                    double cA = ((Number) a.getOrDefault("churnProb", 0.0)).doubleValue();
                    double cB = ((Number) b.getOrDefault("churnProb", 0.0)).doubleValue();
                    return Double.compare(cB, cA);
                })
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Retrieve trained model parameters exported by ml/crm_ml.py
     */
    public synchronized Map<String, Object> getModelParams() {
        if (cachedParams != null) {
            return cachedParams;
        }

        try {
            Path paramsPath = repository.resolveDataPath("ml_model_params.json");
            if (Files.isRegularFile(paramsPath)) {
                cachedParams = objectMapper.readValue(paramsPath.toFile(), new TypeReference<Map<String, Object>>() {});
                return cachedParams;
            }
        } catch (Exception e) {
            log.warn("Could not load ml_model_params.json: {}", e.getMessage());
        }

        // Return fallback defaults if file not present yet
        Map<String, Object> fallback = new LinkedHashMap<>();
        fallback.put("status", "FALLBACK");
        fallback.put("features", Arrays.asList("recency", "frequency", "monetary", "aov", "tenure", "cancellations"));
        fallback.put("scaler_mean", Arrays.asList(163.15, 1.43, 6.67, 5.61, 345.65, 0.47));
        fallback.put("scaler_std", Arrays.asList(137.0, 0.75, 1.33, 0.74, 151.88, 0.65));
        return fallback;
    }

    /**
     * Run high-speed live ML inference on raw customer inputs
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> predict(double recency, double frequency, double monetary, double cancellations) {
        Map<String, Object> params = getModelParams();

        double aov = monetary / Math.max(frequency, 1.0);
        double tenure = Math.max(recency, 1.0) + 30.0;

        double[] raw = new double[]{
                recency,
                Math.log1p(Math.max(0.0, frequency)),
                Math.log1p(Math.max(0.0, monetary)),
                Math.log1p(Math.max(0.0, aov)),
                tenure,
                Math.log1p(Math.max(0.0, cancellations))
        };

        List<Number> meanList = (List<Number>) params.get("scaler_mean");
        List<Number> stdList = (List<Number>) params.get("scaler_std");

        double[] norm = new double[6];
        for (int i = 0; i < 6; i++) {
            double m = (meanList != null && i < meanList.size()) ? meanList.get(i).doubleValue() : 0.0;
            double s = (stdList != null && i < stdList.size()) ? stdList.get(i).doubleValue() : 1.0;
            norm[i] = (raw[i] - m) / (s != 0.0 ? s : 1.0);
        }

        // 1. Churn Prediction (Logistic Regression Sigmoid)
        double churnIntercept = 0.0400;
        double[] churnCoeffs = new double[]{0.6734, -0.0634, -1.1934, 0.4514, 0.1550, -0.0494};
        double auc = 0.7784;

        Map<String, Object> churnModel = (Map<String, Object>) params.get("churn_model");
        if (churnModel != null) {
            if (churnModel.get("intercept") != null) churnIntercept = ((Number) churnModel.get("intercept")).doubleValue();
            if (churnModel.get("auc") != null) auc = ((Number) churnModel.get("auc")).doubleValue();
            List<Number> cList = (List<Number>) churnModel.get("coefficients");
            if (cList != null && cList.size() == 6) {
                for (int i = 0; i < 6; i++) churnCoeffs[i] = cList.get(i).doubleValue();
            }
        }

        double lrZ = churnIntercept;
        for (int i = 0; i < 6; i++) {
            lrZ += norm[i] * churnCoeffs[i];
        }
        double churnProb = 1.0 / (1.0 + Math.exp(-lrZ));
        churnProb = Math.round(churnProb * 10000.0) / 10000.0;

        // 2. Spend Prediction (Linear Regression)
        double spendIntercept = 822.56;
        double[] spendCoeffs = new double[]{395.58, 12914.56, -15167.70, 9338.84, -588.52, -78.94};
        double r2 = 0.2739;

        Map<String, Object> spendModel = (Map<String, Object>) params.get("spend_model");
        if (spendModel != null) {
            if (spendModel.get("intercept") != null) spendIntercept = ((Number) spendModel.get("intercept")).doubleValue();
            if (spendModel.get("r2") != null) r2 = ((Number) spendModel.get("r2")).doubleValue();
            List<Number> sList = (List<Number>) spendModel.get("coefficients");
            if (sList != null && sList.size() == 6) {
                for (int i = 0; i < 6; i++) spendCoeffs[i] = sList.get(i).doubleValue();
            }
        }

        double linPred = spendIntercept;
        for (int i = 0; i < 6; i++) {
            linPred += norm[i] * spendCoeffs[i];
        }
        double clvPred = Math.round(Math.max(0.0, linPred) * 100.0) / 100.0;

        // 3. Segment Assignment
        String segment;
        if (monetary > 10000 || (monetary > 5000 && frequency > 15)) {
            segment = "Premium";
        } else if (monetary > 1800 || frequency > 6) {
            segment = "Loyal";
        } else if (monetary > 500 || frequency > 2) {
            segment = "Regular";
        } else {
            segment = "Low value";
        }

        // 4. Campaign Recommendation
        String campaign;
        if (churnProb >= 0.6) {
            campaign = "M002 Win-back discount";
        } else if (("Loyal".equals(segment) || "Premium".equals(segment)) && churnProb < 0.3) {
            campaign = "M004 Loyalty rewards";
        } else if (frequency <= 1 && recency < 30) {
            campaign = "M001 Welcome offer";
        } else {
            campaign = "M003 Seasonal sale";
        }

        // 5. Risk Tier
        String riskTier;
        if (churnProb >= 0.6) riskTier = "HIGH RISK";
        else if (churnProb >= 0.3) riskTier = "MEDIUM RISK";
        else riskTier = "HEALTHY";

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("recency", recency);
        response.put("frequency", frequency);
        response.put("monetary", monetary);
        response.put("cancellations", cancellations);
        response.put("aov", Math.round(aov * 100.0) / 100.0);
        response.put("tenure", tenure);
        response.put("churnProb", churnProb);
        response.put("clvPred", clvPred);
        response.put("segment", segment);
        response.put("campaign", campaign);
        response.put("riskTier", riskTier);

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("auc", auc);
        meta.put("r2", r2);
        meta.put("engine", "Apache Spark MLlib (In-memory accelerated)");
        response.put("modelMeta", meta);

        return response;
    }

    /**
     * Retrain the Spark MLlib models via Python script and reload the warehouse cache
     */
    public Map<String, Object> retrain() {
        Map<String, Object> result = new LinkedHashMap<>();
        long startTime = System.currentTimeMillis();

        try {
            Path projectRoot = findProjectRoot();
            Path pythonExe = projectRoot.resolve(".venv/bin/python3");
            String pyCmd = Files.isExecutable(pythonExe) ? pythonExe.toAbsolutePath().toString() : "python3";
            Path mlScript = projectRoot.resolve("ml/crm_ml.py");

            if (!Files.exists(mlScript)) {
                result.put("status", "ERROR");
                result.put("message", "ml/crm_ml.py script not found at " + mlScript.toAbsolutePath());
                return result;
            }

            ProcessBuilder pb = new ProcessBuilder(pyCmd, mlScript.toAbsolutePath().toString(), "--source", "csv");
            pb.directory(projectRoot.toFile());
            pb.environment().put("JAVA_HOME", "/usr/lib/jvm/java-17-temurin-jdk");
            pb.redirectErrorStream(true);

            log.info("Executing MLlib retrain pipeline via: {} {}", pyCmd, mlScript.toAbsolutePath());
            Process process = pb.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(120, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                result.put("status", "TIMEOUT");
                result.put("message", "ML training process timed out after 120 seconds");
                return result;
            }

            int exitCode = process.exitValue();
            if (exitCode == 0) {
                // Refresh data repository and cached parameters
                repository.reload();
                synchronized (this) {
                    cachedParams = null;
                }
                long durationMs = System.currentTimeMillis() - startTime;
                result.put("status", "SUCCESS");
                result.put("message", "PySpark MLlib models retrained and CRM warehouse refreshed successfully.");
                result.put("durationMs", durationMs);
                result.put("metrics", repository.getMlMetrics());
                result.put("output", output.toString().trim());
            } else {
                result.put("status", "ERROR");
                result.put("message", "ML training process exited with error code " + exitCode);
                result.put("output", output.toString().trim());
            }

        } catch (Exception e) {
            log.error("Failed to retrain ML pipeline: {}", e.getMessage(), e);
            result.put("status", "ERROR");
            result.put("message", "Failed to execute ML pipeline: " + e.getMessage());
        }

        return result;
    }

    private Path findProjectRoot() {
        Path p = Paths.get(".").toAbsolutePath().normalize();
        if (Files.exists(p.resolve("ml/crm_ml.py"))) return p;
        if (Files.exists(p.resolve("../ml/crm_ml.py"))) return p.resolve("..").normalize();
        return Paths.get("/home/venu/hbase-crm");
    }
}
