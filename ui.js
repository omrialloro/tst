// ui.js
window.UI = {
  brushSize: 32,
  gray: 128,
  showMap: true,
  speedScale: 1.0,
  capFPS: 24,
  maxDisplayW: 900,
};

// Elements
const elBrush = document.getElementById("brushSize");
const elGray = document.getElementById("grayVal");
const elSS = document.getElementById("speedScale");
const elFps = document.getElementById("capFps");
const elMaxW = document.getElementById("maxW");

const bsVal = document.getElementById("bsVal");
const gVal = document.getElementById("gVal");
const ssVal = document.getElementById("ssVal");
const fpsVal = document.getElementById("fpsVal");
const mwVal = document.getElementById("mwVal");

window.UI_EL = {
  stLoop: document.getElementById("stLoop"),
  stFrames: document.getElementById("stFrames"),
  stRes: document.getElementById("stRes"),
  stMap: document.getElementById("stMap"),
  modeText: document.getElementById("modeText"),
  modeDot: document.getElementById("modeDot"),
};

function syncUI() {
  UI.brushSize = parseInt(elBrush.value, 10);
  UI.gray = parseInt(elGray.value, 10);
  UI.speedScale = parseInt(elSS.value, 10) / 100;
  UI.capFPS = parseInt(elFps.value, 10);
  UI.maxDisplayW = parseInt(elMaxW.value, 10);

  bsVal.textContent = UI.brushSize;
  gVal.textContent = UI.gray;
  ssVal.textContent = UI.speedScale.toFixed(2);
  fpsVal.textContent = UI.capFPS;
  mwVal.textContent = UI.maxDisplayW;

  UI_EL.stMap.textContent = UI.showMap ? "ON" : "OFF";
}
[elBrush, elGray, elSS, elFps, elMaxW].forEach((el) =>
  el.addEventListener("input", syncUI),
);
syncUI();

document.getElementById("toggleMapBtn").onclick = () => {
  UI.showMap = !UI.showMap;
  syncUI();
};

let videoURL = null;
document.getElementById("fileInput").addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  if (videoURL) URL.revokeObjectURL(videoURL);
  videoURL = URL.createObjectURL(f);
  window.__loadVideo(videoURL);
});

document.getElementById("playBtn").onclick = () => window.__play?.();
document.getElementById("stopBtn").onclick = () => window.__stop?.();
document.getElementById("clearBtn").onclick = () => window.__clearMap?.();

document.getElementById("tplLR").onclick = () => window.__template?.("LR");
document.getElementById("tplRL").onclick = () => window.__template?.("RL");
document.getElementById("tplCenter").onclick = () =>
  window.__template?.("CENTER");
