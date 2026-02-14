// vault.ts — single source of truth for all vault content
// edit items here, they render as cards in the vault app

export interface VaultItem {
  id: string;
  title: string;
  icon: string;
  desc: string;
  url?: string;
  items?: { name: string; desc?: string; url?: string }[];
}

export const vaultData: VaultItem[] = [
  {
    id: "resume",
    title: "Resume",
    icon: '<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
    desc: "My resume in PDF format",
    url: "https://pietrouni.com/vault/PietroUni_Resume_2026.pdf",
  },
  {
    id: "techstack",
    title: "Tech Stack",
    icon: '<svg class="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
    desc: "AWS, Terraform, Networking, DevOps tools & skills",
    items: [
      { name: "Compute: EC2, Auto Scaling, ELB/ALB" },
      { name: "Networking: VPC, Route53, CloudFront, Direct Connect" },
      { name: "Storage: S3, EBS, EFS" },
      { name: "Security: IAM, ACM, Security Groups, NACLs" },
      { name: "Monitoring: CloudWatch, CloudTrail, Config" },
      { name: "Databases: RDS, DynamoDB" },
      { name: "IaC: Terraform, CloudFormation" },
      { name: "CI/CD: GitHub Actions, Jenkins" },
      { name: "Scripting: Python, Bash, PowerShell" },
      { name: "Version Control: Git, GitHub" },
      { name: "Protocols: TCP/IP, BGP, OSPF, EIGRP, STP" },
      { name: "Certs: CCNA, CCNP (ENARSI)" },
      { name: "Platforms: Cisco Catalyst, DNA Center" },
      { name: "Concepts: VPN, Routing, Switching, Network Security" },
      { name: "Containers: Docker, Kubernetes" },
      { name: "Config Mgmt: Ansible" },
      { name: "Monitoring: Splunk, Nagios, Prometheus, Grafana" },
      { name: "OS: Linux (Ubuntu, CentOS), Windows Server" },
    ],
  },
  {
    id: "food",
    title: "Food",
    icon: '<svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z"></path></svg>',
    desc: "My favorite spots and recipes",
    items: [
      { name: "Kibuka", desc: "My absolute favorite Japanese restaurant in Barcelona — sushi & sashimi", url: "https://maps.app.goo.gl/oF299DEe28c4H1QZ9" },
      { name: "Don Kilo", desc: "Great Italian restaurant in Barcelona — pasta & pizza", url: "https://maps.app.goo.gl/zQnKCvT9UB6gXWZB9" },
    ],
  },
  {
    id: "books",
    title: "Books",
    icon: '<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>',
    desc: "Books that shaped my thinking",
    items: [
      { name: "Steve Jobs", desc: "The inspiring life of Apple's visionary co-founder", url: "https://www.goodreads.com/book/show/11084145-steve-jobs" },
      { name: "The Difference Engine", desc: "Steampunk alt-history where Babbage's computer changed everything", url: "https://www.goodreads.com/book/show/9732196-the-difference-engine" },
      { name: "The Phoenix Project", desc: "A novel about IT, DevOps, and helping your business win", url: "https://www.goodreads.com/book/show/17255186-the-phoenix-project" },
      { name: "The Pragmatic Programmer", desc: "Timeless advice on software craftsmanship and career growth", url: "https://www.goodreads.com/book/show/4099.The_Pragmatic_Programmer" },
      { name: "Designing Data-Intensive Applications", desc: "The big ideas behind reliable, scalable systems", url: "https://www.goodreads.com/book/show/23463279-designing-data-intensive-applications" },
      { name: "A Profound Waste of Time", desc: "A magazine that celebrates games as an art form", url: "https://apwot.com/" },
      { name: "Every Man for Himself and God Against All", desc: "Werner Herzog's wild memoir of filmmaking and life", url: "https://www.goodreads.com/book/show/78292253-every-man-for-himself-and-god-against-all" },
      { name: "Maus", desc: "A Pulitzer-winning graphic novel about the Holocaust", url: "https://www.goodreads.com/book/show/15195.The_Complete_Maus" },
      { name: "Site Reliability Engineering", desc: "Google's free guide to running production systems at scale", url: "https://sre.google/sre-book/table-of-contents/" },
      { name: "The DevOps Handbook", desc: "Practical guide to world-class DevOps practices", url: "https://itrevolution.com/product/the-devops-handbook/" },
      { name: "A Song of Ice and Fire", desc: "George R.R. Martin's unfinished epic fantasy saga", url: "https://www.goodreads.com/series/43790-a-song-of-ice-and-fire" },
    ],
  },
  {
    id: "games",
    title: "Games",
    icon: '<svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"></path></svg>',
    desc: "Games I love",
    items: [
      { name: "Baldur's Gate 3" },
      { name: "Half-Life 2" },
      { name: "Half-Life Alyx" },
      { name: "Fallout: New Vegas" },
      { name: "Red Dead Redemption 2" },
      { name: "The Witcher 3: Wild Hunt" },
      { name: "The Elder Scrolls V: Skyrim" },
      { name: "Cyberpunk 2077" },
      { name: "Dragon Age: Origins" },
      { name: "Star Wars Knights of the Old Republic" },
      { name: "Portal 1 & 2" },
      { name: "The Last of Us Part I & II" },
      { name: "Disco Elysium" },
      { name: "Mass Effect Trilogy" },
      { name: "Halo series" },
      { name: "Team Fortress 2" },
      { name: "Crusader Kings 3" },
      { name: "Cities: Skylines" },
      { name: "The Sims 4" },
      { name: "The Legend of Zelda: Breath of the Wild" },
      { name: "Persona 5 Royal" },
      { name: "Stardew Valley" },
      { name: "Dishonored" },
    ],
  },
  {
    id: "apps",
    title: "Apps",
    icon: '<svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>',
    desc: "Apps and tools I swear by",
    items: [
      { name: "File Pilot", desc: "Windows explorer replacement, laser focused on performance", url: "https://filepilot.tech" },
      { name: "Notepad++", desc: "A text editor", url: "https://notepad-plus-plus.org" },
      { name: "Obsidian", desc: "A markdown editor", url: "https://obsidian.md" },
      { name: "Windirstat", desc: "A disk usage analyzer", url: "https://windirstat.info" },
      { name: "Auto Dark Mode", desc: "A dark mode toggle for Windows", url: "https://github.com/AutoDarkMode/Windows-Auto-Night-Mode" },
      { name: "Hwinfo64", desc: "A hardware information tool", url: "https://www.hwinfo.com" },
      { name: "Termius", desc: "Modern SSH client", url: "https://termius.com" },
      { name: "Windhawk", desc: "A Windows customizer", url: "https://windhawk.net" },
      { name: "Everything", desc: "A fast file search tool", url: "https://www.voidtools.com" },
    ],
  },
];
