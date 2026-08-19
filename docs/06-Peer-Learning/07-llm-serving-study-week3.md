---
title: Hands-On LLM Serving Optimization Study - Week3
description: "-"
date: 2026-08-19
sidebar_class_name: hidden-sidebar-item
image: /img/posts/06-Peer-Learning/05-llm-serving-study-week1/llm-serving-book.jpg
---

---
## CH5. Challenges When Serving LLMs

---
### Why Optimizing LLM Serving is Important

---
#### 개요

이전 챕터들에서는 모델을 운영 환경에 배포할 때 기능적으로 잘 작동하도록 설계하는 방법을 다뤘다.

지금부터 배울 또 다른 중요한 점은 모델이 <span class="t-red">실제 운영환경</span>에서 빠르고 효율적으로 작동하도록 하는 것이다.

이는 기존의 ML, DL 모델보다 더 큰 리소스를 필요로하는 LLM 모델에서 더욱 더 중요하다.

LLM Serving 최적화에서 중요하게 다뤄야할 요소는 3가지이다.

1. 고객 경험 (Customer Experience)
2. 비용 효율성 (Cost Efficiency)
3. 확장성 (Scalability), 최대 부하 처리 능력 (Peak Load Handling), 실현 가능성 (Feasibility)

---
#### 고객 경험 (Customer Experience)

> <span class="t-red">TTFT</span>(Time To First Token)과 <span class="t-red">응답 지연</span>이 커질수록 만족도가 떨어진다. 그러나 선형적인 것은 아니다.
> 
> 일반적으로 파라미터 수가 클수록 모델 품질이 좋으며, <span class="t-red">모델 품질이 좋을수록 만족도가 높아</span>진다.

![](assets/07-llm-serving-study-week3/customer-experience1.png)

- 이전에 이러한 TTFT를 줄이기 위해서 Streaming을 사용한다고 했었다.
- 이와 별개로 Latency는 결과물이 모두 출력되는데 걸리는 시간이다.
- <span class="t-red">TTFT든 Latency든 이 수치와 고객 만족도는 반비례 관계</span>이지만, 영향이 선형적이진 않다.
	- 20초 -> 1초로 줄이면 만족도가 극적으로 개선되지만, 0.1초 -> 0.01초 처럼 이미 충분히 빠른 구간에서는 체감 차이가 거의 없다.
	- 따라서 <span class="t-red">충분히 빠른 상황에서는 이러한 수치를 조금 늘리는 대신 시간당 처리할 수 있는 요청량(throughput)을 높이는 트레이드오프가 비용 효율 측면에서 더 유리할 수 있다.</span>

![](assets/07-llm-serving-study-week3/customer-experience2.png)

- 고객 경험에서의 또 다른 중요한 축은 <span class="t-red">모델 품질</span>이다.
- 일반적으로 <span class="t-red">파라미터 수가 클수록 모델 품질이 높다.</span>
- 큰 모델은 품질이 좋지만 latency와 비용이 커진다. 반대로 작은 모델은 빠르고 저렴하지만 품질이 낮을 수 있다.

> [!info] 결국 모델 품질, 시간(TTFT, Latency), 비용 사이에서 트레이드오프를 비교하며 최적의 균형을 찾아야한다.

---
#### 비용 효율성 (Cost Efficiency)

> Inference 를 위한 GPU 비용은 빠르게 증가하고 있으며, 이러한 비용은 <span class="t-red">모델 크기</span>와 <span class="t-red">최대 트래픽</span>(traffic peak)에 달려있다.

![](assets/07-llm-serving-study-week3/cost-efficiency.png)

- AI 시스템은 아무리 강력해도 운영 비용이 너무 크면 사업적으로 성립할 수 없다.
- 이러한 AI 비용 구조에서 가장 큰 비중을 차지하는 것은 훈련(train)이 아니라 <span class="t-red">추론</span>(inference)이다.
	- 훈련은 일회성이지만, 추론은 지속적이기 때문이며, 심지어 점점 커지고 있다.
