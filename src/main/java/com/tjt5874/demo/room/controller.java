package com.tjt5874.demo.room;

import com.tjt5874.demo.room.model.ChatMessageEntity;
import com.tjt5874.demo.room.repository.ChatMessageRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
public class controller {

    private final ChatMessageRepository chatMessageRepository;
    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    public controller(ChatMessageRepository chatMessageRepository,
                      RoomService roomService,
                      SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.joinRoom")
    public void joinRoom(@Payload text msg, SimpMessageHeaderAccessor headerAccessor) {

        String roomCode = msg.getRoomCode();

        if (roomCode == null || roomCode.isBlank()) {
            return;
        }

        boolean ok = roomService.joinRoom(roomCode);
        if (!ok) {
            return;
        }

        headerAccessor.getSessionAttributes().put("username", msg.getSender());
        headerAccessor.getSessionAttributes().put("roomCode", roomCode);

        // Save JOIN event to DB
        ChatMessageEntity entity = new ChatMessageEntity(
                msg.getSender(),
                msg.getSender() + " joined the room",
                "JOIN",
                roomCode,
                LocalDateTime.now()
        );
        chatMessageRepository.save(entity);

        msg.setType("JOIN");
        msg.setContent(msg.getSender() + " joined the room");
        messagingTemplate.convertAndSend("/topic/room/" + roomCode, msg);
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload text msg, SimpMessageHeaderAccessor headerAccessor) {
        System.out.println("SEND called: " + msg.getSender() + " content=" + msg.getContent());
        String roomCode = (String) headerAccessor.getSessionAttributes().get("roomCode");
        if (roomCode == null) {
            return;
        }

        if (msg.getContent() == null || msg.getContent().trim().isEmpty()) {
            return;
        }

        ChatMessageEntity entity = new ChatMessageEntity(
                msg.getSender(),
                msg.getContent(),
                "CHAT",
                roomCode,
                LocalDateTime.now()
        );
        chatMessageRepository.save(entity);

        msg.setType("CHAT");
        msg.setRoomCode(roomCode);
        messagingTemplate.convertAndSend("/topic/room/" + roomCode, msg);
    }

    @MessageMapping("/chat.leaveRoom")
    public void leaveRoom(@Payload text msg, SimpMessageHeaderAccessor headerAccessor) {

        String roomCode = (String) headerAccessor.getSessionAttributes().get("roomCode");
        String username = (String) headerAccessor.getSessionAttributes().get("username");

        if (roomCode == null || username == null) {
            return;
        }

        roomService.leaveRoom(roomCode, username);

        ChatMessageEntity entity = new ChatMessageEntity(
                username,
                username + " left the room",
                "LEAVE",
                roomCode,
                LocalDateTime.now()
        );
        chatMessageRepository.save(entity);

        text out = new text();
        out.setType("LEAVE");
        out.setSender(username);
        out.setRoomCode(roomCode);
        out.setContent(username + " left the room");

        messagingTemplate.convertAndSend("/topic/room/" + roomCode, out);

        headerAccessor.getSessionAttributes().remove("roomCode");
        headerAccessor.getSessionAttributes().remove("username");
    }
}
