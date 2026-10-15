# Quality Monitoring System for Continuous Analysis of Temperature, Humidity, and Harmful Gas Concentrations Using Wi-Fi Communication and Cloud Services

A responsive, high-performance web dashboard built with HTML5, CSS3, and JavaScript for continuous real-time monitoring and analysis of environmental metrics: **Temperature (°C)**, **Relative Humidity (%)**, and **Harmful Gas Concentrations (Raw ADC Values)**.

---

> [!IMPORTANT]
> **SIMULATION NOTICE & DATA DISCLAIMER:**  
> This dashboard is currently operating in **Local Simulation Mode** using realistic synthetic sensor telemetry. Because the ESP32 hardware/simulation in Mokxi / Wokwi is not yet connected to the dashboard, **no claim is made that live sensor readings or real cloud database streams are being received**. All values, charts, and alarm feeds are generated locally for user interface verification, threshold alarm tuning, and operational testing.

---

## 🌟 Key Features

1. **Environmental KPI Metric Displays**:
   - **Temperature**: Displayed in Celsius (°C) with fractional precision and session Min / Max / Average tracking.
   - **Relative Humidity**: Displayed in percentage (%) with session statistics.
   - **Harmful Gas Concentration**: Displayed as **Raw ADC readings** (12-bit integer, range `0 – 4095` from analog gas sensors such as MQ-135 or MQ-2).
2. **Three Separate Live-Updating Line Charts**:
   - Individual real-time trend charts for Temperature, Humidity, and Gas Concentration.
   - Configurable visible time-window (15, 25, 50, or 100 points).
   - Smooth cubic bezier curves, gradient area fills, and responsive scaling.
3. **Configurable Thresholds & Multi-Level Alarms**:
   - User-configurable High & Low bounds for Temperature (°C) and Humidity (%).
   - Configurable Warning and Critical thresholds for Harmful Gas (Raw ADC values).
   - Immediate visual feedback on KPI cards (Warning Amber / Critical Red glowing alerts).
   - Real-time Alert Log feed detailing the parameter, timestamp, severity, and breach details.
   - Optional synthesized audio tone alerts (Web Audio API).
   - Persistent threshold settings saved across sessions via browser `localStorage`.
4. **Monitoring & Operational Controls**:
   - **Start Monitoring** and **Stop Monitoring** buttons to pause and resume live data acquisition.
   - **Configurable Polling Rate** selector (1.0s, 2.0s, 3.0s, 5.0s).
   - **Simulation Anomaly Test Injections**: One-click triggers for *Gas Hazard Spike* and *Temperature Surge* to verify safety alert triggers on demand.
5. **System Telemetry & Status Monitoring**:
   - Visual connection state indicator (Green pulsating LED for active, Amber for paused).
   - Dynamic "Last Updated" timestamp tracker with relative time ("Just now", "X seconds ago").
   - Packet sequence counter and simulated Wi-Fi RSSI strength.
6. **Historical Data Table & CSV Export**:
   - Scrollable history log of previous readings with timestamp, sensor metrics, and status badges.
   - Instant search/filter box to filter readings by status or value.
   - **Export to CSV** button to download telemetry datasets for external scientific or engineering analysis.
7. **Offline-Ready & Zero Backend Requirement**:
   - Runs purely inside any modern web browser without requiring Node.js, Python, or a backend database.
   - Bundled local Chart.js library (`lib/chart.umd.min.js`) so the dashboard operates even without internet access.
8. **Modern Responsive Design**:
   - Sleek cyber-industrial glassmorphism theme with accessible high-contrast colors.
   - Built-in Dark Mode and Light Mode toggle.
   - Fully responsive layout optimized for desktop, tablet, and mobile displays.

---

## 📁 Project Structure

