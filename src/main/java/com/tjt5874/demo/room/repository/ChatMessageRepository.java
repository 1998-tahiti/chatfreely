package com.tjt5874.demo.room.repository;

import com.tjt5874.demo.room.model.ChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {

    List<ChatMessageEntity> findByRoomCodeOrderByCreatedAtAsc(String roomCode);

    @Query("SELECT c FROM ChatMessageEntity c " +
            "WHERE c.sender = :username AND c.roomCode = :roomCode " +
            "ORDER BY c.createdAt ASC")
    List<ChatMessageEntity> findMessagesByUsernameAndRoom(
            @Param("username") String username,
            @Param("roomCode") String roomCode
    );

    @Query(value = "SELECT * FROM chat_messages " +
            "WHERE room_code = :roomCode " +
            "ORDER BY created_at ASC " +
            "LIMIT :limit", nativeQuery = true)
    List<ChatMessageEntity> findRecentMessagesByRoom(
            @Param("roomCode") String roomCode,
            @Param("limit") int limit
    );

    @Query("SELECT c FROM ChatMessageEntity c " +
            "WHERE c.roomCode = :roomCode " +
            "ORDER BY c.createdAt ASC")
    List<ChatMessageEntity> findAllMessagesByRoom(@Param("roomCode") String roomCode);
}
