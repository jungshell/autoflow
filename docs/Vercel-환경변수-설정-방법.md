# Vercel 환경 변수 설정 방법

## 현재 상황

`.env.local` 파일 형식:
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**로컬에서는 정상 작동하지만, Vercel에서는 다르게 설정해야 합니다.**

---

## 문제 원인

Vercel 환경 변수는:
- **작은따옴표(`'`)를 포함하면 안 됩니다**
- JSON 문자열만 입력해야 합니다
- Vercel이 자동으로 문자열로 처리합니다

---

## 해결 방법

### 방법 1: FIREBASE_SERVICE_ACCOUNT_JSON 수정 (JSON만 입력)

**Vercel 환경 변수 설정:**

1. Vercel 대시보드 → Settings → **Environment Variables**
2. `FIREBASE_SERVICE_ACCOUNT_JSON` 찾기
3. **Value** 필드에서:
   - 작은따옴표(`'`) 제거
   - JSON만 입력:

```
{"type":"service_account","project_id":"schedule-checker-b0eb7","private_key_id":"d07637702abc6479b1d761406a8d9786d515150d","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCpzUVX3gtpCbJP\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@schedule-checker-b0eb7.iam.gserviceaccount.com",...}
```

**중요:**
- 작은따옴표(`'`) 없이 JSON만 입력
- `\n`은 그대로 유지 (Vercel이 자동 처리)
- 전체를 한 줄로 입력

4. 저장 후 **Redeploy** 실행

---

### 방법 2: 개별 환경 변수 3개 사용 (권장)

**더 안전하고 문제가 적습니다!**

코드는 두 가지 방식을 모두 지원합니다:
- `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON 하나)
- 또는 `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (3개)

**환경 변수 3개 추가:**

**1. FIREBASE_PROJECT_ID**
- Value: `schedule-checker-b0eb7`
- Environment: All Environments

**2. FIREBASE_CLIENT_EMAIL**
- Value: `firebase-adminsdk-fbsvc@schedule-checker-b0eb7.iam.gserviceaccount.com`
- Environment: All Environments

