package com.booksys.guest.preference;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class GuestPreferenceController {

    private final GuestPreferenceRepository repo;

    @GetMapping("/{guestId}/preferences")
    public ResponseEntity<GuestPreference> get(@PathVariable UUID guestId) {
        return repo.findByGuestId(guestId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(GuestPreference.builder().guestId(guestId).build()));
    }

    @PutMapping("/{guestId}/preferences")
    public ResponseEntity<GuestPreference> upsert(
            @PathVariable UUID guestId,
            @RequestBody GuestPreference incoming) {

        GuestPreference pref = repo.findByGuestId(guestId).orElseGet(() -> {
            GuestPreference p = new GuestPreference();
            p.setGuestId(guestId);
            return p;
        });

        pref.setRoomFloor(incoming.getRoomFloor());
        pref.setBedType(incoming.getBedType());
        pref.setPillow(incoming.getPillow());
        pref.setSmokingPreference(incoming.getSmokingPreference());
        pref.setViewPreference(incoming.getViewPreference());
        pref.setDietaryRestrictions(incoming.getDietaryRestrictions());
        pref.setAllergies(incoming.getAllergies());
        pref.setQuietRoom(incoming.getQuietRoom());
        pref.setHighFloor(incoming.getHighFloor());
        pref.setAccessibleRoom(incoming.getAccessibleRoom());
        pref.setExtraTowels(incoming.getExtraTowels());
        pref.setExtraPillows(incoming.getExtraPillows());
        pref.setEarlyCheckIn(incoming.getEarlyCheckIn());
        pref.setLateCheckOut(incoming.getLateCheckOut());
        pref.setSpecialRequests(incoming.getSpecialRequests());
        pref.setInternalNotes(incoming.getInternalNotes());

        return ResponseEntity.ok(repo.save(pref));
    }
}
