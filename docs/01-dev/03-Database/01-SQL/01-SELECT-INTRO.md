---
title: "[DML] SELECT - 기본 문법과 별칭(alias), NULL 처리"
description: SQL의 핵심인 SELECT와 FROM 문법을 이해하고, 별칭(alias), 상수 반환, NULL 처리 등 기본 문법을 실습 예제와 함께 배웁니다.
keywords:
  - SQL SELECT
  - FROM 절
  - alias 별칭
  - NULL 처리
  - IFNULL 함수
---
---
## SELECT, FROM

![select1](select1.png)

```sql
SELECT * | { [ALL | DISTINCT] column | expression [ alias ], ...}
FROM table_name;
```

- `SELECT`와 `FROM`은 무조건 함께 사용한다.
- 예외: 상수 반환(`SELECT 1 + 1;`), 함수 호출결과 반환(`SELECT NOW();`)


```sql
SELECT employee_id, first_name, salary
FROM employees;
```

- 모든 사원의 사번, 이름, 급여 검색


![select2](select2.jpg)

```sql
SELECT employee_id 사번, first_name "이름", salary "급 여"
FROM employees;
```

- 별칭(alias)을 사용할 때 `AS`는 생략해도 된다. (`employee_id AS 사번` -> `employee_id 사번`)
- 별칭(alias)을 지정할 때, 큰 따옴표를 사용해도 되고, 사용하지 않아도 되지만, 무조건 사용해야하는 몇몇 경우가 있다.
	1. 공백이 포함된 경우 - ex: `"급 여"`
	2. 대소문자를 구분해야하는 경우
	3. 예약어를 사용해야하는 경우 - ex: `"Select"`, `"From"`, `"Table"` 등


---
## 사칙연산, NULL

```sql
SELECT employee_id AS 사번, 
       first_name "이 름",
	   salary AS "급여", 
	   salary * 12 "연봉"
FROM employees;
```

- 모든 사원의 사번, 이름, 급여, 급여 * 12 (연봉) 검색


![select3](select3.jpg)

```sql
SELECT employee_id AS 사번, 
       first_name "이 름",
	   salary AS "급여", 
	   salary * 12 "연봉",
	   commission_pct,
	   (salary + salary * commission_pct) * 12 "커미션포함연봉1",
	   (salary + salary * IFNULL(commission_pct, 0)) * 12 "커미션포함연봉2" -- NULL이라면 0
FROM employees;
```

- 모든 사원의 사번, 이름, 급여, 급여 * 12 (연봉), 커미션, 커미션포함 연봉 검색
