const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const sIdx = code.indexOf('{/* Top Navbar Component rendered inline for simplicity */}');
const mIdx = code.indexOf('<main className="flex-1 w-full mt-4 p-4 lg:p-8">');

if (sIdx > -1 && mIdx > -1) {
    const endNav = code.lastIndexOf('</nav>', mIdx);
    
    // Extract right side utilities (Search, Dark Mode, Profile etc)
    const rightSearch = code.indexOf('<div className="relative hidden md:block w-64 lg:w-80">', sIdx);
    const endRightSearch = code.lastIndexOf('</div>\n              </div>\n            </div>', mIdx);

    const extractedHeaderContent = code.substring(rightSearch, endRightSearch);
    
    // Create new Layout
    const newLayout = `      {/* Layout with Sidebar */}
      <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 transition-colors w-full font-sans">
        
        {/* Sidebar Navigation */}
        <aside className="w-72 bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800 flex flex-col transition-colors z-40 shadow-sm relative shrink-0">
          <div className="h-20 flex items-center px-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
              <div className="bg-neutral-900 dark:bg-emerald-500 text-emerald-400 dark:text-emerald-950 p-2.5 rounded-xl rotate-3 hover:rotate-0 transition-transform shadow-lg shadow-neutral-900/10">
                <ShieldAlert size={22} />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {NAVBAR_CATEGORIES.map((category) => {
              const isActiveCategory = category.items.some(i => i.id === activeView);
              // Either it's manually expanded, OR it has the active item inside.
              const isExpanded = expandedCategory === category.id || isActiveCategory;
              
              return (
                <div key={category.id} className="space-y-1">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className={\`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 \${
                      isActiveCategory 
                        ? 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white font-black shadow-sm border border-neutral-100 dark:border-neutral-800' 
                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:hover:text-white'
                    }\`}
                  >
                    <div className="flex items-center gap-3">
                      <category.icon size={18} className={isActiveCategory ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'} />
                      <span className="text-[13px] tracking-wide uppercase">{category.label}</span>
                    </div>
                    <ChevronRight size={14} className={\`transition-transform duration-300 ease-out \${isExpanded ? 'rotate-90 text-neutral-900 dark:text-white' : 'text-neutral-300 dark:text-neutral-600'}\`} />
                  </button>
                  
                  {/* Category Items Accordion */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="pl-12 pr-2 py-2 space-y-1 relative">
                          <div className="absolute left-6 top-0 bottom-4 w-px bg-neutral-100 dark:bg-neutral-800" />
                          {category.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveView(item.id as View);
                              }}
                              className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all relative \${
                                activeView === item.id 
                                  ? 'text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-800/50' 
                                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30'
                              }\`}
                            >
                              {activeView === item.id && (
                                <motion.div 
                                  layoutId="active-indicator" 
                                  className="absolute -left-6 w-1 h-5 bg-neutral-900 dark:bg-white rounded-r-full" 
                                />
                              )}
                              <item.icon size={14} />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
          
          <header className="h-20 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between shrink-0 transition-colors">
            {/* Header Right Tools */}
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              ${extractedHeaderContent}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto w-full relative z-10 custom-scrollbar">
            <main className="min-h-full p-6 lg:p-10 pb-20">`;

    code = code.substring(0, sIdx) + newLayout + code.substring(mIdx + '<main className="flex-1 w-full mt-4 p-4 lg:p-8">'.length);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Success");
} else {
    console.log("Didn't find indexes");
}
