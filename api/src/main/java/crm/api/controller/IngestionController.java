
package crm.api.controller;

import crm.api.service.DataIngestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class IngestionController {

    private final DataIngestionService ingestionService;

    public IngestionController(DataIngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/ingest")
    public ResponseEntity<?> ingest() {

        try {
            Map<String, Object> result = ingestionService.ingestAll();
            return ResponseEntity.ok(result);

        } catch (IOException | RuntimeException e) {
            return ResponseEntity.internalServerError().body(
                Map.of(
                    "status", "FAILED",
                    "message", e.getMessage()
                )
            );
        }
    }
}
