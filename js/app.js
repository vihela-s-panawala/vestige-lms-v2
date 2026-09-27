import { initialStudents } from './data.js';

function bindAdminPortalAccess() {
  const adminButton = document.getElementById('adminBtn');
  const adminModal = document.getElementById('adminPinModal');
  const adminPinInput = document.getElementById('adminPinInput');
  const confirmAdminPin = document.getElementById('confirmAdminPin');
  const cancelAdminPin = document.getElementById('cancelAdminPin');

  if (!adminButton || !adminModal || !adminPinInput || !confirmAdminPin || !cancelAdminPin) return;

  const openAdminModal = () => {
    adminModal.classList.remove('hidden');
    adminModal.setAttribute('aria-hidden', 'false');
    adminPinInput.value = '';
    setTimeout(() => adminPinInput.focus(), 50);
  };

  const closeAdminModal = () => {
    adminModal.classList.add('hidden');
    adminModal.setAttribute('aria-hidden', 'true');
    adminPinInput.value = '';
  };

  const handleAdminAccess = async () => {
    const enteredPin = adminPinInput.value.trim();

    if (!enteredPin) {
      alert('Please enter the admin PIN.');
      adminPinInput.focus();
      return;
    }

    try {
      const response = await fetch('/api/admin-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin: enteredPin })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        alert(data.message || 'Incorrect PIN. Access denied.');
        adminPinInput.focus();
        return;
      }

      localStorage.setItem('vestige-admin-auth', 'true');
      closeAdminModal();
      window.location.href = './admin.html';
    } catch (error) {
      console.error('Admin PIN check failed:', error);
      alert('Unable to verify the admin PIN right now. Please try again.');
    }
  };

  adminButton.addEventListener('click', openAdminModal);
  confirmAdminPin.addEventListener('click', handleAdminAccess);
  cancelAdminPin.addEventListener('click', closeAdminModal);
  adminPinInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleAdminAccess();
    }
  });
  adminModal.addEventListener('click', (event) => {
    if (event.target === adminModal) {
      closeAdminModal();
    }
  });
}

function populateStudentDatalist() {
  const select = document.getElementById('studentSearchInput');

  if (!select) return;

  const options = initialStudents
    .map((studentName) => `<option value="${studentName}">${studentName}</option>`)
    .join('');

  select.innerHTML = `<option value="">Select student name...</option>${options}`;
}

function bindGuestLogin() {
  const guestButton = document.getElementById('viewStudentBtn');
  const select = document.getElementById('studentSearchInput');
  const passwordInput = document.getElementById('passwordInput');

  if (!guestButton || !select || !passwordInput) return;

  guestButton.addEventListener('click', () => {
    const selectedName = select.value.trim();
    const enteredPassword = passwordInput.value.trim();

    if (!selectedName) {
      alert('Please select a student name first.');
      select.focus();
      return;
    }

    if (!initialStudents.includes(selectedName)) {
      alert('Please choose a valid student name from the list.');
      select.focus();
      return;
    }

    if (enteredPassword !== 'demopass') {
      alert('Incorrect password. Please use the demo password: demopass');
      passwordInput.focus();
      return;
    }

    localStorage.setItem('combined-maths-state', JSON.stringify({ selectedStudent: selectedName }));
    window.location.href = './student.html';
  });
}

populateStudentDatalist();
bindGuestLogin();
bindAdminPortalAccess();

