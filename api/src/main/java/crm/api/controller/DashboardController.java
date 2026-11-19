package crm.api.controller;

import crm.api.service.DashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {

        try {
            Map<String, Object> summary =
                    dashboardService.getSummary();

            return ResponseEntity.ok(summary);

        } catch (IOException exception) {

            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "status", "ERROR",
                            "message", "Unable to retrieve HBase dashboard data",
                            "details", exception.getMessage()
                    ));
        }
    }
}
