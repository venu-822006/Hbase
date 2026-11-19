package crm.api.controller;

import crm.api.service.MlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ml")
public class MlController {

    private final MlService mlService;

    @Autowired
    public MlController(MlService mlService) {
        this.mlService = mlService;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview() {
        return ResponseEntity.ok(mlService.getOverview());
    }

    @GetMapping("/segments")
    public ResponseEntity<?> getSegments() {
        return ResponseEntity.ok(mlService.getSegments());
    }

    @GetMapping("/churn-risk")
    public ResponseEntity<?> getChurnRisk(@RequestParam(defaultValue = "15") int limit) {
        return ResponseEntity.ok(mlService.getTopChurnRisk(limit));
    }

    @GetMapping("/model-params")
    public ResponseEntity<?> getModelParams() {
        return ResponseEntity.ok(mlService.getModelParams());
    }

    @PostMapping("/predict")
    public ResponseEntity<?> predict(@RequestBody(required = false) Map<String, Object> body) {
        double recency = 45.0;
        double frequency = 5.0;
        double monetary = 2400.0;
        double cancellations = 0.0;

        if (body != null) {
            if (body.get("recency") != null) recency = ((Number) body.get("recency")).doubleValue();
            if (body.get("frequency") != null) frequency = ((Number) body.get("frequency")).doubleValue();
            if (body.get("monetary") != null) monetary = ((Number) body.get("monetary")).doubleValue();
            if (body.get("cancellations") != null) cancellations = ((Number) body.get("cancellations")).doubleValue();
        }

        return ResponseEntity.ok(mlService.predict(recency, frequency, monetary, cancellations));
    }

    @PostMapping("/retrain")
    public ResponseEntity<?> retrain() {
        Map<String, Object> result = mlService.retrain();
        if ("ERROR".equals(result.get("status"))) {
            return ResponseEntity.status(500).body(result);
        }
        return ResponseEntity.ok(result);
    }
}
