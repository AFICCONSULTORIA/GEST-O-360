const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Find the first main start
const mainIdx = code.indexOf('<main className="min-h-full p-6 lg:p-10 pb-20">');
if (mainIdx === -1) {
  console.log("Could not find main start");
  process.exit(1);
}

// Find where the dump starts
const dumpStart = code.lastIndexOf("import React from 'react';");
if (dumpStart === -1) {
  console.log("Could not find dump");
  process.exit(1);
}

// We just need to reconstruct the original code from:
// 1. the correct part1 (lines 1 up to `{/* Top Navbar Component */}` or similar)
let part1Idx = code.indexOf('{/* Top Navbar Component */}');
if (part1Idx === -1) {
    part1Idx = code.indexOf('{/* Layout with Sidebar */}');
}

let part1 = code.substring(0, part1Idx);

// 2. The new navbar layout I want
const middle = `      {/* Top Navbar Component */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10 transition-all duration-300 w-full overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
        <nav className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-40 transition-colors shadow-sm w-full">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
                  <div className="bg-neutral-900 dark:bg-emerald-500 text-emerald-400 dark:text-emerald-950 p-2 rounded-xl rotate-3 hover:rotate-0 transition-transform shadow-lg shadow-neutral-900/10">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight leading-none italic dark:text-white">Gestão <span className="text-neutral-400 font-normal">360</span></h1>
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-2">
                  {NAVBAR_CATEGORIES.map((category) => {
                    const isActiveCategory = category.items.some(i => i.id === activeView);
                    
                    return (
                      <div key={category.id} className="relative">
                        <button
                          onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                          className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors \${
                            isActiveCategory 
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white'
                          }\`}
                        >
                          <category.icon size={16} />
                          {category.label}
                          <ChevronRight size={14} className={\`transition-transform duration-200 \${expandedCategory === category.id ? 'rotate-90' : ''}\`} />
                        </button>

                        <AnimatePresence>
                        {expandedCategory === category.id && (
                          <>
                          <div className="fixed inset-0 z-30" onClick={() => setExpandedCategory(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 mt-2 w-56 z-40"
                          >
                            <div className="pt-2">
                              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-xl overflow-hidden relative z-40 p-2">
                                {category.items.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => {
                                      setActiveView(item.id as View);
                                      setExpandedCategory(null);
                                    }}
                                    className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all relative \${
                                      activeView === item.id 
                                        ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white' 
                                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                                    }\`}
                                  >
                                    <item.icon size={16} />
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                          </>
                        )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4">
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


// 3. The part2 is just everything from `<main>` in the ORIGINAL non-duplicated section of the file.
// But wait, `<main>` might only appear inside the duplicated section?
// Let's find `<main>` that comes AFTER the duplicated section.
const part3Start = code.lastIndexOf('<div className="max-w-[1400px] mx-auto w-full">');
let part3 = code.substring(part3Start);

fs.writeFileSync('src/App.tsx', part1 + middle + '\\n          ' + part3);
console.log("Fixed!");