- AI 에이전트, 복잡한 워크플로우는 하나의 워크플로우 안에서 여러 LLM, 임베딩 모델 호출을 필요로 해 추론 비용을 더욱 가중시킨다.

> [!info] AI 비즈니스의 생존을 좌우하는 것은 '추론 비용'이며 효율적인 모델 서빙(같은 하드웨어로 더 높은 처리량, 또는 더 저렴한 하드웨어로 동등한 성능)이 매우 중요하다.

---
#### 확장성, 최대 부하 처리, 실현 가능성

> 추론 최적화를 통해 확장성(Scalability), 최대 부하 처리(Peak Load Handling), 실현 가능성(Feasibility) 측면까지 이점을 누릴 수 있다.

**확장성, 최대 부하 처리**
- 평소 안정적인 트래픽을 처리하던 LLM 서비스도 블랙프레이데이 같은 시기엔 트래픽이 400% 이상 급증할 수 있다.
- 확장성과 최대 부하 처리에 있어 최적화가 부족하다면, 요청 실패로 이어지고 이것은 곧 고객이탈이다.
- 추론 최적화를 통해 추론에 드는 리소스를 줄인다면, 이러한 확장성, 최대 부하 처리에도 매우 큰 도움이 된다.

**하드웨어 유연성**
- 모델을 최적화하여 저사양 칩에서도 구동 가능해진다면, 유연성이 커진다.
- 단순히 비용문제 뿐만 아니라, AWS, GCP, Azure와 같은 주요 클라우드를 사용한다고 하더라도 모든 리전에서 고사양 GPU를 항상 구동할 수 있는것은 아니다.
- 이에, 고사양 GPU에 종속되지 않고 더 넓은 범위의 하드웨어에서 모델을 구동할 수 있는 능력은 매우 중요하다.
- 추론 최적화를 통해 추론에 드는 리소스를 줄인다면, 이러한 하드웨어 유연성 증대에도 매우 큰 도움이 된다.

> [!info] 추론 최적화는 성능, 비용 뿐만 아니라 확장성, 최대 부하 처리, 하드웨어 유연성 측면에서 도움을 주며, 결국 사업의 실현 가능성 자체를 좌우하는 요소이다.

---
### The Role of Accelerator Chips in LLM Serving

---
#### 개요

앞서서 LLM 최적화가 왜 중요한지 알아보았다. 이제 다음 단계는 LLM을 구동하는 하드웨어(가속기 칩, Accelerator Chip)을 이해해야한다.

적절한 하드웨어(GPU) 구성 선택은 LLM 서빙에서 가장 중요한 결정 중 하나이다. 왜냐하면 하드웨어 제약이 메모리 용량, 연산 성능, 효율성을 결정하기 때문이다.

이 챕터에서는 일단 NVIDIA GPU에 초점을 맞춘다. 2026년도 초(책 저자 서술 기준) 현재 NVIDIA의 GPGPU(범용 GPU 컴퓨팅) 솔루션이 여전히 시장을 지배하고 있기 때문이다.

**핵심 개념**
- GPU 연산 성능 (compute power)
- 메모리 용량 (memory capacity)
	- 여기서의 메모리는 VRAM
- 메모리 대역폭 (memory bandwidth)
- 인터커넥트 (interconnects)

이 핵심 개념들을 다룬 뒤, 주요 NVIDIA GPU 모델들의 스펙을 비교 분석하고, LLM 사용 사례별로 어떤 GPU가 적합한지에 대한 저자들의 인사이트를 배운다.

---
#### Compute

Compute 성능은 행렬 곱과 attention/MLP 연산 처리량을 결정한다.

하지만, 보통 <span class="t-red">LLM decode 단계</span>에서는 Compute 성능 제약보다는 <span class="t-red">Memory 대역폭에 제약</span>이 걸리는 경우가 많다.

