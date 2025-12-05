const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// ==================== 配置 ====================
const CONFIG = {
  // Dashboard 认证配置（生产环境请修改！）
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'desktop-beauty-2024',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
  SESSION_EXPIRY: 24 * 60 * 60 * 1000,  // 24小时
};

// 简单的会话存储
const sessions = new Map();

// 启用 CORS 和 JSON 解析
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ==================== 工具函数 ====================

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 获取日期字符串
function getDateStr(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// 读取指定日期范围的日志
function readLogs(startDate, endDate) {
  const logs = [];
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.jsonl')).sort();
  
  for (const file of files) {
    const dateMatch = file.match(/telemetry-(\d{4}-\d{2}-\d{2})\.jsonl/);
    if (dateMatch) {
      const fileDate = dateMatch[1];
      if (fileDate >= startDate && fileDate <= endDate) {
        const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            logs.push(JSON.parse(line));
          } catch (e) {}
        }
      }
    }
  }
  return logs;
}

// ==================== 认证中间件 ====================

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);
  
  if (!session || session.expiry < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.user = session.user;
  next();
}

// ==================== 认证 API ====================

// 登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
    const token = generateToken();
    sessions.set(token, {
      user: { username },
      expiry: Date.now() + CONFIG.SESSION_EXPIRY
    });
    
    res.json({
      success: true,
      token,
      user: { username },
      expiresIn: CONFIG.SESSION_EXPIRY
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// 登出
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  sessions.delete(token);
  res.json({ success: true });
});

// 验证 token
app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ==================== 遥测数据接收 ====================

