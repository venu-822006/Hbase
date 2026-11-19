package crm.api.controller;

import crm.api.service.CancellationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cancellations")
public class CancellationController {

    private final CancellationService cancellationService;

    @Autowired
    public CancellationController(CancellationService cancellationService) {
        this.cancellationService = cancellationService;
    }

    @GetMapping
    public ResponseEntity<?> getCancellations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {

        return ResponseEntity.ok(cancellationService.getCancellations(page, size, search));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getCancellationStats() {
        return ResponseEntity.ok(cancellationService.getCancellationStats());
    }
}
