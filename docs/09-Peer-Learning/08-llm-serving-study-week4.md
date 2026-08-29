---
title: Hands-On LLM Serving Optimization Study - Week4
description: --
date: 2026-08-29
sidebar_class_name: hidden-sidebar-item
image: /img/posts/09-Peer-Learning/05-llm-serving-study-week1/llm-serving-book.jpg
---

---
## CH7. Advanced LLM Optimization Techniques

---
### Speculative Decoding

---
#### Speculative Decoding이란?

검색이나 추천을 위해 백만 개의 데이터 포인트를 가진 대규모 머신러닝 시스템에서는, **첫 번째 필터링 단계를 위해 작지만 정확도가 낮은 모델을 사용**하는 것이 일반적이다. (시간, 비용 효율적)

```
원래:

The weather is [???] [???] [???]
                 ↑
              순차적으로
              알아내야 함


Draft 사용:

The weather is [sunny] [and] [warm]
                 ↑       ↑     ↑
              일단 후보를 채움

Target 검증:

The weather is [sunny] [and] [warm]
                 ✓       ✓      ✓
```

Speculative Decoding도 비슷한 개념이다.

Draft Model 이라고 부르는 작은 모델을 활용해 대형 Target Model을 위한 후보 토큰을 생성하는데 도움을 준다. 이로 인해 디코딩 단계가 빨라진다.

즉, <span class="t-red">토큰 생성 과정에서 작은 Draft Model이 다음에 올 토큰이 무엇인지 추측한다. 그리고 Target Model이 이렇게 생성된 토큰들을 검증</span>한다. 검증 기준에 충족된 토큰들은 받아들이고, 아닌 토큰들은 버린다.

이 기법의 가장 큰 장점은 <span class="t-red">속도는 얻지만 품질 저하는 없다</span>는 것이다.  단순히 빠른 모델을 쓰는 게 아니라, 수학적으로 원래 target 모델의 확률 분포와 동일한 분포에서 샘플링한 것과 같은 결과가 나오도록 설계되어 있기 때문이다.(rejection sampling 방식)

> [!info] 왜 빠른가?
> - (Draft Model이 생성한) 여러 토큰을 한 번의 target forward pass로 검증하므로, target 모델이 토큰마다 개별로 forward pass를 하는 것보다 훨씬 효율적.
> - GPU는 순차 연산보다 병렬 연산에 강하기 때문에 이 병렬 검증이 실질적인 속도 향상(특히 ITL, 토큰 간 지연시간)을 만들어낸다.

----
#### 자세한 과정 설명

![](assets/08-llm-serving-study-week4/speculative1.png)

- 먼저 Draft Model이 빠르게 K개의 토큰을 생성 (여기서의 K 또한 최적값으로 튜닝해야하는 중요한 파라미터)
- 예를들어 "The soccer team of the United"라는 문구가 주어졌을 때, Draft 모델이 다음 토큰의 확률을
	- "State" - 0.6
	- "Kingdom" - 0.3
	- "Nations" - 0.1
- 이라고 예측했을 때, 만약 Target Model이 "State"의 확률을 0.8로 판단한다면 (Draft의 0.6보다 높으므로) 그 토큰을 그대로 수락한다.
- 만약 Target Model이 "State"의 확률을 0.4로 판단한다면, 보통 0.4를 0.6으로 나눈 값을 기준으로 수락 여부를 확률적으로 결정한다.
- Target Model이 그대로 토큰을 수락한다면, 다음 토큰 검증으로 넘어간다.
- 만약 수락하지 않는다면, 해당 토큰 이후의 모든 토큰을 버린다. (이후의 토큰들은 해당 토큰의 영향이 있으므로) 대신, Target Model이 적절하다고 판단하는 토큰을 하나 직접 생성한다. (위 그림의 Token3)

---
#### 실무에서의 Speculative Decoding 팁들

**Draft Model 모델을 선택하는 여러 방법**

| 방법                      | 방식                           |
| ----------------------- | ---------------------------- |
| 기존 소형 모델                | 같은 계열의 작은 모델을 그대로 사용(양자화 권장) |
| 증류(Distrillation)       | 타깃 모델로부터 소형 모델을 직접 학습        |
| 셀프 드래프팅 (Medusa, EAGLE) | 타깃 모델 자체에 예측 헤드/모듈 추가        |
| N-gram                  | 프롬프트 내 반복 패턴을 테이블화해 매칭       |

