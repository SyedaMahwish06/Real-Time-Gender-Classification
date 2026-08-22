// dashboard.js - FINAL WORKING VERSION

// ================= DOM ELEMENTS =================
const video = document.getElementById('webcam');
const startBtn = document.getElementById('startCameraBtn');
const stopBtn = document.getElementById('stopCameraBtn');
const camPlaceholder = document.getElementById('camPlaceholder');
const predictionLoader = document.getElementById('predictionLoader');
const confidenceBar = document.getElementById('confidenceBar');
const confidencePercentLabel = document.getElementById('confidencePercentLabel');
const lastPredictionSpan = document.getElementById('lastPredictionTime');
const historyTableBody = document.getElementById('historyTableBody');
const totalCountStat = document.getElementById('totalCountStat');
const maleRatioStat = document.getElementById('maleRatioStat');
const femaleRatioStat = document.getElementById('femaleRatioStat');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const mobileToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const predictionDisplay = document.getElementById('predictionDisplay');

// ================= STATE =================
let stream = null;
let intervalId = null;
let isCameraActive = false;
let predictionHistory = [];
let chartInstance = null;

// ================= BUTTON CONTROL =================
function toggleButtons(started) {
    if (startBtn) startBtn.disabled = started;
    if (stopBtn) stopBtn.disabled = !started;
}

// ================= LOCAL STORAGE =================
function loadHistoryFromLocal() {
    const stored = localStorage.getItem('genderPredictionHistory');

    try {
        predictionHistory = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(predictionHistory)) predictionHistory = [];
    } catch {
        predictionHistory = [];
    }

    updateHistoryTable();
    updateStatsAndChart();
}

function saveHistoryToLocal() {
    localStorage.setItem(
        'genderPredictionHistory',
        JSON.stringify(predictionHistory.slice(-50))
    );
}

// ================= HISTORY TABLE =================
function updateHistoryTable() {
    if (!historyTableBody) return;

    if (predictionHistory.length === 0) {
        historyTableBody.innerHTML =
            '<tr><td colspan="3" class="text-center py-5 text-gray-400">No predictions yet.</td></tr>';
        return;
    }

    let html = '';

    [...predictionHistory].reverse().forEach(entry => {
        const genderIcon =
            entry.gender === 'Male'
                ? '<i class="fas fa-mars text-blue-400"></i>'
                : '<i class="fas fa-venus text-pink-400"></i>';

        html += `
        <tr class="history-row">
            <td class="py-2 text-xs">${entry.timestamp}</td>
            <td class="py-2">${genderIcon} ${entry.gender}</td>
            <td class="py-2">${Math.round(entry.confidence)}%</td>
        </tr>`;
    });

    historyTableBody.innerHTML = html;
    saveHistoryToLocal();
}

// ================= STATS + CHART =================
function updateStatsAndChart() {
    const total = predictionHistory.length;
    if (totalCountStat) totalCountStat.innerText = total;

    if (total === 0) {
        if (maleRatioStat) maleRatioStat.innerText = '0%';
        if (femaleRatioStat) femaleRatioStat.innerText = '0%';
        return;
    }

    const maleCount = predictionHistory.filter(p => p.gender === 'Male').length;
    const femaleCount = total - maleCount;

    const malePercent = Math.round((maleCount / total) * 100);
    const femalePercent = Math.round((femaleCount / total) * 100);

    if (maleRatioStat) maleRatioStat.innerText = `${malePercent}%`;
    if (femaleRatioStat) femaleRatioStat.innerText = `${femalePercent}%`;

    const canvas = document.getElementById('historyChart');
    if (!canvas) return;

    if (chartInstance) {
        chartInstance.data.datasets[0].data = [maleCount, femaleCount];
        chartInstance.update();
    } else {
        const ctx = canvas.getContext('2d');

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Male', 'Female'],
                datasets: [{
                    data: [maleCount, femaleCount],
                    backgroundColor: ['#3b82f6', '#ec4899'],
                    borderWidth: 0
                }]
            }
        });
    }
}

// ================= ADD PREDICTION =================
function addPredictionToHistory(gender, confidence) {
    const now = new Date();

    predictionHistory.push({
        timestamp: now.toLocaleTimeString(),
        gender: gender,
        confidence: confidence
    });

    if (predictionHistory.length > 100) {
        predictionHistory = predictionHistory.slice(-100);
    }

    updateHistoryTable();
    updateStatsAndChart();
}

// ================= CLEAR HISTORY =================
function clearHistory() {
    if (confirm("Clear all history?")) {
        predictionHistory = [];
        updateHistoryTable();
        updateStatsAndChart();
        saveHistoryToLocal();
    }
}

// ================= UI UPDATE =================
function updatePredictionDisplay(gender, confidence) {
    const g = gender || '—';
    const c = confidence || 0;

    predictionDisplay.innerHTML = `
        <div class="prediction-icon">
            <i class="fas ${
                g === 'Male' ? 'fa-mars text-blue-400' :
                g === 'Female' ? 'fa-venus text-pink-400' :
                'fa-question text-gray-400'
            } text-6xl"></i>
        </div>
        <div class="prediction-text">
            <p class="gender-text">${g}</p>
            <p class="confidence-text">confidence: ${Math.round(c)}%</p>
        </div>
    `;

    confidenceBar.style.width = `${c}%`;
    confidencePercentLabel.innerText = `${Math.round(c)}%`;

    lastPredictionSpan.innerText = new Date().toLocaleTimeString();
}

// ================= API CALL =================
async function sendFrameForPrediction(imageData) {
    try {
        const res = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });

        const data = await res.json();

        if (data.success) {
            const confidence = data.confidence * 100;

            updatePredictionDisplay(data.gender, confidence);
            addPredictionToHistory(data.gender, confidence);
        } else {
            updatePredictionDisplay("No Face", 0);
        }

    } catch (err) {
        console.error(err);
        alert("Server error!");
    }
}

// ================= CAPTURE =================
async function captureAndPredict() {
    if (!isCameraActive || !video.videoWidth) return;

    predictionLoader.classList.remove('hidden');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const image = canvas.toDataURL('image/jpeg');

    await sendFrameForPrediction(image);

    predictionLoader.classList.add('hidden');
}

// ================= CAMERA =================
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });

        video.srcObject = stream;
        await video.play();

        isCameraActive = true;
        camPlaceholder.classList.add('hidden');

        toggleButtons(true);

        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(captureAndPredict, 1500);

    } catch {
        alert("Camera access denied!");
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    video.srcObject = null;
    isCameraActive = false;

    camPlaceholder.classList.remove('hidden');
    toggleButtons(false);

    if (intervalId) clearInterval(intervalId);
}

// ================= MOBILE MENU =================
function initMobileMenu() {
    if (!mobileToggle) return;

    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// ================= EVENTS =================
function initEventListeners() {
    if (startBtn) startBtn.addEventListener('click', startCamera);
    if (stopBtn) stopBtn.addEventListener('click', stopCamera);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);
}

// ================= INIT =================
function init() {
    loadHistoryFromLocal();
    initEventListeners();
    initMobileMenu();
    updatePredictionDisplay(null, 0);
    toggleButtons(false);
}

document.addEventListener('DOMContentLoaded', init);

// Cleanup
window.addEventListener('beforeunload', () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (intervalId) clearInterval(intervalId);
});