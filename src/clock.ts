// Menubar clock with flip-digit animation
let prevClockText = '';

function updateClock(): void {
  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = days[now.getDay()];
  const month = months[now.getMonth()];
  const date = now.getDate();
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const text = `${day} ${month} ${date} ${time}`;
  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  if (!prevClockText || prevClockText.length !== text.length) {
    clockEl.innerHTML = '';
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'clock-char';
      span.textContent = ch;
      span.dataset.char = ch;
      clockEl.appendChild(span);
    }
    prevClockText = text;
    return;
  }

  const spans = clockEl.querySelectorAll('.clock-char');
  for (let i = 0; i < text.length; i++) {
    if (prevClockText[i] !== text[i] && spans[i]) {
      const span = spans[i] as HTMLElement;
      span.classList.add('clock-char-flip');
      span.textContent = text[i];
      span.dataset.char = text[i];
      setTimeout(() => span.classList.remove('clock-char-flip'), 400);
    }
  }
  prevClockText = text;
}

export function initClock(): void {
  setInterval(updateClock, 1000);
  updateClock();
}