// 单条事件
app.post('/api/analytics', (req, res) => {
  try {
    const event = req.body;
    const logEntry = JSON.stringify({
      ...event,
      serverTimestamp: Date.now(),
      serverTime: new Date().toISOString()
    }) + '\n';
    
    const dateStr = getDateStr();
    const logFile = path.join(dataDir, `telemetry-${dateStr}.jsonl`);

    fs.appendFile(logFile, logEntry, (err) => {
      if (err) {
        console.error('写入遥测数据失败:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.status(200).json({ status: 'ok' });
    });
  } catch (error) {
    console.error('处理请求失败:', error);
    res.status(400).json({ error: 'Bad Request' });
  }
});

// 批量事件
app.post('/api/analytics/batch', (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Invalid events array' });
    }

    const dateStr = getDateStr();
    const logFile = path.join(dataDir, `telemetry-${dateStr}.jsonl`);
    const serverTime = new Date().toISOString();
    const serverTimestamp = Date.now();

    const logEntries = events.map(event => 
      JSON.stringify({ ...event, serverTimestamp, serverTime })
    ).join('\n') + '\n';

    fs.appendFile(logFile, logEntries, (err) => {
      if (err) {
        console.error('批量写入失败:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.status(200).json({ status: 'ok', count: events.length });
    });
  } catch (error) {
    console.error('批量处理失败:', error);
    res.status(400).json({ error: 'Bad Request' });
  }
});

// ==================== Dashboard 数据 API ====================

// 概览统计
app.get('/api/dashboard/overview', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || getDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const end = endDate || getDateStr();
    
    const logs = readLogs(start, end);
    
    const userIds = new Set();
    const sessionIds = new Set();
    const todayUserIds = new Set();
    const today = getDateStr();
    const versions = {};
    const platforms = {};
    
    let totalSessions = 0;
    let totalSessionDuration = 0;
    let errorCount = 0;

    for (const log of logs) {
      if (log.userId) userIds.add(log.userId);
      if (log.sessionId) sessionIds.add(log.sessionId);
      
      if (log.serverTime?.startsWith(today) && log.userId) {
        todayUserIds.add(log.userId);
      }
      
      if (log.appVersion) {
        versions[log.appVersion] = (versions[log.appVersion] || 0) + 1;
      }
      
      if (log.platform) {
        platforms[log.platform] = (platforms[log.platform] || 0) + 1;
      }
      
      if (log.eventType === 'app_quit' && log.sessionDuration) {
        totalSessions++;
        totalSessionDuration += log.sessionDuration;
      }
      
      if (log.eventType === 'error') {
        errorCount++;
      }
    }

    res.json({
      totalUsers: userIds.size,
      activeUsersToday: todayUserIds.size,
      totalEvents: logs.length,
      totalSessions: sessionIds.size,
      avgSessionDuration: totalSessions > 0 ? Math.round(totalSessionDuration / totalSessions / 1000) : 0,
      errorCount,
      versions: Object.entries(versions).map(([version, count]) => ({ version, count })).sort((a, b) => b.count - a.count),
      platforms: Object.entries(platforms).map(([platform, count]) => ({ platform, count })),
      dateRange: { start, end }
    });
  } catch (error) {
    console.error('获取概览失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 用户活跃度趋势
app.get('/api/dashboard/trends', authMiddleware, (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const logs = readLogs(getDateStr(startDate), getDateStr(endDate));
    
    const dailyStats = {};
    
    for (const log of logs) {
      const date = log.serverTime?.split('T')[0];
      if (!date) continue;
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          users: new Set(),
          sessions: new Set(),
          events: 0,
          errors: 0
        };
      }
      
      dailyStats[date].events++;
      if (log.userId) dailyStats[date].users.add(log.userId);
      if (log.sessionId) dailyStats[date].sessions.add(log.sessionId);
      if (log.eventType === 'error') dailyStats[date].errors++;
    }
    
    const trends = Object.values(dailyStats).map(day => ({
      date: day.date,
      users: day.users.size,
      sessions: day.sessions.size,
      events: day.events,
      errors: day.errors
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ trends });
  } catch (error) {
    console.error('获取趋势失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 功能使用统计
app.get('/api/dashboard/features', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || getDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const end = endDate || getDateStr();
    
    const logs = readLogs(start, end);
    
    const features = {};
    const actions = {};
    
    for (const log of logs) {
      if (log.eventType === 'feature_use') {
        const category = log.category || 'unknown';
        const action = log.action || 'unknown';
        const key = `${category}:${action}`;
        
        features[category] = (features[category] || 0) + 1;
        actions[key] = (actions[key] || 0) + 1;
      }
    }
    
    res.json({
      categories: Object.entries(features).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      actions: Object.entries(actions).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 20)
    });
  } catch (error) {
    console.error('获取功能统计失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 页面访问统计
app.get('/api/dashboard/pages', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || getDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const end = endDate || getDateStr();
    
    const logs = readLogs(start, end);
    
    const pages = {};
    const pageTime = {};
    const pageCount = {};
    
    for (const log of logs) {
      if (log.eventType === 'page_view') {
        const pageName = log.pageName || log.label || 'unknown';
        pages[pageName] = (pages[pageName] || 0) + 1;
        
        if (log.timeOnPreviousPage && log.previousPage) {
          pageTime[log.previousPage] = (pageTime[log.previousPage] || 0) + log.timeOnPreviousPage;
          pageCount[log.previousPage] = (pageCount[log.previousPage] || 0) + 1;
        }
      }
    }
    
    const avgTimeOnPage = {};
    for (const [page, totalTime] of Object.entries(pageTime)) {
      avgTimeOnPage[page] = Math.round(totalTime / pageCount[page] / 1000);
    }
    
    res.json({
      pageViews: Object.entries(pages).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      avgTimeOnPage: Object.entries(avgTimeOnPage).map(([name, seconds]) => ({ name, seconds })).sort((a, b) => b.seconds - a.seconds)
    });
  } catch (error) {
    console.error('获取页面统计失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 错误统计
app.get('/api/dashboard/errors', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    const start = startDate || getDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const end = endDate || getDateStr();
    
    const logs = readLogs(start, end);
    
    const errorTypes = {};
    const errorMessages = {};
    const recentErrors = [];
    
    for (const log of logs) {
      if (log.eventType === 'error') {
        errorTypes[log.errorType || 'unknown'] = (errorTypes[log.errorType || 'unknown'] || 0) + 1;
        
        const msg = log.errorMessage?.substring(0, 100) || 'Unknown error';
        errorMessages[msg] = (errorMessages[msg] || 0) + 1;
        
        recentErrors.push({
          timestamp: log.serverTimestamp,
          type: log.errorType,
          message: log.errorMessage,
          severity: log.severity,
          component: log.componentName,
          userId: log.userId?.substring(0, 8),
          appVersion: log.appVersion
        });
      }
    }
    
    recentErrors.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({
      byType: Object.entries(errorTypes).map(([type, count]) => ({ type, count })),
      topMessages: Object.entries(errorMessages).map(([message, count]) => ({ message, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      recent: recentErrors.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('获取错误统计失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 系统信息统计
app.get('/api/dashboard/systems', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || getDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = endDate || getDateStr();
    
    const logs = readLogs(start, end);
    
    const cpuModels = {};
    const gpuModels = {};
    const resolutions = {};
    const memoryRanges = { '4GB以下': 0, '4-8GB': 0, '8-16GB': 0, '16-32GB': 0, '32GB以上': 0 };
    
    for (const log of logs) {
      if (log.eventType === 'system_info') {
        if (log.cpuModel) {
          cpuModels[log.cpuModel] = (cpuModels[log.cpuModel] || 0) + 1;
        }
        if (log.gpuModel) {
          gpuModels[log.gpuModel] = (gpuModels[log.gpuModel] || 0) + 1;
        }
        if (log.screenResolution) {
          resolutions[log.screenResolution] = (resolutions[log.screenResolution] || 0) + 1;
        }
        if (log.totalMemory) {
          const mem = log.totalMemory;
          if (mem < 4) memoryRanges['4GB以下']++;
          else if (mem < 8) memoryRanges['4-8GB']++;
          else if (mem < 16) memoryRanges['8-16GB']++;
          else if (mem < 32) memoryRanges['16-32GB']++;
          else memoryRanges['32GB以上']++;
        }
      }
    }
    
    res.json({
      cpuModels: Object.entries(cpuModels).map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count).slice(0, 15),
      gpuModels: Object.entries(gpuModels).map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count).slice(0, 15),
      resolutions: Object.entries(resolutions).map(([resolution, count]) => ({ resolution, count })).sort((a, b) => b.count - a.count),
      memoryDistribution: Object.entries(memoryRanges).map(([range, count]) => ({ range, count }))
    });
  } catch (error) {
    console.error('获取系统统计失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 实时日志流
app.get('/api/dashboard/live', authMiddleware, (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const today = getDateStr();
    const logs = readLogs(today, today);
    
    logs.sort((a, b) => (b.serverTimestamp || 0) - (a.serverTimestamp || 0));
    
    res.json({
      logs: logs.slice(0, parseInt(limit)).map(log => ({
        timestamp: log.serverTimestamp,
        eventType: log.eventType,
        userId: log.userId?.substring(0, 8),
        sessionId: log.sessionId?.substring(0, 8),
        appVersion: log.appVersion,
        details: log.category ? `${log.category}:${log.action}` : (log.pageName || log.errorMessage || '-')
      }))
    });
  } catch (error) {
    console.error('获取实时日志失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 用户留存分析
app.get('/api/dashboard/retention', authMiddleware, (req, res) => {
  try {
    const { weeks = 4 } = req.query;
    const endDate = new Date();
    const startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
    
    const logs = readLogs(getDateStr(startDate), getDateStr(endDate));
    
    const weeklyUsers = {};
    
    for (const log of logs) {
      if (!log.userId || !log.serverTime) continue;
      
      const date = new Date(log.serverTime);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = getDateStr(weekStart);
      
      if (!weeklyUsers[weekKey]) {
        weeklyUsers[weekKey] = new Set();
      }
      weeklyUsers[weekKey].add(log.userId);
    }
    
    const sortedWeeks = Object.keys(weeklyUsers).sort();
    const retention = [];
    
    for (let i = 0; i < sortedWeeks.length; i++) {
      const baseWeek = sortedWeeks[i];
      const baseUsers = weeklyUsers[baseWeek];
      const retentionData = { week: baseWeek, newUsers: baseUsers.size, retention: [] };
      
      for (let j = i; j < sortedWeeks.length; j++) {
        const targetWeek = sortedWeeks[j];
        const targetUsers = weeklyUsers[targetWeek];
        let retained = 0;
        
        for (const userId of baseUsers) {
          if (targetUsers.has(userId)) retained++;
        }
        
        retentionData.retention.push({
          week: j - i,
          rate: baseUsers.size > 0 ? Math.round(retained / baseUsers.size * 100) : 0
        });
      }
      
      retention.push(retentionData);
    }
    
    res.json({ retention: retention.slice(-parseInt(weeks)) });
  } catch (error) {
    console.error('获取留存分析失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 兼容旧版 API
app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate || getDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const end = endDate || getDateStr();
  
  const logs = readLogs(start, end);
  
  const stats = {
    totalUsers: new Set(logs.map(l => l.userId).filter(Boolean)).size,
    activeUsersToday: new Set(logs.filter(l => l.serverTime?.startsWith(getDateStr())).map(l => l.userId).filter(Boolean)).size,
    totalEvents: logs.length,
    recentLogs: logs.sort((a, b) => b.serverTimestamp - a.serverTimestamp).slice(0, 20)
  };
  
  res.json(stats);
});

// ==================== 静态文件服务 ====================

// 自动更新文件
const updatesDir = path.join(__dirname, 'public', 'updates');
if (!fs.existsSync(updatesDir)) {
  fs.mkdirSync(updatesDir, { recursive: true });
}
app.use('/updates', express.static(updatesDir));

// Dashboard 静态文件
const dashboardDir = path.join(__dirname, 'public', 'dashboard');
app.use('/dashboard', express.static(dashboardDir));

// 健康检查
app.get('/', (req, res) => {
  res.send('Desktop Beauty Server is running. v2.0');
});

// ==================== 启动服务器 ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📡 Analytics API: http://localhost:${PORT}/api/analytics`);
  console.log(`📦 Updates: http://localhost:${PORT}/updates`);
  console.log(`Updates URL: http://localhost:${PORT}/updates`);
});
