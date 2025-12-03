<template>
  <div class="cpu-health-view">
    <!-- 头部 -->
    <header class="header">
      <div class="title-section">
        <h1>🔍 CPU健康检测</h1>
        <p class="subtitle">Intel 13/14代"缩缸"问题检测工具</p>
      </div>
      <button 
        class="btn-check" 
        :disabled="isChecking"
        @click="runHealthCheck"
      >
        <span v-if="isChecking" class="spinner"></span>
        {{ isChecking ? '检测中...' : '开始检测' }}
      </button>
    </header>

    <!-- 检测中状态 -->
    <div v-if="isChecking" class="checking-state">
      <div class="checking-animation">
        <div class="cpu-icon">🖥️</div>
        <div class="scan-ring"></div>
      </div>
      <p>正在分析CPU状态...</p>
      <p class="hint">正在检测微码版本、系统日志、硬件错误...</p>
    </div>

    <!-- 检测结果 -->
    <div v-else-if="report" class="report-content">
      <!-- 风险等级卡片 -->
      <div class="risk-card" :class="report.riskLevel">
        <div class="risk-icon">{{ getRiskIcon(report.riskLevel) }}</div>
        <div class="risk-info">
          <div class="risk-level-text">{{ getRiskLevelText(report.riskLevel) }}</div>
          <div class="risk-score">风险评分: {{ report.riskScore }}/100</div>
        </div>
        <div class="risk-meter">
          <div class="meter-fill" :style="{ width: report.riskScore + '%' }"></div>
        </div>
      </div>

      <!-- CPU信息卡片 -->
      <div class="info-card">
        <h3>📊 CPU信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">处理器</span>
            <span class="value">{{ report.cpuInfo.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">核心/线程</span>
            <span class="value">{{ report.cpuInfo.cores }}核 / {{ report.cpuInfo.threads }}线程</span>
          </div>
          <div class="info-item">
            <span class="label">微码版本</span>
            <span class="value" :class="{ 'text-success': report.microcodeInfo.isFixed, 'text-warning': !report.microcodeInfo.isFixed }">
              {{ report.microcodeInfo.version }}
              <span v-if="report.microcodeInfo.isFixed" class="badge success">已修复</span>
              <span v-else class="badge warning">需更新</span>
            </span>
          </div>
          <div class="info-item">
            <span class="label">BIOS日期</span>
            <span class="value">{{ report.microcodeInfo.updateDate }}</span>
          </div>
        </div>
      </div>

      <!-- 受影响状态 -->
      <div class="status-card" :class="{ affected: report.isAffectedCpu, safe: !report.isAffectedCpu }">
        <div class="status-icon">{{ report.isAffectedCpu ? '⚠️' : '✅' }}</div>
        <div class="status-text">{{ report.affectedReason }}</div>
      </div>

      <!-- 错误统计 -->
      <div class="stats-row">
        <div class="stat-card" :class="{ 'has-error': report.wheaErrorCount > 0 }">
          <div class="stat-value">{{ report.wheaErrorCount }}</div>
          <div class="stat-label">硬件错误 (30天)</div>
        </div>
        <div class="stat-card" :class="{ 'has-error': report.recentCrashes > 0 }">
          <div class="stat-value">{{ report.recentCrashes }}</div>
          <div class="stat-label">系统崩溃 (30天)</div>
        </div>
      </div>

      <!-- 建议列表 -->
      <div class="recommendations-card">
        <h3>💡 建议</h3>
        <ul class="recommendations-list">
          <li v-for="(rec, index) in report.recommendations" :key="index">
            {{ rec }}
          </li>
        </ul>
      </div>

      <!-- 评判标准说明 -->
      <div class="scoring-card">
        <h3>📐 风险评分计算方式</h3>
        <div class="scoring-table">
          <div class="scoring-header">
            <span>检测项目</span>
            <span>您的状态</span>
            <span>得分</span>
          </div>
          <div class="scoring-row">
            <span class="item">CPU型号是否受影响</span>
            <span class="status" :class="report.isAffectedCpu ? 'bad' : 'good'">
              {{ report.isAffectedCpu ? '是 (13/14代K系列)' : '否' }}
            </span>
            <span class="score">{{ report.isAffectedCpu ? '+30分' : '+0分' }}</span>
          </div>
          <div class="scoring-row">
            <span class="item">微码是否已修复 (≥0x0125)</span>
            <span class="status" :class="report.microcodeInfo.isFixed ? 'good' : 'bad'">
              {{ report.microcodeInfo.isFixed ? '已修复' : '未修复' }}
            </span>
            <span class="score">{{ report.microcodeInfo.isFixed ? '+0分' : '+20分' }}</span>
          </div>
          <div class="scoring-row">
            <span class="item">30天内WHEA硬件错误</span>
            <span class="status" :class="report.wheaErrorCount > 0 ? 'bad' : 'good'">
              {{ report.wheaErrorCount }} 条
            </span>
            <span class="score">+{{ Math.min(report.wheaErrorCount * 5, 25) }}分 (每条+5，上限25)</span>
          </div>
          <div class="scoring-row">
            <span class="item">30天内系统崩溃/蓝屏</span>
            <span class="status" :class="report.recentCrashes > 0 ? 'bad' : 'good'">
              {{ report.recentCrashes }} 次
            </span>
            <span class="score">+{{ Math.min(report.recentCrashes * 8, 25) }}分 (每次+8，上限25)</span>
          </div>
          <div class="scoring-row total">
            <span class="item">总计</span>
            <span class="status"></span>
            <span class="score total-score">{{ report.riskScore }}/100分</span>
          </div>
        </div>
        <div class="scoring-legend">
          <h4>风险等级划分：</h4>
          <div class="legend-items">
            <span class="legend-item safe">0-20: 安全</span>
            <span class="legend-item low">21-40: 低风险</span>
            <span class="legend-item medium">41-60: 中等风险</span>
            <span class="legend-item high">61-80: 高风险</span>
            <span class="legend-item critical">81-100: 严重风险</span>
          </div>
        </div>
      </div>

      <!-- 检测方法说明 -->
      <details class="details-card method">
        <summary>🔬 检测方法说明</summary>
        <div class="details-content method-content">
          <div class="method-section">
            <h4>1. CPU型号识别</h4>
            <p>通过WMI查询 <code>Win32_Processor</code> 获取CPU名称，使用正则表达式 <code>/I[579]-1[34]\d{3}K/</code> 匹配13/14代K系列处理器。</p>
            <p><strong>受影响型号：</strong>i9-14900K/KF/KS、i7-14700K/KF、i9-13900K/KF/KS、i7-13700K/KF、i5-13600K/KF</p>
          </div>
          <div class="method-section">
            <h4>2. 微码版本检测</h4>
            <p>从注册表 <code>HKLM\HARDWARE\DESCRIPTION\System\CentralProcessor\0</code> 读取 "Update Revision" 值。</p>
            <p><strong>修复版本：</strong>Intel于2024年8月发布微码 0x0125/0x0129，可防止进一步退化。</p>
          </div>
          <div class="method-section">
            <h4>3. WHEA错误分析</h4>
            <p>查询Windows事件日志中的 <code>Microsoft-Windows-WHEA-Logger</code> 事件，检测硬件错误。</p>
            <p><strong>关键事件ID：</strong>17(已更正错误)、18(致命错误)、19(缓存错误)、47(处理器核心错误)</p>
          </div>
          <div class="method-section">
            <h4>4. 系统稳定性</h4>
            <p>统计事件ID 41(Kernel-Power意外重启)和1001(BugCheck蓝屏)的发生次数。</p>
          </div>
          <div class="method-section warning">
            <h4>⚠️ 局限性说明</h4>
            <p>本工具仅能检测软件可观测的指标。CPU是否已经发生不可逆退化，需要通过压力测试（如Prime95、OCCT）才能确定。</p>
            <p>如频繁出现游戏崩溃、编译错误等问题，即使本工具显示低风险，也建议联系Intel进行RMA。</p>
          </div>
        </div>
      </details>

      <!-- 详细分析 -->
      <details class="details-card">
        <summary>📋 详细分析报告</summary>
        <div class="details-content">
          <pre>{{ report.detailedAnalysis.join('\n') }}</pre>
        </div>
      </details>

      <!-- WHEA错误列表 -->
      <details v-if="report.wheaErrors.length > 0" class="details-card errors">
        <summary>⚠️ 硬件错误日志 ({{ report.wheaErrors.length }}条)</summary>
        <div class="details-content">
          <div v-for="(error, index) in report.wheaErrors" :key="index" class="error-item">
            <div class="error-time">{{ error.timeCreated }}</div>
            <div class="error-type">{{ error.errorType }}</div>
            <div class="error-desc">{{ error.description }}</div>
          </div>
        </div>
      </details>

      <!-- 压力测试工具 -->
      <div class="stress-test-card">
        <h3>🔥 压力测试工具</h3>
        <p class="stress-desc">软件检测只能发现已有的错误日志，要真正验证CPU稳定性，需要使用专业压力测试工具。</p>
        
        <!-- 专业工具推荐 -->
        <div class="pro-tools">
          <div class="tools-grid">
            <div v-for="tool in tools" :key="tool.id" class="tool-card">
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-info">
                <h5>{{ tool.name }}</h5>
                <p>{{ tool.description }}</p>
                <p v-if="tool.note" class="tool-note">⚠️ {{ tool.note }}</p>
                <div class="tool-tags">
                  <span v-for="tag in tool.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
              <div class="tool-actions">
                <button 
                  class="btn-tool" 
                  :class="{ downloading: isDownloading(tool.id) }"
                  :disabled="isDownloading(tool.id)"
                  @click="downloadTool(tool)"
                >
                  <template v-if="isDownloading(tool.id)">
                    <span class="download-spinner"></span>
                    {{ getToolProgress(tool) }}%
                  </template>
                  <template v-else>
                    📥 下载
                  </template>
                </button>
                <button class="btn-homepage" @click="openHomepage(tool)" title="访问官网">
                  🔗
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 测试指南 -->
        <details class="test-guide">
          <summary>📖 完整测试指南</summary>
          <div class="guide-content">
            <!-- Prime95 指南 -->
            <div class="guide-section">
              <div class="guide-header">
                <span class="guide-icon">🔨</span>
                <h4>Prime95 测试指南</h4>
                <span class="guide-badge recommended">推荐首选</span>
              </div>
              <div class="guide-steps">
                <div class="step">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <strong>下载并解压</strong>
                    <p>下载后解压到任意文件夹，运行 prime95.exe</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <strong>选择测试模式</strong>
                    <p>首次运行选择 "Just Stress Testing"，然后选择 <code>Blend</code> 测试（同时测试CPU和内存）</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <strong>运行时长（行业标准）</strong>
                    <ul>
                      <li><strong>快速检测：</strong>30分钟 - 可发现严重退化问题</li>
                      <li><strong>标准检测：</strong>1-2小时 - 用户常用标准</li>
                      <li><strong>完整检测：</strong>8-24小时 - 专业超频社区推荐</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">4</span>
                  <div class="step-content">
                    <strong>观察结果</strong>
                    <ul>
                      <li>✅ <span class="text-success">通过</span>：所有Worker显示绿色，无错误提示</li>
                      <li>❌ <span class="text-error">失败</span>：出现 "FATAL ERROR"、"Rounding Error" 或 "Hardware Error"</li>
                      <li>💀 <span class="text-error">严重</span>：直接蓝屏(BSOD)或系统死机</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="guide-verdict">
                <strong>判定标准：</strong>按照Intel官方和超频社区共识，如果在1小时内出现任何计算错误，说明CPU可能已发生 "Vmin Shift"（最低工作电压漂移），这是退化的明确信号，建议申请RMA。
              </div>
            </div>

            <!-- OCCT 指南 -->
            <div class="guide-section">
              <div class="guide-header">
                <span class="guide-icon">🌡️</span>
                <h4>OCCT 测试指南</h4>
                <span class="guide-badge">全面检测</span>
              </div>
              <div class="guide-steps">
                <div class="step">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <strong>安装并运行</strong>
                    <p>安装后运行OCCT，选择 "CPU" 标签页</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <strong>配置测试（推荐设置）</strong>
                    <ul>
                      <li>测试模式：<code>Extreme</code>（最严格）</li>
                      <li>数据集：<code>Large</code>（测试更多缓存）</li>
                      <li>✅ 勾选 "Auto Stop on Error"（发现错误自动停止）</li>
                      <li>✅ 勾选 "Error Detection"（启用错误检测）</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <strong>运行测试</strong>
                    <p>点击绿色播放按钮开始，建议测试时长 <strong>1-2小时</strong></p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">4</span>
                  <div class="step-content">
                    <strong>查看结果</strong>
                    <ul>
                      <li>✅ <span class="text-success">通过</span>：界面保持绿色，Errors = 0</li>
                      <li>❌ <span class="text-error">失败</span>：界面变红，显示错误数量 &gt; 0</li>
                      <li>📊 同时关注左侧监控面板的温度/功耗曲线</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="guide-verdict">
                <strong>判定标准：</strong>OCCT 的错误检测功能非常敏感，任何计算错误（Errors &gt; 0）都表明CPU核心存在问题。OCCT 也会生成详细的测试报告供参考。
              </div>
            </div>

            <!-- Intel XTU 指南 -->
            <div class="guide-section">
              <div class="guide-header">
                <span class="guide-icon">🎯</span>
                <h4>Intel XTU 测试指南</h4>
                <span class="guide-badge official">官方工具</span>
              </div>
              <div class="guide-steps">
                <div class="step">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <strong>版本选择</strong>
                    <ul>
                      <li><strong>13/14代酷睿：</strong>使用 XTU 7.14 版本</li>
                      <li><strong>Core Ultra 系列：</strong>使用 XTU 10.0+ 版本</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <strong>查看关键信息</strong>
                    <ul>
                      <li><strong>微码版本：</strong>确认是否已更新至 0x125 或更高</li>
                      <li><strong>Package TDP：</strong>当前功耗限制</li>
                      <li><strong>Core Voltage：</strong>核心电压是否正常</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <strong>运行基准测试</strong>
                    <p>点击 "Benchmarking" → 运行 "CPU Benchmark"，记录分数用于对比</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">4</span>
                  <div class="step-content">
                    <strong>运行压力测试</strong>
                    <p>点击 "Stress Test" → 勾选 "CPU Stress Test" → 运行至少30分钟</p>
                  </div>
                </div>
              </div>
              <div class="guide-verdict">
                <strong>判定标准：</strong>
                <ul style="margin-top: 8px;">
                  <li>基准分数与同型号 CPU 正常分数相比下降 &gt;10% 可能表明退化</li>
                  <li>压力测试中出现频繁降频或温度墙触发异常早</li>
                  <li>查看 Windows 事件查看器是否有 WHEA 错误（硬件错误）</li>
                </ul>
              </div>
            </div>

            <!-- HWiNFO64 使用说明 -->
            <div class="guide-section">
              <div class="guide-header">
                <span class="guide-icon">📊</span>
                <h4>HWiNFO64 监控指南</h4>
                <span class="guide-badge">配合使用</span>
              </div>
              <div class="guide-steps">
                <div class="step">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <strong>启动监控</strong>
                    <p>运行时选择 "Sensors-only" 模式，打开实时监控面板</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <strong>关注的关键指标（行业参考值）</strong>
                    <ul>
                      <li><strong>CPU Package Power：</strong>i9-14900K 默认最高 253W，i7 最高 253W，i5 最高 181W</li>
                      <li><strong>CPU Package Temp：</strong>压测时应 &lt;100°C，日常 &lt;80°C</li>
                      <li><strong>VID / Vcore：</strong>正常范围 0.85-1.45V（取决于负载）</li>
                      <li><strong>CPU IA Cores (WHEA Errors)：</strong>应始终为 0</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <strong>配合压测使用</strong>
                    <p>运行Prime95/OCCT时保持HWiNFO64开启，观察是否有异常降频或WHEA错误累积</p>
                  </div>
                </div>
              </div>
              <div class="guide-verdict">
                <strong>异常信号：</strong>
                <ul style="margin-top: 8px;">
                  <li>⚠️ WHEA错误计数 &gt; 0（最明确的退化信号）</li>
                  <li>⚠️ 压测时频率无法维持正常睿频</li>
                  <li>⚠️ 相同负载下温度/功耗比以前明显升高</li>
                  <li>⚠️ 需要比出厂默认更高的电压才能稳定</li>
                </ul>
              </div>
            </div>

            <!-- 综合判断 -->
            <div class="guide-section final-verdict">
              <div class="guide-header">
                <span class="guide-icon">⚖️</span>
                <h4>综合判断标准（业界共识）</h4>
              </div>
              <div class="verdict-grid">
                <div class="verdict-item good">
                  <div class="verdict-icon">✅</div>
                  <div class="verdict-text">
                    <strong>CPU正常</strong>
                    <p>Prime95 Blend 运行4小时+无错误，HWiNFO显示 WHEA Errors = 0，游戏/工作稳定</p>
                  </div>
                </div>
                <div class="verdict-item warning">
                  <div class="verdict-icon">⚠️</div>
                  <div class="verdict-text">
                    <strong>可能退化</strong>
                    <p>偶发计算错误、性能下降明显、需要降频/加电压才能稳定运行、WHEA错误偶发</p>
                  </div>
                </div>
                <div class="verdict-item bad">
                  <div class="verdict-icon">❌</div>
                  <div class="verdict-text">
                    <strong>建议RMA</strong>
                    <p>30分钟内报错、频繁蓝屏、无法通过标准压测、WHEA错误持续增长</p>
                  </div>
                </div>
              </div>
              <div class="rma-info">
                <h5>🔧 Intel RMA 流程（官方确认）：</h5>
                <ol>
                  <li>访问 <a href="#" @click.prevent="openUrl('https://www.intel.cn/content/www/cn/zh/support/articles/000005862/processors.html')">Intel中国支持页面</a> 或 <a href="#" @click.prevent="openUrl('https://www.intel.com/content/www/us/en/support/contact-us.html')">Intel全球支持</a></li>
                  <li>准备好CPU序列号（FPO/ATPO，在CPU顶盖或包装盒上）</li>
                  <li>描述问题症状，最好附上 Prime95/OCCT 错误截图</li>
                  <li><strong>重要：</strong>Intel已宣布受影响的13/14代K系列CPU保修延长至5年</li>
                  <li>Intel会安排免费更换，且更换的CPU会包含修复微码</li>
                </ol>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- 初始状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">🔬</div>
      <h2>Intel CPU健康检测</h2>
      <p>检测您的CPU是否受Intel 13/14代"缩缸"问题影响</p>
      <div class="feature-list">
        <div class="feature-item">✓ 识别受影响CPU型号</div>
        <div class="feature-item">✓ 检测微码修复版本</div>
        <div class="feature-item">✓ 分析系统稳定性日志</div>
        <div class="feature-item">✓ 评估风险等级</div>
        <div class="feature-item">✓ 提供修复建议</div>
      </div>
    </div>

    <!-- 信息说明 -->
    <div class="info-footer">
      <details>
        <summary>ℹ️ 关于Intel 13/14代"缩缸"问题</summary>
        <div class="info-content">
          <p><strong>问题概述：</strong>Intel第13、14代桌面处理器（Raptor Lake）存在稳定性问题，主要影响K系列高性能型号。</p>
          <p><strong>问题原因：</strong>过高的eTVB电压请求导致CPU内部电路逐渐退化。</p>
          <p><strong>主要症状：</strong>游戏崩溃、蓝屏死机(BSOD)、系统不稳定、编译错误等。</p>
          <p><strong>Intel解决方案：</strong></p>
          <ul>
            <li>发布微码更新（0x125/0x129）限制电压</li>
            <li>将受影响CPU保修期延长至5年</li>
            <li>提供RMA更换服务</li>
          </ul>
          <p><strong>注意：</strong>微码更新只能防止进一步损坏，无法恢复已经退化的CPU。</p>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface CpuHealthReport {
  timestamp: string
  cpuInfo: {
    name: string
    cores: number
    threads: number
  }
  isAffectedCpu: boolean
  affectedReason: string
  microcodeInfo: {
    version: string
    isFixed: boolean
    updateDate: string
  }
  wheaErrors: Array<{
    timeCreated: string
    errorType: string
    description: string
  }>
  wheaErrorCount: number
  recentCrashes: number
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  recommendations: string[]
  detailedAnalysis: string[]
}

interface ToolInfo {
  id: string
  name: string
  icon: string
  description: string
  tags: string[]
  downloads: {
    x64?: { url: string, filename: string }
    x86?: { url: string, filename: string }
    arm64?: { url: string, filename: string }
    universal?: { url: string, filename: string }
  }
  homepage: string
  note?: string  // 特别提示
}

// 工具定义
const tools: ToolInfo[] = [
  {
    id: 'prime95',
    name: 'Prime95',
    icon: '🔨',
    description: '经典的CPU压力测试工具，使用高强度数学运算检验稳定性。推荐运行"Blend"测试至少1小时。',
    tags: ['免费', '经典'],
    downloads: {
      x64: { url: 'https://www.mersenne.org/download/software/v30/30.19/p95v3019b20.win64.zip', filename: 'Prime95_v30.19b20_Win64.zip' },
      x86: { url: 'https://www.mersenne.org/download/software/v30/30.19/p95v3019b20.win32.zip', filename: 'Prime95_v30.19b20_Win32.zip' }
    },
    homepage: 'https://www.mersenne.org/download/'
  },
  {
    id: 'occt',
    name: 'OCCT',
    icon: '🌡️',
    description: '全方位系统稳定性测试工具，支持CPU、GPU、内存测试，并实时监控温度和电压。',
    tags: ['免费', '全面'],
    downloads: {
      universal: { url: 'https://www.ocbase.com/download/edition:Personal', filename: 'OCCT_Personal.exe' }
    },
    homepage: 'https://www.ocbase.com/'
  },
  {
    id: 'xtu',
    name: 'Intel XTU',
    icon: '🎯',
    description: 'Intel官方超频工具，可查看详细的CPU信息、温度和功耗，适合检测和调整Intel CPU设置。',
    tags: ['官方', 'Intel专用'],
    downloads: {
      universal: { url: 'https://downloadmirror.intel.com/833755/XTUSetup.exe', filename: 'Intel_XTU_Setup.exe' }
    },
    homepage: 'https://www.intel.com/content/www/us/en/download/17881/intel-extreme-tuning-utility-intel-xtu.html',
    note: '注意：7.14版本适用于13/14代酷睿，Core Ultra系列需下载10.0+版本'
  },
  {
    id: 'hwinfo',
    name: 'HWiNFO64',
    icon: '📊',
    description: '硬件监控工具，实时显示CPU温度、电压、功耗等信息，可配合压测工具使用监控状态。',
    tags: ['免费', '监控'],
    downloads: {
      x64: { url: 'https://www.sac.sk/download/utildiag/hwi_808.exe', filename: 'HWiNFO64_v8.08.exe' },
      universal: { url: 'https://www.sac.sk/download/utildiag/hwi_808.zip', filename: 'HWiNFO_v8.08_Portable.zip' }
    },
    homepage: 'https://www.hwinfo.com/download/'
  }
]

const isChecking = ref(false)
const report = ref<CpuHealthReport | null>(null)
const systemArch = ref<string>('x64')
const downloadingTools = ref<Set<string>>(new Set())
const downloadProgress = ref<Record<string, number>>({})

let unsubscribeDownload: (() => void) | null = null

onMounted(async () => {
  // 获取系统架构
  try {
    systemArch.value = await window.electronAPI.getSystemArch()
  } catch (e) {
    systemArch.value = 'x64' // 默认
  }

  // 监听下载进度
  unsubscribeDownload = window.electronAPI.onDownloadProgress((data) => {
    if (data.status === 'downloading') {
      downloadProgress.value[data.filename] = data.progress
    } else if (data.status === 'completed' || data.status === 'error') {
      // 下载完成或失败，移除进度
      const toolId = Object.keys(downloadingTools.value).find(id => {
        const tool = tools.find(t => t.id === id)
        return tool && Object.values(tool.downloads).some(d => d?.filename === data.filename)
      })
      if (toolId) {
        downloadingTools.value.delete(toolId)
      }
      delete downloadProgress.value[data.filename]
    }
  })
})

onUnmounted(() => {
  unsubscribeDownload?.()
})

async function runHealthCheck() {
  isChecking.value = true
  report.value = null
  
  // 统计开始检测
  window.electronAPI?.trackEvent('CpuHealth', 'Check', 'Start')

  try {
    const result = await window.electronAPI.cpuHealthCheck()
    if (result.success) {
      report.value = result.data
      // 统计检测结果
      window.electronAPI?.trackEvent('CpuHealth', 'Check', 'Complete', result.data.riskScore)
    } else {
      console.error('检测失败:', result.error)
    }
  } catch (error) {
    console.error('检测出错:', error)
  } finally {
    isChecking.value = false
  }
}

function getRiskIcon(level: string): string {
  switch (level) {
    case 'safe': return '✅'
    case 'low': return '🟢'
    case 'medium': return '🟡'
    case 'high': return '🟠'
    case 'critical': return '🔴'
    default: return '❓'
  }
}

function getRiskLevelText(level: string): string {
  switch (level) {
    case 'safe': return '安全'
    case 'low': return '低风险'
    case 'medium': return '中等风险'
    case 'high': return '高风险'
    case 'critical': return '严重风险'
    default: return '未知'
  }
}

function getDownloadInfo(tool: ToolInfo): { url: string, filename: string } | null {
  const arch = systemArch.value
  
  // 优先选择匹配架构的下载
  if (arch === 'x64' && tool.downloads.x64) {
    return tool.downloads.x64
  }
  if ((arch === 'ia32' || arch === 'x86') && tool.downloads.x86) {
    return tool.downloads.x86
  }
  if (arch === 'arm64' && tool.downloads.arm64) {
    return tool.downloads.arm64
  }
  
  // 回退到通用版本
  if (tool.downloads.universal) {
    return tool.downloads.universal
  }
  
  // 回退到 x64 (如果是 arm64 可能没有专用版本)
  if (tool.downloads.x64) {
    return tool.downloads.x64
  }
  
  return null
}

async function downloadTool(tool: ToolInfo) {
  const downloadInfo = getDownloadInfo(tool)
  
  if (!downloadInfo) {
    // 没有直接下载链接，打开官网
    window.electronAPI.openExternal(tool.homepage)
    return
  }

  downloadingTools.value.add(tool.id)
  downloadProgress.value[downloadInfo.filename] = 0

  try {
    const result = await window.electronAPI.downloadFile({
      url: downloadInfo.url,
      filename: downloadInfo.filename
    })
    
    if (result.canceled) {
      // 用户取消
    } else if (!result.success) {
      console.error('下载失败:', result.error)
      // 下载失败，打开官网
      window.electronAPI.openExternal(tool.homepage)
    }
  } catch (error) {
    console.error('下载出错:', error)
    window.electronAPI.openExternal(tool.homepage)
  } finally {
    downloadingTools.value.delete(tool.id)
    delete downloadProgress.value[downloadInfo.filename]
  }
}

function openHomepage(tool: ToolInfo) {
  window.electronAPI.openExternal(tool.homepage)
}

function openUrl(url: string) {
  window.electronAPI.openExternal(url)
}

function isDownloading(toolId: string): boolean {
  return downloadingTools.value.has(toolId)
}

function getToolProgress(tool: ToolInfo): number {
  const downloadInfo = getDownloadInfo(tool)
  if (downloadInfo) {
    return downloadProgress.value[downloadInfo.filename] || 0
  }
  return 0
}
</script>

<style scoped>
.cpu-health-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 20px;
  overflow-y: auto;
}

/* 头部 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title-section h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #888;
}

.btn-check, .btn-start {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-check:hover:not(:disabled), .btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-check:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 检测中状态 */
.checking-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.checking-animation {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
}

.cpu-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  animation: pulse 1s ease-in-out infinite;
}

