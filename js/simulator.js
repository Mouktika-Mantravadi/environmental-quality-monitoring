/**
 * Quality Monitoring System - Sensor Telemetry Simulator
 * 
 * DISCLAIMER:
 * This module generates synthetic telemetry for temperature, humidity,
 * and harmful gas concentration (Raw ADC) for testing and UI validation.
 * It simulates an ESP32 microcontroller with DHT22 and MQ-series analog gas sensors.
 * No real sensor readings or cloud services are connected at this stage.
 */

class SensorSimulator {
  constructor() {
    // Baseline realistic room values
    this.baseTemp = 25.5;      // °C
    this.baseHumidity = 52.0;  // %
    this.baseGasRaw = 520;     // Raw ADC (0 - 4095 range, MQ sensor in clean air)

    // Current state
    this.currentTemp = this.baseTemp;
    this.currentHumidity = this.baseHumidity;
    this.currentGasRaw = this.baseGasRaw;

    // Simulation counters
    this.packetId = 1000;
    this.spikeCyclesRemaining = 0;
    this.spikeType = null; // 'gas' | 'temp' | 'humidity'
    this.trendDirection = 1;
    this.tickCount = 0;
  }

  /**
   * Inject a temporary anomaly/spike to test warning threshold alerts
   * @param {'gas' | 'temp' | 'humidity'} type
   * @param {number} durationTicks
   */
  triggerSpike(type = 'gas', durationTicks = 8) {
    this.spikeType = type;
    this.spikeCyclesRemaining = durationTicks;
  }

  /**
   * Generate next simulated telemetry packet
   * @returns {Object} Telemetry payload
   */
  generateReading() {
    this.tickCount++;
    this.packetId++;

    // Small random walk noise
    const tempNoise = (Math.random() - 0.5) * 0.35;
    const humidityNoise = (Math.random() - 0.5) * 0.8;
    const gasNoise = (Math.random() - 0.48) * 25;

    // Gentle sinusoidal drift over time
    const drift = Math.sin(this.tickCount / 15) * 0.5;

    if (this.spikeCyclesRemaining > 0) {
      this.spikeCyclesRemaining--;
      if (this.spikeType === 'gas') {
        // Severe gas concentration spike (e.g. smoke / volatile organic compound detected)
        this.currentGasRaw = Math.min(4095, Math.round(2300 + Math.random() * 800));
        this.currentTemp += 0.2;
      } else if (this.spikeType === 'temp') {
        // Temperature spike (e.g. heating hazard)
        this.currentTemp = Math.min(60, Number((36.5 + Math.random() * 3.5).toFixed(1)));
      } else if (this.spikeType === 'humidity') {
        // High humidity surge
        this.currentHumidity = Math.min(99, Number((82.0 + Math.random() * 6.0).toFixed(1)));
      }
    } else {
      this.spikeType = null;
      // Normal continuous drift with mean-reversion
      this.currentTemp += tempNoise + drift * 0.05;
      // Pull back towards baseline if drifting too far
      this.currentTemp += (this.baseTemp - this.currentTemp) * 0.08;

      this.currentHumidity += humidityNoise;
      this.currentHumidity += (this.baseHumidity - this.currentHumidity) * 0.08;

      this.currentGasRaw += gasNoise;
      this.currentGasRaw += (this.baseGasRaw - this.currentGasRaw) * 0.08;
    }

    // Bound values to physically realistic sensor limits
    const finalTemp = Math.max(-10, Math.min(65, Number(this.currentTemp.toFixed(1))));
    const finalHumidity = Math.max(10, Math.min(98, Number(this.currentHumidity.toFixed(1))));
    const finalGasRaw = Math.max(50, Math.min(4095, Math.round(this.currentGasRaw)));

    // Simulated Wi-Fi signal strength (RSSI in dBm)
    const rssi = -60 + Math.floor((Math.random() - 0.5) * 12);

    return {
      packetId: this.packetId,
      timestamp: new Date(),
      isoTimestamp: new Date().toISOString(),
      temperature: finalTemp,
      humidity: finalHumidity,
      gasRaw: finalGasRaw,
      rssi: rssi,
      isSimulated: true,
      hasActiveSpike: this.spikeCyclesRemaining > 0,
      spikeType: this.spikeType
    };
  }

  /**
   * Reset simulation parameters to standard room baseline
   */
  reset() {
    this.currentTemp = this.baseTemp;
    this.currentHumidity = this.baseHumidity;
    this.currentGasRaw = this.baseGasRaw;
    this.spikeCyclesRemaining = 0;
    this.spikeType = null;
    this.tickCount = 0;
  }
}

// Export universally for browser and test runners
if (typeof window !== 'undefined') {
  window.SensorSimulator = SensorSimulator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SensorSimulator;
}
