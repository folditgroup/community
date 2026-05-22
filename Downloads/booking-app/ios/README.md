# Fieldbase Crew — iOS

SwiftUI застосунок для працівників у машині. Логін той самий що й веб (Supabase Auth), сьогоднішні бронювання, статус "in progress / done", нотатки, навігація.

**Бекенд:** той самий Supabase Postgres що й веб → дані синхронізуються автоматично.

## Налаштування за 3 кроки

### Крок 1 — Підготуй worker запис у Supabase

Перш ніж відкривати iOS застосунок, треба щоб у тебе був `workers` рядок з `user_id` що відповідає твоєму Supabase auth user. Інакше після логіну побачиш "Clear day".

У Supabase Dashboard → **SQL Editor** → **New query** → встав і Run:

```sql
-- 1. Знайди свій user_id (скопіюй id навпроти свого email)
select id, email from auth.users;
```

```sql
-- 2. Знайди business_id (твоя компанія)
select id, name from public.businesses;
```

```sql
-- 3. Створи worker рядок (підстав свої UUID-и)
insert into public.workers (business_id, user_id, name, email, role)
values (
  'BUSINESS_UUID_СЮДИ',
  'USER_UUID_СЮДИ',
  'Захар',
  'bernykzahar@gmail.com',
  'Owner'
);
```

### Крок 2 — На Mac запусти setup.sh

Відкрий **Terminal**, перейди в папку `ios/`, і запусти:

```bash
cd /шлях/до/booking-app/ios
./setup.sh
```

Скрипт автоматично:
- Перевірить що Xcode встановлений
- Встановить **Homebrew** і **XcodeGen** якщо немає (це інструмент що генерує Xcode проєкт)
- Створить `Secrets.xcconfig` з шаблону
- Згенерує `FieldbaseCrew.xcodeproj`
- Відкриє проект в Xcode

Перший запуск може зайняти 5 хвилин (через встановлення інструментів).

### Крок 3 — Встав свої Supabase credentials

Скрипт зробить файл `Secrets.xcconfig`. Відкрий його в редакторі і встав свої значення:

```
SUPABASE_URL = https:/$()/krcibgafwtgtkpewrrpr.supabase.co
SUPABASE_ANON_KEY = sb_publishable_xxx...
```

> `$()` у URL — це не помилка. Це обхід обмеження xcconfig (там `//` означає коментар).

Тепер у Xcode натисни **▶ Run** з обраним симулятором → застосунок збереться і запуститься.

---

## Запустити на справжньому iPhone

1. Підключи iPhone через USB
2. У Xcode зліва обери `FieldbaseCrew` (синя іконка проекту)
3. Вкладка **Signing & Capabilities**:
   - Постав галочку **Automatically manage signing**
   - **Team**: вибери свій Apple ID (можна додати безкоштовний через `Add Account`)
4. Зверху, де симулятор, обери свій iPhone
5. **▶ Run**

Безкоштовний Apple ID — білд зникає через 7 днів. Для постійного — Apple Developer Program ($99/рік).

---

## Як це працює з веб (sync)

Один Postgres у Supabase — це **єдине джерело правди**. RLS правила обмежують доступ:

- Worker бачить тільки свої роботи (через `user_id` → `workers` → `worker_ids` в `bookings`)
- Коли worker натискає **Mark Done** на iPhone — статус оновлюється в Postgres → миттєво з'являється на веб admin сторінці
- Коли адмін створює нове бронювання на веб → worker побачить його після pull-to-refresh

Тобто iPhone і веб дашборд — це по суті **два інтерфейси до тих самих даних**. Жодних окремих API чи синхронізацій налаштовувати не треба.

---

## Якщо щось пішло не так

**Скрипт setup.sh падає на `brew install xcodegen`:**
- Перевір що термінал не за proxy. Перезапусти Mac.

**`xcodegen generate` падає з помилкою про Info.plist:**
- Запусти `mkdir -p Resources` в папці ios/ і повтори.

**Застосунок запускається, але після логіну "Clear day":**
- Не зробив крок 1 — нема worker з твоїм user_id. Поверніться до SQL у Supabase.

**Помилка "Missing SUPABASE_URL" при запуску:**
- Не заповнив Secrets.xcconfig. Відкрий його і встав свої значення.
- Або: у Xcode зроби **Product → Clean Build Folder** і запусти знову.

**Не можу логінитись (Auth error):**
- Перевір що в Supabase Authentication → Sign-in methods → Email/Password увімкнено.
- Email і пароль той самий що на веб.

---

## Файлова структура

```
ios/
├─ setup.sh                      ← запусти це
├─ project.yml                   ← XcodeGen specification
├─ Secrets.xcconfig.example      ← шаблон секретів
├─ README.md                     ← цей файл
└─ Sources/FieldbaseCrew/
   ├─ FieldbaseCrewApp.swift     ← @main
   ├─ AppState.swift             ← @Observable, auth listener
   ├─ SupabaseClientProvider.swift
   ├─ Theme.swift
   ├─ Models/                    ← Booking, Client, Worker
   ├─ Services/                  ← AuthService, SupabaseService
   └─ Views/                     ← LoginView, TodayView, JobDetailView
```

---

## Деплой в App Store

Коли застосунок буде готовий:

1. Apple Developer Program — $99/рік на developer.apple.com/programs
2. App Store Connect → створи listing
3. У Xcode: **Product → Archive → Distribute App → App Store Connect → Upload**
4. Submit for review (1–3 дні)

Потрібно мати: App icon 1024×1024, screenshots на 6.7" iPhone, privacy policy URL, demo account для рев'юера.
