package crm.api.controller;

import crm.api.service.CampaignService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
