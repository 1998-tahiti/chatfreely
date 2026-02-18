package com.tjt5874.demo.config;

import com.tjt5874.demo.room.text;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@Slf4j
@RequiredArgsConstructor
public class wsListener {

    private final SimpMessageSendingOperations messagingTemplate;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {

        SimpMessageHeaderAccessor headerAccessor =
                SimpMessageHeaderAccessor.wrap(event.getMessage());

        if (headerAccessor.getSessionAttributes() == null) return;

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        String roomCode = (String) headerAccessor.getSessionAttributes().get("roomCode");

        if (username != null && roomCode != null) {
            log.info("user disconnected: {} from room {}", username, roomCode);

            text msg = new text();
            msg.setType("LEAVE");
            msg.setSender(username);
            msg.setRoomCode(roomCode);
            msg.setContent(username + " disconnected");

            messagingTemplate.convertAndSend("/topic/room/" + roomCode, msg);
        }
    }
}
