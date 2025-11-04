// server.fixed.js - Corrected and improved KTU API server
// Notes:
// - Uses axios.create to centralize httpsAgent and default headers
// - TLS verification is enabled by default; disable in development with SKIP_TLS_VERIFY=true
// - Properly sets `Content-Type: application/x-www-form-urlencoded` when posting login form
// - Merges headers passed to makeRequest with default headers
// - Basic validation for register numbers consistent across routes
// - Better error logging and safer parsing guards

import puppeteer from 'puppeteer';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

const app = express();
const PORT = process.env.PORT || 3000;

// Cache responses for 30 minutes
const cache = new NodeCache({ stdTTL: 1800 });

// TLS: enable verification by default. To bypass for local dev only set SKIP_TLS_VERIFY=true
const skipTls = process.env.SKIP_TLS_VERIFY === 'true';
if (skipTls) {
  console.warn('⚠️  TLS verification is disabled (SKIP_TLS_VERIFY=true) — only use for local development');
}

const httpsAgent = new https.Agent({ rejectUnauthorized: !skipTls });

// Default axios instance
const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://app.ktu.edu.in/',
};

const axiosInstance = axios.create({
  timeout: 15000,
  httpsAgent,
  maxRedirects: 5,
  headers: { ...defaultHeaders },
});

