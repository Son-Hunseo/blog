---
title: 문자열 1 - 기본 유형
description: 자바(Java)로 배우는 문자열 알고리즘 유형 정리. 회문(Palindrome), 문자열 뒤집기, 조건부 정렬, 단어 빈도수 계산, 애너그램(Anagram) 등 코딩 테스트에서 자주 등장하는 문자열 문제를 예제 코드와 함께 설명합니다.
keywords:
  [
    문자열 알고리즘,
    Java 문자열,
    Palindrome,
    애너그램,
    문자열 뒤집기,
    코딩테스트,
    Java 알고리즘,
    String Manipulation,
    자바 예제,
    알고리즘 문제풀이,
  ]
sidebar_position: 4
---

---

## 회문 (Palindrome)

### 기본 유형

- 회문, Palindrome은 앞뒤가 똑같은 단어나 문장을 의미
- 문제 유형 예시: "앞뒤가 같은 단어를 찾아라."
  - ex: '가나다다나가', 'Madam, I'm Adam'

**코드 예시**

```java
import java.util.*;

public class PalindromeChecker {
    public static boolean isPalindrome(String s) {
        Deque<Character> deque = new ArrayDeque<>();

        for (char c : s.toCharArray()) {
            if (Character.isLetter(c)) {
                deque.add(Character.toLowerCase(c));
            }
        }

        while (deque.size() > 1) {
            if (deque.pollFirst() != deque.pollLast()) {
                return false;
            }
        }
        return true;
    }

    public static void main(String[] args) {
        String data = "Madam, I'm Adam";
        System.out.println(isPalindrome(data) ? "회문입니다." : "회문이 아닙니다.");
    }
}
```

- 기본적인 아이디어는 `Deque`에 다 집어넣어놓고 앞에서 한번 뒤에서 한번 꺼내면서 비교한다.
  - 마지막 1개의 요소가 남았다면, 그건 처리 안함 (`deque.size() > 1`)
- 알아야할 메서드
  - `문자열.toCharArray()`: 문자열을 `char`타입 배열로 만드는 메서드
  - `Character.isLetter(a)`: `a`가 알파벳인지 아닌지 판단
  - `Character.toLowerCase(a)`: `a`를 소문자로 변환

### 가장 긴 회문

- 주어진 문자열에서 가장 긴 팰린드롬을 찾는 문제
  - ex: `ewqpbewqbfjabcdefedcbaienqnfkndkl` 이 문자열에서 가장 긴 팰린드롬은 `abcdefedcba` 이다.

**코드 예시**

```java
public class LongestPalindrome {
    public static String longestPalindrome(String s) {
        if (s.length() < 2) return s;
        String res = "";

        for (int i = 0; i < s.length() - 1; i++) {
            String p1 = expand(s, i, i + 1);
            String p2 = expand(s, i, i + 2);
            if (p1.length() > res.length()) res = p1;
            if (p2.length() > res.length()) res = p2;
        }
        return res;
    }

    private static String expand(String s, int left, int right) {
        while (left >= 0 && right <= s.length() && s.charAt(left) == s.charAt(right - 1)) {
            left--;
            right++;
        }
        return s.substring(left + 1, right - 1);
    }

    public static void main(String[] args) {
        String data = "ewqpbewqbfjabcdefedcbaienqnfkndkl";
        System.out.println("가장 긴 팰린드롬: " + longestPalindrome(data));
    }
}

```

- 기본 아이디어는, 매 자리마다 해당 자리를 기준으로 양쪽으로 뻗어나가면서 팰린드롬인지 아닌지 검사를한다.
- `expand(s, i, i + 1);` 과 `expand(s, i, i + 2)`로 나누는 이유는 문자열의 길이가 짝수인 경우와 홀수인 경우 모두 고려해야하기 때문이다.
- 이 알고리즘은 $O(n^2)$의 시간복잡도를 가진다. 하지만 'Manacher's 알고리즘'을 사용하면 $O(n)$ 으로 풀 수 있다.
	- 하지만, 현재 공부하려는 범위를 벗어나므로 추후에 다시 정리하겠다.

---

## 문자열 뒤집기

**코드 예시**

**(1) `Collections.reverse()`**

