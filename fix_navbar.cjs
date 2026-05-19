const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const sIdx = code.indexOf('{/* Layout with Sidebar */}');
const mIdx = code.indexOf('<main className="min-h-full p-6 lg:p-10 pb-20">');

if (sIdx > -1 && mIdx > -1) {
    const endHeaderSearch = code.indexOf('<div className="relative hidden md:block w-64 lg:w-80">', sIdx);
    const endRightSearch = code.lastIndexOf('</div>\n            </div>\n          </header>');

    console.log(endHeaderSearch, endRightSearch)

    const searchToolsContent = code.substring(endHeaderSearch, endRightSearch).trim();

	const topnavLayout = `      {/* Top Navbar Component */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10 transition-all duration-300 w-full overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
        <nav className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-40 transition-colors shadow-sm w-full">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
                  <div className="bg-neutral-900 dark:bg-emerald-500 text-emerald-400 dark:text-emerald-950 p-2 rounded-xl rotate-3 hover:rotate-0 transition-transform shadow-lg shadow-neutral-900/10">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
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
                 ${searchToolsContent}
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto w-full relative z-10 custom-scrollbar">
          <main className="min-h-full p-6 lg:p-10 pb-20">`;


    code = code.substring(0, sIdx) + topnavLayout + code.substring(mIdx + '<main className="min-h-full p-6 lg:p-10 pb-20">'.length);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Success");
} else {
    console.log("Didn't find indexes");
}