1. 기존 소형 모델
	- 같은 계열의 모델을 사용하면 동일한 토크나이저와 사전학습을 공유하게 되어 높은 수락률을 달성하는 데 실질적으로 도움이 된다.
	- 또한, 이러한 같은 계열의 모델은 공격적으로 양자화하여 Draft Model로 사용하는 것도 좋은 방법인데, 어차피 Target Model이 항상 fallback 역할을 해주기 때문이다.

2. 증류(Distillation)
	- 만약 어느정도 training이 가능한 환경이라면, 기존의 작은 모델을 그냥 고르기보다는 Target Model로부터 작은 같은 계열의 작은 모델을 증류(distill)하는 것이 보통 더 낫다.
	- 이러한 과정은 Draft Model의 예측과 Target의 검증 단계 사이의 불일치를 줄여준다. (수락률 높아짐)

![medusa | 500](assets/08-llm-serving-study-week4/medusa.png)

![eagle|500](assets/08-llm-serving-study-week4/eagle.png)

3. 셀프 드래프팅 (Medusa, EAGLE)
	- 모델 스스로가 자신의 미래 토큰을 Draft하게 하는 방식이다.
	- Target Model에 경량 예측 헤드(prediction head)나 보조 모듈(auxiliary module)을 추가해 같은 모델 안에서 여러 단계 앞을 내다보는 예측(multistep lookahead)을 만들어낸다.
		- 여기서의 head는 '최종 벡터(hidden state) -> 문자 토큰 별 확률' 로 바꾸는 부분이다.
		- 그러니까, Target Model의 검증 전에 Target Model안에서 경량 헤드로 k개의 토큰을 만든다는 뜻
	- 별도의 Draft Model 없이 수행하기 때문에 GPU 메모리를 절약하고 배포를 단순화한다.
	- 첫번째 그림의 Medusa는 여러 헤드로 한번에 여러 토큰들을 만들어내고, 여러 후보 토큰들을 조합해 그중 가장 길게 수락되는 후보를 선택한다. (한번에 여러 토큰 생성)
	- 두번재 그림의 EAGLE(Extrapolation Algorithm for Greater Language-Model Efficiency)은 Medusa처럼 토큰을 직접 드래프트하지 않는다.
		- Target Model의 미래 내부 hidden state를 예측하도록 학습된 작은 보조 모듈을 사용한다.
		- 이를 통해서 비싼 Target Model의 연산을 덜 하게 민들어 전체 디코딩 속도를 높인다. (한번에 여러 토큰 생성은 아님)

|트라이그램 테이블 (n=3)|다음 토큰|카운트|
|---|---|---|
|a quick brown|(해당 없음, 등장만)|1|
|quick brown **fox**|-|1|

4. N-gram
	- 작은 모델이나 모듈이 토큰을 추측하게 하는 대신, 세 번재 옵션으로 n-gram이라는 단순한 방법이 있다.
	- 기본적으로 요청의 앞부분에서 인접한 n개의 시퀀스를 골라, 이를 위와같은 n-gram 테이블에 저장한 뒤, 매칭을 수행해 다음 토큰들을 제안하는 방식이다.
	- `An hour ago, a quick brown fox ran away and now, that quick brown [next token]`
	- 위 표의 2번째 행을 근거로 다음 토큰이 fox일 것이라고 제안한다. (AI 기법이라기 보다는 캐싱과 비슷하다고 생각하면 됨)
	- 단순한 캐싱과 같은 방법이므로 오버헤드가 매우 낮으면서도 다음과 같은 상황에서 매우 강력하다.
		- JSON이나 SQL 파일 같은 구조화된 출력(structured output)을 생성할 때
		- LLM에게 글을 다듬거나 미리 정해진 템플릿을 채우도록 요청할 때


