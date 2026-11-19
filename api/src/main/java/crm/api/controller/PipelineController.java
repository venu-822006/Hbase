package crm.api.controller;

import crm.api.service.PipelineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pipeline")
public class PipelineController {

    private final PipelineService pipelineService;

    @Autowired
    public PipelineController(PipelineService pipelineService) {
        this.pipelineService = pipelineService;
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(pipelineService.getPipelineStatus());
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncPipeline() {
        return ResponseEntity.ok(pipelineService.syncPipeline());
    }

    @PostMapping("/reload")
    public ResponseEntity<?> reloadPipeline() {
        return ResponseEntity.ok(pipelineService.syncPipeline());
    }
}
