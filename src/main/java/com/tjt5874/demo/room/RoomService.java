package com.tjt5874.demo.room;
import com.tjt5874.demo.room.model.RoomEntity;
import com.tjt5874.demo.room.repository.RoomRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final Random random = new Random();

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public String generateRoomCode() {
        String code;
        do {
            // Generate 6-character alphanumeric code
            code = generateRandomCode(6);
        } while (roomRepository.existsByRoomCode(code));

        return code;
    }

    private String generateRandomCode(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    public RoomEntity createRoom(String roomName, String createdBy) {
        String roomCode = generateRoomCode();

        RoomEntity room = new RoomEntity(
                roomCode,
                roomName,
                createdBy,
                LocalDateTime.now()
        );

        return roomRepository.save(room);
    }

    public Optional<RoomEntity> getRoomByCode(String roomCode) {
        return roomRepository.findByRoomCode(roomCode);
    }

    public List<RoomEntity> getActiveRooms() {
        return roomRepository.findActiveRooms();
    }

    public boolean joinRoom(String roomCode) {
        Optional<RoomEntity> roomOptional = roomRepository.findByRoomCode(roomCode);
        return roomOptional.isPresent() && roomOptional.get().isActive();
    }

    public void leaveRoom(String roomCode, String username) {
        // Log leave action (you can add room user tracking if needed)
        System.out.println(username + " left room: " + roomCode);
    }
}