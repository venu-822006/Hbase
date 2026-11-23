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
}
