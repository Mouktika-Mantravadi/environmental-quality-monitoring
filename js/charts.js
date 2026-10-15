/**
 * Quality Monitoring System - Charting Manager
 * 
 * Manages separate live-updating line charts for:
 * 1. Temperature (°C)
 * 2. Humidity (%)
 * 3. Harmful Gas Sensor Readings (Raw ADC Values)
 */

class DashboardCharts {
  constructor() {
    this.maxPoints = 25; // Default window of visible points
    this.tempChart = null;
    this.humidityChart = null;
    this.gasChart = null;

    // Data buffers
    this.timestamps = [];
    this.tempData = [];
    this.humidityData = [];
    this.gasData = [];
  }

  /**
   * Initialize all three line charts
   * @param {Object} currentThresholds 
   * @param {boolean} isDarkMode 
   */
  init(currentThresholds, isDarkMode = true) {
    const textColor = isDarkMode ? '#94a3b8' : '#475569';
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(0, 0, 0, 0.06)';

    this.initTempChart(textColor, gridColor, currentThresholds);
    this.initHumidityChart(textColor, gridColor, currentThresholds);
    this.initGasChart(textColor, gridColor, currentThresholds);
  }

  /**
   * Helper to format time label
   */
  formatTimeLabel(date) {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  /**
   * Initialize Temperature Line Chart
   */
  initTempChart(textColor, gridColor, thresholds) {
    const ctx = document.getElementById('tempChartCanvas');
    if (!ctx) return;

    if (this.tempChart) this.tempChart.destroy();

    this.tempChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.timestamps,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: this.tempData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Temperature: ${context.parsed.y.toFixed(1)} °C`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
          },
          y: {
            suggestedMin: 15,
            suggestedMax: 40,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (val) => `${val}°C`
            }
          }
        }
      }
    });
  }

  /**
   * Initialize Humidity Line Chart
   */
  initHumidityChart(textColor, gridColor, thresholds) {
    const ctx = document.getElementById('humidityChartCanvas');
    if (!ctx) return;

    if (this.humidityChart) this.humidityChart.destroy();

    this.humidityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.timestamps,
        datasets: [
          {
            label: 'Relative Humidity (%)',
            data: this.humidityData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Humidity: ${context.parsed.y.toFixed(1)} %`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
          },
          y: {
            suggestedMin: 20,
            suggestedMax: 90,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (val) => `${val}%`
            }
          }
        }
      }
    });
  }

  /**
   * Initialize Harmful Gas Sensor Line Chart
   */
  initGasChart(textColor, gridColor, thresholds) {
    const ctx = document.getElementById('gasChartCanvas');
    if (!ctx) return;

    if (this.gasChart) this.gasChart.destroy();

    this.gasChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.timestamps,
        datasets: [
          {
            label: 'Gas Sensor (Raw ADC)',
            data: this.gasData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Harmful Gas Raw: ${context.parsed.y} / 4095`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
          },
          y: {
            suggestedMin: 200,
            suggestedMax: 3000,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (val) => `${val}`
            }
          }
        }
      }
    });
  }

  /**
   * Add a new telemetry reading to the charts
   * @param {Object} reading 
   */
  pushReading(reading) {
    const timeLabel = this.formatTimeLabel(reading.timestamp);

    this.timestamps.push(timeLabel);
    this.tempData.push(reading.temperature);
    this.humidityData.push(reading.humidity);
    this.gasData.push(reading.gasRaw);

    // Maintain max points window
    if (this.timestamps.length > this.maxPoints) {
      this.timestamps.shift();
      this.tempData.shift();
      this.humidityData.shift();
      this.gasData.shift();
    }

    if (this.tempChart) this.tempChart.update('none');
    if (this.humidityChart) this.humidityChart.update('none');
    if (this.gasChart) this.gasChart.update('none');
  }

  /**
   * Adjust visible point history limit (15, 25, 50, 100)
   */
  setMaxPoints(newMax) {
    this.maxPoints = newMax;
    while (this.timestamps.length > this.maxPoints) {
      this.timestamps.shift();
      this.tempData.shift();
      this.humidityData.shift();
      this.gasData.shift();
    }
    if (this.tempChart) this.tempChart.update();
    if (this.humidityChart) this.humidityChart.update();
    if (this.gasChart) this.gasChart.update();
  }

  /**
   * Update theme styling (dark/light)
   */
  updateTheme(isDarkMode) {
    const textColor = isDarkMode ? '#94a3b8' : '#475569';
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(0, 0, 0, 0.06)';

    [this.tempChart, this.humidityChart, this.gasChart].forEach(chart => {
      if (chart) {
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.options.scales.y.grid.color = gridColor;
        chart.update();
      }
    });
  }

  /**
   * Reset all chart data series
   */
  reset() {
    this.timestamps.length = 0;
    this.tempData.length = 0;
    this.humidityData.length = 0;
    this.gasData.length = 0;

    if (this.tempChart) this.tempChart.update();
    if (this.humidityChart) this.humidityChart.update();
    if (this.gasChart) this.gasChart.update();
  }
}

// Export universally for browser and modules
if (typeof window !== 'undefined') {
  window.DashboardCharts = DashboardCharts;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardCharts;
}
