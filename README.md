# KTU API (Modern Version)

A clean, modernized REST API for fetching student data from Kerala Technological University (KTU) portals — rewritten for 2025 with updated dependencies and simplified architecture.

---

## 🚀 Features

- **Complete Student Profile** — Name, Admission No, Branch, Semester, Batch, College
- **Academic Info** — CGPA, SGPA, Percentage, Credits Earned
- **Semester Results** — Course-wise grades, credits, and grade points
- **Modern Stack** — Node.js 18+, Express, ES Modules
- **Web Scraping** — Axios + Cheerio
- **Session Management** — Handles KTU portal authentication
- **Caching** — In-memory cache (NodeCache)
- **Error Handling** — Retry logic and structured error responses
- **CORS Ready** — Works with any frontend

---

## 🧩 Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Scraper:** Axios + Cheerio
- **Cache:** NodeCache (in-memory)
- **Modules:** ES Modules (no CommonJS)

---

## 🛠️ Setup

### 1. Clone the project
```bash
git clone https://github.com/albensjohn/KTU-API
cd KTU-API
```

### 2. Create files
- `.env`

### 3. Install dependencies
```bash
npm install
```

### 4. Start the server
```bash
# Development (auto reload)
npm run dev

# Production
npm start
```

Server starts at:
```
http://localhost:3000
```

---

## 📡 API Endpoints

### 1️⃣ Get Complete Student Profile
Fetches full student details (requires credentials).

**POST** `/api/profile`
```json
{
  "registerNo": "ABC20CS001",
  "password": "your_password"
}
```

**Response:**
```json
{
  "registerNo": "ABC20CS001",
  "personalInfo": {
    "name": "John Doe",
    "admissionNo": "ABC20001",
    "branch": "Computer Science",
    "semester": "S6",
    "batch": "2020-24",
    "college": "ABC College of Engineering"
  },
  "academicInfo": {
    "cgpa": "8.5",
    "sgpa": "8.7"
  },
  "semesterResults": [
    {
      "courseCode": "CS301",
      "courseName": "Data Structures",
      "grade": "A+",
      "credits": "4"
    }
  ]
}
```

### 2️⃣ Health Check
**GET** `/health`
```json
{
  "status": "ok",
  "timestamp": "2025-11-02T00:00:00.000Z",
  "endpoints": ["/api/profile"]
}
```

---

## ⚙️ Configuration

### .env Example
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Cache TTL in seconds (default: 1800 = 30 minutes)
CACHE_TTL=1800
```

---

## 🧠 How It Works

1. Uses Axios to fetch HTML pages from the official KTU portal.
2. Parses the content with Cheerio to extract relevant data (profile, CGPA, results, etc.).
3. Returns structured JSON responses.
4. Uses NodeCache to reduce load and accelerate responses.

---

## 🧩 Notes & Limitations

- This is **not an official KTU API** — it scrapes publicly available data.
- If KTU changes its website structure, selectors must be updated.
- In-memory cache resets on restart — use Redis for persistent caching in production.

---

## 🧑‍💻 Author
**KTU API Modern Version** — Rewritten by community contributors for 2025 Node.js standards.