// Helper: makeRequest with retry + header merging
async function makeRequest(url, options = {}, retries = 3) {
  const opts = { ...options };
  opts.headers = { ...defaultHeaders, ...(opts.headers || {}) };
  opts.url = url;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axiosInstance.request(opts);
      return response;
    } catch (err) {
      const short = err?.message || String(err);
      const status = err?.response?.status;
      console.error(`Request failed (attempt ${i + 1}/${retries}):`, short, status ? `(status ${status})` : '');
      if (i === retries - 1) throw err;
      // backoff
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// KTU URLs
const KTU_LOGIN_URL = 'https://app.ktu.edu.in/login.jsp';
const KTU_STUDENT_HOME = 'https://app.ktu.edu.in/eu/stu/studentBasicProfile.htm';

// Basic register number validation used in multiple routes
const REGNO_RE = /^[A-Z]{3}\d{2}[A-Z]{2}\d{3}$/i;

async function loginStudent(registerNo, password) {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    console.log('Navigating to login page...');
    await page.goto(KTU_LOGIN_URL, { waitUntil: 'networkidle2' });

    console.log('Extracting CSRF token...');
    const csrfToken = await page.$eval('input[name="CSRF_TOKEN"]', el => el.value);

    console.log('Typing credentials...');
    await page.type('input[name="username"]', registerNo);
    await page.type('input[name="password"]', password);

    console.log('Submitting login form...');
    await page.evaluate((token) => {
      document.querySelector('input[name="CSRF_TOKEN"]').value = token;
      document.querySelector('form').submit();
    }, csrfToken);

    console.log('Waiting for navigation after login...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Navigating to full profile page...');
    await page.goto('https://app.ktu.edu.in/eu/stu/studentDetailsView.htm', { waitUntil: 'networkidle2' });

    console.log('Getting page content...');
    const content = await page.content();
    console.log(content);
    return content;
  } catch (err) {
    console.error('Login error:', err?.message || err);
    return null;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route: profile
app.post('/api/profile', async (req, res) => {
  try {
    const { registerNo, password } = req.body;
    if (!registerNo || !password) {
      return res.status(400).json({ error: 'Register number and password are required' });
    }
    if (!REGNO_RE.test(registerNo)) {
      return res.status(400).json({ error: 'Invalid register number format' });
    }

    const cacheKey = `profile_${registerNo.toUpperCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const pageContent = await loginStudent(registerNo, password);
    if (!pageContent) {
      return res.status(401).json({ error: 'Invalid credentials or login failed' });
    }

    const $ = cheerio.load(pageContent || '');

    const profile = {
      registerNo: registerNo.toUpperCase(),
      personalInfo: {},
      academicInfo: {},
      attendance: {},
      activityPoints: {},
      credits: {},
      semesterResults: [],
    };

    // PERSONAL INFO
    const nameAndAdmissionText = $('.profile-title').first().text().trim();
    const username = nameAndAdmissionText.substring(0, nameAndAdmissionText.indexOf('(')).trim();
    const admissionNo = nameAndAdmissionText.substring(nameAndAdmissionText.indexOf('(') + 1, nameAndAdmissionText.indexOf(')')).trim();

    let gender = '';
    let dob = '';
    $('.list-group-item').each(function () {
      const badgeText = $(this).find('.view-badge').text().trim();
      if (badgeText === 'Gender') {
        gender = $(this).contents().filter(function() { return this.nodeType === 3; }).text().trim();
      }
      if (badgeText === 'Date of Birth') {
        dob = $(this).contents().filter(function() { return this.nodeType === 3; }).text().trim();
      }
    });

    const panelTitle = $('.panel-title').first().text().trim();
    const college = panelTitle.substring(panelTitle.lastIndexOf('(') + 1, panelTitle.lastIndexOf(')'));

    const branchParent = $('span.view-badge:contains("Admitted Branch")').parent();
    const branchBadge = branchParent.find('.view-badge').text();
    const branch = branchParent.text().replace(branchBadge, '').trim();

    const semesterParent = $('span.view-badge:contains("Current Semester")').parent();
    const semesterBadge = semesterParent.find('.view-badge').text();
    const semester = semesterParent.text().replace(semesterBadge, '').trim();

    profile.personalInfo = {
      name: username,
      admissionNo: admissionNo,
      gender: gender,
      dob: dob,
      branch: branch,
      semester: semester,
      batch: '', // This information is not available on the page
      college: college,
    };

    // ACADEMIC
    const cgpaParent = $('span.view-badge:contains("CGPA")').parent();
    const cgpaBadge = cgpaParent.find('.view-badge').text();
    const cgpa = cgpaParent.text().replace(cgpaBadge, '').replace(':', '').trim();
    
    const sgpaAll = $('#curriculamTab_curriculam .panel-default table td[rowspan]').map((i, el) => $(el).text().trim()).get();
    const sgpaText = sgpaAll.reverse().find(s => !isNaN(parseFloat(s))) || '';

    profile.academicInfo = { cgpa: cgpa || '', sgpa: sgpaText || '', percentage: '' };
    const cgpaNum = parseFloat(profile.academicInfo.cgpa);
    if (!isNaN(cgpaNum)) profile.academicInfo.percentage = ((cgpaNum * 10) - 2.5).toFixed(2) + '%';

    // ATTENDANCE
    profile.attendance = { overall: '', subjects: [] };
    // The HTML provided does not contain attendance details, so we leave this part as is.
    // If attendance is needed, a separate navigation to the attendance page is required.

    // ACTIVITY POINTS
    profile.activityPoints = { total: '0', required: '100', status: 'Pending', breakdown: [] };
    const activityRows = $('#collapseSix table tbody tr');
    activityRows.each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
            const key = $(cells[0]).text().trim();
            const val = $(cells[1]).text().trim();
            if (key && val && !/total/i.test(key)) {
                profile.activityPoints.breakdown.push({ category: key, points: parseInt(val) || 0 });
            }
        }
    });
    const totalPointsText = activityRows.last().find('td').last().text().trim();
    const totalPoints = parseInt(totalPointsText) || profile.activityPoints.breakdown.reduce((s, b) => s + (b.points || 0), 0);
    profile.activityPoints.total = totalPoints.toString();
    profile.activityPoints.status = totalPoints >= 100 ? 'Completed' : 'Pending';


    // CREDITS
    let earnedCredits = 0;
    $('#curriculamTab_curriculam .panel-default table tbody tr').each((i, row) => {
      const creditText = $(row).find('td').eq(8).text().trim();
      const credit = parseFloat(creditText);
      if (!isNaN(credit)) {
        earnedCredits += credit;
      }
    });

    profile.credits = {
      earned: earnedCredits.toString(),
      required: '162',
      courseCredits: '160',
      activityCredits: '2',
    };

    // SEMESTER RESULTS
    $('#curriculamTab_curriculam .panel-group .panel-default').each((i, semesterPanel) => {
        const semesterName = $(semesterPanel).find('.panel-title a').first().text().trim();
        const subjects = [];
        $(semesterPanel).find('table tbody tr').each((j, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 9) {
                const courseText = $(cells[1]).text().trim();
                const codeMatch = courseText.match(/[A-Z]{3}\d{3}/);
                const code = codeMatch ? codeMatch[0] : '';
                const name = code ? courseText.substring(courseText.indexOf(code) + code.length).replace(/&nbsp;|-/g, ' ').trim() : courseText;

                const subject = {
                    code: code,
                    name: name,
                    credits: $(cells[2]).text().trim(),
                    grade: $(cells[7]).text().trim(),
                    gradePoint: '' // Not available
                };
                if (subject.code && subject.name) {
                    subjects.push(subject);
                }
            }
        });
        if (subjects.length > 0) {
            profile.semesterResults.push({ semester: semesterName, subjects });
        }
    });

    cache.set(cacheKey, profile);
    return res.json(profile);
  } catch (err) {
    console.error('Error fetching profile:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch student profile', message: err?.message || String(err) });
  }
});

// Route: public results
app.get('/api/results/:registerNo', async (req, res) => {
  try {
    const { registerNo } = req.params;
    const { examId } = req.query;
    if (!registerNo || !REGNO_RE.test(registerNo)) {
      return res.status(400).json({ error: 'Invalid register number format', expected: 'Format: ABC20CS001' });
    }

    const cacheKey = `results_${registerNo.toUpperCase()}_${examId || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const resultsUrls = [
      `https://app.ktu.edu.in/public/results?registerNo=${registerNo}`,
      `https://results.ktu.edu.in/results?registerNo=${registerNo}`,
      `https://app.ktu.edu.in/public/studentresults/${registerNo}`,
    ];

    let response = null;
    let successUrl = null;
    for (const url of resultsUrls) {
      try {
        response = await makeRequest(examId ? `${url}&examId=${examId}` : url, { method: 'GET' });
        if (response && response.status === 200 && response.data) {
          successUrl = url;
          break;
        }
      } catch (e) {
        // continue to next URL
      }
    }

    if (!response || !successUrl) return res.status(404).json({ error: 'Could not fetch results from KTU portal', registerNo: registerNo.toUpperCase() });

    const $ = cheerio.load(response.data || '');
    const results = { registerNo: registerNo.toUpperCase(), studentName: '', results: [], fetchedFrom: successUrl };

    results.studentName = $('.student-name, #studentName').text().trim() || $('span:contains("Name:")').next().text().trim() || $('td:contains("Name")').next().text().trim() || 'Name not available';

    $('.exam-result, .result-card, table.result').each((i, elem) => {
      const exam = {
        examName: $(elem).find('.exam-name, h3, h4, caption').first().text().trim(),
        examDate: $(elem).find('.exam-date, .date').text().trim(),
        sgpa: $(elem).find('.sgpa, td:contains("SGPA")').next().text().trim() || 'N/A',
        cgpa: $(elem).find('.cgpa, td:contains("CGPA")').next().text().trim() || 'N/A',
        subjects: [],
      };

      $(elem).find('tbody tr, tr.subject-row, tr').each((j, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const subject = { code: $(cells[0]).text().trim(), name: $(cells[1]).text().trim(), credits: $(cells[2]).text().trim() || '', grade: $(cells[3]).text().trim() || '', gradePoint: $(cells[4]).text().trim() || '' };
          if (subject.code && subject.name) exam.subjects.push(subject);
        }
      });

      if (exam.examName && exam.subjects.length) results.results.push(exam);
    });

    if (!results.results.length) return res.status(404).json({ error: 'No results found', registerNo: registerNo.toUpperCase(), studentName: results.studentName });

    cache.set(cacheKey, results);
    return res.json(results);
  } catch (err) {
    console.error('Error fetching results:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch results', message: err?.message || String(err) });
  }
});

// Route: attendance (requires login)
app.post('/api/attendance', async (req, res) => {
  try {
    const { registerNo, password } = req.body;
    if (!registerNo || !password) return res.status(400).json({ error: 'Register number and password required' });
    if (!REGNO_RE.test(registerNo)) return res.status(400).json({ error: 'Invalid register number format' });

    const sessionCookie = await loginStudent(registerNo, password);
    if (!sessionCookie) return res.status(401).json({ error: 'Invalid credentials' });

    const response = await makeRequest('https://app.ktu.edu.in/attendance.htm', { method: 'GET', headers: { Cookie: sessionCookie } });
    if (!response || !response.data) return res.status(502).json({ error: 'Empty response from KTU attendance' });

    const $ = cheerio.load(response.data || '');
    const attendance = { overall: '', subjects: [], lastUpdated: new Date().toISOString() };

    $('table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 4 && i > 0) {
        const subject = $(cells[0]).text().trim();
        const attended = parseInt($(cells[1]).text().trim()) || 0;
        const total = parseInt($(cells[2]).text().trim()) || 0;
        const percentage = $(cells[3]).text().trim() || (total ? ((attended / total) * 100).toFixed(2) + '%' : '0%');
        attendance.subjects.push({ subject, attended, total, percentage });
      }
    });

    const totals = attendance.subjects.reduce((acc, s) => ({ attended: acc.attended + s.attended, total: acc.total + s.total }), { attended: 0, total: 0 });
    attendance.overall = totals.total ? ((totals.attended / totals.total) * 100).toFixed(2) + '%' : '0%';

    return res.json(attendance);
  } catch (err) {
    console.error('Error fetching attendance:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch attendance', message: err?.message || String(err) });
  }
});

// Announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const cacheKey = 'announcements';
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const response = await makeRequest('https://ktu.edu.in/eu/core/announcements.htm', { method: 'GET' });
    if (!response || !response.data) return res.status(502).json({ error: 'Empty response from KTU announcements' });

    const $ = cheerio.load(response.data || '');
    const announcements = [];
    $('.announcement, .panel, article, .news-item').each((i, elem) => {
      const title = $(elem).find('h3, h4, .title').first().text().trim();
      const date = $(elem).find('.date, .posted-date, time').text().trim();
      const description = $(elem).find('p, .description').first().text().trim();
      const links = [];
      $(elem).find('a').each((j, link) => {
        const href = $(link).attr('href');
        const linkText = $(link).text().trim();
        if (href && linkText && !linkText.toLowerCase().includes('read more')) {
          links.push({ title: linkText, url: href.startsWith('http') ? href : `https://ktu.edu.in${href}` });
        }
      });
      if (title) announcements.push({ title, date, description, links });
    });

    const result = { announcements: announcements.slice(0, 20), count: announcements.length, lastUpdated: new Date().toISOString() };
    cache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error('Error fetching announcements:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch announcements', message: err?.message || String(err) });
  }
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), cache: { keys: cache.keys().length, stats: cache.getStats() } });
});

app.get('/', (req, res) => res.json({ name: 'KTU API v2.0', description: 'API for KTU Student Portal' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err?.message || String(err) });
});

app.listen(PORT, () => {
  console.log(`\n🚀 KTU API v2.0 Server Running`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
});
