package crm.api.controller;

import crm.api.service.CampaignService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/campaigns")
public class CampaignController {

    private final CampaignService campaignService;

    @Autowired
    public CampaignController(CampaignService campaignService) {
        this.campaignService = campaignService;
    }

    @GetMapping
    public ResponseEntity<?> getCampaigns() {
        return ResponseEntity.ok(campaignService.getCampaigns());
    }

    @GetMapping("/offers")
    public ResponseEntity<?> getOffers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String campaign) {

        return ResponseEntity.ok(campaignService.getOffers(page, size, campaign));
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateAndSyncOffers() {
        return ResponseEntity.ok(campaignService.generateAndSyncOffers());
    }

    @PostMapping("/dispatch")
    public ResponseEntity<?> dispatchCampaign(@RequestBody Map<String, String> payload) {
        String cid = payload.get("cid");
        String campaignId = payload.getOrDefault("campaignId", "M002");
        String channel = payload.getOrDefault("channel", "EMAIL");
        String notes = payload.getOrDefault("notes", "Dispatched from CRM Dashboard");

        if (cid == null || cid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Customer ID (cid) is required"));
        }

        Map<String, Object> result = campaignService.dispatchCampaign(cid, campaignId, channel, notes);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/interactions")
    public ResponseEntity<?> getInteractions(@RequestParam(required = false) String cid) {
        return ResponseEntity.ok(campaignService.getInteractions(cid));
    }
}
