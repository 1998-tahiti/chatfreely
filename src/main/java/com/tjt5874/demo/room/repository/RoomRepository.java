package com.tjt5874.demo.room.repository;

import com.tjt5874.demo.room.model.RoomEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<RoomEntity, Long> {
    Optional<RoomEntity> findByRoomCode(String roomCode);
    boolean existsByRoomCode(String roomCode);

    @Query("SELECT r FROM RoomEntity r WHERE r.isActive = true ORDER BY r.createdAt DESC")
    List<RoomEntity> findActiveRooms();
}