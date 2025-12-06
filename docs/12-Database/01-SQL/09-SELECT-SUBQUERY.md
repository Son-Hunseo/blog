---
title: "[DML] SELECT - SUBQUERY"
description: SQL 서브쿼리(Subquery)의 개념부터 종류(Nested, Inline View, Scalar)별 특징과 활용법까지 단계별로 설명합니다. 예제 중심으로 SELECT문에서 서브쿼리를 효율적으로 사용하는 방법을 배울 수 있습니다.
keywords:
  - SQL Subquery
  - 서브쿼리 예제
  - SQL SELECT
---
---
## SUBQUERY

- `SUBQUERY`란 다른 쿼리 내부에 포함되어 있는 `SELECT` 문을 의미한다.
- `SUBQUERY`를 포함하고 있는 쿼리를 외부 쿼리(outer query) 또는 메인 쿼리(main query)라고 부르며, 서브 쿼리는 내부(inner query)라고도 부른다.


---
## SUBQUERY의 특징

- `SUBQUERY`는 반드시 괄호'()'로 감싸져야 한다.
- `SUBQUERY`는 비교 연산자와 함께 사용 가능하다.
- `SUBQUERY`에서는 `ORDER BY`를 사용하지 못한다.


---
## NESTED SUBQUERY

`WHERE` 절에 작성하는 `SUBQUERY` 이다.

### 단일 행을 반환해야하는 NESTED SUBQUERY

```SQL
-- 1단계: Den의 급여 확인
SELECT salary
FROM employees
WHERE first_name = 'Den';

-- 2단계: Den의 급여보다 많이 받는 사원 조회
SELECT employee_id, first_name, salary
FROM employees
WHERE salary > 11000;

-- 서브쿼리 사용
SELECT employee_id, first_name, salary
FROM employees
WHERE salary > (SELECT salary
                FROM employees
                WHERE first_name = 'Den');
```

- 단일 행 비교 연산자(`=`, `>`, `<`, `>=`, `<=`, `!=`)와 함께 사용될 경우 단일 행을 반환해야한다.
- 다중 행을 반환할 경우 비교할 수 없기 때문이다.

### 다중 행을 반환해도 되는 NESTED SUBQUERY

```SQL
	-- 각 부서별로 최고 급여를 받는 사원의 사번, 이름, 급여, 부서번호
SELECT employee_id, first_name, salary, department_id
FROM employees
WHERE salary IN (SELECT MAX(salary)
                 FROM employees
                 GROUP BY department_id);
                 
-- 30번 부서의 급여보다 많은 급여를 받는 사원 (ANY: 최소값보다 크면 됨)
SELECT employee_id, first_name, salary
FROM employees
WHERE salary > ANY (SELECT salary
                    FROM employees
                    WHERE department_id = 30);

-- 30번 부서의 급여보다 많은 급여를 받는 사원 (ALL: 최대값보다 커야 함)
SELECT employee_id, first_name, salary
FROM employees
WHERE salary > ALL (SELECT salary
                    FROM employees
                    WHERE department_id = 30);
```

- 다중 행 비교 연산자(`IN`, `ANY`, `ALL`, `EXISTS`)와 함께 사용될 경우 다중 행을 반환해도 된다.


```SQL
SELECT employee_id, first_name, salary, department_id
FROM employees
WHERE (department_id, salary) IN (SELECT department_id, MAX(salary)
                                  FROM employees
                                  GROUP BY department_id);
```

- 여러 열을 비교해야할 경우 위처럼 사용할 수 있다.


---
## INLINE VIEW

`FROM` 절에 작성하는 `SUBQUERY`이다. 즉, `SUBQUERY`의 결과를 테이블처럼 사용한다.


## INLINE VIEW의 특징

- 일반적인 VIEW와달리 물리적으로 존재하지 않음
- 쿼리 내에서만 일시적으로 사용됨
- 별칭(alias)를 반드시 지정해야 함

### 예시

