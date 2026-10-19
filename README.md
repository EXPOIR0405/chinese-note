# 중국어 복습노트

중국어 수업에서 배운 발음과 문화를 차시별로 모아두는 개인 복습 사이트.

- 빌드 없는 정적 사이트 (HTML/CSS/JS). Vercel에 그대로 배포.
- 내용은 전부 `data/` 폴더의 JSON에 있다. 수업이 끝나면 JSON만 고친다.
- '헷갈려요' 표시는 브라우저(localStorage)에만 저장된다.

## 데이터 파일

| 파일 | 내용 |
|---|---|
| `data/schedule.json` | 수업 날짜. `tentative: true`는 예상 날짜 |
| `data/lessons.json` | 차시별 요약과 배운 것 목록 |
| `data/words.json` | 단어 카드. `syl`은 `[병음, 성조]` 목록 (경성은 0) |
| `data/sounds.json` | 배운 성모·운모, 발음 팁, 비교 발음, 성조 퀴즈 문제 |
| `data/culture.json` | 문화 노트. `check`는 수업 메모와 사실이 다를 때 남기는 확인 메모 |

## 로컬에서 보기

```
npx serve .
```
