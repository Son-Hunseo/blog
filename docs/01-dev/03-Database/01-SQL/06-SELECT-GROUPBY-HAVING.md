---
title: "[DML] SELECT - GROUP BY와 HAVING"
description: 데이터를 그룹화하고 요약하는 GROUP BY와, 그룹 조건을 지정하는 HAVING 절의 차이와 활용법을 예제로 설명합니다.
keywords:
  - GROUP BY
  -  HAVING 절
  - 집계 함수
  - SQL 그룹화
  - AVG SUM COUNT
---
---
## GROUP BY

`GROUP BY`는 '같은 값'을 가진 '행'들을 하나의 그룹으로 묶어주는 기능이다.

### 핵심 규칙

GROUP BY를 사용하는 SELECT 문에서는, SELECT 절에 다음 3가지만 올 수 있다.

1. **GROUP BY 절에 있는 컬럼**

```sql
SELECT department_id, job_id  -- department_id와 job_id 모두 GROUP BY에 있음
FROM employees
GROUP BY department_id, job_id;
```

2. **집계 함수**

```sql
SELECT department_id, COUNT(*), AVG(salary), MAX(salary)  -- 집계 함수들
FROM employees
GROUP BY department_id;
```

3. **상수 (고정된 값)**

```sql
SELECT department_id, '명', COUNT(*), 100  -- '명'과 100은 상수
FROM employees
GROUP BY department_id;
```


이런 규칙이 있는 이유는 다음과 같다.

```sql
SELECT department_id, first_name, AVG(salary) FROM employees GROUP BY department_id;
```

**문제:** department_id가 50인 부서에 여러 직원(예: Steven, Neena, Lex 등)이 있는데, `first_name`에 누구를 표시해야 할까?
- department_id 50은 **하나의 행**으로 나타나는데
- first_name은 **여러 개**가 있어서 모순이 발생

---
## HAVING

- `GROUP BY`한 결과에 조건을 추가 할 경우 `HAVING` 절을 사용한다.
- Query의 실행 순서상 `WHERE`절이 `GROUP BY`절보다 먼저 실행되기 때문에 `GROUP BY` 결과의 조건은 `HAVING`절에 작성한다. (`WHERE`을 사용하면 안된다)

```SQL
SELECT department_id, AVG(salary)
FROM employees
GROUP BY department_id
HAVING AVG(salary) > 7000;
```

- 추가적으로 내림차순으로 정렬하고 싶을 경우

```SQL
SELECT department_id, AVG(salary)
FROM employees
GROUP BY department_id
HAVING AVG(salary) > 7000
ORDER BY AVG(salary) DESC;
```

