const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. the correct part before search tools
const correctPart1End = code.indexOf('<div className="flex items-center gap-4">\n                 <div className="relative hidden md:block w-64 lg:w-80">');
if (correctPart1End === -1) {
    console.log("Could not find correctPart1End");
    process.exit(1);
}
let part1 = code.substring(0, correctPart1End);

// 2. We need the correct ending part (everything after the main opening).
// Inside the duplicated content, let's find the original `<main className="min-h-full p-6 lg:p-10 pb-20">`
const endOfDupStart = code.lastIndexOf('<main className="min-h-full p-6 lg:p-10 pb-20">'); // this should be in the duplicate
if (endOfDupStart === -1) {
    console.log('could not find main start in dup');
    process.exit(1);
}
let part2 = code.substring(endOfDupStart + '<main className="min-h-full p-6 lg:p-10 pb-20">'.length);

const middle = `              <div className="flex items-center gap-4">
                <div className="relative hidden md:block w-64 lg:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    className="w-full bg-neutral-50 dark:bg-neutral-800/50 pl-11 pr-4 py-2.5 rounded-2xl text-xs border border-neutral-100 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 dark:focus:ring-white/5 transition-all shadow-sm text-neutral-900 dark:text-neutral-100 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="w-px h-8 bg-neutral-100 dark:bg-neutral-800 hidden md:block"></div>

                <div className="relative">
                  <button className="relative p-2.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/50 dark:hover:bg-neutral-800 rounded-xl transition-all shadow-sm text-neutral-600 dark:text-neutral-400" onClick={() => alert("Notificações em breve")}>
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-neutral-900"></span>
                  </button>
                </div>

                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/50 dark:hover:bg-neutral-800 rounded-xl transition-all shadow-sm text-neutral-600 dark:text-neutral-400"
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-tight">Admin JRS</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight flex items-center justify-end gap-1"><CheckCircle2 size={10} className="text-emerald-500"/> SMAF</p>
                  </div>
                  <div className="w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center font-black text-sm shadow-sm cursor-pointer hover:rotate-3 transition-transform">
                    AJ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto w-full relative z-10 custom-scrollbar">
          <main className="min-h-full p-6 lg:p-10 pb-20">`;


fs.writeFileSync('src/App.tsx', part1 + middle + part2);
console.log("Reconstructed App.tsx successfully");
