---
title: "[DML] SELECT - CASE ~ WHEN 조건 분기"
description: CASE문을 이용해 SQL에서 조건별 다른 값을 반환하는 방법을 배웁니다. 급여 구간별 등급 분류 등 실무 예시로 쉽게 이해할 수 있습니다.
keywords:
  - CASE문
  - SQL 조건 분기
  - WHEN THEN
  - ELSE
  - 급여 등급
---
---
## CASE ~ WHEN ~ THEN

**문법**

```sql
CASE exp1 WHEN exp2 THEN exp3
	[
	WHEN exp4 THEN exp5
	...
	ELSE exp6
	]
END
```


![select4](select4.jpg)

```sql
SELECT employee_id, 
	   first_name, 
	   salary,
	   CASE
		   WHEN salary > 15000 THEN '고액연봉'
		   WHEN salary > 8000 THEN '평균연봉'
		   ELSE '저액연봉'
	   END "연봉등급"
FROM employees;
```

- 모든 사원의 사번, 이름, 급여, 급여에 따른 등급 표시 검색