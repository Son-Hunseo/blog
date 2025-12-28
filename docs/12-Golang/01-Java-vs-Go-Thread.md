---
title: Java Thread vs Go Goroutine
description: 자바(Java)의 synchronized와 volatile의 차이부터 Go 언어 고루틴(Goroutine)의 동작 원리까지, 멀티 스레드 환경의 고질적인 문제인 Race Condition과 Visibility 해결법을 상세히 비교 분석합니다. Java 21 가상 스레드(Virtual Thread) 도입 배경과 성능 이점도 함께 확인해 보세요.
keywords:
  - Java vs Go
  - Java Thread
  - Go Goroutine
  - 동시성 프로그래밍
  - 경량 쓰레드
---

---

:::info
쓰레드에 대한 이해가 필요하다.
[프로세스와 쓰레드](../16-OS/01-Process-And-Thread.md) 글 참조
:::

---
## Java Thread
### Race Condition과 synchronized

```java
public class RaceConditionExample {
    private int count = 0;

    public void increment() {
        count++; // 이 부분이 원자적(Atomic)이지 않음
    }

    public static void main(String[] args) throws InterruptedException {
        RaceConditionExample example = new RaceConditionExample();
        
        // 1000번씩 증가시키는 스레드 2개 생성
        Thread t1 = new Thread(() -> {
            for (int i = 0; i < 1000; i++) example.increment();
        });
        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 1000; i++) example.increment();
        });

        t1.start();
        t2.start();
        t1.join();
        t2.join();

        // 기대값: 2000, 실제 결과: 2000보다 작은 값 (예: 1856)
        System.out.println("최종 결과: " + example.count);
    }
}
```

- 위 코드를 실행시키면 결과가 2000이 아니라 2000보다 작은 값이 출력된다.
- 이 문제는 여러 스레드가 동일한 변수를 동시에 증가시킬 때 발생하는 문제이다.
- 이 문제가 발생하는 이유는 `count++` 연산은 겉보기엔 한 줄이지만, 실제로는 '값을 읽기 -> 증가시키기 -> 저장하기'의 3단계로 이루어지기 때문이다.
- 이에 스레드 1이 값을 읽어간 사이에 스레드 2가 값을 수정해버리면 스레드 1은 업데이트된 값이 아닌 과거 값에 1을 더해 덮어쓰게 된다.

```java
// synchronized 로 락 걸어서 해결
// 근데 이게 무조건 좋은건 아니다.
public class RaceConditionExample {  
    private int count = 0;  
  
    public synchronized void increment() {  
        count++; 
    }  
  
    public static void main(String[] args) throws InterruptedException {  
        RaceConditionExample example = new RaceConditionExample();  
  
        // 1000번씩 증가시키는 스레드 2개 생성  
        Thread t1 = new Thread(() -> {  
            for (int i = 0; i < 1000; i++) example.increment();  
        });  
        Thread t2 = new Thread(() -> {  
            for (int i = 0; i < 1000; i++) example.increment();  
        });  
  
        t1.start();  
        t2.start();  
        t1.join();  
        t2.join();  
  
        System.out.println("최종 결과: " + example.count);  
    }  
}
```

- 이를 해결하기 위해 증가 메서드에 `synchronized`를 붙여 해당 메서드의 원자성을 보장한다.
- `synchronized`를 붙이면 결과가 항상 2000이 출력된다.
- `synchronized`는 해당 메서드에 락을 걸고기 때문이다. (데이터베이스의 락과 비슷한 원리)
- 하지만 이를 사용하면 락을 걸고 푸는 과정에서의 비용 때문에 프로그램의 전체적인 성능이 떨어질 수 있다.
- 또한, 두 개 이상의 스레드가 서로가 가진 락을 기다리며 영원히 멈춰버리는 데드락 상황이 발생할 수 있다.
- `Atomic` 클래스를 사용하면 이러한 성능저하를 개선시킬 수 있다.

### Visibility 문제와 volatile

```java
public class VisibilityExample {
    // volatile이 없으면 메인 메모리에 즉시 반영되지 않을 수 있음
    private static boolean stopRequested = false;

    public static void main(String[] args) throws InterruptedException {
        Thread backgroundThread = new Thread(() -> {
            int i = 0;
            while (!stopRequested) {
                i++;
            }
            System.out.println("배경 스레드 종료!");
        });
        backgroundThread.start();

        Thread.sleep(1000); // 1초 대기
        stopRequested = true; // 메인 스레드에서 값을 변경
        System.out.println("중지 요청 완료");
    }
}
```

