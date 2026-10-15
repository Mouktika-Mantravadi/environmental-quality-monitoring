/**
 * Quality Monitoring System - Main Application Controller
 * Project: "Quality Monitoring System for Continuous Analysis of Temperature,
 *           Humidity, and Harmful Gas Concentrations Using Wi-Fi Communication and Cloud Services"
 *
 * Current State: Offline Simulation Mode (Synthetic Telemetry Generator).
 * Disclaimers: No real physical ESP32 or Cloud database connected currently.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // CONFIGURATION & DEFAULT THRESHOLDS
  // ==========================================
  const DEFAULT_THRESHOLDS = {
    tempMax: 32.0,       // °C
    tempMin: 18.0,       // °C
    humidityMax: 70.0,   // %
    humidityMin: 30.0,   // %
    gasWarning: 1200,    // Raw ADC (MQ Sensor)
    gasCritical: 2200    // Raw ADC
  };

  // State
  let isMonitoring = true;
  let intervalMs = 2000;
  let timerId = null;
  let lastUpdatedTime = null;
  let audioAlertsEnabled = false;
  let isDarkMode = true;

  // Active thresholds loaded from localStorage if present
  let thresholds = loadThresholds();

  // Data history buffers
  const readingsHistory = [];
  const MAX_HISTORY_ROWS = 100;
  const alertHistory = [];
  const MAX_ALERTS = 40;

  // Statistics accumulators
  const stats = {
    temp: { min: Infinity, max: -Infinity, sum: 0, count: 0 },
    humidity: { min: Infinity, max: -Infinity, sum: 0, count: 0 },
    gas: { min: Infinity, max: -Infinity, sum: 0, count: 0 }
  };

  // Instantiate Modules
  const simulator = new window.SensorSimulator();
  const charts = new window.DashboardCharts();

  // Audio Context for synthetic alarm beeps
  let audioCtx = null;

  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  // KPI Value displays
  const tempValEl = document.getElementById('tempValue');
  const humidityValEl = document.getElementById('humidityValue');
  const gasValEl = document.getElementById('gasValue');
  const tempStatusEl = document.getElementById('tempStatus');
  const humidityStatusEl = document.getElementById('humidityStatus');
  const gasStatusEl = document.getElementById('gasStatus');

  // KPI Min/Max/Avg stats
  const tempStatsEl = document.getElementById('tempStats');
  const humidityStatsEl = document.getElementById('humidityStats');
  const gasStatsEl = document.getElementById('gasStats');

  // KPI Cards for alert styling
  const cardTemp = document.getElementById('cardTemp');
  const cardHumidity = document.getElementById('cardHumidity');
  const cardGas = document.getElementById('cardGas');

  // Status and System displays
  const connStatusBadge = document.getElementById('connStatusBadge');
  const connStatusDot = document.getElementById('connStatusDot');
  const connStatusText = document.getElementById('connStatusText');
  const lastUpdatedEl = document.getElementById('lastUpdatedTime');
  const rssiValueEl = document.getElementById('rssiValue');
  const packetCountEl = document.getElementById('packetCount');

  // Controls
  const btnStart = document.getElementById('btnStartMonitoring');
  const btnStop = document.getElementById('btnStopMonitoring');
  const selectInterval = document.getElementById('selectInterval');
  const selectPoints = document.getElementById('selectPoints');
  const btnSpikeGas = document.getElementById('btnSpikeGas');
  const btnSpikeTemp = document.getElementById('btnSpikeTemp');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  const btnToggleAudio = document.getElementById('btnToggleAudio');

  // Modals
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const settingsModal = document.getElementById('settingsModal');
  const formThresholds = document.getElementById('formThresholds');
  const btnResetDefaults = document.getElementById('btnResetDefaults');

  const btnOpenCloudGuide = document.getElementById('btnOpenCloudGuide');
  const btnCloseCloudGuide = document.getElementById('btnCloseCloudGuide');
  const cloudGuideModal = document.getElementById('cloudGuideModal');

  // History & Alerts containers
  const historyTableBody = document.getElementById('historyTableBody');
  const historySearch = document.getElementById('historySearch');
  const alertListEl = document.getElementById('alertList');
  const alertBadgeCount = document.getElementById('alertBadgeCount');
  const btnClearAlerts = document.getElementById('btnClearAlerts');

  // Threshold labels in UI
  const displayTempThresh = document.getElementById('displayTempThresh');
  const displayHumThresh = document.getElementById('displayHumThresh');
  const displayGasThresh = document.getElementById('displayGasThresh');

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    updateThresholdDisplayLabels();
    populateThresholdFormInputs();
    charts.init(thresholds, isDarkMode);

    attachEventListeners();
    updateConnectionUI();

    // Start clock updater for "Last updated X seconds ago"
    setInterval(updateRelativeTimestamp, 1000);

    // Initial tick
    tick();

    // Start continuous monitoring timer
    startMonitoring();
  }

  // ==========================================
  // MONITORING CYCLE (TICK)
  // ==========================================
  function tick() {
    if (!isMonitoring) return;

    // 1. Generate synthetic sensor reading from simulator
    const reading = simulator.generateReading();
    lastUpdatedTime = reading.timestamp;

    // 2. Update stats
    updateStats(reading);

    // 3. Evaluate thresholds & check alerts
    const alerts = evaluateThresholds(reading);

    // 4. Update KPI Cards & Status tags
    renderKpiCards(reading, alerts);

    // 5. Update Charts
    charts.pushReading(reading);

    // 6. Record to history and render table
    addReadingToHistory(reading, alerts);

    // 7. Render any alerts generated
    if (alerts.length > 0) {
      alerts.forEach(a => recordAlert(a));
      if (audioAlertsEnabled) {
        const hasCritical = alerts.some(a => a.severity === 'critical');
        playAudioTone(hasCritical ? 880 : 587, hasCritical ? 0.35 : 0.2);
      }
    }

    // 8. Update telemetry meta (packets, rssi)
    if (packetCountEl) packetCountEl.textContent = reading.packetId;
    if (rssiValueEl) rssiValueEl.textContent = `Simulated (${reading.rssi} dBm)`;
    updateRelativeTimestamp();
  }

  function startMonitoring() {
    if (timerId) clearInterval(timerId);
    isMonitoring = true;
    timerId = setInterval(tick, intervalMs);
    updateConnectionUI();
  }

  function stopMonitoring() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    isMonitoring = false;
    updateConnectionUI();
  }

  function updateConnectionUI() {
    if (isMonitoring) {
      btnStart.disabled = true;
      btnStop.disabled = false;
      connStatusBadge.className = 'status-badge status-badge-active';
      connStatusDot.className = 'status-dot dot-active';
      connStatusText.textContent = 'Simulated Monitoring Active';
    } else {
      btnStart.disabled = false;
      btnStop.disabled = true;
      connStatusBadge.className = 'status-badge status-badge-paused';
      connStatusDot.className = 'status-dot dot-paused';
      connStatusText.textContent = 'Monitoring Paused';
    }
  }

  function updateRelativeTimestamp() {
    if (!lastUpdatedTime) {
      lastUpdatedEl.textContent = 'Waiting for data...';
      return;
    }
    const elapsedSec = Math.floor((Date.now() - lastUpdatedTime.getTime()) / 1000);
    const timeStr = lastUpdatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    if (elapsedSec <= 1) {
      lastUpdatedEl.textContent = `${timeStr} (Just now)`;
    } else {
      lastUpdatedEl.textContent = `${timeStr} (${elapsedSec}s ago)`;
    }
  }

  // ==========================================
  // THRESHOLD EVALUATION & ALERTS
  // ==========================================
  function evaluateThresholds(reading) {
    const alerts = [];

    // Temperature Check
    if (reading.temperature > thresholds.tempMax) {
      alerts.push({
        id: Date.now() + Math.random(),
        timestamp: reading.timestamp,
        parameter: 'Temperature',
        severity: 'critical',
        message: `High Temperature Alert: ${reading.temperature}°C exceeds configured threshold (${thresholds.tempMax}°C)`,
        value: `${reading.temperature}°C`,
        threshold: `Max: ${thresholds.tempMax}°C`
      });
    } else if (reading.temperature < thresholds.tempMin) {
      alerts.push({
        id: Date.now() + Math.random(),
        timestamp: reading.timestamp,
        parameter: 'Temperature',
        severity: 'warning',
        message: `Low Temperature Warning: ${reading.temperature}°C is below threshold (${thresholds.tempMin}°C)`,
        value: `${reading.temperature}°C`,
        threshold: `Min: ${thresholds.tempMin}°C`
      });
    }

    // Humidity Check
    if (reading.humidity > thresholds.humidityMax) {
      alerts.push({
        id: Date.now() + Math.random(),
        timestamp: reading.timestamp,
        parameter: 'Humidity',
        severity: 'warning',
        message: `High Humidity Warning: ${reading.humidity}% exceeds threshold (${thresholds.humidityMax}%)`,
        value: `${reading.humidity}%`,
        threshold: `Max: ${thresholds.humidityMax}%`
      });
    } else if (reading.humidity < thresholds.humidityMin) {
      alerts.push({
        id: Date.now() + Math.random(),
        timestamp: reading.timestamp,
        parameter: 'Humidity',
        severity: 'warning',
        message: `Low Humidity Warning: ${reading.humidity}% is below threshold (${thresholds.humidityMin}%)`,
        value: `${reading.humidity}%`,
        threshold: `Min: ${thresholds.humidityMin}%`
      });
    }

    // Harmful Gas Check (Raw ADC)
    if (reading.gasRaw >= thresholds.gasCritical) {
      alerts.push({
        id: Date.now() + Math.random(),
        timestamp: reading.timestamp,
        parameter: 'Harmful Gas',
        severity: 'critical',
        message: `CRITICAL GAS CONCENTRATION: Raw ADC ${reading.gasRaw} breached critical threshold (${thresholds.gasCritical})!`,
        value: `${reading.gasRaw} (Raw ADC)`,
        threshold: `Critical: ${thresholds.gasCritical}`
      });
    } else if (reading.gasRaw >= thresholds.gasWarning) {
      alerts.push({
        id: Date.now() + Math.random(),
        timestamp: reading.timestamp,
        parameter: 'Harmful Gas',
        severity: 'warning',
        message: `Elevated Gas Concentration: Raw ADC ${reading.gasRaw} exceeds warning threshold (${thresholds.gasWarning}).`,
        value: `${reading.gasRaw} (Raw ADC)`,
        threshold: `Warn: ${thresholds.gasWarning}`
      });
    }

    return alerts;
  }

  function recordAlert(alertObj) {
    // Avoid spamming identical alert if occurred within last 4 seconds
    const recentDuplicate = alertHistory.find(
      a => a.parameter === alertObj.parameter &&
           a.severity === alertObj.severity &&
           (alertObj.timestamp - a.timestamp) < 4000
    );
    if (recentDuplicate) return;

    alertHistory.unshift(alertObj);
    if (alertHistory.length > MAX_ALERTS) {
      alertHistory.pop();
    }
    renderAlertList();
  }

  function renderAlertList() {
    if (!alertListEl) return;

    alertBadgeCount.textContent = alertHistory.length;
    if (alertHistory.length === 0) {
      alertListEl.innerHTML = `
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="M9 12l2 2 4-4"></path>
          </svg>
          <p>No active warning alerts. All sensor parameters within configured thresholds.</p>
        </div>`;
      return;
    }

    alertListEl.innerHTML = alertHistory.map(alert => {
      const isCritical = alert.severity === 'critical';
      const timeStr = alert.timestamp.toLocaleTimeString();
      return `
        <div class="alert-item alert-item-${alert.severity}">
          <div class="alert-icon">
            ${isCritical ? '⚠️' : '⚡'}
          </div>
          <div class="alert-content">
            <div class="alert-header">
              <span class="alert-tag alert-tag-${alert.severity}">${alert.severity.toUpperCase()}</span>
              <span class="alert-time">${timeStr}</span>
            </div>
            <p class="alert-msg">${escapeHtml(alert.message)}</p>
            <div class="alert-meta">Reading: <strong>${escapeHtml(alert.value)}</strong> | Target: ${escapeHtml(alert.threshold)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // KPI RENDERING
  // ==========================================
  function renderKpiCards(reading, alerts) {
    // Temperature
    tempValEl.textContent = reading.temperature.toFixed(1);
    const tempAlert = alerts.find(a => a.parameter === 'Temperature');
    if (tempAlert) {
      setCardState(cardTemp, tempStatusEl, tempAlert.severity, tempAlert.severity === 'critical' ? 'High Temp' : 'Low Temp');
    } else {
      setCardState(cardTemp, tempStatusEl, 'normal', 'Normal');
    }

    // Humidity
    humidityValEl.textContent = reading.humidity.toFixed(1);
    const humAlert = alerts.find(a => a.parameter === 'Humidity');
    if (humAlert) {
      setCardState(cardHumidity, humidityStatusEl, humAlert.severity, humAlert.severity === 'critical' ? 'High Humidity' : 'Out of Bounds');
    } else {
      setCardState(cardHumidity, humidityStatusEl, 'normal', 'Normal');
    }

    // Harmful Gas
    gasValEl.textContent = reading.gasRaw;
    const gasAlert = alerts.find(a => a.parameter === 'Harmful Gas');
    if (gasAlert) {
      setCardState(cardGas, gasStatusEl, gasAlert.severity, gasAlert.severity === 'critical' ? 'DANGER HAZARD' : 'Elevated Gas');
    } else {
      setCardState(cardGas, gasStatusEl, 'normal', 'Air Quality Good');
    }

    // Render Stats
    if (tempStatsEl) {
      tempStatsEl.textContent = `Min: ${stats.temp.min.toFixed(1)}° | Max: ${stats.temp.max.toFixed(1)}° | Avg: ${(stats.temp.sum / stats.temp.count).toFixed(1)}°`;
    }
    if (humidityStatsEl) {
      humidityStatsEl.textContent = `Min: ${stats.humidity.min.toFixed(1)}% | Max: ${stats.humidity.max.toFixed(1)}% | Avg: ${(stats.humidity.sum / stats.humidity.count).toFixed(1)}%`;
    }
    if (gasStatsEl) {
      gasStatsEl.textContent = `Min: ${stats.gas.min} | Max: ${stats.gas.max} | Avg: ${Math.round(stats.gas.sum / stats.gas.count)}`;
    }
  }

  function setCardState(card, statusBadge, state, text) {
    card.classList.remove('card-alert-warning', 'card-alert-critical', 'card-normal');
    statusBadge.classList.remove('badge-status-normal', 'badge-status-warning', 'badge-status-critical');

    if (state === 'critical') {
      card.classList.add('card-alert-critical');
      statusBadge.classList.add('badge-status-critical');
      statusBadge.textContent = text;
    } else if (state === 'warning') {
      card.classList.add('card-alert-warning');
      statusBadge.classList.add('badge-status-warning');
      statusBadge.textContent = text;
    } else {
      card.classList.add('card-normal');
      statusBadge.classList.add('badge-status-normal');
      statusBadge.textContent = text;
    }
  }

  function updateStats(reading) {
    // Temperature
    stats.temp.min = Math.min(stats.temp.min, reading.temperature);
    stats.temp.max = Math.max(stats.temp.max, reading.temperature);
    stats.temp.sum += reading.temperature;
    stats.temp.count++;

    // Humidity
    stats.humidity.min = Math.min(stats.humidity.min, reading.humidity);
    stats.humidity.max = Math.max(stats.humidity.max, reading.humidity);
    stats.humidity.sum += reading.humidity;
    stats.humidity.count++;

    // Gas
    stats.gas.min = Math.min(stats.gas.min, reading.gasRaw);
    stats.gas.max = Math.max(stats.gas.max, reading.gasRaw);
    stats.gas.sum += reading.gasRaw;
    stats.gas.count++;
  }

  // ==========================================
  // HISTORY TABLE
  // ==========================================
  function addReadingToHistory(reading, alerts) {
    let overallStatus = 'Normal';
    let statusClass = 'status-tag-normal';

    if (alerts.some(a => a.severity === 'critical')) {
      overallStatus = 'CRITICAL ALERT';
      statusClass = 'status-tag-critical';
    } else if (alerts.some(a => a.severity === 'warning')) {
      overallStatus = 'WARNING';
      statusClass = 'status-tag-warning';
    }

    const rowData = {
      packetId: reading.packetId,
      timestamp: reading.timestamp,
      temperature: reading.temperature,
      humidity: reading.humidity,
      gasRaw: reading.gasRaw,
      overallStatus,
      statusClass
    };

    readingsHistory.unshift(rowData);
    if (readingsHistory.length > MAX_HISTORY_ROWS) {
      readingsHistory.pop();
    }

    renderHistoryTable();
  }

  function renderHistoryTable() {
    if (!historyTableBody) return;

    const searchTerm = (historySearch?.value || '').toLowerCase().trim();
    const filtered = readingsHistory.filter(row => {
      if (!searchTerm) return true;
      return (
        row.overallStatus.toLowerCase().includes(searchTerm) ||
        row.temperature.toString().includes(searchTerm) ||
        row.humidity.toString().includes(searchTerm) ||
        row.gasRaw.toString().includes(searchTerm)
      );
    });

    if (filtered.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty">No telemetry records match the current filter.</td>
        </tr>`;
      return;
    }

    historyTableBody.innerHTML = filtered.slice(0, 30).map(row => {
      const timeStr = row.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const dateStr = row.timestamp.toLocaleDateString();
      return `
        <tr>
          <td class="col-num">#${row.packetId}</td>
          <td class="col-time"><span class="table-time">${timeStr}</span> <span class="table-date">${dateStr}</span></td>
          <td class="col-temp"><strong>${row.temperature.toFixed(1)}</strong> °C</td>
          <td class="col-hum"><strong>${row.humidity.toFixed(1)}</strong> %</td>
          <td class="col-gas"><strong>${row.gasRaw}</strong> <span class="raw-label">ADC</span></td>
          <td><span class="status-tag ${row.statusClass}">${row.overallStatus}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // CSV EXPORT & CLEAR
  // ==========================================
  function exportHistoryToCsv() {
    if (readingsHistory.length === 0) {
      alert('No sensor readings recorded yet to export.');
      return;
    }

    const headers = ['Packet ID', 'ISO Timestamp', 'Local Time', 'Temperature (°C)', 'Relative Humidity (%)', 'Gas Sensor (Raw ADC)', 'Status'];
    const csvRows = [headers.join(',')];

    readingsHistory.forEach(r => {
      const row = [
        r.packetId,
        `"${r.timestamp.toISOString()}"`,
        `"${r.timestamp.toLocaleTimeString()}"`,
        r.temperature,
        r.humidity,
        r.gasRaw,
        `"${r.overallStatus}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Quality_Monitoring_Telemetry_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function clearHistoryData() {
    if (confirm('Are you sure you want to clear all telemetry history and reset statistics?')) {
      readingsHistory.length = 0;
      alertHistory.length = 0;
      stats.temp = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
      stats.humidity = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
      stats.gas = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
      charts.reset();
      simulator.reset();
      renderHistoryTable();
      renderAlertList();
    }
  }

  // ==========================================
  // THRESHOLD PERSISTENCE & SETTINGS
  // ==========================================
  function loadThresholds() {
    try {
      const stored = localStorage.getItem('qms_thresholds');
      if (stored) {
        return { ...DEFAULT_THRESHOLDS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not load thresholds from localStorage', e);
    }
    return { ...DEFAULT_THRESHOLDS };
  }

  function saveThresholds(newThresholds) {
    thresholds = { ...newThresholds };
    try {
      localStorage.setItem('qms_thresholds', JSON.stringify(thresholds));
    } catch (e) {
      console.warn('Could not save thresholds to localStorage', e);
    }
    updateThresholdDisplayLabels();
  }

  function updateThresholdDisplayLabels() {
    if (displayTempThresh) {
      displayTempThresh.textContent = `Alert: > ${thresholds.tempMax}°C | < ${thresholds.tempMin}°C`;
    }
    if (displayHumThresh) {
      displayHumThresh.textContent = `Alert: > ${thresholds.humidityMax}% | < ${thresholds.humidityMin}%`;
    }
    if (displayGasThresh) {
      displayGasThresh.textContent = `Warn: ≥ ${thresholds.gasWarning} | Crit: ≥ ${thresholds.gasCritical}`;
    }
  }

  function populateThresholdFormInputs() {
    if (!formThresholds) return;
    document.getElementById('inputTempMax').value = thresholds.tempMax;
    document.getElementById('inputTempMin').value = thresholds.tempMin;
    document.getElementById('inputHumidityMax').value = thresholds.humidityMax;
    document.getElementById('inputHumidityMin').value = thresholds.humidityMin;
    document.getElementById('inputGasWarning').value = thresholds.gasWarning;
    document.getElementById('inputGasCritical').value = thresholds.gasCritical;
  }

  // ==========================================
  // SYNTHETIC AUDIO ALERT TONE
  // ==========================================
  function playAudioTone(freq = 660, duration = 0.2) {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) {
        audioCtx = new AudioCtxClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('Audio synthesis not supported or blocked by browser policy', err);
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  function attachEventListeners() {
    // Start / Stop buttons
    btnStart.addEventListener('click', () => {
      startMonitoring();
    });

    btnStop.addEventListener('click', () => {
      stopMonitoring();
    });

    // Polling Interval Select
    selectInterval.addEventListener('change', (e) => {
      intervalMs = parseInt(e.target.value, 10);
      if (isMonitoring) {
        startMonitoring(); // restarts with new interval
      }
    });

    // Chart Window points selector
    if (selectPoints) {
      selectPoints.addEventListener('change', (e) => {
        charts.setMaxPoints(parseInt(e.target.value, 10));
      });
    }

    // Trigger test anomaly spikes
    btnSpikeGas.addEventListener('click', () => {
      simulator.triggerSpike('gas', 6);
      showToast('⚠️ Simulating Harmful Gas Hazard Spike! Check alert panel.', 'warning');
      if (!isMonitoring) tick();
    });

    btnSpikeTemp.addEventListener('click', () => {
      simulator.triggerSpike('temp', 6);
      showToast('🌡️ Simulating High Temperature Spike! Check alert panel.', 'warning');
      if (!isMonitoring) tick();
    });

    // Export and Clear
    btnExportCsv.addEventListener('click', exportHistoryToCsv);
    btnClearHistory.addEventListener('click', clearHistoryData);
    btnClearAlerts.addEventListener('click', () => {
      alertHistory.length = 0;
      renderAlertList();
      showToast('Alert logs cleared.', 'info');
    });

    // History Search
    historySearch.addEventListener('input', renderHistoryTable);

    // Audio Mute/Unmute
    btnToggleAudio.addEventListener('click', () => {
      audioAlertsEnabled = !audioAlertsEnabled;
      btnToggleAudio.classList.toggle('btn-active', audioAlertsEnabled);
      btnToggleAudio.setAttribute('aria-pressed', audioAlertsEnabled);
      btnToggleAudio.innerHTML = audioAlertsEnabled 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Audio Alerts: ON`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg> Audio Alerts: OFF`;
      
      if (audioAlertsEnabled) {
        playAudioTone(520, 0.15);
        showToast('Audio alarms enabled (Synthesized chime will sound on alerts).', 'info');
      }
    });

    // Theme Switcher
    btnToggleTheme.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      document.body.classList.toggle('light-theme', !isDarkMode);
      btnToggleTheme.innerHTML = isDarkMode
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Light Mode`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> Dark Mode`;
      charts.updateTheme(isDarkMode);
    });

    // Settings Modal
    btnOpenSettings.addEventListener('click', () => {
      populateThresholdFormInputs();
      settingsModal.classList.add('modal-open');
    });

    btnCloseSettings.addEventListener('click', () => {
      settingsModal.classList.remove('modal-open');
    });

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('modal-open');
      }
    });

    formThresholds.addEventListener('submit', (e) => {
      e.preventDefault();
      const newThresholds = {
        tempMax: parseFloat(document.getElementById('inputTempMax').value),
        tempMin: parseFloat(document.getElementById('inputTempMin').value),
        humidityMax: parseFloat(document.getElementById('inputHumidityMax').value),
        humidityMin: parseFloat(document.getElementById('inputHumidityMin').value),
        gasWarning: parseInt(document.getElementById('inputGasWarning').value, 10),
        gasCritical: parseInt(document.getElementById('inputGasCritical').value, 10)
      };

      if (newThresholds.tempMin >= newThresholds.tempMax) {
        alert('Temperature Min must be less than Temperature Max.');
        return;
      }
      if (newThresholds.humidityMin >= newThresholds.humidityMax) {
        alert('Humidity Min must be less than Humidity Max.');
        return;
      }
      if (newThresholds.gasWarning >= newThresholds.gasCritical) {
        alert('Gas Warning threshold must be lower than Gas Critical threshold.');
        return;
      }

      saveThresholds(newThresholds);
      settingsModal.classList.remove('modal-open');
      showToast('Threshold configurations updated successfully!', 'success');
      tick(); // re-eval with new thresholds
    });

    btnResetDefaults.addEventListener('click', () => {
      if (confirm('Reset all threshold values to factory defaults?')) {
        saveThresholds(DEFAULT_THRESHOLDS);
        populateThresholdFormInputs();
        settingsModal.classList.remove('modal-open');
        showToast('Thresholds reset to default specifications.', 'info');
        tick();
      }
    });

    // Cloud Integration Guide Modal
    btnOpenCloudGuide.addEventListener('click', () => {
      cloudGuideModal.classList.add('modal-open');
    });

    btnCloseCloudGuide.addEventListener('click', () => {
      cloudGuideModal.classList.remove('modal-open');
    });

    cloudGuideModal.addEventListener('click', (e) => {
      if (e.target === cloudGuideModal) {
        cloudGuideModal.classList.remove('modal-open');
      }
    });
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Start app
  init();
});