**K 파라미터 튜닝 (Draft 토큰 개수)**
- K↑ → 잠재적 속도 향상 상한 ↑, 그러나 수락률이 낮으면 낭비도 ↑
- K↓ → 예측 가능하고 안정적이지만 이득이 제한적
- 실무 권장: 보통 4~8, 구조화된 출력/함수 호출처럼 예측 가능성이 높으면 16~32까지도 가능
- 위치별 수락률(예: [0.8, 0.7, 0.6, 0.5, 0.10, 0.02])을 모니터링해 이득이 없는 뒷부분은 K를 줄여 잘라내는 것이 실전 튜닝법


**Speculative Decoding의 한계**
- prefill이 아닌 decode 단계에만 유효 : 긴 입력 컨텍스트처럼 이미 compute-bound인 상황에서는 효과 없음
- 엔지니어링 난이도 : 두 모델을 한 GPU에서 동시에 효율적으로 운용하는 것 자체가 어려움 → 그래서 최근 트렌드는 별도 드래프트 모델보다 셀프 드래프팅 + n-gram으로 이동
- 정적 K의 한계 → 적응형(adaptive) K에 대한 연구가 활발


> **결론**
> 추론적 디코딩은 "**처리량(throughput)이나 TTFT를 다소 희생해도 ITL/지연시간을 낮추고 싶은**", **memory-bound·저배치·저지연 요구 시나리오**에서 가장 강력한 무기다. 

> [!info] 실습
> - https://github.com/orca3/llm-model-inference/blob/main/ch07/SpecDecode.ipynb
> - 위 실습을 추후 `Runpod` 나 `AWS GPU EC2`에서 돌려보자.

---
### Multi-GPU / Multi-Node 에서의 추론

---
#### 개요

현대의 LLM은 종종 단일 GPU가 감당할 수 있는 메모리 용량을 초과하며, 이를 낮은 지연 시간으로 대규모로 서비스하는 것은 한 개의 GPU가 감당할 수 있는 범위를 훨씬 넘어선다.

이러한 한계를 극복하기 위해 추론 시스템은 하나 이상의 노드에 분산된 여러 GPU를 활용하는 분산 전략을 사용한다. 

이 섹션에서는 분산 서빙에 초점을 맞추고 네 가지 병렬 처리 기법을 다룬다.

1. 데이터 병렬 처리 (DP, Data Parallelism)
	- 처리량 확장을 위해 GPU와 노드 전반에 모델 인스턴스를 복제
2. 텐서 병렬처러 (TP, Tensor Parallelism)
	- 대형 모델에 적합하며, 레이어와 대규모 행렬 연산을 분할하여 지연시간을 줄임
3. 파이프라인 병렬 처리 (PP, Pipeline Parallelism)
	- 대규모 모델 훈련에 적합하며, 레이어를 여러 GPU 및 노드에 걸쳐 단계별로 분할하여 처리
4. 전문가 병렬 처리 (jExpert Parallelism)
	- 전문가 혼합(MoE) 모델의 경우, 전문가들을 여러 GPU에 분산시켜 작동시킴

---
#### 데이터 병렬 처리 (DP)

> Inference Serving 관점에서 데이터 병렬화를 다룬다.

![dp|500](assets/08-llm-serving-study-week4/dp.png)

일반적인 소프트웨어 워크로드에서 많이 사용되어 익숙한 Replica를 늘려 수평확장하고 로드밸런싱하는 방법과 동일하다. (부하 분산 및 고가용성 보장)

다만, LLM 서빙에 사용되는 하드웨어는 매우 고가이기 때문에, 효율적인 라우팅 메커니즘의 가치는 일반적인 소프트웨어 워크로드 보다 높다.

이에 아래와 같은 다양한 라우팅 전략을 사용한다.

**라운드 로빈**
- 일반적인 소프트웨어 워크로드에서 가장 익숙한 방법
- 그냥 순서대로 각 인스턴스에 고루 분산
- 특정 요청은 처리 시간이 길 수 있기 때문에 불균등한 부하로 이어질 수 있다.

**최소 연결**
- 활성 연결 수가 가장 적은 인스턴스로 라우팅
- 라운드 로빈보다는 낫지만, 이미 처리 중인 요청의 복잡성이나 길이는 고려하지 않는다.

**Latency 기반 라우팅**
- 실시간 Latency를 지속적으로 모니터링하고, 가장 빠르게 응답하는 인스턴스로 라우팅
- 이 방법은 성능 변동에 동적으로 대응함으로써 tail latency(응답 시간 분포에서 가장 느린 구간의 레이턴시)를 개선시킨다.

