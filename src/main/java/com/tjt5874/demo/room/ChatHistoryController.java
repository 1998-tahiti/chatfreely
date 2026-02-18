package com.tjt5874.demo.room;

import com.tjt5874.demo.room.model.ChatMessageEntity;
import com.tjt5874.demo.room.repository.ChatMessageRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class ChatHistoryController {

    private final ChatMessageRepository chatMessageRepository;

    public ChatHistoryController(ChatMessageRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    @GetMapping("/{roomCode}")
    public List<text> getMessages(@PathVariable String roomCode) {

        List<ChatMessageEntity> entities =
                chatMessageRepository.findByRoomCodeOrderByCreatedAtAsc(roomCode);

        return entities.stream().map(e -> {
            text t = new text();
            t.setSender(e.getSender());
            t.setContent(e.getContent());
            t.setType(e.getType());
            t.setRoomCode(e.getRoomCode());
            return t;
        }).collect(Collectors.toList());
    }
}
