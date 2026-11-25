package crm.api.controller;

import crm.api.service.CrmDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/warehouse")
@CrossOrigin(origins = "*")
public class WarehouseController {

    private final CrmDataRepository repository;

    @Autowired
    public WarehouseController(CrmDataRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/lineage")
    public ResponseEntity<Map<String, Object>> getLineage() {
        return ResponseEntity.ok(repository.getWarehouseLineage());
    }

    @GetMapping("/inspect/{datasetId}")
    public ResponseEntity<Map<String, Object>> inspectDataset(
            @PathVariable String datasetId,
            @RequestParam(defaultValue = "12") int limit
    ) {
        return ResponseEntity.ok(repository.inspectDataset(datasetId, limit));
    }

    @GetMapping("/probe")
    public ResponseEntity<Map<String, Object>> probeHBase(
            @RequestParam(defaultValue = "crm_customer") String table,
            @RequestParam(defaultValue = "C014095") String rowKey
    ) {
        return ResponseEntity.ok(repository.probeHBaseRow(table, rowKey));
    }
}
