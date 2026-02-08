---
title: "[초코레터 프로젝트 고도화 -6] Spring Event로 결합도 낮추기"
description: "[초코레터 프로젝트 고도화 -6] Spring Event로 결합도 낮추기"
---

---
## 문제점
### 강한 결합

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class GiftLetterService {
	private final GiftLetterRepository giftLetterRepository;
	private final QuestionRepository questionRepository;

	private final GiftBoxRepository giftBoxRepository;
	private final MemberRepository memberRepository;
	private final ChatRoomRepository chatRoomRepository;

	private final LetterEncryptionUtil letterEncryptionUtil;
	private final IdEncryptionUtil idEncryptionUtil;

	...

	@Transactional
	public void modifyGiftLetterById(Long memberId, Long giftLetterId, ModifyGiftLetterRequestDto requestDto) {
		GiftLetter giftLetter = giftLetterRepository.findByIdOrThrow(giftLetterId);
		if (!memberId.equals(giftLetter.getSenderId())) {
			throw new ForbiddenException(ErrorMessage.ERR_FORBIDDEN);
		}
		String encryptedContent = letterEncryptionUtil.encrypt(requestDto.content());
		String encryptedAnswer = letterEncryptionUtil.encrypt(requestDto.answer());
		giftLetter.modify(requestDto.nickName(), requestDto.question(), encryptedAnswer, encryptedContent);
	}
}
```

이전 글에서 여러 문제점을 해결했지만 아직 남아있는 문제점이 있다.

위 코드를 보면 `GiftLetter`라는 도메인의 Service임에도 불구하고 `GiftBoxRepository`, `MemberRepository`, `ChatRoomRepository` 라는 다른 도메인의 레포지토리에 의존하고있다.

이는 `GiftLetterService`가 너무 많은 책임을 지고있기 때문에 객체지향 설계 원칙에 맞지 않다. 이러한 구조는 단위 테스트 작성, 유지보수 측면에서 여려워진다.

### Spring Event

![springevent1](assets/springevent1.png)

이때 `Spring Event`를 도입하여 중간에 `ApplicationEventPublisher`라는 이벤트 처리 계층을 두어서 문제를 해결할 수 있다.

:::info
메시지 큐를 도입하지 않고 `Spring Event`를 사용한 이유는 현재 서비스는 MSA 환경이 아닌 하나의 서버에서 모든 로직을 처리하는 간단한 모놀리틱 아키텍처 서버이다. 이러한 환경에서 도메인 간의 결합도를 낮추기 위해 메시지 큐를 도입하는 것은 더 많은 관리 포인트가 추가되는 오버엔지니어링이라고 판단했다.
:::

---
## 해결 과정
### AS-IS

```java
@Slf4j  
@Service  
@RequiredArgsConstructor  
public class GiftLetterService {  
    private final GiftLetterRepository giftLetterRepository;  
  
    private final GiftBoxRepository giftBoxRepository;  
    private final MemberRepository memberRepository;  
    private final ChatRoomRepository chatRoomRepository;  
  
    private final LetterEncryptionUtil letterEncryptionUtil;  
    private final IdEncryptionUtil idEncryptionUtil;
	
	...
	
	@Transactional  
	public void sendFreeGiftLetter(Long senderId, Long giftBoxId, FreeGiftLetterRequestDto requestDto) {  
	    GiftBox receiverGiftBox = giftBoxRepository.findGiftBoxByGiftBoxId(giftBoxId);  
	    if (receiverGiftBox == null) {  
	        throw new NotFoundException(ErrorMessage.ERR_NOT_FOUND_GIFT_BOX);  
	    }  
	  
	    if (giftLetterRepository.findBySenderIdAndGiftBoxId(senderId, giftBoxId).isPresent()) {  
	        throw new BadRequestException(ErrorMessage.ERR_ALREADY_EXISTS_GIFT);  
	    }  
	  
	    Long receiverId = receiverGiftBox.getMember().getId();  
	    String encryptedContent = letterEncryptionUtil.encrypt(requestDto.content());  
	    GiftLetter giftLetter = GiftLetter.createFreeGiftLetter(  
	            receiverGiftBox, senderId, receiverId, requestDto.nickName(), encryptedContent);  
	    giftLetterRepository.save(giftLetter);  
	  
	    GiftLetter receiverGiftLetter = giftLetterRepository.findBySenderIdAndReceiverId(receiverId, senderId).orElse(null);  
	    if (receiverGiftLetter != null) {  
	        chatRoomRepository.save(ChatRoom.builder()  
	                .hostId(receiverId)  
	                .guestId(senderId)  
	                .hostGiftId(giftLetter.getId())  
	                .guestGiftId(receiverGiftLetter.getId())  
	                .build());  
	    }  
	  
	    receiverGiftBox.addGiftCount();  
	  
	    Member sender = memberRepository.findById(senderId)  
	            .orElseThrow(() -> new NotFoundException(ErrorMessage.ERR_NOT_FOUND_USER));  
	    sender.increaseSendGiftCount();  
	}
	...
}
```

위 `sendFreeGiftLetter`는 자유 형식으로 작성한 편지를 전송하는 메서드이다.

이때 주어지는 데이터는 편지를 보낸 사람의 id, 편지를 받는 사람의 편지함 id, 그리고 편지에 대한 데이터들이다. 이에 다른 도메인의 레포지토리에 의존해야하는 로직은 다음과 같다.

1. `giftBoxRepository`에서 편지함 id로 받는 사람의 id를 찾는다.
2. `chatRoomRepository`에서 현재 편지를 받는 사람이 보낸 사람에게 편지를 보낸 적이 있으면 (지금 현재 편지를 보냄으로써 서로 보낸 것이 될 경우) `ChatRoom`을 생성한다.
3. 받는 사람의 편지함의 `giftCount`를 늘린다.
4. `memberRepository`에서 보낸 사람의 편지 보낸 횟수를 늘린다.

이러한 로직들을 `Spring Event`를 통해 각 로직을 이벤트화 시켜 현재 코드에서 이벤트를 `Publish`하고 실제 해당 로직을 수행하는 `Listener`를 만들면 된다.

### Event

```java
@Getter  
@RequiredArgsConstructor  
public class GiftBoxQuery {  
    private final Long giftBoxId;  
    private GiftBox result;  
  