**캐시 인지 라우팅** (Cache-aware routing)
- CH6에서 prefix caching을 소개했는데, 이는 input의 prefix가 동일할 때 요청 간 기존 KV 캐시를 재사용하는 기법이었다.
- 이를 라우팅에 적용하여 여러 인스턴스 중 해당 prefix cache를 가진 인스턴스로 라우팅하는 방법이다.

---
#### 텐서 병렬처리(TP)와 파이프라인 병럴처리(PP)

**의사결정트리**

![decision-tree|400](assets/08-llm-serving-study-week4/decision-tree.png)

1. 가능하면 GPU 1개로 해결 - 같은 노드라도 GPU간 인터커넥트는 GPU 내부 대역폭보다 훨씬 느리다.
2. 메모리가 부족하면 먼저 양자화 시도
3. 그래도 안되면 멀티 GPU 노드 (노드 1개) - 노드 간 대역폭(InfiniBand)은 노드 내 대역폭(NVLink)보다 훨씬 느리다.
	- 만약, NVLink가 아니라 PCIe라면, 그냥 다른 모델 선택을 선택하거나 PP 고려하자. -> PCIe는 TP를 하기에 너무 느리다.
4. 모델이 멀티 GPU 노드에도 안들어가면 멀티 노드
	- 이때 TP는 노드 내부에서만, PP는 노드간에 적용하는 하이브리드 전략이 표준이다.


**TP와 PP**

![](assets/08-llm-serving-study-week4/tp-and-pp.png)

- TP는 모델을 너비 방향으로 샤딩하고, PP는 깊이 방향으로 샤딩한다.
- 쉽게 얘기하면, TP는 Weight들을 여러 GPU로 분할하여 계산하는 방식이다.
	- 다만, 모든 레이어에서 GPU간 통신이 필요하다. (계산 후 결과를 합치야 다음 레이어 계산이 가능하기 때문)
- 반면에, PP는 모델의 Layer들을 여러 GPU로 분할하여 계산하는 방식이다.
	- GPU 1개의 연산이 모두 끝나고 다음 GPU에 있는 레이어에 넘어갈 때만 GPU간 통신을 한다.
	- 그렇다고 무조건 PP가 좋은건 아닌게, 한 단계가 느려지면 이 영향이 모든 레이어에 전파된다.

---
#### 전문가 병렬화 (EP)

![ep|500](assets/08-llm-serving-study-week4/ep.png)

> [!info] MoE
> - Mixtral, DeepSeek-V3, GPT-OSS 같은 최신 LLM들은 모든 파라미터를 매 토큰마다 사용하는 것이 아니라, **라우터가 토큰마다 소수의 Expert만 선택적으로 활성화**하도록 설계되었다. (큰 모델의 성능을 유지하면서도 연산량을 줄이기 위해)

MoE를 사용하면 토큰당 연산량은 줄어들지만, 전체 Expert 파라미터 총합은 여전히 매우 커서 단일 GPU 메모리에 다 담기지 못하는 경우가 많다.

Expert들을 여러 GPU에 나눠서 배치하고, 각 토큰은 라우터가 선택한 전문가가 실제로 위치한 GPU로만 전달됨 (비활성 전문가가 있는 GPU에는 아무 연산도 요청하지 않아 불필요한 계산을 피함)

> EP는 TP/PP와 독립적으로 쓰이는 것이 아니라 상호 보완적으로 결합되어 사용하는 기법이다.

---
### Prefill-Decode Disaggregation

---
#### 개요

> Prefill-Decode Disaggregation - Prefill과 Decode 분리

TP·PP는 "모델을 어떻게 GPU에 나눠 담을까"만 해결할 뿐, prefill(연산 집약)과 decode(메모리 대역폭 집약)라는 완전히 다른 두 워크로드가 같은 **GPU를 공유하면서 생기는 간섭(interference) 문제는 해결하지 못함.** (CH6의 chunked prefill로 일부 완화는 가능하지만 근본적 해결책은 아니다)

---
#### Prefill-Decode 분리의 이점