**용어 정리**
- FLOPS - 초당 부동소수점 연산 횟수
	- 예: `100 TFLOPS` = 초당 약 100조 번의 부동소수점 연산
	- GPU의 **순수 연산 성능**을 나타내는 대표 지표
- Tensor Core 성능 - NVIDIA GPU의 행렬 연산 전용 하드웨어 성능
	- LLM 추론/학습은 대부분 행렬곱이라 Tensor Core 성능이 매우 중요함
	- 일반 CUDA Core의 FLOPS보다 LLM 성능과 더 직접적으로 관련되는 경우가 많음
- 지원 Precision - 어떤 숫자 정밀도 계산 방식을 지원하는지
	- `FP32` : 32비트 실수, 정확하지만 느리고 메모리 많이 사용
	- `FP16` : 16비트, 딥러닝에서 많이 사용
	- `BF16` : 16비트, 학습에 특히 많이 사용
	- `FP8` : 8비트, 최신 GPU에서 LLM 추론/학습 가속
	- `INT8` : 8비트 정수, 양자화 추론
	- `INT4` : 4비트, LLM 모델 메모리를 크게 줄이는 양자화 방식
	- 예: `FP8` 과 같은 연산을 지원하는 GPU는 양자화를 통해 같은 모델을 더 적은 메모리로 올려서 계산할 수 있다.

**비교 예시**

|GPU|Tensor Core|Precision|
|---|---|---|
|오래된 GPU|낮음|FP32, FP16|
|A100|높음|FP32, TF32, FP16, BF16, INT8|
|H100|매우 높음|FP32, TF32, FP16, BF16, **FP8**, INT8|

---
#### Memory

<span class="t-red">VRAM 용량</span>은 모델 weight와 KV cache를 담을 수 있냐 없냐를 결정한다.

<span class="t-red">Memory 대역폭</span>은 weight와 activation을 얼마나 빨리 읽어올 수 있는지를 결정한다.

LLM serving에서는 VRAM 용량과 Memory 대역폭 모두 중요하다.

---
#### Interconnect

여러 GPU가 한 서버 안에 있을 때 GPU 간 통신은 PCIe, NVLink, NVSwitch 구조에 따라 성능 차이가 난다.

예시
- 한 서버 안
	- Tensor parallelism을 사용할 때 GPU 간 activation, partial result, synchronization traffic이 생긴다.
	- 따라서 GPU 수만 늘린다고 항상 빨라지지 않는다.
	- Interconnect bandwith와 topology가 중요하다. (내부 대역폭과, 연결 방식)
- 여러 서버 간
	- 여러 서버에 걸쳐 모델을 나누면 Infiniband, RoCE 같은 네트워크 성능이 중요하다.
	- Inter-node serving은 intra-node serving보다 latency와 운영 복잡도가 커지므로 가능하면 한 노드 안에서 먼저 최적화하는 것이 좋다.

**용어 정리**
- InfiniBand와 RoCE 모두 CPU를 거의 거치지 않고 한 서버의 메모리에서 다른 서버의 메모리로 직접 데이터를 전송하는 방식인 RDMA(Remote Direct Memroy Access)를 활용한다.
- **InfiniBand** - HPC/AI 용 고성능 네트워크로 설계된 별도 네트워크 기술
	- 일반적인 네트워크는 `Application → OS → TCP/IP Stack → NIC → Network` 의 단계를 거치지만
	- RDMA는 `Memory → NIC → Network → NIC → Memory` 형태로 움직여서 지연시간이 낮고 CPU 부하가 적다.
	- 이에, 매우 낮은 latency, 높은 대역폭을 지원한다.
	- 일반 Ethernet과 다르게 전용 NIC, 전용 스위치, 전용 프로토콜을 사용한다.
- **RoCE** (RDMA over Converged Ethernet) - RDMA를 일반 Ethernet 위에서 사용하는 기술
	- RDMA를 기존 Ethernet 인프라를 활용하여 사용하는 기술

