/*
 * MathCheck AI - 초기 프런트엔드 시제품
 * 이 파일은 필기 입력, 브라우저 임시 저장, 제출 목록을 담당합니다.
 * 실제 AI 채점과 여러 기기 간 데이터 공유는 다음 개발 단계에서 연결합니다.
 */

const DRAFT_STORAGE_KEY = "mathcheck_draft_v1";
const SUBMISSION_STORAGE_KEY = "mathcheck_submissions_v1";

const canvases = Array.from(document.querySelectorAll(".writing-canvas"));
const studentIdInput = document.getElementById("studentId");
const studentMessage = document.getElementById("studentMessage");

let activeTool = "pen";
let strokes = { "1": [], "2": [], "3": [] };
let activeStroke = { "1": null, "2": null, "3": null };

// ---------- 화면 전환 ----------
document.getElementById("studentTab").addEventListener("click", () => switchView("student"));
document.getElementById("teacherTab").addEventListener("click", () => switchView("teacher"));

function switchView(viewName) {
  const isStudent = viewName === "student";
  document.getElementById("studentView").classList.toggle("hidden", !isStudent);
  document.getElementById("teacherView").classList.toggle("hidden", isStudent);
  document.getElementById("studentTab").classList.toggle("active", isStudent);
  document.getElementById("teacherTab").classList.toggle("active", !isStudent);

  if (!isStudent) renderSubmissionList();
}

// ---------- 필기 도구 ----------
document.getElementById("penButton").addEventListener("click", () => setTool("pen"));
document.getElementById("eraserButton").addEventListener("click", () => setTool("eraser"));
document.getElementById("undoButton").addEventListener("click", undoLastStroke);
document.getElementById("clearButton").addEventListener("click", clearAllStrokes);
document.getElementById("submitButton").addEventListener("click", submitWork);

function setTool(toolName) {
  activeTool = toolName;
  document.getElementById("penButton").classList.toggle("active", toolName === "pen");
  document.getElementById("eraserButton").classList.toggle("active", toolName === "eraser");
}

// 캔버스 크기에 상관없이 저장할 수 있도록 좌표를 0~1 범위로 정규화합니다.
function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
    pressure: event.pressure || 0.5
  };
}

function drawStroke(context, stroke, width, height) {
  if (!stroke.points || stroke.points.length === 0) return;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : "#172554";
  context.lineWidth = stroke.tool === "eraser" ? 20 : 2.5;
  context.beginPath();

  const first = stroke.points[0];
  context.moveTo(first.x * width, first.y * height);

  for (let index = 1; index < stroke.points.length; index += 1) {
    const point = stroke.points[index];
    context.lineTo(point.x * width, point.y * height);
  }

  // 탭 한 번으로 찍은 점도 보이도록 아주 짧은 선을 만듭니다.
  if (stroke.points.length === 1) {
    context.lineTo(first.x * width + 0.1, first.y * height + 0.1);
  }

  context.stroke();
  context.restore();
}

function redrawCanvas(canvas) {
  const questionId = canvas.dataset.question;
  const context = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(pixelRatio, pixelRatio);

  strokes[questionId].forEach((stroke) => {
    drawStroke(context, stroke, cssWidth, cssHeight);
  });

  context.restore();
}

function resizeCanvas(canvas) {
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  const oldImage = document.createElement("canvas");
  oldImage.width = oldWidth;
  oldImage.height = oldHeight;

  if (oldWidth > 0 && oldHeight > 0) {
    oldImage.getContext("2d").drawImage(canvas, 0, 0);
  }

  const pixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * pixelRatio);
  canvas.height = Math.round(rect.height * pixelRatio);

  // 정규화된 획 데이터를 다시 그리므로 화면 크기가 바뀌어도 필기가 유지됩니다.
  redrawCanvas(canvas);
}

function attachPenEvents(canvas) {
  const questionId = canvas.dataset.question;

  canvas.addEventListener("pointerdown", (event) => {
    // 손가락과 마우스는 필기 입력으로 사용하지 않고 펜 입력만 허용합니다.
    if (event.pointerType !== "pen") {
      studentMessage.textContent = "S펜으로 필기해 주세요. 손가락 입력은 현재 비활성화되어 있습니다.";
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const stroke = {
      tool: activeTool,
      points: [getCanvasPoint(event, canvas)]
    };

    strokes[questionId].push(stroke);
    activeStroke[questionId] = stroke;
    redrawCanvas(canvas);
  });

  canvas.addEventListener("pointermove", (event) => {
    const stroke = activeStroke[questionId];
    if (!stroke || event.pointerType !== "pen") return;

    event.preventDefault();
    stroke.points.push(getCanvasPoint(event, canvas));
    redrawCanvas(canvas);
  });

  const finishStroke = () => {
    if (activeStroke[questionId]) {
      activeStroke[questionId] = null;
      saveDraft();
    }
  };

  canvas.addEventListener("pointerup", finishStroke);
  canvas.addEventListener("pointercancel", finishStroke);
}

function undoLastStroke() {
  // 마지막으로 작성된 획 하나를 취소합니다.
  for (const questionId of ["3", "2", "1"]) {
    if (strokes[questionId].length > 0) {
      strokes[questionId].pop();
      const canvas = canvases.find((item) => item.dataset.question === questionId);
      redrawCanvas(canvas);
      saveDraft();
      return;
    }
  }
}

function clearAllStrokes() {
  if (!window.confirm("모든 문제의 풀이를 지울까요?")) return;

  strokes = { "1": [], "2": [], "3": [] };
  canvases.forEach(redrawCanvas);
  saveDraft();
}

// ---------- 브라우저 저장 ----------
function saveDraft() {
  const draft = {
    studentId: studentIdInput.value.trim(),
    strokes
  };

  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    document.getElementById("saveStatus").textContent = "작성 내용이 이 브라우저에 저장되었습니다.";
  } catch (error) {
    document.getElementById("saveStatus").textContent = "저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.";
    console.error("임시 저장 오류:", error);
  }
}