**3. FIREBASE_PRIVATE_KEY**
- Value: (`.env.local`의 JSON에서 `private_key` 값 복사)
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCpzUVX3gtpCbJP\nGcXV9jBZUsP2P5folVOCeFXzNtBrcZNq3cfg2Mt6jpjR7tkAkgrUWtkcnHhZuWBI\nBSThzxvvLexRwVT9v3eFgvBY1/umCbhst0vyyaKpSKV56USNY4UBhnyOi/WX1XKC\nX4VqXrJlQ0qWd43oCKVBn21NX0txnL+W+3kWYyafukLtITTmiGxQ+X+5O5/2Vm+3\nfUCQeGl2VqKDvziXOcGA3fuuJO5sCkpBKpTwGSCaicmkjTggkeyPFPxMqMkhZS9f\n5Lw+w2Q51X/DtcIIYqWdd0i9mqV80ASxYxnZW7r/+S2sxvPW2DQh6kUUnC7lDy8M\nR8LbmYyfAgMBAAECggEAFFa8GZxFLZ21t/fUVJ6ah/h79IEFhxxr1lLnqKxGJriB\n+ej6yhnttY5jC7JaV9Embu062Ex9tfGYcMf89PdD11Be4CQSNBq9DEb01w932xmK\n96q09C3mx/Qlrgac6XqkMdyUCtcE4dz1TFx4tJcHM03uHzvOyZ5PfR7FjuD9Pmxf\ntTV8XTKjM3S0x3JjRKuF8t5suHkOulJO2w1nof7NOmz13j1U5aIP+314MpKsFKr2\nralLTZ36c5+3CU2yq4DI7M2wm3udFwL/ss5hgjy1y7etm6+mrN5KSFGy9qQIMZB0\nInzQDWPzC19A6gpXqACATQC2uFzzNaEs1Tal2sc3gQKBgQDu7OX+j5UaS3CPyKol\nz7eI9lI8BdnCLrQ0Pz2WEVI8ZZmQ2YK8pi5NIimUUM/bYz94lcJiaRuu0A+bxTfC\nLtGyVWfGPLyDhjoStkzznD/yc6eWwC+v8z+CrX4ykvoRBnIy+a1YLitLVZCtQegj\nF/prYlSHa2PiE5iFR61AvcA9oQKBgQC178Sua/cw2d4TA+F6vNkFUo214HVk4HMr\nDe1EYIuffdmxOfLPdfASz5+bm1S6F3+jZ/eoB4CruMvhygwV9lWS8SDvlUvvbR49\naSZqf3tKXZQzpkdx4MwGvcB/GWA+L4NlvjONz1KZTM234UY0IlOAbqznbw1EUgFg\nkz8pTTsiPwKBgQC0/vOQr1bFr6aa1enHcR7Ze7h6TfhTuSu8dLgD6iVBKbp217/J\nh56Fwj57Y+jCiuH3SIQUJwnYmTdpyrJdwTgL/9T4gORSQqnVqRKMba6nzeOEOR0n\nDn/rT+DNETitExQJ98jQh1E25aAPEGF5zF1hYgElAT6OckfVl6Hw7I4oYQKBgFhk\nurlHqVyprXStoQJB+GrWlhU0jbTKPApCBPIAujVuLrMlhWv4UADDsTcn+71CJ3hb\nzf5sTr6f1SbJRJ/zA9aVorvkXHViHZwWl1yMvXj/CD8j3XhdkKMB1CGsUY9FBGEN\nTPzsKqRipVxebf5sYwd2PjlfQiHceeDTCY/mfwF/AoGAB0P0ue5Pc6UhVHAgusDM\nTUL+lOtiFWMBsGj5247zVa1t0M5PKPMK2ufM2xiAvU3oVNp6EZVuA+XZJT1rnx0g\nmUMmQQf+j+r6UhMTB8Yb7YNpYg7ZGQdLP+MxMJOtu4Z8IAfYO2prJafCMncV0w4r\nuo7RBmYbGvNbRKvpaOp9fAQ=\n-----END PRIVATE KEY-----\n
```
- Environment: All Environments

**중요:**
- `FIREBASE_SERVICE_ACCOUNT_JSON`은 삭제하거나 비활성화
- 3개 환경 변수만 사용
- `FIREBASE_PRIVATE_KEY`의 `\n`은 그대로 입력 (Vercel이 자동 처리)

---

## 답변

### Q1: `.env.local` 형식이 잘못된 건가요?

**아니요, 로컬에서는 정상입니다!**

- `.env.local`의 `FIREBASE_SERVICE_ACCOUNT_JSON='{...}'` 형식은 로컬에서 정상 작동합니다
- 문제는 **Vercel 환경 변수 설정 방식**입니다
- Vercel에서는 작은따옴표(`'`) 없이 JSON만 입력해야 합니다

### Q2: 3개 환경 변수만 추가해도 문제 없나요?

**네, 문제 없습니다!**

코드는 두 가지 방식을 모두 지원합니다:
1. `FIREBASE_SERVICE_ACCOUNT_JSON` 하나
2. 또는 `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` 3개

**3개 환경 변수만 사용하는 것을 권장합니다:**
- 더 안전함
- 문제 해결이 쉬움
- JSON 파싱 오류 없음

---

## 추천 방법

**방법 2 (개별 환경 변수 3개)를 권장합니다:**

1. `FIREBASE_SERVICE_ACCOUNT_JSON` 삭제 또는 비활성화
2. 3개 환경 변수 추가:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. 저장 후 **Redeploy**
4. 함수 테스트

---

## 확인 방법

환경 변수 수정 후:
1. **Redeploy** 실행
2. Functions → `/api/automation/daily-summary` → **Invoke** 테스트
3. Logs 확인:
   - `Firebase Admin init skipped` Warning이 사라졌는지
   - `Firebase Admin이 초기화되지 않았습니다` 오류가 사라졌는지
   - 함수가 정상 작동하는지

---

## 요약

- `.env.local` 형식은 정상입니다 (로컬용)
- Vercel에서는 작은따옴표 없이 JSON만 입력하거나
- **3개 환경 변수만 사용하는 것을 권장합니다** (더 안전함)