1. TTFT/ITL을 독립적으로 최적화 가능
	- 입력이 긴 워크로드는 prefill에 자원을 몰아 TTFT를 줄이고, 출력이 긴 워크로드는 decode에 자원을 몰아 ITL을 줄이는 식으로 비대칭 확장이 가능하다.
2. 워크로드별 독립적으로 최적화 가능
	- Prefill은 주로 compute-bound이므로 Tensor Core 등 GPU 연산 자원을 충분히 활용할 수 있도록 적절한 batch size를 사용하고 (GPU에 연산기가 아주 많은데, 배칭하면 한 번에 더 큰 계산을 만들어 더 많은 연산기를 동시에 사용)
	- Decode는 주로 memory-bandwidth-bound이므로 여러 요청을 batching하여 weight 재사용률과 메모리 대역폭 효율을 높인다. (큰 모델 weight를 읽어와야하는데, 배칭을 하면 한번 읽어왔을 때 동시에 많은 처리 가능)
	- Prefill과 Decode의 최적 batch size가 서로 다르기 때문에, 두 단계를 분리하면 각각 독립적으로 최적화할 수 있다.
3. 하드웨어 선택 다양화
	- prefill=연산 최적화 GPU(예: H100), decode=메모리 대역폭 최적화 GPU(예: H200, 또는 저비용 L40S)로 서로 다른 하드웨어를 매칭해 비용 최적화
4. 독립적, 비대칭적 스케일링
	- prefill은 요청이 버스트성이라 공격적 오토스케일링에 적합하고, decode는 더 예측 가능하고 안정적인 스케일링 전략에 적합

---
#### 아키텍처 소개

**DistServe의 prefill-decode disaggregation architecture**

![dist-serve|500](assets/08-llm-serving-study-week4/dist-serve.png)

- 컨트롤러(Controller)가 모든 들어오는 요청의 진입점 역할을 하며 라우팅을 담당
- 요청이 먼저 Prefill 인스턴스로 전송되어 처리 → 이 과정에서 KV 캐시가 생성됨
- 생성된 KV 캐시가 즉시 Decode 인스턴스로 전달되고, decode 인스턴스가 이를 이어받아 토큰을 순차 생성하며 요청을 완료

