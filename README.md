# KTU API - Modernized Version

A modern, updated API for fetching student data from Kerala Technological University (KTU) portal. This is a complete rewrite of the original 6-year-old project with current technologies.

## 🚀 Features

- **Complete Student Profile** - Name, Admission No, Branch, Semester, Batch, College
- **Activity Points Tracking** - Total points, breakdown by category, status (100 required)
- **Attendance Monitoring** - Overall and subject-wise attendance (75% mandatory)
- **Academic Info** - CGPA, SGPA, Percentage calculation, Credits earned
- **Semester Results** - Course-wise grades, credits, and grade points
- **Public Results Access** - Exam results without login
- **Announcements** - Latest KTU notifications
- **Modern Stack** - Built with latest Node.js (18+), Express, and ES modules
- **Web Scraping** - Uses Axios and Cheerio for reliable data fetching
- **Session Management** - Handles KTU portal authentication
- **Caching** - Built-in caching to reduce load on KTU servers
- **Error Handling** - Robust error handling with retry logic
- **CORS Support** - Ready for frontend integration

## 🛠️ Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

1. **Clone or create the project**:
```bash
mkdir ktu-api
cd ktu-api
```

2. **Create the files**:
   - Copy `package.json`
   - Copy `server.js`
   - Copy `.env.example` to `.env`

3. **Install dependencies**:
```bash
npm install
```

4. **Start the server**:
```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### 1. Get Complete Student Profile ⭐ NEW

**Get ALL student details: Name, Activity Points, Attendance, Credits, CGPA**

```bash
POST /api/profile
Content-Type: application/json

{
  "registerNo": "ABC20CS001",
  "password": "your_password"
}
```

**Example with curl**:
```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{"registerNo":"ABC20CS001","password":"your_password"}'
```

**Response**:
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
    "sgpa": "8.7",
    "percentage": "82.5%"
  },
  "attendance": {
    "overall": "85.5%",
    "subjects": [
      {
        "subject": "Data Structures",
        "attended": 34,
        "total": 40,
        "percentage": "85%"
      }
    ]
  },
  "activityPoints": {
    "total": "95",
    "required": "100",
    "status": "Pending",
    "breakdown": [
      {
        "category": "NSS/NCC",
        "points": 60
      },
      {
        "category": "Technical Events",
        "points": 35
      }
    ]
  },
  "credits": {
    "earned": "148",
    "required": "162",
    "courseCredits": "160",
    "activityCredits": "2"
  },
  "semesterResults": [...]
}
```

### 2. Get Public Student Results

```bash
GET /api/results/:registerNo
```

**Example**:
```bash
curl http://localhost:3000/api/results/ABC20CS001
```

**Response**:
```json
{
  "registerNo": "ABC20CS001",
  "studentName": "John Doe",
  "results": [
    {
      "examName": "S1 Exam Dec 2020",
      "examDate": "Dec 2020",
      "sgpa": "8.5",
      "cgpa": "8.5",
      "subjects": [...]
    }
  ]
}
```

### 3. Get Detailed Attendance

```bash
POST /api/attendance
Content-Type: application/json

{
  "registerNo": "ABC20CS001",
  "password": "your_password"
}
```

**Response**:
```json
{
  "overall": "85.5%",
  "subjects": [
    {
      "subject": "Data Structures",
      "attended": 34,
      "total": 40,
      "percentage": "85%"
    }
  ],
  "lastUpdated": "2025-11-01T10:00:00.000Z"
}
```

### 4. Get Announcements

```bash
GET /api/announcements
```

**Response**:
```json
{
  "announcements": [
    {
      "title": "Exam Schedule Released",
      "date": "Nov 1, 2025",
      "description": "...",
      "links": [...]
    }
  ],
  "count": 20,
  "lastUpdated": "2025-11-01T10:00:00.000Z"
}
```

### 5. Health Check

```bash
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-01T10:00:00.000Z",
  "endpoints": {...}
}
```

## 🔧 Configuration

Edit the `.env` file:

```bash
PORT=3000
NODE_ENV=development
```

## 🐳 Docker Support (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t ktu-api .
docker run -p 3000:3000 ktu-api
```

## 📝 Notes

### Why This Works Now

The original project failed because:

1. **Old Dependencies**: Used deprecated packages that no longer work
2. **Complex Setup**: Required Redis, Firebase, and other services
3. **Outdated Scraping**: Website structure changed
4. **No Maintenance**: 6 years without updates

This version fixes all these issues with:

- Modern, maintained dependencies
- Simpler architecture (no external services needed)
- Updated scraping logic
- Current best practices

### Limitations

- **Rate Limiting**: Built-in caching reduces requests, but excessive use may be blocked by KTU
- **Dynamic Content**: Some KTU pages use JavaScript rendering - for those, you'd need Puppeteer
- **Structure Changes**: If KTU changes their website structure, scraping logic needs updates

### Adding Puppeteer (for JavaScript-rendered pages)

If you need to scrape pages that require JavaScript execution:

```bash
npm install puppeteer
```

Then modify the scraping logic to use Puppeteer instead of Axios.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

GPL-3.0 (same as original project)

## ⚠️ Disclaimer

This is an unofficial API. Use responsibly and respect KTU's terms of service. Don't overload their servers.

## 🙏 Credits

Based on the original project by ktuapp (2019), completely rewritten with modern technologies.