- 위 코드의 로직대로 따라가면 메인스레드에서 `stopRequested` 값을 바꿨을 때 `while` 루프가 멈추어야하지만 멈추지 않고 무한 루프에 빠진다.
- 왜냐하면, `backgroundThread`는 자신의 CPU 캐시에 저장된 `false` 값을 계속 읽기 때문이다.

```java
public class VisibilityExample {
    // volatile를 사용해서 CPU 캐시가 아닌 메인 메모리에서 작업하도록 강제함
    private static volatile boolean stopRequested = false;

    public static void main(String[] args) throws InterruptedException {
        Thread backgroundThread = new Thread(() -> {
            int i = 0;
            while (!stopRequested) {
                i++;
            }
            System.out.println("배경 스레드 종료!");
        });
        backgroundThread.start();

        Thread.sleep(1000); // 1초 대기
        stopRequested = true; // 메인 스레드에서 값을 변경
        System.out.println("중지 요청 완료");
    }
}
```

- `volatile` 을 사용하면 해당 변수는 CPU 캐시가 아닌 메인 메모리에서 작업하도록 강제한다.
- 이에 `stopRequested` 값을 바꿨을 때  `while` 루프가 바로 멈춘다.

---

## Go
### Goroutine

```go
// Go 방식의 안전한 카운터 예시
func main() {
    hits := make(chan int)
    count := 0

    // 공유 변수를 직접 수정하는 대신 채널로 신호를 보냄
    go func() {
        for i := 0; i < 1000; i++ { hits <- 1 }
    }()
    go func() {
        for i := 0; i < 1000; i++ { hits <- 1 }
    }()

    // 메인 루틴에서만 count를 수정하므로 안전함
    for i := 0; i < 2000; i++ {
        count += <-hits
    }
    fmt.Println(count) // 항상 2000 보장
}
```

- 코드를 실행시키면 항상 2000이 출력된다.
- `synchronized` 처럼 데이터에 락을 거는 방식이 아니라 채널(`channel`)을 통해 값을 주고 받는 원리이다.

### Java Thread 에 비해 갖는 이점

1. 메모리 효율 (Stack Size)
	- Java Thread: 생성 시 기본적으로 약 1MB의 스택 메모리를 할당받는다. (커널 스케줄러가 개입하므로 비용이 큼)
	- Go Goroutine: 처음 생성될 때 단 2KB의 메모리만 사용한다. 필요에 따라 스택 크기가 유동적으로 늘어나거나 줄어든다. (커널이 개입하지 않고 Go 런타임 내의 User Space 스케줄러가 관리하므로 비용이 매우 작음)
2. 컨텍스트 스위칭 비용
	- Java Thread: OS 커널이 직접 관리하기 때문에 작업 전환 시 CPU 레지스터 16~32개를 저장하고 복구해야 하며 커널 모드와 유저 모드를 오가는 오버헤드가 크다.
	- Go Goroutine: Go 런타임 스케줄러가 관리하기때문에 훨씬 적은 수의 레지스터(PC, SP, DX 등 3개 정도)만 저장하면 되므로 전환 속도가 훨씬 빠르다.
3. 스케줄링 방식 (M:N 모델)
	- Java Thread: 1:1 모델입니다. 자바 스레드 1개는 반드시 OS 스레드 1개와 매칭된다. OS 스레드가 비싸기 때문에 많이 만들 수 없다.
	- Go Goroutine: M개의 고루틴을 N개의 OS 스레드 위에서 돌린다. 예를 들어 OS 스레드 8개 위에서 수만 개의 고루틴을 번갈아 가며 실행한다.

---
## 최신) Java의 가상 스레드

- Java 21부터 도입된 가상 스레드(Virtual Thread)는 Go의 Goroutine과 같은 경량 쓰레드로 이와 유사한 효율성을 가진다.

|**구분**|**Java 일반 스레드**|**Go 고루틴**|**Java 가상 스레드**|
|---|---|---|---|
|**관리 주체**|OS 커널|Go 런타임|JVM (유저 레벨)|
|**초기 메모리**|~1MB|~2KB|수 KB 내외|
|**생성 비용**|매우 높음|매우 낮음|매우 낮음|
|**동시성 수**|수천 개|수백만 개|수백만 개|