    public void setResult(GiftBox giftBox) {  
        this.result = giftBox;  
    }   
}
```

타 도메인인 편지함 정보를 직접 조회하지 않고, 이벤트를 통해 외부로부터 대상 편지함 데이터를 동기적으로 전달받기 위한 응답 래퍼 객체이다.

```java
@Getter  
@RequiredArgsConstructor  
public class ChatRoomCreateEvent {  
    private final Long hostId;  
    private final Long guestId;  
    private final Long hostGiftId;  
    private final Long guestGiftId;  
}
```

서로 편지를 주고받은 조건이 충족되었을 때 채팅방 도메인에게 새로운 대화 채널 생성을 요청하기 위한 이벤트이다.

```java
@Getter  
@RequiredArgsConstructor  
public class GiftBoxCountIncrementEvent {  
    private final Long giftBoxId;  
}
```

편지 전송이 완료된 후 수신자의 편지함 내 누적 편지 개수를 갱신하도록 알리는 이벤트이다.

```java
@Getter  
@RequiredArgsConstructor  
public class MemberSendCountIncrementEvent {  
    private final Long memberId;  
}
```

발신자 회원의 총 편지 발송 횟수를 증가시키도록 요청하는 이벤트이다.

### Listener

```java
@Component  
@RequiredArgsConstructor  
public class GiftBoxEventListener {  
    private final GiftBoxRepository giftBoxRepository;  
  
    @EventListener  
    public void handleGiftBoxQuery(GiftBoxQuery query) {  
        GiftBox giftBox = giftBoxRepository.findGiftBoxByGiftBoxId(query.getGiftBoxId());  
        if (giftBox != null) {  
            query.setResult(giftBox);  
        }  
    }  
  
	...
}
```

위 코드는 `GiftBoxQuery`를 `ApplicationEventPublisher`로 이벤트를 `Publish`하면 작동하는 `Listener`이다.

위와 같이 정의된 `Event`를 발생시키면 `Listener`에서 로직을 수행한다. 이렇게 다른 이벤트들도 리스너가 존재하며 이를 통해 코드간 결합도를 줄일 수 있다.

### TO-BE

```java
@Slf4j  
@Service  
@RequiredArgsConstructor  
public class GiftLetterService {  
    private final GiftLetterRepository giftLetterRepository;  
  
    private final ApplicationEventPublisher eventPublisher;  
  
    private final LetterEncryptionUtil letterEncryptionUtil;  
    private final IdEncryptionUtil idEncryptionUtil;
    
    ...
	@Transactional  
	public void sendFreeGiftLetter(Long senderId, Long giftBoxId, FreeGiftLetterRequestDto requestDto) {  
	    GiftBoxQuery giftBoxQuery = new GiftBoxQuery(giftBoxId);  
	    eventPublisher.publishEvent(giftBoxQuery);  
	    GiftBox receiverGiftBox = giftBoxQuery.getResult();  
	    if (receiverGiftBox == null) {  
	        throw new NotFoundException(ErrorMessage.ERR_NOT_FOUND_GIFT_BOX);  
	    }  
	  
	    if (giftLetterRepository.findBySenderIdAndGiftBoxId(senderId, giftBoxId).isPresent()) {  
	        throw new BadRequestException(ErrorMessage.ERR_ALREADY_EXISTS_GIFT);  
	    }  
	  
	    Long receiverId = receiverGiftBox.getMember().getId();  
	    String encryptedContent = letterEncryptionUtil.encrypt(requestDto.content());  
	    GiftLetter giftLetter = GiftLetter.createFreeGiftLetter(  
	            receiverGiftBox, senderId, receiverId, requestDto.nickName(), encryptedContent);  
	    giftLetterRepository.save(giftLetter);  
	  
	    GiftLetter receiverGiftLetter = giftLetterRepository.findBySenderIdAndReceiverId(receiverId, senderId).orElse(null);  
	    if (receiverGiftLetter != null) {  
	        eventPublisher.publishEvent(new ChatRoomCreateEvent(  
	                receiverId, senderId, giftLetter.getId(), receiverGiftLetter.getId()));  
	    }  
	  
	    eventPublisher.publishEvent(new GiftBoxCountIncrementEvent(giftBoxId));  
	    eventPublisher.publishEvent(new MemberSendCountIncrementEvent(senderId));  
	}
    ...
}
```

결과적으로 `GiftLetterService`는 다른 도메인의 레포지토리에대한 결합도가 낮아졌다.

이렇게 프로젝트 전체에서 다른 도메인간 높은 결합도를 가지는 코드들을 리팩토링 하였다.