```java
import java.util.*;

public class ReverseString {
    public static void main(String[] args) {
        List<Character> list = new ArrayList<>(Arrays.asList('a','b','c','d','e'));
        Collections.reverse(list);
        System.out.println(list);
    }
}
```

**(2) 투포인터**

```java
public class ReverseStringTwoPointer {
    public static void reverse(char[] arr) {
        int left = 0, right = arr.length - 1;
        while (left < right) {
            char temp = arr[left];
            arr[left] = arr[right];
            arr[right] = temp;
            left++;
            right--;
        }
    }

    public static void main(String[] args) {
        char[] data = {'a','b','c','d','e'};
        reverse(data);
        System.out.println(data);
    }
}
```

## 조건에 맞는 정렬

**코드 예시**

```java
import java.util.*;

class Data implements Comparable<Data> {
    String original;
    String first;
    String second;

    Data(String s) {
        this.original = s;
        String[] parts = s.split(" ");
        this.first = parts[0];
        this.second = parts[1];
    }

    @Override
    public int compareTo(Data other) {
        int cmp = this.second.compareTo(other.second);
        if (cmp != 0) return cmp;
        return this.first.compareTo(other.first);
    }

    @Override
    public String toString() {
        return original;
    }
}

public class CustomSort {
    public static void main(String[] args) {
        List<Data> data = new ArrayList<>();
        data.add(new Data("1 A"));
        data.add(new Data("1 B"));
        data.add(new Data("6 A"));
        data.add(new Data("2 D"));
        data.add(new Data("4 B"));

        Collections.sort(data);
        System.out.println(data);
    }
}
```

- 중요) 여러 문제에서 응용해서 나올 수 있다.
- 새로운 Class 정의해서 `implements Comparable<Class>` 이고 `compareTo` 구현하는 방법 외우기

---

## 특정 단어 등장 횟수

**코드 예시**

```java
import java.util.*;

public class MostCommonWord {
    public static void main(String[] args) {
        String paragraph = "Bob hit a ball, the hit BALL flew far after it was hit";

        String cleaned = paragraph.toLowerCase();
        StringTokenizer st = new StringTokenizer(cleaned);

        Map<String, Integer> freq = new HashMap<>();
        while (st.hasMoreTokens()) {
            String token = st.nextToken();
            StringBuilder word = new StringBuilder();

            for (char c : token.toCharArray()) {
                if (Character.isLetter(c)) {
                    word.append(c);
                }
            }

            if (word.length() > 0) {
                String w = word.toString();
                freq.put(w, freq.getOrDefault(w, 0) + 1);
            }
        }

        String result = "";
        int maxCount = 0;
        for (Map.Entry<String, Integer> entry : freq.entrySet()) {
            if (!entry.getKey().equals("hit") && entry.getValue() > maxCount) {
                maxCount = entry.getValue();
                result = entry.getKey();
            }
        }

        System.out.println("가장 많이 등장한 단어: " + result);
    }
}
```

- 특정 단어를 제외하고 가장 많이 사용된 단어를 찾는 문제
- `StringTokenizer`로 다 나누고 하나씩 꺼내면서 소문자처리, 특수문자 제외 전처리를 한 뒤 `HashMap`에 넣는다.
- 이후 하나씩 셀 때 제외해야하는 단어는 제외
- `for (Map.Entry<String, Integer> entry : 해시맵.entrySet())` 이러한 반복문 패턴 외워두기

---

## 애너그램 (anagrams)

- 애너그램은 문자를 재 배열하여 다른 뜻을 가진 단어로 바꾸는 것을 말함
- 예: `ate`와 `eat`와 `tea`는 서로 애너그램이 가능하다.

**코드 예시**

```java
import java.util.*;

public class GroupAnagrams {
    public static void main(String[] args) {
        String[] words = {"eat","tea","tan","ate","nat","bat"};
        Map<String, List<String>> map = new HashMap<>();
        for (String word : words) {
            char[] arr = word.toCharArray();
            Arrays.sort(arr);
            String key = new String(arr);

            if (!map.containsKey(key)) {
                map.put(key, new ArrayList<>());
            }
            map.get(key).add(word);
        }
        System.out.println(map.values());
    }
}
```

- 의외로 풀이는 매우 간단하다. 정렬해서 같으면 서로 애너그램이 가능한 것이다.