.scan-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

.checking-state p {
  margin: 8px 0;
  font-size: 16px;
}

.checking-state .hint {
  font-size: 13px;
  color: #888;
}

/* 报告内容 */
.report-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 风险卡片 */
.risk-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  background: rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
}

.risk-card.safe { border-left: 4px solid #4ade80; }
.risk-card.low { border-left: 4px solid #22c55e; }
.risk-card.medium { border-left: 4px solid #eab308; }
.risk-card.high { border-left: 4px solid #f97316; }
.risk-card.critical { border-left: 4px solid #ef4444; }

.risk-icon { font-size: 40px; }

.risk-info { flex: 1; }

.risk-level-text {
  font-size: 22px;
  font-weight: 600;
  color: #fff;
}

.risk-score {
  font-size: 14px;
  color: #aaa;
  margin-top: 4px;
}

.risk-meter {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255,255,255,0.1);
}

.meter-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.risk-card.safe .meter-fill { background: #4ade80; }
.risk-card.low .meter-fill { background: #22c55e; }
.risk-card.medium .meter-fill { background: #eab308; }
.risk-card.high .meter-fill { background: #f97316; }
.risk-card.critical .meter-fill { background: #ef4444; }

/* 信息卡片 */
.info-card {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 16px;
}

.info-card h3 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #fff;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #888;
}

.info-item .value {
  font-size: 14px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.badge.success {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.badge.warning {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
}

/* 状态卡片 */
.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 10px;
}

.status-card.safe {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.status-card.affected {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.status-icon { font-size: 24px; }
.status-text { flex: 1; font-size: 14px; }

/* 统计行 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}

.stat-card.has-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #fff;
}

.stat-card.has-error .stat-value { color: #ef4444; }

.stat-label {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

/* 建议卡片 */
.recommendations-card {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 16px;
}

.recommendations-card h3 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #fff;
}

.recommendations-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.recommendations-list li {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 14px;
  line-height: 1.5;
}

.recommendations-list li:last-child {
  border-bottom: none;
}

/* 详情卡片 */
.details-card {
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  overflow: hidden;
}

.details-card summary {
  padding: 14px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  background: rgba(0,0,0,0.2);
}

.details-card summary:hover {
  background: rgba(0,0,0,0.3);
}

.details-content {
  padding: 16px;
  font-size: 13px;
  max-height: 300px;
  overflow-y: auto;
}

.details-content pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Consolas', monospace;
  line-height: 1.6;
}

/* 评分卡片 */
.scoring-card {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 16px;
}

.scoring-card h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #fff;
}

.scoring-table {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  overflow: hidden;
}

.scoring-header, .scoring-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 12px 16px;
  gap: 12px;
}

.scoring-header {
  background: rgba(102, 126, 234, 0.2);
  font-weight: 600;
  font-size: 13px;
  color: #aaa;
}

.scoring-row {
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 13px;
}

.scoring-row:last-child {
  border-bottom: none;
}

.scoring-row.total {
  background: rgba(102, 126, 234, 0.1);
  font-weight: 600;
}

.scoring-row .item {
  color: #ccc;
}

.scoring-row .status {
  text-align: center;
}

.scoring-row .status.good {
  color: #4ade80;
}

.scoring-row .status.bad {
  color: #f97316;
}

.scoring-row .score {
  text-align: right;
  color: #888;
}

.scoring-row .total-score {
  color: #667eea;
  font-size: 15px;
}

.scoring-legend {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.scoring-legend h4 {
  margin: 0 0 10px;
  font-size: 13px;
  color: #aaa;
  font-weight: 500;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.legend-item {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.legend-item.safe { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
.legend-item.low { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.legend-item.medium { background: rgba(234, 179, 8, 0.2); color: #eab308; }
.legend-item.high { background: rgba(249, 115, 22, 0.2); color: #f97316; }
.legend-item.critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

/* 检测方法说明 */
.method-content {
  max-height: 400px;
}

.method-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.method-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.method-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #fff;
  font-weight: 600;
}

.method-section p {
  margin: 6px 0;
  line-height: 1.6;
  color: #aaa;
}

.method-section code {
  background: rgba(102, 126, 234, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #a5b4fc;
}

.method-section.warning {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}

.method-section.warning h4 {
  color: #eab308;
}

.error-item {
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  margin-bottom: 8px;
}

.error-time {
  font-size: 12px;
  color: #888;
}

.error-type {
  font-weight: 500;
  color: #ef4444;
  margin: 4px 0;
}

.error-desc {
  font-size: 12px;
  color: #aaa;
  word-break: break-all;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h2 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #fff;
}

.empty-state > p {
  color: #888;
  margin-bottom: 24px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 32px;
}

.feature-item {
  font-size: 14px;
  color: #aaa;
}

/* 底部信息 */
.info-footer {
  margin-top: auto;
  padding-top: 20px;
}

.info-footer details {
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  overflow: hidden;
}

.info-footer summary {
  padding: 12px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #888;
}

.info-content {
  padding: 0 16px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #aaa;
}

.info-content p {
  margin: 8px 0;
}

.info-content ul {
  margin: 8px 0;
  padding-left: 20px;
}

.info-content li {
  margin: 4px 0;
}

.text-success { color: #4ade80; }
.text-warning { color: #eab308; }

/* 压力测试卡片 */
.stress-test-card {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
}

.stress-test-card > h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.stress-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: #888;
}

/* 专业工具 */
.pro-tools {
  margin-bottom: 20px;
}

.pro-tools h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #fff;
}

.pro-tools-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: #888;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tool-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  transition: all 0.2s;
}

.tool-card:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(102, 126, 234, 0.3);
}

.tool-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-info h5 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #fff;
}

.tool-info p {
  margin: 0 0 8px;
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}

.tool-info .tool-note {
  color: #f5a623;
  font-size: 11px;
  background: rgba(245, 166, 35, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 2px solid #f5a623;
}

.tool-tags {
  display: flex;
  gap: 6px;
}

.tool-tags .tag {
  padding: 2px 8px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 10px;
  font-size: 10px;
  color: #a5b4fc;
}

.tool-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-self: center;
}

.btn-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  min-width: 80px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-tool:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-tool:disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.btn-tool.downloading {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.download-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn-homepage {
  padding: 6px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-homepage:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

/* 测试指南 */
.test-guide {
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  overflow: hidden;
  margin-top: 16px;
}

.test-guide summary {
  padding: 14px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: rgba(102, 126, 234, 0.2);
  transition: background 0.2s;
}

.test-guide summary:hover {
  background: rgba(102, 126, 234, 0.3);
}

.guide-content {
  padding: 16px;
}

.guide-section {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.guide-section:last-child {
  margin-bottom: 0;
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.guide-icon {
  font-size: 24px;
}

.guide-header h4 {
  margin: 0;
  font-size: 15px;
  color: #fff;
  flex: 1;
}

.guide-badge {
  padding: 3px 10px;
  background: rgba(102, 126, 234, 0.3);
  border-radius: 12px;
  font-size: 11px;
  color: #a5b4fc;
}

.guide-badge.recommended {
  background: rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.guide-badge.official {
  background: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step {
  display: flex;
  gap: 12px;
}

.step-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.step-content {
  flex: 1;
}

.step-content strong {
  display: block;
  font-size: 13px;
  color: #fff;
  margin-bottom: 4px;
}

.step-content p {
  margin: 0;
  font-size: 12px;
  color: #aaa;
  line-height: 1.5;
}

.step-content ul {
  margin: 6px 0 0;
  padding-left: 16px;
}

.step-content li {
  font-size: 12px;
  color: #aaa;
  margin: 4px 0;
  line-height: 1.4;
}

.step-content code {
  background: rgba(102, 126, 234, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 11px;
  color: #a5b4fc;
}

.guide-verdict {
  margin-top: 14px;
  padding: 10px 12px;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.2);
  border-radius: 6px;
  font-size: 12px;
  color: #eab308;
  line-height: 1.5;
}

.guide-verdict strong {
  color: #fbbf24;
}

/* 综合判断 */
.final-verdict {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.2);
}

.verdict-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.verdict-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0,0,0,0.2);
}

.verdict-item.good {
  border-left: 3px solid #4ade80;
}

.verdict-item.warning {
  border-left: 3px solid #eab308;
}

.verdict-item.bad {
  border-left: 3px solid #ef4444;
}

.verdict-icon {
  font-size: 20px;
}

.verdict-text strong {
  display: block;
  font-size: 13px;
  color: #fff;
  margin-bottom: 4px;
}

.verdict-text p {
  margin: 0;
  font-size: 11px;
  color: #888;
  line-height: 1.4;
}

.rma-info {
  padding: 14px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
}

.rma-info h5 {
  margin: 0 0 10px;
  font-size: 13px;
  color: #60a5fa;
}

.rma-info ol {
  margin: 0;
  padding-left: 18px;
}

.rma-info li {
  font-size: 12px;
  color: #aaa;
  margin: 6px 0;
  line-height: 1.5;
}

.rma-info a {
  color: #60a5fa;
  text-decoration: none;
}

.rma-info a:hover {
  text-decoration: underline;
}

.text-success { color: #4ade80; }
.text-warning { color: #eab308; }
.text-error { color: #ef4444; }

/* 响应式 */
@media (max-width: 800px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
  
  .verdict-grid {
    grid-template-columns: 1fr;
  }
}
</style>
