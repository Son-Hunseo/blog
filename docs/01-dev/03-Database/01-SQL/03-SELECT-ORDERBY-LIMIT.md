---
title: "[DML] SELECT - ORDER BY와 LIMIT"
description: SQL 결과를 정렬하고 제한하는 ORDER BY와 LIMIT의 작동 원리를 실제 예제와 함께 알아봅니다. OFFSET을 활용한 페이지네이션 기법도 함께 다룹니다.
keywords:
  - ORDER BY
  - LIMIT
  - SQL 정렬
  - OFFSET
  - 페이지네이션
---
---
## ORDER BY

```sql
SELECT * | { [ ALL | DISTINCT ] collumn | expression [ alias ], ... }
FROM table_name
WHERE conditions
ORDER BY col_name1 [ ASC | DESC ] [col_name1, ...];
```

- `ORDER BY` : 정렬, default: 오름차순(`ASC`)


```sql
SELECT employee_id, first_name, salary
FROM employees
ORDER BY salary DESC;
```

- 모든 사원의 사번, 이름, 급여 검색. 단, 급여 순 정렬(내림차순)


```sql
SELECT employee_id, first_name, department_id, salary
FROM employees
WHERE department_id IN (50, 60, 70)
ORDER BY department_id, salary DESC;
```

- 50, 60, 70에 근무하는 사원의 사번, 이름, 부서번호, 급여 검색. 단, 부서별 정렬(오름차순) 후 급여 순(내림차순) 검색


---
## LIMIT

```sql
SELECT * | { [ ALL | DISTINCT ] collumn | expression [ alias ], ... }
FROM table_name
WHERE conditions
ORDER BY col_name1 [ ASC | DESC ] [col_name1, ...]
LIMIT 개수 [ OFFSET 시작 인덱스 ];
```

- 검색할 데이터의 수(행) 제한
- `SELECT`문의 가장 마지막에 추가
- offset은 0부터 시작 (인덱스)


```sql
SELECT employee_id, first_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 1 offset 4;
```

- 급여 순 정렬 후 5번째로 높은 급여를 받는 사원의 사번, 이름, 급여


![select7](select7.jpg)

```sql
SELECT employee_id, first_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 0, 5;
```

- 급여 순 정렬 후 1~ 5번째로 급여를 많이 받는 사원의 사번, 이름, 급여
- offset 생략가능 `(LIMIT 시작인덱스, 개수)`
- 생략하지 않았을 떄와 순서 반대인 것에 유의!