// Render Week/Paper Marksheet section with class average, total students, highest mark & rank highlights
function renderPaperSection(studentName) {
  const container = document.getElementById('paperContent');
  const paperNumber = state.currentPaperNumber;
  const rankings = calculateRankings(paperNumber);
  const paperRecords = getMarksForPaper(paperNumber);

  // Statistics calculations
  const totalStudents = paperRecords.length;
  const totalScore = paperRecords.reduce((sum, r) => sum + r.score, 0);
  const averageScore = totalStudents ? (totalScore / totalStudents).toFixed(1) : '0.0';
  const highestMark = totalStudents ? Math.max(...paperRecords.map(r => r.score)) : 0;

  // Render whole class marksheet table rows
  const tableRows = rankings.map((entry) => {
    let rankClass = '';
    let badgeText = entry.rank;

    if (entry.rank === 1) {
      rankClass = 'rank-1'; // Green highlight
      badgeText = '🥇 1st';
    } else if (entry.rank === 2) {
      rankClass = 'rank-2'; // Yellow highlight
      badgeText = '🥈 2nd';
    } else if (entry.rank === 3) {
      rankClass = 'rank-3'; // Yellow highlight
      badgeText = '🥉 3rd';
    }

    const isCurrentStudent = entry.studentName.toLowerCase() === studentName.toLowerCase();

    return `
      <tr class="${rankClass} ${isCurrentStudent ? 'logged-in-student' : ''}">
        <td><strong>${badgeText}</strong></td>
        <td><strong>${entry.studentName}</strong> ${isCurrentStudent ? '<span class="you-tag">You</span>' : ''}</td>
        <td><strong>${entry.total}</strong></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <!-- WEEK / PAPER SUMMARY METRICS -->
    <div class="metric-grid">
      <div class="metric-card-box">
        <h4>Class Average</h4>
        <p style="color: #4cd137;">${averageScore}</p>
      </div>
      <div class="metric-card-box">
        <h4>Total Students</h4>
        <p style="color: #3598db;">${totalStudents}</p>
      </div>
      <div class="metric-card-box">
        <h4>Highest Mark</h4>
        <p style="color: #f1c40f;">${highestMark}</p>
      </div>
    </div>

    <!-- WHOLE CLASS MARKSHEET -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student Name</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.length ? tableRows : '<tr><td colspan="3" style="text-align: center;">No marks recorded for this paper.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// Exact Canvas Graph logic from original app.js
function getChartData(studentName, mode) {
  const studentMarks = getStudentMarks(studentName).sort((a, b) => a.paperNumber - b.paperNumber);
  const papers = [...new Set(studentMarks.map((item) => item.paperNumber))].sort((a, b) => a - b);

  if (mode === 'pure') {
    return papers.map((paperNumber) => {
      const item = studentMarks.find((entry) => entry.paperNumber === paperNumber && entry.paperType === 'Pure');
      return { label: `Paper ${paperNumber}`, value: item ? item.score : null };
    }).filter((item) => item.value !== null);
  }

  if (mode === 'applied') {
    return papers.map((paperNumber) => {
      const item = studentMarks.find((entry) => entry.paperNumber === paperNumber && entry.paperType === 'Applied');
      return { label: `Paper ${paperNumber}`, value: item ? item.score : null };
    }).filter((item) => item.value !== null);
  }

  if (mode === 'total') {
    const pairs = [];
    for (let i = 0; i < papers.length; i += 2) {
      const first = papers[i];
      const second = papers[i + 1];
      const firstValue = studentMarks.find((entry) => entry.paperNumber === first)?.score || 0;
      const secondValue = second ? studentMarks.find((entry) => entry.paperNumber === second)?.score || 0 : 0;
      pairs.push({ label: `Pair ${Math.floor(i / 2) + 1}`, value: second ? (firstValue + secondValue) / 2 : firstValue });
    }
    return pairs;
  }

  return studentMarks.map((entry) => ({ label: `P${entry.paperNumber}`, value: entry.score }));
}

function renderProgressSection(studentName) {
  const container = document.getElementById('progressContent');
  const filterRow = document.getElementById('chartFilters');
  const modes = [
    { mode: 'default', label: 'Default', className: 'blue', color: '#3a6fd8' },
    { mode: 'pure', label: 'Pure', className: 'red', color: '#d9484a' },
    { mode: 'applied', label: 'Applied', className: 'yellow', color: '#e3b22c' },
    { mode: 'total', label: 'Total', className: 'green', color: '#2e9d5b' }
  ];
  filterRow.innerHTML = modes.map((item) => `
    <button class="filter-btn ${item.className} ${state.chartMode === item.mode ? 'active' : ''}" data-mode="${item.mode}">
      ${item.label}
    </button>
  `).join('');

  filterRow.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.chartMode = button.dataset.mode;
      renderProgressSection(studentName);
    });
  });

  const data = getChartData(studentName, state.chartMode);
  const modeColor = modes.find((m) => m.mode === state.chartMode)?.color || '#3a6fd8';
  container.innerHTML = `
    <div class="chart-card">
      <canvas id="progressChart"></canvas>
    </div>
  `;
  renderChart(data, modeColor);
}

function renderChart(data, dotColor = '#3a6fd8') {
  const canvas = document.getElementById('progressChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 260;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = 36;
  const maxValue = Math.max(...data.map((item) => item.value), 100);
  const minValue = Math.min(...data.map((item) => item.value), 0);
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  // Draw Axis
  ctx.strokeStyle = '#d2a93c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();

  // Draw Y-axis ticks and labels
  ctx.fillStyle = '#fdfdfd';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const value = minValue + (maxValue - minValue) * (i / ySteps);
    const y = height - padding - (i / ySteps) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding - 5, y);
    ctx.lineTo(padding, y);
    ctx.strokeStyle = '#d2a93c';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(Math.round(value).toString(), padding - 10, y);
  }

  // Draw line
  ctx.strokeStyle = '#fdfdfd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((point.value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw points and values
  data.forEach((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((point.value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.fillStyle = '#fdfdfd';
    ctx.font = '12px sans-serif';
    ctx.fillText(point.label, x - 18, height - 10);
    ctx.fillText(String(point.value), x - 10, y - 10);
  });
}