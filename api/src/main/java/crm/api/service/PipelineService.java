package crm.api.service;

import org.apache.hadoop.hbase.TableName;
import org.apache.hadoop.hbase.client.Admin;
import org.apache.hadoop.hbase.client.Connection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;

@Service
public class PipelineService {

    private final Connection hbaseConnection;
    private final CrmDataRepository repository;

    @Autowired
    public PipelineService(Connection hbaseConnection, CrmDataRepository repository) {
        this.hbaseConnection = hbaseConnection;
        this.repository = repository;
    }

    public Map<String, Object> getPipelineStatus() {
        Map<String, Object> status = new LinkedHashMap<>();

        // 1. HBase Check
        boolean hbaseLive = false;
        List<String> liveTables = new ArrayList<>();
        if (hbaseConnection != null && !hbaseConnection.isClosed()) {
            try (Admin admin = hbaseConnection.getAdmin()) {
                hbaseLive = true;
                for (TableName tn : admin.listTableNames()) {
                    liveTables.add(tn.getNameAsString());
                }
            } catch (Exception ignored) {}
        }

        Map<String, Object> hbaseStatus = new LinkedHashMap<>();
        hbaseStatus.put("connected", hbaseLive);
        hbaseStatus.put("tablesFound", liveTables);
        status.put("hbase", hbaseStatus);

        // 2. Data Files Check
        Map<String, Object> dataStatus = new LinkedHashMap<>();
        dataStatus.put("rawExportExists", fileExists("data/raw/online_retail.csv") || fileExists("../data/raw/online_retail.csv"));
        dataStatus.put("cleanCustomersExists", fileExists("data/clean/customers.csv") || fileExists("../data/clean/customers.csv"));
        dataStatus.put("cleanOrdersExists", fileExists("data/clean/orders.csv") || fileExists("../data/clean/orders.csv"));
        dataStatus.put("cleanCancellationsExists", fileExists("data/clean/cancellations.csv") || fileExists("../data/clean/cancellations.csv"));
        dataStatus.put("mlResultsExists", fileExists("data/results.csv") || fileExists("../data/results.csv"));
        dataStatus.put("campaignsCatalogExists", fileExists("config/campaigns.csv") || fileExists("../config/campaigns.csv"));
        status.put("dataArtifacts", dataStatus);

        // 3. In-memory Cache & Counts
        Map<String, Object> runtimeStatus = new LinkedHashMap<>();
        runtimeStatus.put("loadedCustomers", repository.getAllCustomers().size());
        runtimeStatus.put("loadedOrders", repository.getOrders().size());
        runtimeStatus.put("loadedCancellations", repository.getCancellations().size());
        runtimeStatus.put("loadedCampaigns", repository.getAllCampaigns().size());
        status.put("runtimeWarehouse", runtimeStatus);

        status.put("timestamp", Instant.now().toString());
        return status;
    }

    public Map<String, Object> syncPipeline() {
        repository.reload();
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("status", "SUCCESS");
        res.put("message", "CRM Pipeline repository reloaded and synchronized successfully.");
        res.put("timestamp", Instant.now().toString());
        res.put("pipelineStatus", getPipelineStatus());
        return res;
    }

    private boolean fileExists(String p) {
        return Files.isRegularFile(Paths.get(p));
    }
}
