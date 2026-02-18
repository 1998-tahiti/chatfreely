package com.tjt5874.demo.room.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
public class ChatMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sender;

    @Column(length = 2000)
    private String content;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String roomCode;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public ChatMessageEntity() {}

    public ChatMessageEntity(String sender, String content, String type, String roomCode, LocalDateTime createdAt) {
        this.sender = sender;
        this.content = content;
        this.type = type;
        this.roomCode = roomCode;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getRoomCode() { return roomCode; } // NEW
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; } // NEW

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