```SQL
-- 부서별 평균 급여보다 많은 급여를 받는 사원 조회
SELECT e.employee_id, e.first_name, e.salary, e.department_id, d.avg_sal
FROM employees e JOIN (SELECT department_id, AVG(salary) as avg_sal
                       FROM employees
                       GROUP BY department_id) d
ON e.department_id = d.department_id
WHERE e.salary > d.avg_sal;
```


```SQL
-- 급여 순위 TOP 5 조회
SELECT employee_id, first_name, salary
FROM (SELECT employee_id, first_name, salary
      FROM employees
      ORDER BY salary DESC) e
LIMIT 5;
```


```SQL
-- 페이징 처리
SELECT employee_id, first_name, salary
FROM (SELECT employee_id, first_name, salary,
             ROW_NUMBER() OVER (ORDER BY salary DESC) as rnum
      FROM employees) e
WHERE rnum BETWEEN 6 AND 10;
```


---
## SCALAR SUBQUERY

`SELECT` 절에 작성하는 서브 쿼리

### SCALAR SUBQUERY의 특징

- 반드시 1개의 행, 1개의 컬럼만 반환해야 함
- 주로 `JOIN`을 대체하거나 계산된 값을 조회할 때 사용
- 각 행마다 서브 쿼리가 실행되므로 성능에 주의
- 일반적으로는 `JOIN`이 더 효율적이다.

### 예시

```SQL
-- 모든 사원의 사번, 이름, 급여, 부서이름 조회
SELECT e.employee_id, 
       e.first_name, 
       e.salary,
       (SELECT d.department_name
        FROM departments d
        WHERE d.department_id = e.department_id) as department_name
FROM employees e;
```


```SQL
-- 사원의 정보와 해당 부서의 평균 급여 조회
SELECT e.employee_id,
       e.first_name,
       e.salary,
       e.department_id,
       (SELECT AVG(salary)
        FROM employees
        WHERE department_id = e.department_id) as dept_avg_salary
FROM employees e;
```


```SQL
-- 스칼라 서브 쿼리 vs JOIN

-- 스칼라 서브 쿼리 방식
SELECT e.employee_id, 
       e.first_name,
       (SELECT d.department_name
        FROM departments d
        WHERE d.department_id = e.department_id) as department_name
FROM employees e;

-- JOIN 방식
SELECT e.employee_id, 
       e.first_name,
       d.department_name
FROM employees e LEFT JOIN departments d
ON e.department_id = d.department_id;
```

## SUBQUERY 활용

```SQL
-- 자신이 속한 부서의 평균 급여보다 많은 급여를 받는 사원
SELECT e.employee_id, e.first_name, e.salary, e.department_id
FROM employees e
WHERE e.salary > (SELECT AVG(salary)
                  FROM employees
                  WHERE department_id = e.department_id);
```


**EXISTS**

- 서브 쿼리의 결과가 존재하는지 확인
- 존재하면 TRUE, 존재하지 않으면 FALSE
- IN보다 성능이 좋은 경우가 많음


```SQL
-- 부하 직원이 있는 사원만 조회
SELECT e.employee_id, e.first_name
FROM employees e
WHERE EXISTS (SELECT 1
              FROM employees
              WHERE manager_id = e.employee_id);
```


```SQL
-- 부하 직원이 없는 사원만 조회 (NOT EXISTS)
SELECT e.employee_id, e.first_name
FROM employees e
WHERE NOT EXISTS (SELECT 1
                  FROM employees
                  WHERE manager_id = e.employee_id);
```


**서브 쿼리를 활용한 INSERT**

```MySQL
-- departments 테이블의 데이터를 dept_copy 테이블에 복사
INSERT INTO dept_copy
SELECT * FROM departments
WHERE department_id > 100;
```


**서브 쿼리를 활용한 UPDATE**

```MySQL
-- 각 사원의 급여를 해당 부서의 평균 급여로 변경
UPDATE employees e
SET salary = (SELECT AVG(salary)
              FROM employees
              WHERE department_id = e.department_id);
```


**서브 쿼리를 활용한 DELETE**

```MySQL
-- 부서 평균 급여보다 적게 받는 사원 삭제
DELETE FROM employees e
WHERE salary < (SELECT AVG(salary)
                FROM employees
                WHERE department_id = e.department_id);
```