> 하나의 서버 내부의 여러 GPU 끼리는 보통 NVLink / NVSwitch
> 
> 여러 서버 간의 GPU 끼리는 InfiniBand / RoCE

> [!tip] GPU 파워 소모량도 중요하다.
> - GPU는 전력과 냉각 비용도 크다.
> - 동일 throughput을 더 낮은 전력으로 달성하는 최적화는 운영 비용에 직접 영향을 준다.
> - Model serving capacity planning에서는 GPU 가격뿐 아니라 전력, rack density, cooling, utilization 까지 함께 계산해야 한다.

---
#### H100 SXM과 H100 NVL의 비교

![](assets/07-llm-serving-study-week3/gpu-archi.png)

> 위 사진은 NVIDIA Hopper 아키텍처의 SM 구조도. 이 구조를 사용하는 GPU는 대표적으로 H100이 있다.

|**항목**|**H100 SXM**|**H100 NVL**|
|---|---|---|
|**FP64**|34 teraFLOPS|30 teraFLOPS|
|**FP64 Tensor Core**|67 teraFLOPS|60 teraFLOPS|
|**FP32**|67 teraFLOPS|60 teraFLOPS|
|**TF32 Tensor Core**|989 teraFLOPS|835 teraFLOPS|
|**BFLOAT16 Tensor Core**|1979 teraFLOPS|1671 teraFLOPS|
|**FP16 Tensor Core**|1979 teraFLOPS|1671 teraFLOPS|
|**FP8 Tensor Core**|3958 teraFLOPS|3341 teraFLOPS|
|**INT8 Tensor Core**|3958 TOPS|3341 TOPS|
|**GPU Memory**|80 GB|94 GB|
|**GPU Memory Bandwidth**|3.35 TB/s|3.9 TB/s|
|**Form Factor**|SXM|PCIe dual-slot air-cooled|
|**Interconnect**|NVIDIA NVLink™: 900GB/sPCIe Gen5: 128GB/s|NVIDIA NVLink: 600GB/sPCIe Gen5: 128GB/s|

> 위 표는 H100 SXM과 H100 NVL의 스펙을 분석한 표이다. 이 섹션에서는 위 2개의 GPU르 비교하며 GPU 사양 읽는 방법을 설명한다.

**Compute**
- 위 표를 보면, `FP16`과 `FP8`에서 H10 SXM이 더 높다. 이 두 정밀도는 딥러닝에서 쓰이는 저정밀도 포맷이다.
- 그렇다고, '모든 용도에서 NVL이 열등하다' 라는 뜻은 아니다.

**Memory**
- 위 표를 보면 NVL이 VRAM이 94GB로 SXM의 80GB보다 더 높다. 또한 대역폭도 3.9TB/s로 SXM의 3.35TB/s 보다 우수하다.

이에 무엇이 더 우월하다고 할 수 없고 아래와 같은 여러 상황에 맞춰 균형을 선택하면 된다.
- 모델을 로드할 VRAM이 부족 -> NVL
- 대역폭에서 병목이 생긴다 -> NVL
- 연산속도에서 병목이 생긴다 -> SXM

![](assets/07-llm-serving-study-week3/form-factor.png)

**Interconnect**
- 하나의 GPU로는 모델을 다 담지 못하거나, 지연시간 요구사항을 맞추기 위해 여러 GPU가 협력해야하는 경우 Interconnect 속성도 중요해진다.

|항목|**H100 PCIe**|**H100 NVL**|**H100 SXM**|
|---|---|---|---|
|**Form factor**|**PCIe**|**PCIe**|**SXM**|
|**NVLink support**|**No (optional)**|**NVLink Bridge**|**NVLink/NVSwitch**|
|**Interconnect GPU-to-GPU bandwidth (GPU 간 대역폭)**|**128 GB/s with PCIe**|**600 GB/s with NVLink Bridge connecting 2 H100 GPUs only**|**900 GB/s connecting up to 8 H100 GPUs**|