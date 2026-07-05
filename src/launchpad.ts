// Launchpad — full-screen app grid with search filter
const launchpadApps = [
  { id: "about", title: "README.md", icon: "📄", color: "bg-blue-500" },
  { id: "projects", title: "Projects", icon: "📁", color: "bg-purple-500" },
  { id: "vault", title: "Vault", icon: "🔒", color: "bg-amber-500" },
  { id: "terminal", title: "Terminal", icon: "💻", color: "bg-gray-700" },
  { id: "finder", title: "Finder", icon: "📂", color: "bg-blue-400" },
  { id: "monitor", title: "Monitoring", icon: "📊", color: "bg-teal-500" },
  { id: "settings", title: "Settings", icon: "⚙️", color: "bg-gray-500" },
  { id: "sysinfo", title: "About", icon: "ℹ️", color: "bg-rose-500" },
  { id: "experiments", title: "Lab", icon: "🧪", color: "bg-lime-500" },
];

export function filterLaunchpad(query: string): void {
  const grid = document.getElementById("launchpad-grid");
  if (!grid) return;

  const term = query.toLowerCase();
  const filtered = launchpadApps.filter(app =>
    app.title.toLowerCase().includes(term) || app.id.includes(term)
  );

  grid.innerHTML = "";

  filtered.forEach((app, idx) => {
    const item = document.createElement("div");
    item.className = "launchpad-item flex flex-col items-center gap-2 cursor-pointer group";
    item.style.animationDelay = `${idx * 30}ms`;
    item.innerHTML = `
      <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl ${app.color} flex items-center justify-center text-2xl md:text-3xl shadow-lg group-hover:scale-110 transition-transform">
        ${app.icon}
      </div>
      <span class="text-white text-xs text-center truncate w-full opacity-80 group-hover:opacity-100">${app.title}</span>
    `;

    item.onclick = () => {
      window.closeWindow("launchpad");
      setTimeout(() => window.restoreWindow(app.id), 100);
    };

    grid.appendChild(item);
  });
}

export function initLaunchpadModule(): void {
  window.initLaunchpad = () => filterLaunchpad("");
  window.filterLaunchpad = filterLaunchpad;
}
