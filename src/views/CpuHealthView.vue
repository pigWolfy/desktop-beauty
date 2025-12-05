<template>
  <div class="cpu-health-view">
    <!-- 头部 -->
    <header class="header">
      <div class="title-section">
        <h1>{{ t('cpuHealth.title') }}</h1>
        <p class="subtitle">{{ t('cpuHealth.subtitle') }}</p>
      </div>
      <button 
        class="btn-check" 
        :disabled="isChecking"
        @click="runHealthCheck"
      >
        <span v-if="isChecking" class="spinner"></span>
        {{ isChecking ? t('cpuHealth.testing') : t('cpuHealth.startTest') }}
      </button>
    </header>

    <!-- 检测中状态 -->
    <div v-if="isChecking" class="checking-state">
      <div class="checking-animation">
        <div class="cpu-icon">🖥️</div>
        <div class="scan-ring"></div>
      </div>
      <p>{{ t('cpuHealth.analyzing') }}</p>
      <p class="hint">{{ t('cpuHealth.analyzingHint') }}</p>
    </div>

    <!-- 检测结果 -->
    <div v-else-if="report" class="report-content">
      <!-- 风险等级卡片 -->
      <div class="risk-card" :class="report.riskLevel">
        <div class="risk-icon">{{ getRiskIcon(report.riskLevel) }}</div>
        <div class="risk-info">
          <div class="risk-level-text">{{ getRiskLevelText(report.riskLevel) }}</div>
          <div class="risk-score">{{ t('cpuHealth.riskScore') }}: {{ report.riskScore }}/100</div>
        </div>
        <div class="risk-meter">
          <div class="meter-fill" :style="{ width: report.riskScore + '%' }"></div>
        </div>
      </div>

      <!-- CPU信息卡片 -->
      <div class="info-card">
        <h3>{{ t('cpuHealth.cpuInfo') }}</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">{{ t('monitor.processor') }}</span>
            <span class="value">{{ report.cpuInfo.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">{{ t('cpuHealth.coresThreads') }}</span>
            <span class="value">{{ report.cpuInfo.cores }}{{ t('monitor.cores') }} / {{ report.cpuInfo.threads }}{{ t('monitor.threads') }}</span>
          </div>
          <div class="info-item">
            <span class="label">{{ t('cpuHealth.microcodeVersion') }}</span>
            <span class="value" :class="{ 'text-success': report.microcodeInfo.isFixed, 'text-warning': !report.microcodeInfo.isFixed }">
              {{ report.microcodeInfo.version }}
              <span v-if="report.microcodeInfo.isFixed" class="badge success">{{ t('cpuHealth.fixed') }}</span>
              <span v-else class="badge warning">{{ t('cpuHealth.needUpdate') }}</span>
            </span>
          </div>
          <div class="info-item">
            <span class="label">{{ t('cpuHealth.biosDate') }}</span>
            <span class="value">{{ report.microcodeInfo.updateDate }}</span>
          </div>
        </div>
      </div>

      <!-- 受影响状态 -->
      <div class="status-card" :class="{ affected: report.isAffectedCpu, safe: !report.isAffectedCpu }">
        <div class="status-icon">{{ report.isAffectedCpu ? '⚠️' : '✅' }}</div>
        <div class="status-text">{{ getTranslatedReason() }}</div>
      </div>

      <!-- 错误统计 -->
      <div class="stats-row">
        <div class="stat-card" :class="{ 'has-error': report.wheaErrorCount > 0 }">
          <div class="stat-value">{{ report.wheaErrorCount }}</div>
          <div class="stat-label">{{ t('cpuHealth.hardwareErrors') }}</div>
        </div>
        <div class="stat-card" :class="{ 'has-error': report.recentCrashes > 0 }">
          <div class="stat-value">{{ report.recentCrashes }}</div>
          <div class="stat-label">{{ t('cpuHealth.systemCrashes') }}</div>
        </div>
      </div>

      <!-- 建议列表 -->
      <div class="recommendations-card">
        <h3>{{ t('cpuHealth.recommendations') }}</h3>
        <ul class="recommendations-list">
          <li v-for="(rec, index) in getTranslatedRecommendations()" :key="index">
            {{ rec }}
          </li>
        </ul>
      </div>

      <!-- 评判标准说明 -->
      <div class="scoring-card">
        <h3>{{ t('cpuHealth.scoringMethod') }}</h3>
        <div class="scoring-table">
          <div class="scoring-header">
            <span>{{ t('cpuHealth.scoring.testItem') }}</span>
            <span>{{ t('cpuHealth.scoring.yourStatus') }}</span>
            <span>{{ t('cpuHealth.scoring.score') }}</span>
          </div>
          <div class="scoring-row">
            <span class="item">{{ t('cpuHealth.scoring.cpuAffected') }}</span>
            <span class="status" :class="report.isAffectedCpu ? 'bad' : 'good'">
              {{ report.isAffectedCpu ? t('cpuHealth.scoring.yes13_14K') : t('cpuHealth.scoring.no') }}
            </span>
            <span class="score">{{ report.isAffectedCpu ? '+30' : '+0' }}</span>
          </div>
          <div class="scoring-row">
            <span class="item">{{ t('cpuHealth.scoring.microcodeFixed') }}</span>
            <span class="status" :class="report.microcodeInfo.isFixed ? 'good' : 'bad'">
              {{ report.microcodeInfo.isFixed ? t('cpuHealth.scoring.fixed') : t('cpuHealth.scoring.notFixed') }}
            </span>
            <span class="score">{{ report.microcodeInfo.isFixed ? '+0' : '+20' }}</span>
          </div>
          <div class="scoring-row">
            <span class="item">{{ t('cpuHealth.scoring.wheaErrors30Days') }}</span>
            <span class="status" :class="report.wheaErrorCount > 0 ? 'bad' : 'good'">
              {{ t('cpuHealth.scoring.count', { count: report.wheaErrorCount }) }}
            </span>
            <span class="score">+{{ Math.min(report.wheaErrorCount * 5, 25) }} ({{ t('cpuHealth.scoring.perItem5Max25') }})</span>
          </div>
          <div class="scoring-row">
            <span class="item">{{ t('cpuHealth.scoring.crashes30Days') }}</span>
            <span class="status" :class="report.recentCrashes > 0 ? 'bad' : 'good'">
              {{ t('cpuHealth.scoring.times', { count: report.recentCrashes }) }}
            </span>
            <span class="score">+{{ Math.min(report.recentCrashes * 8, 25) }} ({{ t('cpuHealth.scoring.perItem8Max25') }})</span>
          </div>
          <div class="scoring-row total">
            <span class="item">{{ t('cpuHealth.scoring.total') }}</span>
            <span class="status"></span>
            <span class="score total-score">{{ report.riskScore }}/100</span>
          </div>
        </div>
        <div class="scoring-legend">
          <h4>{{ t('cpuHealth.scoring.riskLevels') }}</h4>
          <div class="legend-items">
            <span class="legend-item safe">{{ t('cpuHealth.scoring.safe') }}</span>
            <span class="legend-item low">{{ t('cpuHealth.scoring.low') }}</span>
            <span class="legend-item medium">{{ t('cpuHealth.scoring.medium') }}</span>
            <span class="legend-item high">{{ t('cpuHealth.scoring.high') }}</span>
            <span class="legend-item critical">{{ t('cpuHealth.scoring.critical') }}</span>
          </div>
        </div>
      </div>

      <!-- 检测方法说明 -->
      <details class="details-card method">
        <summary>{{ t('cpuHealth.method.title') }}</summary>
        <div class="details-content method-content">
          <div class="method-section">
            <h4>{{ t('cpuHealth.method.cpuIdentification') }}</h4>
            <p>{{ t('cpuHealth.method.cpuIdentificationDesc') }}</p>
            <p><strong>{{ t('cpuHealth.method.affectedModels') }}</strong>{{ t('cpuHealth.method.affectedModelsList') }}</p>
          </div>
          <div class="method-section">
            <h4>{{ t('cpuHealth.method.microcodeDetection') }}</h4>
            <p>{{ t('cpuHealth.method.microcodeDetectionDesc') }}</p>
            <p><strong>{{ t('cpuHealth.method.fixedVersion') }}</strong>{{ t('cpuHealth.method.fixedVersionDesc') }}</p>
          </div>
          <div class="method-section">
            <h4>{{ t('cpuHealth.method.wheaAnalysis') }}</h4>
            <p>{{ t('cpuHealth.method.wheaAnalysisDesc') }}</p>
            <p><strong>{{ t('cpuHealth.method.keyEventIds') }}</strong>{{ t('cpuHealth.method.keyEventIdsDesc') }}</p>
          </div>
          <div class="method-section">
            <h4>{{ t('cpuHealth.method.systemStability') }}</h4>
            <p>{{ t('cpuHealth.method.systemStabilityDesc') }}</p>
          </div>
          <div class="method-section warning">
            <h4>{{ t('cpuHealth.method.limitations') }}</h4>
            <p>{{ t('cpuHealth.method.limitationsDesc1') }}</p>
            <p>{{ t('cpuHealth.method.limitationsDesc2') }}</p>
          </div>
        </div>
      </details>

      <!-- 详细分析 -->
      <details class="details-card">
        <summary>{{ t('cpuHealth.details.title') }}</summary>
        <div class="details-content">
          <pre>{{ getTranslatedDetailedAnalysis().join('\n') }}</pre>
        </div>
      </details>

      <!-- WHEA错误列表 -->
      <details v-if="report.wheaErrors.length > 0" class="details-card errors">
        <summary>{{ t('cpuHealth.details.wheaErrors', { count: report.wheaErrors.length }) }}</summary>
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
        <h3>{{ t('cpuHealth.relatedTools') }}</h3>
        <p class="stress-desc">{{ t('cpuHealth.toolsDesc') }}</p>
        
        <!-- 专业工具推荐 -->
        <div class="pro-tools">
          <div class="tools-grid">
            <div v-for="tool in tools" :key="tool.id" class="tool-card">
              <div class="tool-icon">{{ tool.icon }}</div>
              <div class="tool-info">
                <h5>{{ tool.name }}</h5>
                <p>{{ t(tool.descriptionKey) }}</p>
                <p v-if="tool.noteKey" class="tool-note">⚠️ {{ t(tool.noteKey) }}</p>
                <div class="tool-tags">
                  <span class="tag">{{ t(tool.tag1Key) }}</span>
                  <span class="tag">{{ t(tool.tag2Key) }}</span>
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
                    📥 {{ t('cpuHealth.download') }}
                  </template>
                </button>
                <button class="btn-homepage" @click="openHomepage(tool)" :title="t('cpuHealth.openPage')">
                  🔗
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 测试指南 -->
        <details class="test-guide">
          <summary>{{ t('cpuHealth.guide.title') }}</summary>
          <div class="guide-content">
            <!-- Prime95 指南 -->
            <div class="guide-section">
              <div class="guide-header">
                <span class="guide-icon">🔨</span>
                <h4>{{ t('cpuHealth.guide.prime95.title') }}</h4>
                <span class="guide-badge recommended">{{ t('cpuHealth.guide.prime95.recommended') }}</span>
              </div>
              <div class="guide-steps">
                <div class="step">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.prime95.step1Title') }}</strong>
                    <p>{{ t('cpuHealth.guide.prime95.step1Desc') }}</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.prime95.step2Title') }}</strong>
                    <p>{{ t('cpuHealth.guide.prime95.step2Desc') }}</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.prime95.step3Title') }}</strong>
                    <ul>
                      <li>{{ t('cpuHealth.guide.prime95.quick') }}</li>
                      <li>{{ t('cpuHealth.guide.prime95.standard') }}</li>
                      <li>{{ t('cpuHealth.guide.prime95.complete') }}</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">4</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.prime95.step4Title') }}</strong>
                    <ul>
                      <li>✅ <span class="text-success">{{ t('cpuHealth.guide.prime95.pass') }}</span>：{{ t('cpuHealth.guide.prime95.passDesc') }}</li>
                      <li>❌ <span class="text-error">{{ t('cpuHealth.guide.prime95.fail') }}</span>：{{ t('cpuHealth.guide.prime95.failDesc') }}</li>
                      <li>💀 <span class="text-error">{{ t('cpuHealth.guide.prime95.severe') }}</span>：{{ t('cpuHealth.guide.prime95.severeDesc') }}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="guide-verdict">
                <strong>{{ t('cpuHealth.guide.prime95.verdict') }}</strong>
              </div>
            </div>

            <!-- OCCT 指南 -->
            <div class="guide-section">
              <div class="guide-header">
                <span class="guide-icon">🌡️</span>
                <h4>{{ t('cpuHealth.guide.occt.title') }}</h4>
                <span class="guide-badge">{{ t('cpuHealth.guide.occt.comprehensive') }}</span>
              </div>
              <div class="guide-steps">
                <div class="step">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.occt.step1Title') }}</strong>
                    <p>{{ t('cpuHealth.guide.occt.step1Desc') }}</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.occt.step2Title') }}</strong>
                    <ul>
                      <li>{{ t('cpuHealth.guide.occt.mode') }}<code>{{ t('cpuHealth.guide.occt.modeValue') }}</code></li>
                      <li>{{ t('cpuHealth.guide.occt.dataset') }}<code>{{ t('cpuHealth.guide.occt.datasetValue') }}</code></li>
                      <li>✅ Auto Stop on Error</li>
                      <li>✅ Error Detection</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.occt.step3Title') }}</strong>
                    <p>{{ t('cpuHealth.guide.occt.durationDesc') }}</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">4</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.occt.step4Title') }}</strong>
                    <ul>
                      <li>✅ <span class="text-success">{{ t('cpuHealth.guide.occt.errorFree') }}</span>：{{ t('cpuHealth.guide.occt.errorFreeDesc') }}</li>
                      <li>❌ <span class="text-error">{{ t('cpuHealth.guide.occt.errorDetected') }}</span>：{{ t('cpuHealth.guide.occt.errorDetectedDesc') }}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="guide-verdict">
                <strong>{{ t('cpuHealth.guide.occt.occtAdvantage') }}</strong>
              </div>
            </div>

            <!-- Intel XTU 指南 -->
            <div class="guide-section">
              <div class="guide-header">
                <span class="guide-icon">🎯</span>
                <h4>{{ t('cpuHealth.guide.xtu.title') }}</h4>
                <span class="guide-badge official">{{ t('cpuHealth.guide.xtu.official') }}</span>
              </div>
              <div class="guide-steps">
                <div class="step">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.xtu.step1Title') }}</strong>
                    <ul>
                      <li><strong>{{ t('cpuHealth.guide.xtu.gen13_14') }}</strong>{{ t('cpuHealth.guide.xtu.gen13_14Desc') }}</li>
                      <li><strong>{{ t('cpuHealth.guide.xtu.coreUltra') }}</strong>{{ t('cpuHealth.guide.xtu.coreUltraDesc') }}</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.xtu.step2Title') }}</strong>
                    <ul>
                      <li><strong>{{ t('cpuHealth.guide.xtu.microcodeVersion') }}</strong>{{ t('cpuHealth.guide.xtu.microcodeVersionDesc') }}</li>
                      <li><strong>{{ t('cpuHealth.guide.xtu.packageTdp') }}</strong>{{ t('cpuHealth.guide.xtu.packageTdpDesc') }}</li>
                      <li><strong>{{ t('cpuHealth.guide.xtu.coreVoltage') }}</strong>{{ t('cpuHealth.guide.xtu.coreVoltageDesc') }}</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.xtu.step3Title') }}</strong>
                    <p>{{ t('cpuHealth.guide.xtu.step3Desc') }}</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">4</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.xtu.step4Title') }}</strong>
                    <p>{{ t('cpuHealth.guide.xtu.step4Desc') }}</p>
                  </div>
                </div>
              </div>
              <div class="guide-verdict">
                <strong>{{ t('cpuHealth.guide.xtu.verdictTitle') }}</strong>
                <ul style="margin-top: 8px;">
                  <li>{{ t('cpuHealth.guide.xtu.verdict1') }}</li>
                  <li>{{ t('cpuHealth.guide.xtu.verdict2') }}</li>
                  <li>{{ t('cpuHealth.guide.xtu.verdict3') }}</li>
                </ul>
              </div>
            </div>

            <!-- HWiNFO64 使用说明 -->
            <div class="guide-section">
              <div class="guide-header">
                <span class="guide-icon">📊</span>
                <h4>{{ t('cpuHealth.guide.hwinfo.title') }}</h4>
                <span class="guide-badge">{{ t('cpuHealth.guide.hwinfo.companion') }}</span>
              </div>
              <div class="guide-steps">
                <div class="step">
                  <span class="step-num">1</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.hwinfo.step1Title') }}</strong>
                    <p>{{ t('cpuHealth.guide.hwinfo.step1Desc') }}</p>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.hwinfo.step2Title') }}</strong>
                    <ul>
                      <li><strong>{{ t('cpuHealth.guide.hwinfo.packagePower') }}</strong>{{ t('cpuHealth.guide.hwinfo.packagePowerDesc') }}</li>
                      <li><strong>{{ t('cpuHealth.guide.hwinfo.packageTemp') }}</strong>{{ t('cpuHealth.guide.hwinfo.packageTempDesc') }}</li>
                      <li><strong>{{ t('cpuHealth.guide.hwinfo.voltage') }}</strong>{{ t('cpuHealth.guide.hwinfo.voltageDesc') }}</li>
                      <li><strong>{{ t('cpuHealth.guide.hwinfo.wheaErrors') }}</strong>{{ t('cpuHealth.guide.hwinfo.wheaErrorsDesc') }}</li>
                    </ul>
                  </div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div class="step-content">
                    <strong>{{ t('cpuHealth.guide.hwinfo.step3Title') }}</strong>
                    <p>{{ t('cpuHealth.guide.hwinfo.step3Desc') }}</p>
                  </div>
                </div>
              </div>
              <div class="guide-verdict">
                <strong>{{ t('cpuHealth.guide.hwinfo.verdictTitle') }}</strong>
                <ul style="margin-top: 8px;">
                  <li>{{ t('cpuHealth.guide.hwinfo.verdict1') }}</li>
                  <li>{{ t('cpuHealth.guide.hwinfo.verdict2') }}</li>
                  <li>{{ t('cpuHealth.guide.hwinfo.verdict3') }}</li>
                  <li>{{ t('cpuHealth.guide.hwinfo.verdict4') }}</li>
                </ul>
              </div>
            </div>

            <!-- 综合判断 -->
            <div class="guide-section final-verdict">
              <div class="guide-header">
                <span class="guide-icon">⚖️</span>
                <h4>{{ t('cpuHealth.guide.finalVerdict.title') }}</h4>
              </div>
              <div class="verdict-grid">
                <div class="verdict-item good">
                  <div class="verdict-icon">✅</div>
                  <div class="verdict-text">
                    <strong>{{ t('cpuHealth.guide.finalVerdict.goodTitle') }}</strong>
                    <p>{{ t('cpuHealth.guide.finalVerdict.goodDesc') }}</p>
                  </div>
                </div>
                <div class="verdict-item warning">
                  <div class="verdict-icon">⚠️</div>
                  <div class="verdict-text">
                    <strong>{{ t('cpuHealth.guide.finalVerdict.warningTitle') }}</strong>
                    <p>{{ t('cpuHealth.guide.finalVerdict.warningDesc') }}</p>
                  </div>
                </div>
                <div class="verdict-item bad">
                  <div class="verdict-icon">❌</div>
                  <div class="verdict-text">
                    <strong>{{ t('cpuHealth.guide.finalVerdict.badTitle') }}</strong>
                    <p>{{ t('cpuHealth.guide.finalVerdict.badDesc') }}</p>
                  </div>
                </div>
              </div>
              <div class="rma-info">
                <h5>{{ t('cpuHealth.guide.finalVerdict.rmaTitle') }}</h5>
                <ol>
                  <li>{{ t('cpuHealth.guide.finalVerdict.rmaStep1') }}</li>
                  <li>{{ t('cpuHealth.guide.finalVerdict.rmaStep2') }}</li>
                  <li>{{ t('cpuHealth.guide.finalVerdict.rmaStep3') }}</li>
                  <li><strong>{{ t('cpuHealth.guide.finalVerdict.rmaStep4') }}</strong></li>
                  <li>{{ t('cpuHealth.guide.finalVerdict.rmaStep5') }}</li>
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
      <h2>{{ t('cpuHealth.title') }}</h2>
      <p>{{ t('cpuHealth.notStarted') }}</p>
      <div class="feature-list">
        <div class="feature-item">✓ {{ t('cpuHealth.subtitle') }}</div>
      </div>
    </div>

    <!-- 信息说明 -->
    <div class="info-footer">
      <details>
        <summary>{{ t('cpuHealth.disclaimer') }}</summary>
        <div class="info-content">
          <p>{{ t('cpuHealth.disclaimerText') }}</p>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface DetailedAnalysisData {
  cpuName: string
  cores: number
  threads: number
  microcodeVersion: string
  biosDate: string
  isAffected: boolean
  wheaErrorCount: number
  crashCount: number
  wheaErrors: Array<{ time: string; type: string }>
}

interface CpuHealthReport {
  timestamp: string
  cpuInfo: {
    name: string
    cores: number
    threads: number
  }
  isAffectedCpu: boolean
  affectedReason: string
  affectedReasonKey?: string
  affectedReasonParams?: Record<string, string>
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
  recommendationKeys?: Array<{ key: string; params?: Record<string, string | number> }>
  detailedAnalysis: string[]
  detailedAnalysisData?: DetailedAnalysisData
}

interface ToolInfo {
  id: string
  name: string
  icon: string
  descriptionKey: string // Translation key for description
  tag1Key: string // Translation key for first tag
  tag2Key: string // Translation key for second tag
  noteKey?: string // Translation key for note
  downloads: {
    x64?: { url: string, filename: string }
    x86?: { url: string, filename: string }
    arm64?: { url: string, filename: string }
    universal?: { url: string, filename: string }
  }
  homepage: string
}

// Tool definitions using translation keys
const tools: ToolInfo[] = [
  {
    id: 'prime95',
    name: 'Prime95',
    icon: '🔨',
    descriptionKey: 'cpuHealth.tools.prime95.description',
    tag1Key: 'cpuHealth.tools.prime95.tag1',
    tag2Key: 'cpuHealth.tools.prime95.tag2',
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
    descriptionKey: 'cpuHealth.tools.occt.description',
    tag1Key: 'cpuHealth.tools.occt.tag1',
    tag2Key: 'cpuHealth.tools.occt.tag2',
    downloads: {
      universal: { url: 'https://www.ocbase.com/download/edition:Personal', filename: 'OCCT_Personal.exe' }
    },
    homepage: 'https://www.ocbase.com/'
  },
  {
    id: 'xtu',
    name: 'Intel XTU',
    icon: '🎯',
    descriptionKey: 'cpuHealth.tools.xtu.description',
    tag1Key: 'cpuHealth.tools.xtu.tag1',
    tag2Key: 'cpuHealth.tools.xtu.tag2',
    noteKey: 'cpuHealth.tools.xtu.note',
    downloads: {
      universal: { url: 'https://downloadmirror.intel.com/833755/XTUSetup.exe', filename: 'Intel_XTU_Setup.exe' }
    },
    homepage: 'https://www.intel.com/content/www/us/en/download/17881/intel-extreme-tuning-utility-intel-xtu.html'
  },
  {
    id: 'hwinfo',
    name: 'HWiNFO64',
    icon: '📊',
    descriptionKey: 'cpuHealth.tools.hwinfo.description',
    tag1Key: 'cpuHealth.tools.hwinfo.tag1',
    tag2Key: 'cpuHealth.tools.hwinfo.tag2',
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
    case 'safe': return t('cpuHealth.status.safe')
    case 'low': return t('cpuHealth.status.low')
    case 'medium': return t('cpuHealth.status.medium')
    case 'high': return t('cpuHealth.status.high')
    case 'critical': return t('cpuHealth.status.critical')
    default: return t('desktop.unknown')
  }
}

// Translate the affected reason from backend
function getTranslatedReason(): string {
  if (!report.value) return ''
  // Use translation key if available, otherwise fall back to raw reason
  if (report.value.affectedReasonKey) {
    return t(`cpuHealth.reasons.${report.value.affectedReasonKey}`, report.value.affectedReasonParams || {})
  }
  return report.value.affectedReason
}

// Translate recommendations from backend
function getTranslatedRecommendations(): string[] {
  if (!report.value) return []
  // Use translation keys if available, otherwise fall back to raw recommendations
  if (report.value.recommendationKeys && report.value.recommendationKeys.length > 0) {
    return report.value.recommendationKeys.map(rec => 
      t(`cpuHealth.recommendationKeys.${rec.key}`, rec.params || {})
    )
  }
  return report.value.recommendations
}

// Translate detailed analysis from backend
function getTranslatedDetailedAnalysis(): string[] {
  if (!report.value) return []
  const data = report.value.detailedAnalysisData
  if (!data) return report.value.detailedAnalysis
  
  const analysis: string[] = []
  
  analysis.push(t('cpuHealth.analysis.cpuModel', { name: data.cpuName }))
  analysis.push(t('cpuHealth.analysis.coresThreads', { cores: data.cores, threads: data.threads }))
  analysis.push(t('cpuHealth.analysis.microcodeVersion', { version: data.microcodeVersion }))
  analysis.push(t('cpuHealth.analysis.biosDate', { date: data.biosDate }))
  
  if (data.isAffected) {
    analysis.push('')
    analysis.push(t('cpuHealth.analysis.issueExplanation'))
    analysis.push(t('cpuHealth.analysis.issueCause'))
    analysis.push(t('cpuHealth.analysis.issueSymptoms'))
    analysis.push(t('cpuHealth.analysis.intelResponse'))
  }
  
  if (data.wheaErrorCount > 0) {
    analysis.push('')
    analysis.push(t('cpuHealth.analysis.wheaErrorsDetected', { count: data.wheaErrorCount }))
    data.wheaErrors.forEach(e => {
      analysis.push(`  - [${e.time}] ${e.type}`)
    })
  }
  
  if (data.crashCount > 0) {
    analysis.push('')
    analysis.push(t('cpuHealth.analysis.crashesDetected', { count: data.crashCount }))
  }
  
  return analysis
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