function loadDraft() {
  try {
    const savedDraft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "null");
    if (!savedDraft) return;

    if (savedDraft.studentId) studentIdInput.value = savedDraft.studentId;
    if (savedDraft.strokes) {
      for (const questionId of ["1", "2", "3"]) {
        strokes[questionId] = savedDraft.strokes[questionId] || [];
      }
    }
  } catch (error) {
    console.error("저장된 풀이를 불러오지 못했습니다:", error);
  }
}

// ---------- 제출 ----------
function submitWork() {
  const studentId = studentIdInput.value.trim();

  if (!studentId) {
    window.alert("학번을 입력해 주세요.");
    return;
  }

  const hasAnyWriting = Object.values(strokes).some((questionStrokes) => questionStrokes.length > 0);
  if (!hasAnyWriting) {
    window.alert("먼저 풀이를 작성해 주세요.");
    return;
  }

  const submission = {
    submissionId: createSubmissionId(),
    studentId,
    submittedAt: new Date().toISOString(),
    status: "AI 평가 대기",
    strokes: JSON.parse(JSON.stringify(strokes))
  };

  const submissions = getSubmissions();
  submissions.unshift(submission);

  try {
    localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(submissions));
    studentMessage.textContent = "제출되었습니다. 현재 시제품은 이 기기의 브라우저에만 기록을 저장합니다.";
    renderSubmissionList();
  } catch (error) {
    window.alert("제출 기록 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.");
    console.error("제출 저장 오류:", error);
  }
}

function createSubmissionId() {
  return `SUB-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(SUBMISSION_STORAGE_KEY) || "[]");
  } catch (error) {
    console.error("제출 목록을 읽지 못했습니다:", error);
    return [];
  }
}

// ---------- 교사용 제출 목록 ----------
function renderSubmissionList() {
  const submissions = getSubmissions();
  const countElement = document.getElementById("submissionCount");
  const tableContainer = document.getElementById("submissionTable");

  countElement.textContent = String(submissions.length);

  if (submissions.length === 0) {
    tableContainer.innerHTML = '<p class="muted small">아직 제출된 풀이가 없습니다.</p>';
    return;
  }

  const rows = submissions.map((submission) => {
    const date = new Date(submission.submittedAt).toLocaleString("ko-KR");
    return `
      <tr>
        <td>${escapeHtml(submission.studentId)}</td>
        <td>${escapeHtml(date)}</td>
        <td><span class="status-tag">${escapeHtml(submission.status)}</span></td>
        <td><button type="button" data-submission-id="${escapeHtml(submission.submissionId)}">기록 보기</button></td>
      </tr>
    `;
  }).join("");

  tableContainer.innerHTML = `
    <table>
      <thead><tr><th>학번</th><th>제출 시각</th><th>상태</th><th>제출 내용</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  tableContainer.querySelectorAll("button[data-submission-id]").forEach((button) => {
    button.addEventListener("click", () => showSubmission(button.dataset.submissionId));
  });
}

function showSubmission(submissionId) {
  const submission = getSubmissions().find((item) => item.submissionId === submissionId);
  if (!submission) return;

  const summary = Object.entries(submission.strokes)
    .map(([questionId, questionStrokes]) => `${questionId}번: ${questionStrokes.length}개 필기 획`)
    .join("\n");

  window.alert(
    `학번: ${submission.studentId}\n` +
    `제출 시각: ${new Date(submission.submittedAt).toLocaleString("ko-KR")}\n` +
    `${summary}\n\n` +
    "다음 개발 단계에서 교사가 원본 필기 페이지를 확인하고 AI 평가 결과를 검토하도록 구현합니다."
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return replacements[character];
  });
}

// ---------- 초기화 ----------
studentIdInput.addEventListener("change", saveDraft);
canvases.forEach(attachPenEvents);
loadDraft();

// 캔버스 크기를 먼저 확정한 뒤 저장된 획을 다시 그립니다.
window.addEventListener("load", () => canvases.forEach(resizeCanvas));
window.addEventListener("resize", () => canvases.forEach(resizeCanvas));

renderSubmissionList();
switchView("student");
