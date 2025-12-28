---
title: "[DML] SELECT - JOIN"
description: 이 글은 Oracle HR 예제 스키마를 기반으로 INNER JOIN, OUTER JOIN, SELF JOIN, Non-Equi JOIN 등 다양한 SQL JOIN의 개념과 사용법을 단계별 예제와 함께 설명합니다. ON, USING, NATURAL JOIN의 차이와 실제 쿼리 예시를 통해 JOIN의 원리와 활용법을 쉽게 이해할 수 있습니다.
keywords:
  - SQL JOIN
  - INNER JOIN
  - OUTER JOIN
  - SELF JOIN
  - Non-Equi JOIN
---
---

둘 이상의 테이블에서 데이터가 필요한 경우 `JOIN`이 필요하다.

---
## JOIN의 필요성

```SQL
SELECT employee_id, first_name, salary, department_name
FROM employees
WHERE employee_id = 100;
```

- 에러가 난다.
- `department_name` 은 `employees` 테이블이 아니라 `departments` 테이블에 있기 때문이다.

```SQL
SELECT employee_id, first_name, salary, department_id, department_name
FROM employees JOIN departments
WHERE department_id = department_id
AND employee_id = 100;
```

- 에러가 난다.
- `WHERE` 절에서 `department_id` 를 비교할 때 `department_id`가 가리키는 대상이 `employees`에 있는 `department_id` 인지 `departments`에 있는 `department_id` 인지 모호하기 때문이다.

```SQL
SELECT e.employee_id, e.first_name, e.salary, d.department_id, d.department_name
FROM employees e JOIN departments d
WHERE e.department_id = d.department_id
AND employee_id = 100;
```

- 올바른 예

```SQL
SELECT e.employee_id, e.first_name, e.salary, d.department_id, d.department_name
FROM employees e, departments d
WHERE e.department_id = d.department_id
AND employee_id = 100;
```

- MySQL에서는 `JOIN`을 위처럼 생략할 수도 있다.


---
## INNER JOIN

![join1](assets/join1.png)

- 가장 일반적인 `JOIN`의 종류이며 <span style={{color: 'red'}}>교집합</span>이다.
- 동등 조인(`Equi-JOIN`)이라고도 하며, N개의 테이블 `JOIN` 시 N-1개의 `JOIN` 조건이 필요함
- `JOIN` == `INNER JOIN`

### ON

```SQL
SELECT e.employee_id, e.first_name, e.salary, d.department_id, d.department_name
FROM employees e JOIN departments d
WHERE e.department_id = d.department_id AND e.employee_id = 100;
```

- `WHERE`을 사용해서 위처럼 지정하면 `JOIN` 조건과 일반 조건을 구분할 수 없다.


```SQL
SELECT e.employee_id, e.first_name, e.salary, d.department_id, d.department_name
FROM employees e JOIN departments d
ON e.department_id = d.department_id -- JOIN 조건
WHERE e.employee_id = 100; -- 일반 조건
```

- `ON`을 사용해서 위처럼 지정하면 `JOIN` 조건과 일반 조건을 구분할 수 있다.


### USING

```SQL
SELECT e.employee_id, e.first_name, e.salary, d.department_id, d.department_name
FROM employees e JOIN departments d
USING (department_id)
WHERE e.employee_id = 100; -- 일반 조건
```

- `USING` 절에서는 table 이름이나, alias를 명시하면 오히려 에러가 난다.


### NATURAL JOIN

```SQL
SELECT e.employee_id, e.first_name, e.salary, d.department_id, d.department_name
FROM employees e NATURAL JOIN departments d
WHERE e.employee_id = 100; -- 일반 조건
```

- 그런데 위처럼 사용하면, 결과 0개 나온다.
- `employees`와 `departments` 에서 공통된 요소가 `department_id`, `department_name` 으로 2개 있기 때문에, 내부적으로 2개 다 같은 교집합을 찾기 때문이다.

---
## OUTER JOIN

![join2](assets/join2.png)

:::tip
MySQL에는 `FULL OUTER JOIN`이 없기 때문에, `LEFT OUTER JOIN` 이후 `RIGHT OUTER JOIN`을 하는 방법을 사용한다.
:::

### LEFT OUTER JOIN

왼쪽 테이블을 기준으로 JOIN 조건에 일치하지 않는 데이터까지 출력한다. (오른쪽 테이블에서 JOIN 조건에 맞지 않는 데이터는 제외된다)

```SQL
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e JOIN departments d
USING (department_id);
```

- 위처럼 `INNER JOIN`을 사용했을 경우 106명의 결과가 검색된다.
- 왜냐하면 부서가 배치되지 않은 1명이 있기 때문이다.


```SQL
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e LEFT OUTER JOIN departments d
USING (department_id);
```

- `LEFT OUTER JOIN`을 사용하여 부서가 배치되지 않은 1명을 포함하여 107명의 결과를 검색할 수 있다.


```SQL
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e LEFT JOIN departments d
USING (department_id);
```

- `LEFT OUTER JOIN` = `LEFT JOIN`


### RIGHT OUTER JOIN

오른쪽 테이블을 기준으로 JOIN 조건에 일치하지 않는 데이터까지 출력한다. (왼쪽 테이블에서 JOIN 조건에 맞지 않는 데이터는 제외된다)

```SQL
SELECT d.department_name, e.employee_id, e.first_name
FROM employees e JOIN departments d
USING (department_id);
```

- 위처럼 `INNER JOIN`을 사용했을 경우 106명의 결과가 검색된다.
- 왜냐하면 사람이 없는 부서의 경우 검색되지 않기 때문이다.

```SQL
SELECT d.department_name, e.employee_id, e.first_name
FROM employees e RIGHT JOIN departments d
USING (department_id);
```

- `RIGHT JOIN`을 사용하여 사람이 없는 부서까지 122개의 결과를 검색할 수 있다.


## SELF JOIN, Non-Equi JOIN
### SELF JOIN

```SQL
SELECT e.employee_id, e.first_name, e.manager_id, m.employee_id, m.first_name
FROM employees e JOIN employees m
ON e.manager_id = m.employee_id;
```

- 자기 자신과 `SELF JOIN`을 했는데, 사원의 수는 107명이나 106명만 검색된다.
- `employee` 끼리 `INNER JOIN`을 하였으니, 단 하나의 column이라도 결측치가 있는 값은 제외될 것이다.
	- 그 사원은 누구인가? -> 사장 -> manager가 없음


```SQL
SELECT e.employee_id, e.first_name, e.manager_id, m.employee_id, m.first_name
FROM employees e LEFT JOIN employees m
ON e.manager_id = m.employee_id;
```

- 해결 -> `LEFT OUTER JOIN` or `RIGHT OUTER JOIN` 아무거나 사용하면 된다.


### Non-Equi JOIN

```SQL
SELECT e.employee_id,
       e.first_name,
       e.hire_date,
       jh.start_date,
       jh.end_date
FROM employees e
JOIN job_history jh
  ON e.employee_id = jh.employee_id
 AND e.hire_date >= jh.start_date
 AND e.hire_date <= jh.end_date;

```

- 부등호 조건을 넣을 수 있다.

```SQL
SELECT e.employee_id,
       e.first_name,
       e.hire_date,
       jh.start_date,
       jh.end_date
FROM employees e
JOIN job_history jh
  ON e.employee_id = jh.employee_id
 AND e.hire_date BETWEEN jh.start_date AND jh.end_date;
```

- `BETWEEN`도 가능하다.
