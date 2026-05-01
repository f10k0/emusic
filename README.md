# ТАЙГА — Охотничий арсенал

> Интернет-магазин охотничьего оружия и снаряжения с системой лицензирования и поддержки

[![ASP.NET Core](https://img.shields.io/badge/ASP.NET%20Core-8.0-512BD4)](https://dotnet.microsoft.com)
[![Blazor Server](https://img.shields.io/badge/Blazor-Server-7B2D8B)](https://blazor.net)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-336791)](https://postgresql.org)
[![Font Awesome](https://img.shields.io/badge/Font%20Awesome-6.5-528DD7)](https://fontawesome.com)

---

## Содержание

- [О проекте](#о-проекте)
- [Архитектура](#архитектура)
- [Схема базы данных](#схема-базы-данных)
- [Требования](#требования)
- [Установка и запуск](#установка-и-запуск)
- [Запуск через Docker](#запуск-через-docker)
- [Перенос на другой компьютер](#перенос-на-другой-компьютер)
- [Аккаунты по умолчанию](#аккаунты-по-умолчанию)
- [Структура проекта](#структура-проекта)
- [Страницы приложения](#страницы-приложения)

---

## О проекте

**ТАЙГА** — полнофункциональный интернет-магазин охотничьего оружия и снаряжения. Система учитывает специфику продажи оружия: обязательное лицензирование, ролевое разграничение доступа, административный документооборот.

**Ключевые возможности:**
- 🔫 Каталог товаров с поиском, фильтрацией по категории и сортировкой
- 🛒 Корзина и оформление заказов со снимком цен на момент покупки
- 📋 Система лицензирования — заявки на приобретение оружия с проверкой
- 🎫 Тикет-система поддержки с историей переписки
- 🖼 Загрузка фотографий товаров (drag & drop, до 5 МБ)
- ⚙ Административная панель с полным CRUD и дашбордом статистики
- 👥 Многоуровневая система ролей (Admin, Consultant, Support, User)

---

## Архитектура

Проект построен по принципам **Clean Architecture** и разделён на четыре независимых слоя:

```
TaigaArsenal/
├── src/
│   ├── TaigaArsenal.Domain/          # Доменный слой
│   │   └── Entities/                 # Сущности (Product, Order, License, ...)
│   │
│   ├── TaigaArsenal.Data/            # Инфраструктурный слой
│   │   ├── Context/
│   │   │   └── AppDbContext.cs       # EF Core DbContext
│   │   ├── Repositories/
│   │   │   └── Repository.cs         # Универсальный Repository<T>
│   │   └── DbSeeder.cs               # Инициализация БД при запуске
│   │
│   ├── TaigaArsenal.Services/        # Слой бизнес-логики
│   │   ├── Interfaces/IServices.cs   # Контракты сервисов
│   │   └── Implementations/          # ProductService, CartService, OrderService, ...
│   │
│   └── TaigaArsenal.Web/             # Слой представления (Blazor Server)
│       ├── Components/
│       │   ├── Layout/               # MainLayout, NavDropdown
│       │   ├── Pages/                # Страницы приложения
│       │   └── Shared/               # ProductCard, ProductIcon, AdminNav, ...
│       ├── Controllers/
│       │   └── AccountController.cs  # MVC: login / register / logout
│       ├── wwwroot/
│       │   ├── css/taiga.css         # Глобальные стили
│       │   ├── js/taiga.js           # Particles, scroll
│       │   └── uploads/products/     # Загружаемые фото товаров
│       ├── IconHelper.cs             # Маппинг slug → иконка FA
│       └── Program.cs                # Точка входа, DI-регистрация
```

### Диаграмма слоёв

```
┌──────────────────────────────────────────┐
│           TaigaArsenal.Web               │
│   (Blazor Server + MVC Controller)       │
└─────────────────┬────────────────────────┘
                  │ зависит от
┌─────────────────▼────────────────────────┐
│        TaigaArsenal.Services             │
│   (IProductService, ICartService, ...)   │
└─────────────────┬────────────────────────┘
                  │ зависит от
┌─────────────────▼────────────────────────┐
│          TaigaArsenal.Data               │
│   (AppDbContext, Repository<T>, Seeder)  │
└─────────────────┬────────────────────────┘
                  │ зависит от
┌─────────────────▼────────────────────────┐
│         TaigaArsenal.Domain              │
│      (Entities — без зависимостей)       │
└──────────────────────────────────────────┘
```

### Технологический стек

| Компонент       | Технология                         |
|-----------------|------------------------------------|
| Бэкенд          | ASP.NET Core 8.0                   |
| UI              | Blazor Server                      |
| ORM             | Entity Framework Core 8 (Npgsql)   |
| База данных     | PostgreSQL 13+                     |
| Аутентификация  | ASP.NET Identity + Cookie Auth     |
| Иконки          | Font Awesome 6.5 (CDN)             |
| Уведомления     | Blazored.Toast 4.2.1               |
| Шрифты          | Playfair Display, Montserrat       |
| Контейнеры      | Docker / docker-compose            |

---

## Схема базы данных

```
AspNetUsers ─────────────────── Orders
  │ Id (PK)                       │ Id (PK)
  │ Email                         │ UserId (FK → AspNetUsers)
  │ PasswordHash                  │ TotalAmount
  │ FirstName / LastName          │ Status (Pending/Paid/Shipped/Delivered)
  └───────────────────────────────┤ CreatedAt
                                  └── OrderItems
                                        │ Id (PK)
                                        │ OrderId (FK → Orders)
                                        │ ProductId (FK → Products)
                                        │ Quantity
                                        └── Price (снимок цены)

Categories ──────────────────── Products
  │ Id (PK)                       │ Id (PK)
  │ Name                          │ Name / Brand
  │ Slug (URL-ключ)               │ Price / OldPrice
  └───────────────────────────────┤ CategoryId (FK → Categories)
                                  │ ImageUrl
                                  │ RequiresLicense
                                  └── Stock / IsActive

CartItems                       Licenses
  │ Id (PK)                       │ Id (PK)
  │ UserId (FK → AspNetUsers)     │ UserId (FK → AspNetUsers)
  │ ProductId (FK → Products)     │ ProductId (FK → Products)
  └── Quantity                    │ Status (Pending/Approved/Rejected)
                                  └── Comment

SupportTickets ─────────────── SupportMessages
  │ Id (PK)                       │ Id (PK)
  │ UserId (FK → AspNetUsers)     │ TicketId (FK → SupportTickets)
  │ Subject                       │ AuthorId (FK → AspNetUsers)
  │ Status (Open/InProgress/Closed)│ Body
  └──────────────────────────────  └── CreatedAt
```

---

## Требования

### Обязательные
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [PostgreSQL 13 или новее](https://www.postgresql.org/download/)

### Опциональные
- Docker + docker-compose (для запуска через контейнеры)
- Git

---

## Установка и запуск

### 1. Клонирование / копирование проекта

```bash
git clone https://github.com/yourname/taiga-arsenal.git
cd taiga-arsenal
```

Или распакуй архив проекта в удобную папку.

### 2. Настройка базы данных

Открой **PowerShell** и выполни (замени путь на свою версию PostgreSQL):

```powershell
# создать базу данных
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE taiga_db;"
```

### 3. Строка подключения

Отредактируй `src/TaigaArsenal.Web/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=taiga_db;Username=postgres;Password=ВАШ_ПАРОЛЬ"
  }
}
```

### 4. Восстановление зависимостей

```bash
dotnet restore src/TaigaArsenal.Web/TaigaArsenal.Web.csproj
```

### 5. Запуск приложения

```bash
cd src/TaigaArsenal.Web
dotnet run
```

Приложение будет доступно по адресу: **http://localhost:5000**

> **Примечание:** База данных создаётся автоматически при первом запуске через `DbSeeder`. Таблицы создаются SQL-скриптами (`CREATE TABLE IF NOT EXISTS`), миграции EF не используются. Тестовые аккаунты и начальные данные заполняются автоматически.

---

## Запуск через Docker

### docker-compose.yml

```yaml
version: '3.9'

services:
  db:
    image: postgres:16-alpine
    container_name: taiga_postgres
    environment:
      POSTGRES_DB:       taiga_db
      POSTGRES_USER:     taiga
      POSTGRES_PASSWORD: taiga_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    container_name: taiga_app
    depends_on:
      db:
        condition: service_healthy
    environment:
      ConnectionStrings__Default: "Host=db;Port=5432;Database=taiga_db;Username=taiga;Password=taiga_pass"
      ASPNETCORE_URLS: "http://+:80"
    ports:
      - "8080:80"
    volumes:
      - uploads_data:/app/wwwroot/uploads

volumes:
  postgres_data:
  uploads_data:
```

### Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/TaigaArsenal.Domain/TaigaArsenal.Domain.csproj",    "src/TaigaArsenal.Domain/"]
COPY ["src/TaigaArsenal.Data/TaigaArsenal.Data.csproj",        "src/TaigaArsenal.Data/"]
COPY ["src/TaigaArsenal.Services/TaigaArsenal.Services.csproj", "src/TaigaArsenal.Services/"]
COPY ["src/TaigaArsenal.Web/TaigaArsenal.Web.csproj",          "src/TaigaArsenal.Web/"]
RUN dotnet restore "src/TaigaArsenal.Web/TaigaArsenal.Web.csproj"
COPY . .
RUN dotnet publish "src/TaigaArsenal.Web/TaigaArsenal.Web.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "TaigaArsenal.Web.dll"]
```

```bash
# Сборка и запуск
docker compose build
docker compose up -d

# Просмотр логов
docker compose logs -f app

# Остановка
docker compose down
```

Приложение будет доступно по адресу: **http://localhost:8080**

---

## Перенос на другой компьютер

### Резервная копия базы данных

```powershell
# создать дамп (старый компьютер)
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  -U postgres -d taiga_db `
  -f "C:\путь\до\TaigaArsenal\taiga_backup.sql"
```

### Восстановление на новом компьютере

```powershell
# 1. создать базу
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE taiga_db;"

# 2. восстановить дамп
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d taiga_db `
  -f "C:\путь\до\taiga_backup.sql"

# 3. запустить проект
cd C:\путь\до\TaigaArsenal\src\TaigaArsenal.Web
dotnet run
```

> **Важно:** Дополнительно скопируй папку `wwwroot/uploads/products/` — загруженные фотографии товаров хранятся там, в базу данных попадает только путь к файлу.

---

## Аккаунты по умолчанию

| Роль        | Email                    | Пароль           |
|-------------|--------------------------|------------------|
| Admin       | `admin@taiga.ru`         | `Admin123!`      |
| Consultant  | `consultant@taiga.ru`    | `Consultant123!` |
| Support     | `support@taiga.ru`       | `Support123!`    |
| User        | `user@taiga.ru`          | `User123!`       |

---

## Структура проекта

```
src/
├── TaigaArsenal.Domain/
│   └── Entities/
│       └── Entities.cs          # Product, Order, CartItem, License, SupportTicket, ...
│
├── TaigaArsenal.Data/
│   ├── Context/
│   │   └── AppDbContext.cs      # EF Core контекст, все DbSet'ы
│   ├── Repositories/
│   │   └── Repository.cs        # Repository<T> — базовый CRUD
│   └── DbSeeder.cs              # CREATE TABLE IF NOT EXISTS + seed-данные
│
├── TaigaArsenal.Services/
│   ├── Interfaces/
│   │   └── IServices.cs         # IProductService, ICartService, IOrderService, ...
│   └── Implementations/
│       └── Services.cs          # Реализации всех сервисов
│
└── TaigaArsenal.Web/
    ├── Components/
    │   ├── Layout/
    │   │   └── MainLayout.razor          # Навбар + футер
    │   ├── Shared/
    │   │   ├── NavDropdown.razor         # Дропдаун меню пользователя
    │   │   ├── ProductCard.razor         # Карточка товара в сетке
    │   │   ├── ProductIcon.razor         # Font Awesome иконки категорий
    │   │   ├── AccountNav.razor          # Навигация личного кабинета
    │   │   └── AdminNav.razor            # Навигация панели администратора
    │   └── Pages/
    │       ├── Home.razor                # Главная страница
    │       ├── Catalog.razor             # Каталог с поиском и фильтрами
    │       ├── ProductDetail.razor       # Страница товара
    │       ├── Cart.razor                # Корзина
    │       ├── Checkout.razor            # Оформление заказа
    │       ├── Account/
    │       │   ├── Login.razor
    │       │   ├── Register.razor
    │       │   ├── Orders.razor          # Мои заказы
    │       │   ├── Licenses.razor        # Мои лицензии
    │       │   ├── Tickets.razor         # Обращения в поддержку
    │       │   └── Profile.razor
    │       └── Admin/
    │           ├── AdminDashboard.razor  # Дашборд со статистикой
    │           ├── AdminProducts.razor   # Управление товарами + загрузка фото
    │           ├── AdminOrders.razor     # Управление заказами
    │           ├── AdminLicenses.razor   # Заявки на лицензии
    │           ├── AdminTickets.razor    # Тикеты поддержки
    │           └── AdminUsers.razor      # Список пользователей
    ├── Controllers/
    │   └── AccountController.cs          # POST /auth/login, /auth/register, GET /auth/logout
    ├── wwwroot/
    │   ├── css/taiga.css                 # Все стили проекта
    │   ├── js/taiga.js                   # Particles на главной, закрытие dropdown
    │   ├── images/products/              # Иконки-заглушки категорий (PNG)
    │   └── uploads/products/             # Загруженные фото товаров
    ├── IconHelper.cs                     # Маппинг slug категории → ключ иконки FA
    ├── appsettings.json
    └── Program.cs                        # Точка входа, регистрация DI, запуск DbSeeder
```

---

## Страницы приложения

| URL                      | Описание                                    | Доступ              |
|--------------------------|---------------------------------------------|---------------------|
| `/`                      | Главная: hero-секция, категории, рекомендации | Все               |
| `/catalog`               | Каталог товаров (поиск, фильтры, сортировка) | Все               |
| `/catalog?slug=XXX`      | Каталог с предвыбранной категорией           | Все                 |
| `/product/{id}`          | Детальная страница товара                   | Все                 |
| `/cart`                  | Корзина покупателя                          | Авторизованные      |
| `/checkout`              | Оформление заказа                           | Авторизованные      |
| `/account/orders`        | История заказов                             | Авторизованные      |
| `/account/licenses`      | Мои заявки на лицензию                      | Авторизованные      |
| `/account/tickets`       | Обращения в поддержку                       | Авторизованные      |
| `/account/profile`       | Профиль пользователя                        | Авторизованные      |
| `/admin`                 | Дашборд: статистика заказов и выручки       | Admin, Consultant   |
| `/admin/products`        | CRUD товаров, загрузка фото                 | Admin, Consultant   |
| `/admin/orders`          | Управление заказами                         | Admin               |
| `/admin/licenses`        | Одобрение заявок на лицензию               | Admin, Consultant   |
| `/admin/tickets`         | Обработка тикетов поддержки                 | Admin, Support      |
| `/admin/users`           | Список пользователей системы                | Admin               |
| `POST /auth/login`       | Вход (MVC-контроллер)                       | Все                 |
| `POST /auth/register`    | Регистрация (MVC-контроллер)                | Все                 |
| `GET /auth/logout`       | Выход из системы                            | Авторизованные      |

---

## Лицензия

Проект разработан в учебных целях в рамках курсового проекта по дисциплине «Веб-разработка».
