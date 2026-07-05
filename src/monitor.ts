// System monitor app — canvas graph + tabs + simulated KPIs/logs
import { monitorInterval, setMonitorInterval } from "./state";

export function switchMonitorTab(tab: string): void {
  const infra = document.getElementById("mon-view-infra");
  const cf = document.getElementById("mon-view-cloudfront");
  const bill = document.getElementById("mon-view-billing");
  if (infra) infra.style.display = "none";
  if (cf) cf.style.display = "none";
  if (bill) bill.style.display = "none";

  if (tab === "infra" && infra) infra.style.display = "block";
  else if (tab === "cf" && cf) cf.style.display = "block";
  else if (tab === "bill" && bill) bill.style.display = "flex";

  ["infra", "cf", "bill"].forEach((t) => {
    const el = document.getElementById(`tab-${t}`);
    if (!el) return;
    if (t === tab) {
      el.classList.add("border-her-red", "text-her-red", "bg-white/50", "dark:bg-black/20");
      el.classList.remove("border-transparent", "opacity-60");
    } else {
      el.classList.remove("border-her-red", "text-her-red", "bg-white/50", "dark:bg-black/20");
      el.classList.add("border-transparent", "opacity-60");
    }
  });
}

export function startMonitor(): void {
  if (monitorInterval) clearInterval(monitorInterval);

  const canvas = document.getElementById("monitor-canvas") as HTMLCanvasElement | null;
  const ctx = canvas?.getContext("2d") ?? null;
  const dataPoints = new Array(50).fill(20);
  const errorPoints = new Array(50).fill(5);

  const kpiReq = document.getElementById("kpi-req");
  const logContainer = document.getElementById("sys-log");

  const logs = [
    "[INFO] Auto-scaling group: +1 instance",
    "[INFO] Route53 health check: Healthy",
    "[WARN] High latency detected in ap-south-1",
    "[INFO] S3 Lifecycle rule executed",
    "[INFO] CloudFront cache refresh",
  ];

  setMonitorInterval(setInterval(() => {
    dataPoints.shift();
    errorPoints.shift();
    const base = 40 + Math.random() * 30;
    dataPoints.push(base);
    errorPoints.push(Math.max(0, 5 + (Math.random() * 10 - 5)));

    if (canvas && ctx && canvas.offsetParent !== null) {
      if (canvas.width !== canvas.clientWidth) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Filled area under main line
      ctx.beginPath();
      ctx.moveTo(0, h);
      dataPoints.forEach((p, i) => {
        const x = (i / (dataPoints.length - 1)) * w;
        const y = h - (p / 100) * h;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(w, h);
      ctx.fillStyle = "rgba(74, 124, 157, 0.2)";
      ctx.fill();

      // Main line stroke
      ctx.beginPath();
      dataPoints.forEach((p, i) => {
        const x = (i / (dataPoints.length - 1)) * w;
        const y = h - (p / 100) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#4A7C9D";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dashed error-rate stroke
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      errorPoints.forEach((p, i) => {
        const x = (i / (errorPoints.length - 1)) * w;
        const y = h - (p / 100) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#4A7C9D";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (kpiReq && Math.random() > 0.7)
      kpiReq.innerText = (2.4 + Math.random() * 0.2).toFixed(1) + "k";
    if (logContainer && Math.random() > 0.9) {
      const log = logs[Math.floor(Math.random() * logs.length)];
      const div = document.createElement("div");
      div.innerText = log;
      logContainer.prepend(div);
      if (logContainer.children.length > 5)
        logContainer.lastChild?.remove();
    }
  }, 1000));
}

export function initMonitor(): void {
  window.switchMonitorTab = switchMonitorTab;
}
