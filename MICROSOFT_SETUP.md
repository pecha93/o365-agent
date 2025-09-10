# Настройка Microsoft OAuth

## Вариант 1: С APP_ID и APP_SECRET (рекомендуется)

Если у вас есть только `APP_ID` и `APP_SECRET`:

1. **Найдите ваш Tenant ID:**
   - В Azure Portal → App registrations → ваше приложение
   - Скопируйте "Directory (tenant) ID" из Overview

2. **Добавьте секреты в веб-интерфейсе:**
   - Откройте http://localhost:3000/secrets
   - Добавьте:
     - `MS_APP_ID` = ваш Application (client) ID
     - `MS_APP_SECRET` = ваш Application (client) secret
     - `MS_TENANT_ID` = ваш Directory (tenant) ID

3. **Настройте Redirect URI в Azure:**
   - В Azure Portal → App registrations → ваше приложение
   - Authentication → Redirect URIs
   - Добавьте: `http://localhost:4000/auth/ms/callback`

4. **Настройте API permissions:**
   - API permissions → Add a permission
   - Microsoft Graph → Delegated permissions
   - Добавьте: `Mail.ReadWrite`, `Mail.Send`, `Calendars.ReadWrite`, `User.Read`, `offline_access`

## Вариант 2: С TENANT_ID (если есть)

Если у вас есть `TENANT_ID`:

1. **Добавьте секреты:**
   - `MS_TENANT_ID` = ваш Tenant ID
   - `MS_CLIENT_ID` = ваш Application (client) ID
   - `MS_CLIENT_SECRET` = ваш Application (client) secret

## Использование

1. **Авторизация:**

   ```
   http://localhost:4000/auth/ms/login
   ```

2. **После авторизации:**
   - Токены сохранятся в базе данных
   - Коннекторы начнут работать автоматически
   - Outlook: каждые 2 минуты
   - Calendar: каждые 30 минут

3. **Ручные триггеры:**
   ```
   POST http://localhost:4000/admin/pull/outlook
   POST http://localhost:4000/admin/pull/calendar
   ```

## Проверка

- Веб-интерфейс: http://localhost:3000/agent
- API health: http://localhost:4000/health
- Secrets: http://localhost:3000/secrets
