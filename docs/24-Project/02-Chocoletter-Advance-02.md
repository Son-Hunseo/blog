---
title: "[초코레터 프로젝트 고도화 - 2] Kafka에서 Redis Streams로 마이그레이션"
description: "[초코레터 프로젝트 고도화 - 2] Kafka에서 Redis Streams로 마이그레이션"
---

---
![focus-chat](assets/focus-chat.png)

## 마이그레이션 이유
### 당시 Kafka 선택 이유

당시에 채팅방 기능을 구현하기 위해 `Kafka`를 사용했다.
채팅 기능 자체의 중요성에 비해 설계를 꽤나 열심히 했다.
'대규모 시스템 설계 기초' 책에 나오는 채팅 시스템 설계를 참고하여 아키텍처를 구성했다.

채팅 기능의 부하가 메인 기능에 전이되는 것을 막기 위해 채팅 기능만 매개하는 백엔드 서버를 따로 두었고, 다중 인스턴스 환경에서의 메시지 라우팅 기능, 수평 확장 같은 측면을 고려하여 메시지 큐를 도입하였다.

이러한 아키텍처 자체는 지금 봐도 문제가 없어보인다.
단지, 1:1 채팅방이라는 간단한 기능에서 `Kafka`와 같은 비교적 무거운 메시지 큐를 사용해야하는지에 대한 의문이 든다.

당시에는 '`Kafka`라는 기술을 한번 사용해보고싶어서' 라는 이유가 가장 컸던 것 같다.
이에 채팅 서비스의 핵심 요구사항을 다시 정의하고 `Kafka`를 계속 사용해야할지 아니면 다른 스택을 사용하는 것이 더 좋을지 고민해보았다.


### 핵심 요구사항 정의

**Must Have**

1. 실시간성 
	- 메모리 기반이므로 `Redis Streams` 우세
2. 멀티 인스턴스 메시지 동기화
	- `Kafka`, `Redis Streams` 모두 가능
3. 메시지 영구 저장 
	- 메모리에 데이터를 계속 쌓아둘 수 없으므로 `Kafka` 우세
	- 단, 현재의 아키텍처에서는 메시지를 받을 때 `MongoDB`에 저장하므로 `Redis Streams`를 사용해도 만족

**Nice to Have**

1. 메시지 재처리 (메시지 전송 실패시 이를 큐에 놔뒀다가 다시 보내는 기능)
	- `Kafka`, `Redis Streams` 모두 가능
2. 높은 처리량
	- `Kafka` 우세


### 의사 결정 근거

결론적으로 `Redis Streams`로 마이그레이션하기로 결정했는데 근거는 다음과 같다.

1. `Redis Streams`와 `Kafka` 모두 핵심 요구사항을 만족함
2. 실시간성에서는 `Redis Streams` 우세, 나머지 부분에서는 `Kafka`가 우위
3. 소모 자원 리소스, 운영 복잡도 측면에서 `Redis Streams` 우세
4. 메시지 영구 저장의 경우 `MongoDB`에서 담당할 수 있으며, 서비스 기간이 짧은 시즈널 서비스임을 감안할 때 `Redis Streams`가 충분히 감당 가능하다고 판단 (`MongoDB`에 저장 후 메시지 큐에서는 삭제)
5. 이에 소모 자원이나 운영 복잡도 측면에서 `Kafka`는 오버엔지니어링이라고 판단하였음


---
## 구현

의존성과 Config의 경우는 큰 의미가 없으니 생략하겠다.

### Producer

```java
@Service
@RequiredArgsConstructor
public class ChatMessageProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;

    public void sendMessage(String roomId, String message) {
        kafkaTemplate.send("chat", roomId, message); // Key로 roomId 설정
    }
}
```

- `Kafka`에서 처리할 때는 `roomId`를 키로 사용해 같은 `roomId`라면 같은 파티션에 저장되게하여 순서를 보장한다.
- 만약 같은 채팅방에서의 메시지가 여러 파티션에 나눠서 저장된다면 Consume하는 입장에서 순서를 보장할 수 없다.


```java
@Service
@RequiredArgsConstructor
public class ChatMessageProducer {

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    public <T> void sendMessage(String roomId, T messageDto) {
        try {
            String message = objectMapper.writeValueAsString(messageDto);
            String streamKey = RedisConfig.getStreamKey(roomId);

            ObjectRecord<String, String> record = StreamRecords.newRecord()
                    .ofObject(message)
                    .withStreamKey(streamKey);

            stringRedisTemplate.opsForStream().add(record);
        } catch (JsonProcessingException e) {
            throw new InternalServerException(ErrorMessage.ERR_SERIALIZE_MESSAGE);
        }
    }
}
```

- `Redis Streams`에서는 `roomId`를 해시값으로 변경한 값을 StreamKey로 사용해서 채팅방마다 독립된 Stream으로 메시지를 보내서 순서를 보장한다.
- 모두 같은 Stream으로 보내고 `roomId`를 구분값으로 메시지를 Consume 한다면, 커다란 Stream에서 해당 메시지만 가져오는 것이 비효율적일 뿐만 아니라 성능을 위해 Consumer를 여러개 띄운다면 순서까지 문제가 생길 수 있다.


### Consumer / Subscriber

