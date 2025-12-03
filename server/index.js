const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// 启用 CORS
app.use(cors());
app.use(express.json());

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. 遥测数据接口
// 接收 POST 请求并将其追加到 JSONL 文件中
app.post('/api/analytics', (req, res) => {
  try {
    const event = req.body;
    // 添加服务器接收时间
    const logEntry = JSON.stringify({ 
      ...event, 
      serverTimestamp: Date.now(),
      serverTime: new Date().toISOString() 
    }) + '\n';
    
    // 按日期分割日志文件，例如 telemetry-2023-12-01.jsonl
    const dateStr = new Date().toISOString().split('T')[0];
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

// 2. 自动更新文件服务
// 静态托管 public/updates 目录
// 访问地址: https://desktop.ruifeis.net/updates/latest.yml
const updatesDir = path.join(__dirname, 'public', 'updates');
if (!fs.existsSync(updatesDir)) {
  fs.mkdirSync(updatesDir, { recursive: true });
}
app.use('/updates', express.static(updatesDir));

// 3. 仪表盘服务
// 访问地址: https://desktop.ruifeis.net/dashboard
const dashboardDir = path.join(__dirname, 'public', 'dashboard');
app.use('/dashboard', express.static(dashboardDir));

// 仪表盘数据 API
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const stats = {
      totalUsers: 0,
      activeUsersToday: 0,
      totalEvents: 0,
      topVersion: '',
      eventStats: {},
      pageStats: {},
      recentLogs: []
    };

    const userIds = new Set();
    const todayUserIds = new Set();
    const versions = {};
    const today = new Date().toISOString().split('T')[0];

    // 读取所有日志文件
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.jsonl'));
    
    // 简单的内存聚合（注意：生产环境应使用数据库）
    files.forEach(file => {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        try {
          const log = JSON.parse(line);
          stats.totalEvents++;
          userIds.add(log.userId);
          
          // 统计版本
          if (log.appVersion) {
            versions[log.appVersion] = (versions[log.appVersion] || 0) + 1;
          }

          // 统计今日活跃
          if (log.serverTime && log.serverTime.startsWith(today)) {
            todayUserIds.add(log.userId);
          }

          // 统计事件类型
          if (log.category) {
            const key = `${log.category}-${log.action}`;
            stats.eventStats[key] = (stats.eventStats[key] || 0) + 1;
          }

          // 统计页面访问
          if (log.path) {
            stats.pageStats[log.path] = (stats.pageStats[log.path] || 0) + 1;
          }

          // 收集最近日志
          stats.recentLogs.push(log);
        } catch (e) {}
      });
    });

    stats.totalUsers = userIds.size;
    stats.activeUsersToday = todayUserIds.size;
    
    // 计算最常用版本
    let maxVerCount = 0;
    Object.entries(versions).forEach(([ver, count]) => {
      if (count > maxVerCount) {
        maxVerCount = count;
        stats.topVersion = ver;
      }
    });

    // 只保留最近 20 条日志（倒序）
    stats.recentLogs.sort((a, b) => b.serverTimestamp - a.serverTimestamp);
    stats.recentLogs = stats.recentLogs.slice(0, 20);

    res.json(stats);
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 健康检查
app.get('/', (req, res) => {
  res.send('Desktop Beauty Server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Telemetry endpoint: http://localhost:${PORT}/api/analytics`);
  console.log(`Updates URL: http://localhost:${PORT}/updates`);
});
