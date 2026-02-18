

package com.tjt5874.demo.room;

import com.tjt5874.demo.room.model.RoomEntity;
import com.tjt5874.demo.room.RoomService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createRoom(
            @RequestBody Map<String, String> request) {

        String roomName = request.get("roomName");
        String createdBy = request.get("createdBy");

        Map<String, Object> response = new HashMap<>();

        if (roomName == null || roomName.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Room name is required");
            return ResponseEntity.badRequest().body(response);
        }

        RoomEntity room = roomService.createRoom(roomName, createdBy);

        response.put("success", true);
        response.put("message", "Room created successfully");
        response.put("roomCode", room.getRoomCode());
        response.put("roomName", room.getRoomName());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/join")
    public ResponseEntity<Map<String, Object>> joinRoom(
            @RequestBody Map<String, String> request) {

        String roomCode = request.get("roomCode");

        Map<String, Object> response = new HashMap<>();

        if (roomCode == null || roomCode.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Room code is required");
            return ResponseEntity.badRequest().body(response);
        }

        boolean canJoin = roomService.joinRoom(roomCode);

        if (canJoin) {
            Optional<RoomEntity> roomOptional = roomService.getRoomByCode(roomCode);
            if (roomOptional.isPresent()) {
                RoomEntity room = roomOptional.get();
                response.put("success", true);
                response.put("message", "Joined room successfully");
                response.put("roomCode", room.getRoomCode());
                response.put("roomName", room.getRoomName());
                return ResponseEntity.ok(response);
            }
        }

        response.put("success", false);
        response.put("message", "Invalid room code");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @GetMapping("/list")
    public ResponseEntity<List<RoomEntity>> getActiveRooms() {
        List<RoomEntity> rooms = roomService.getActiveRooms();
        return ResponseEntity.ok(rooms);
    }
}