> [!info] 참고할만한 다른 아키텍처들
> - https://llm-d.ai/docs/well-lit-paths/foundations/pd-disaggregation
> - Efficient KV Transfer in vLLM via NIXL
> - [NVIDIA Inference Xfer Library (NIXL)](https://developer.nvidia.com/blog/enhancing-distributed-inference-performance-with-the-nvidia-inference-transfer-library/)

---
#### KV Cache 전송

![kv-cache-transfer|600](assets/08-llm-serving-study-week4/kv-cache-transfer.png)

위의 Prefill-Decode 분리 구조처럼 KV Cache를 전송해야하는 경우 고려해야하는 것들이 있다.

KV 캐시 크기는 입력 길이에 선형적으로 비례한다.

8B 모델을 예를 들면, 10240 토큰 기준, 1 ~ 1.5GB가 KV 캐시의 용량이다.

여기서 초당 16개의 요청이라고하면, 초당 최대 25GB의 KV 캐시를 전송해야한다.

이에 인터커넥트 설계가 배포 설계의 핵심 기준이 된다.

| 인터커넥트                   | 대역폭         | 25GB/s 감당 여부 |
| ----------------------- | ----------- | ------------ |
| NVLink (노드 내)           | ~900GB/s+   | 여유 있게 감당     |
| InfiniBand (노드 간, RDMA) | ~50~100GB/s | 그럭저럭 감당      |
| PCIe (노드 간, RDMA 없음)    | ~10GB/s     | 감당 불가 → 병목   |

결국 노드 간 배치 + RDMA(InfiniBand)는 선택이 아니라 필수가 되며, 그 위에 추가 최적화를 얹어야 한다.


**KV 캐시 전송 오버헤드를 줄이는 4가지 기법**

1. 청크 전송 
	- 전체를 한 번에 보내지 않고 작은 블록 단위로 전송
2. 비동기, 논블로킹 전송 
	- prefill 연산과 전송을 오버랩시켜 전송 시간을 "숨김"
3. 레이어 단위 전송
	- KV 캐시가 레이어별로 독립적이므로, prefill이 다음 레이어를 계산하는 동안 이미 끝난 레이어의 캐시를 먼저 보내 decode가 더 일찍 시작하게 함
4. KV 캐시 압축/양자화
	- CH6에서 다룬 KV 캐시 최적화 방법으로 전송할 데이터 자체의 크기를 줄임

> 위의 4가지 방법을 모두 적용하면 타임라인이 아래와 같이 된다.

![overlap|500](assets/08-llm-serving-study-week4/overlap.png)

---
### Advanced KV Caching

---
#### 개요

왜 고급 KV 캐싱이 필요한가? -> 긴 컨텍스트 처리 수요가 계속 늘어나고 있다.

- 코딩 코파일럿 (ex: codex, claude code)
	- 수천 줄의 소스 코드를 컨텍스트로 유지해야 정확한 코드 수정 제안 가능
- 대화형 에이전트
	- 긴 대화 이력 + 고객사별 지식 베이스를 동시에 유지해야 일관된 답변 가능
- 엔터프라이즈 플랫폼
	- 대규모 문서/거래 이력을 다뤄야 추출, 이상 탐지, 개인화가 가능

> 이러한 긴 컨텍스트 요구사항은 <span class="t-red">결국 KV 캐시의 크기와 재사용 문제로 귀결</span>
> 
> 이에, <span class="t-red">더 정교한 KV 캐시 관리 기법이 필요</span>해진다.

---
#### RAG와 CAG

|항목|RAG|CAG|
|---|---|---|
|방식|쿼리 시점마다 관련 문서를 검색해서 프롬프트에 주입|관련 컨텍스트 대부분/전체를 KV 캐시로 미리 캐싱해 재사용|
|장점|컨텍스트 길이와 TTFT를 관리 가능한 수준으로 유지, 최신 정보 반영 용이|실시간 검색이 필요 없어 중복 연산 감소 → RAG보다 빠른 TTFT|
|구현|-|프리픽스 캐싱(정적 지식=프리픽스, 동적 프롬프트=접미사)이 CAG의 기초적 형태|


**CAG가 최근 힘을 받는 2가지 이유**

1. **긴 컨텍스트 모델의 발전**
	- 컨텍스트 윈도우가 100k~1M 토큰까지 확장되면서, 매번 검색할 필요 없이 테넌트의 전체 지식을 한 번에 모델에 로드하는 것이 가능해짐. 
	- 동시에 모델 성능 향상으로 "lost in the middle"(컨텍스트 중간 정보를 놓치는) 문제도 완화되는 중.
2. **KV 캐시 관리 엔지니어링의 발전**
	- GPU 메모리는 여전히 부족하지만, CPU 메모리/SSD/원격 스토리지로의 오프로딩 + 복제본 간(cross-replica) 라우팅 기술 덕분에, 대량의 지식을 KV 캐시로 캐싱해두고 필요할 때 꺼내 쓰는 것이 실용적으로 가능해짐

> 긴 컨텍스트 기반 CAG 서빙은 검색 파이프라인의 복잡성을 줄이고, 더 매끄러운 추론과 더 나은 응답 품질, 그리고 RAG보다 빠른 TTFT를 제공할 수 있는 실질적 대안으로 떠오르고 있다.


**CAG가 빠르지만 항상 더 저렴한 것은 아님**

| 항목                    | RAG                           | Long-context CAG 캐싱된 토큰      |
| --------------------- | ----------------------------- | ---------------------------- |
| 캐싱된 토큰                | 500 (시스템 프롬프트)                | 100,500 (시스템 프롬프트 + 전체 컨텍스트) |
| 캐싱 안 된(일반 prefill) 토큰 | 5,500 (10개 청크×500 + 사용자 프롬프트) | 500 (사용자 프롬프트만)              |
| TTFT                  | 5초 (기준)                       | ~0.5초 (10배 개선)               |
| 요청당 비용                | $0.007                        | $0.013 (약 2배 비쌈)             |

- 위 계산은 GPT-5 모델 기준
- 캐싱된 토큰도 완전히 공짜가 아니라 일반 입력의 10~25% 가격이 매겨짐
- CAG는 캐싱된 토큰량 자체가 압도적으로 많음(100,500 vs 500)이므로, 할인된 단가에도 불구하고 총량이 너무 커서 오히려 RAG보다 비싸짐
- RAG의 숨겨진 비용(오프라인 인덱싱, 벡터 스토리지, 온라인 검색)을 더해도, 이들은 보통 LLM 호출 비용보다 훨씬 저렴하므로 이 시나리오에서는 RAG가 여전히 더 저렴
- TTFT/응답속도가 최우선이고 비용 여유가 있다면 → long-context CAG
- 비용 효율이 중요하고 약간의 지연시간은 감수 가능하다면 → RAG가 여전히 유리할 수 있음
- 실제 선택은 컨텍스트 크기, 캐시 재사용 빈도(동일 캐시를 얼마나 많은 요청이 재사용하는가), 벤더별 캐싱 요금제를 모두 고려해 케이스별로 계산해봐야 함

---
#### Self-Hosting LLMs

> 앞서 설명한 모든 비용 계산은 서드파티 API를 사용한다는 가정하에 이루어졌다.
> 
> 이제 자체 호스팅 모델을 최적화해서 롱 컨텍스트 CAG가 더 빠르고 저렴하게 작동하도록 하는 방법을 살펴본다. 
> 
> LMCache라는 구체적인 프레임워크를 중심으로 3가지 핵심 기법을 소개한다.

**KV 캐시 오프로딩 (KV Cache Offloading)**

![kv-cache-offloading|500](assets/08-llm-serving-study-week4/kv-cache-offloading.png)

- **KV 캐시**를 GPU 메모리에만 두지 않고 **GPU → CPU 메모리 → SSD → 네트워크 스토리지(Redis/S3)로 계층화**
- CPU 메모리 활용 시 KV 캐시 공간 약 3배, SSD까지 활용 시 최대 50배 확장 가능
- 비용 임팩트: 기존 프리픽스 캐싱만으로는 인스턴스 하나에 장문 컨텍스트 캐시 1개만 담겨서, 여러 테넌트를 처리하려면 모델 복제본을 여러 개 띄워야 했음. 오프로딩을 쓰면 인스턴스 하나가 4개 캐시를 담아 **GPU↔CPU 스와핑으로 처리 가능 → 4배 비용 절감(연간 수백만 달러 규모)**


**KV 캐시 압축 (KV Cache compression)**
- 전통적 **양자화** 또는 **LMCache의 CacheGen**(분포 기반 비트스트림 인코딩)으로 **KV 캐시 크기 축소**
- 효과: 전송 속도↑, 네트워크 지연↓, 압축해제 오버헤드는 미미 → 오프로딩과 결합 시 GPU 메모리 여유 확보 → 배치 크기↑, 처리량↑


**KV 캐시 블렌딩 (KV Cache Blending)**

![kv-cache-blending|500](assets/08-llm-serving-study-week4/kv-cache-blending.png)

- RAG는 여전히 (a) 더 큰 지식 베이스 접근, (b) 최신 정보 반영, (c) 인용 추적 용이성 면에서 강점을 가짐 → **CAG가 RAG를 완전히 대체하는 건 아님**
- **문제**: RAG 청크들은 순서/조합이 매번 달라 **프리픽스 매칭 실패** → KV 캐시 미스 → 전체 재계산 발생
- 단순한 해결책(KV 캐시를 그냥 이어붙이기)은 실패 : self-attention이 캐시들 간의 교차 토큰 상호작용까지 학습하기 때문에, 단순 concat은 이 관계를 깨뜨려 품질이 나빠짐
- **CacheBlend의 해결책**: 전체를 재계산하는 대신, **교차 토큰 관계 보존에 필요한 일부**(기본 15%)만 **선택적으로 재계산** → 전체 재계산 비용은 피하면서 품질 저하는 최소화

> **CacheBlend = “따로 만든 KV Cache들을 그냥 붙이지 말고, 문서 간 관계 때문에 값이 틀어지는 중요한 토큰들만 다시 계산해서 꿰매자.”**


> [!info] 실습
> - https://github.com/orca3/llm-model-inference/blob/main/ch07/LMCache.ipynb

---
## CH8. LLM Serving Frameworks

---
### 왜 LLM 특화 프레임워크를 사용해야하는가?