```
PSLAM/
├── index.html             # Main dashboard structure & modals
├── css/
│   └── styles.css         # Complete styling, CSS variables, dark/light themes, animations
├── js/
│   ├── app.js             # Main application controller, thresholds, alarms, table, export
│   ├── charts.js          # Chart.js initialization and live stream management
│   └── simulator.js       # Synthetic physical sensor telemetry generator
├── lib/
│   └── chart.umd.min.js   # Local Chart.js v4 bundle for 100% offline functionality
└── README.md              # Project documentation and integration manual
```

---

## 🚀 How to Run the Dashboard

Because this is a pure front-end web application, **no installation or server setup is required**.

### Option A: Direct Browser Launch (Easiest)
1. Navigate to the project folder: `c:\Users\PC\Desktop\PSLAM`.
2. Double-click **`index.html`** or right-click and choose **Open with -> Google Chrome / Microsoft Edge / Firefox**.
3. The dashboard will load instantly and begin simulated monitoring.

### Option B: Local Web Server (Independent of Antigravity)
If you prefer running through a local HTTP server:

**1-Click Launcher:**
- Simply double-click **`start_server.bat`** in the project folder. It launches an independent server on `http://localhost:8080` in its own Windows Command Prompt window and opens your browser.

**Or via PowerShell / Command Prompt:**
```powershell
cd c:\Users\PC\Desktop\PSLAM
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser.

Using Node.js:
```powershell
npx serve c:\Users\PC\Desktop\PSLAM
```

---

## 🧪 Testing Threshold Alerts

To verify the threshold detection and alert system:
1. Click **Configure Thresholds** in the top toolbar to review or adjust the safety limits:
   - Temperature High Alert: default `32.0 °C`
   - Temperature Low Warning: default `18.0 °C`
   - Humidity High Alert: default `70.0 %`
   - Humidity Low Warning: default `30.0 %`
   - Harmful Gas Warning: default `1200` (Raw ADC)
   - Harmful Gas Critical: default `2200` (Raw ADC)
2. Click **⚡ Gas Hazard Spike** in the toolbar. The simulated gas sensor will immediately spike above 2300 Raw ADC.
3. Observe:
   - The Harmful Gas KPI card will pulse in critical red with status `DANGER HAZARD`.
   - The Gas Trend chart will reflect the surge.
   - A critical entry will be recorded in the **Active Alerts & Log** panel.
   - If **Audio Alerts** are enabled, an audible alert chime will sound.
4. Click **🌡️ Temp Spike** to test thermal threshold warnings.

---

## 🔌 Roadmap: Connecting ESP32 (Mokxi / Wokwi or Physical Hardware)

When the ESP32 microcontroller simulation in Mokxi / Wokwi is ready to be linked to this dashboard:

### 1. Target JSON Telemetry Format
Configure your ESP32 firmware to construct JSON packets in the following schema:
```json
{
  "device_id": "ESP32_ENV_NODE_01",
  "temperature": 26.4,
  "humidity": 54.2,
  "gas_raw": 680,
  "wifi_rssi": -65,
  "timestamp": 1728918230
}
```

### 2. Connection Approaches
- **MQTT Broker (e.g. HiveMQ, EMQX, Adafruit IO)**:
  Connect the dashboard directly to the MQTT broker over WebSockets using `paho-mqtt.js` or `mqtt.js`. When the ESP32 publishes to topic `sensors/telemetry`, the dashboard subscribes and displays live hardware values.
- **REST API / Cloud Webhook**:
  The ESP32 uses HTTP POST to push readings to a backend endpoint (Firebase Realtime Database, Supabase, or AWS IoT Core), and the dashboard fetches updates via HTTP polling or Server-Sent Events (SSE).
- **Direct ESP32 Web Server**:
  The ESP32 runs `ESPAsyncWebServer` directly, serving this dashboard on its Wi-Fi access point / local IP with WebSocket telemetry streaming.

Once a live connection is established, simply toggle the simulation flag in `js/app.js` and update the status badge from *Simulated* to *Connected to Cloud/ESP32*.
