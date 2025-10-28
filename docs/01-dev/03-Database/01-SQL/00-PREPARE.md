---
title: "[DML] 사전 데이터 준비"
description: Oracle의 HR 스키마를 MySQL 환경에서 직접 실습할 수 있도록 CREATE와 INSERT SQL 스크립트를 제공하고, ERD를 통해 테이블 간 관계를 시각적으로 이해합니다.
keywords:
  - HR 스키마
  - Oracle Sample Schema
  - MySQL 샘플 데이터
  - ERD
  - employees 테이블
---
---
## 사전 준비

이후 글에서 다뤄질 쿼리문에 대한 스키마는 Oracle Sample Schemas - Human Resources(https://github.com/oracle-samples/db-sample-schemas/tree/main/human_resources)이다.

이 스키마를 MySQL로 CREATE하고 Dummy Data를 INSERT하는 SQL문을 만들어서 올려뒀으니 사용하면 된다.
- CREATE: https://github.com/Son-Hunseo/sample-database-query-for-test/blob/main/hr_create.sql
- INSERT: https://github.com/Son-Hunseo/sample-database-query-for-test/blob/main/hr_dummydata_insert.sql

```mermaid
---
title: HR schema
config:
  layout: elk
---
erDiagram
  REGIONS     ||--|{ COUNTRIES   : have
  COUNTRIES   ||--|{ LOCATIONS   : have
  LOCATIONS   ||--|{ DEPARTMENTS : have
  DEPARTMENTS ||--|{ EMPLOYEES   : employ
  DEPARTMENTS ||--|{ JOB_HISTORY : have
  EMPLOYEES   ||--|{ JOB_HISTORY : have
  EMPLOYEES   ||--|{ EMPLOYEES   : manage
  JOBS        ||--|{ JOB_HISTORY : have
  JOBS        ||--|{ EMPLOYEES   : have

  COUNTRIES {
    char(2)      country_id    PK "NN"
    varchar2(60) country_name
    number       region_id     FK
  }

  DEPARTMENTS {
    number(4)    department_id   PK "NN"
    varchar2(30) department_name    "NN"
    number(6)    manager_id
    number(4)    location_id     FK
  }

  EMPLOYEES {
    number(6)    employee_id    PK "NN"
    varchar2(20) first_name
    varchar2(25) last_name          "NN"
    varchar2(25) email          UK "NN"
    varchar2(20) phone_number
    date         hire_date          "NN"
    varchar2(10) job_id         FK  "NN"
    number(8)    salary
    number(2)    commission_pct
    number(6)    manager_id     FK
    number(4)    department_id  FK
  }

  JOBS {
    varchar2(10) job_id     PK "NN"
    varchar2(35) job_title     "NN"
    number(6)    min_salary
    number(6)    max_salary
  }

  JOB_HISTORY {
    number(6)    employee_id   PK "NN"
    date         start_date       "NN"
    date         end_date         "NN"
    varchar2(10) job_id        FK "NN"
    number(4)    department_id FK
  }

  LOCATIONS {
    number(4)    location_id    PK "NN"
    varchar2(40) street_address
    varchar2(12) postal_code
    varchar2(30) city              "NN"
    varchar2(25) state_province
    char(2)      country_id     FK
  }

   REGIONS {
    number       region_id   PK "NN"
    varchar2(25) region_name

   }

```