```java
@Service
@RequiredArgsConstructor
public class ChatMessageConsumer {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageService chatMessageService;
    private final ChatRoomService chatRoomService;

    @KafkaListener(topics = "${spring.kafka.topic.chat}", groupId = "${spring.kafka.consumer.group-id}")
    public void consumeMessage(String message) {
        // 메시지를 WebSocket으로 전송
        ChatMessageResponseDto chatMessageResponseDto = parseMessage(message);
        String topic = "/topic/" + chatMessageResponseDto.roomId();

        if (chatMessageResponseDto.messageType().equals(MessageType.READ_STATUS)) {
            ChatMessageResponseDto result = ChatMessageResponseDto.builder()
                    .messageType(chatMessageResponseDto.messageType())
                    .senderId(chatMessageResponseDto.senderId())
                    .senderName(chatMessageResponseDto.senderName())
                    .content(chatMessageResponseDto.content())
                    .isRead(false)
                    .createdAt(String.valueOf(LocalDateTime.now()))
                    .build();
            messagingTemplate.convertAndSend(topic, result);
            return;
        }

        // 현재 채팅방에 접속중인 인원이 있는지 확인
        boolean isAllConnected = chatRoomService.isAllConnected(chatMessageResponseDto.roomId());

        messagingTemplate.convertAndSend(topic, ChatMessageResponseDto.builder()
                .messageType(chatMessageResponseDto.messageType())
                .senderId(chatMessageResponseDto.senderId())
                .senderName(chatMessageResponseDto.senderName())
                .content(chatMessageResponseDto.content())
                .isRead(isAllConnected)
                .createdAt(String.valueOf(LocalDateTime.now()))
                .build());

        // MongoDB에 메시지 저장
        chatMessageService.saveChatMessage(ChatMessage.builder()
                .senderId(chatMessageResponseDto.senderId())
                .senderName(chatMessageResponseDto.senderName())
                .roomId(chatMessageResponseDto.roomId())
                .content(chatMessageResponseDto.content())
                .isRead(isAllConnected)
                .build());
    }

    private ChatMessageResponseDto parseMessage(String message) {
        // JSON 문자열을 DTO로 변환
        ObjectMapper objectMapper = new ObjectMapper();
        try {
            return objectMapper.readValue(message, ChatMessageResponseDto.class);
        } catch (JsonProcessingException e) {
            throw new InternalServerException(ErrorMessage.ERR_PARSING_MESSAGE);
        }
    }
}
```

```java
@Slf4j  
@Service  
@RequiredArgsConstructor  
public class ChatMessageSubscriber implements StreamListener<String, ObjectRecord<String, String>> {  
  
    private final SimpMessagingTemplate messagingTemplate;  
    private final ChatMessageService chatMessageService;  
    private final ChatRoomService chatRoomService;  
    private final StringRedisTemplate stringRedisTemplate;  
    private final ObjectMapper objectMapper;  
  
    @Override  
    public void onMessage(ObjectRecord<String, String> record) {  
        try {  
            String message = record.getValue();  
            ChatMessageResponseDto chatMessageResponseDto = parseMessage(message);  
            String topic = "/topic/" + chatMessageResponseDto.roomId();  
  
            if (chatMessageResponseDto.messageType().equals(MessageType.READ_STATUS)) {  
                ChatMessageResponseDto result = ChatMessageResponseDto.builder()  
                        .messageType(chatMessageResponseDto.messageType())  
                        .senderId(chatMessageResponseDto.senderId())  
                        .senderName(chatMessageResponseDto.senderName())  
                        .content(chatMessageResponseDto.content())  
                        .isRead(false)  
                        .createdAt(String.valueOf(LocalDateTime.now()))  
                        .build();  
                messagingTemplate.convertAndSend(topic, result);  
            } else {  
                boolean isAllConnected = chatRoomService.isAllConnected(chatMessageResponseDto.roomId());  
  
                messagingTemplate.convertAndSend(topic, ChatMessageResponseDto.builder()  
                        .messageType(chatMessageResponseDto.messageType())  
                        .senderId(chatMessageResponseDto.senderId())  
                        .senderName(chatMessageResponseDto.senderName())  
                        .content(chatMessageResponseDto.content())  
                        .isRead(isAllConnected)  
                        .createdAt(String.valueOf(LocalDateTime.now()))  
                        .build());  
  
                chatMessageService.saveChatMessage(ChatMessage.builder()  
                        .senderId(chatMessageResponseDto.senderId())  
                        .senderName(chatMessageResponseDto.senderName())  
                        .roomId(chatMessageResponseDto.roomId())  
                        .content(chatMessageResponseDto.content())  
                        .isRead(isAllConnected)  
                        .build());  
            }  
  
            // 메시지 처리 완료 후 ACK 및 삭제  
            String streamKey = record.getStream();  
            stringRedisTemplate.opsForStream().acknowledge(streamKey, RedisConfig.CONSUMER_GROUP, record.getId());  
            stringRedisTemplate.opsForStream().delete(streamKey, record.getId());  
        } catch (Exception e) {  
            log.error("Failed to process message: {}", record.getId(), e);  
        }  
    }  
  
    private ChatMessageResponseDto parseMessage(String message) {  
        try {  
            return objectMapper.readValue(message, ChatMessageResponseDto.class);  
        } catch (JsonProcessingException e) {  
            throw new InternalServerException(ErrorMessage.ERR_PARSING_MESSAGE);  
        }  
    }  
}
```

- 메시지를 Consume / Subscribe 하는 측면에서의 로직은 거의 같다.
- 한가지 다른점이라면, `Redis Streams`의 경우 메모리 기반이기 때문에 메시지를 무한정 보관할 수 없으므로 메시지를 받았다면 `MongoDB`에 저장 후 큐에서 삭제한다.

