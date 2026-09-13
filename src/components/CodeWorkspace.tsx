import { useState, useMemo } from 'react';
import {
  FileCode,
  FileText,
  Copy,
  Check,
  Download,
  Save,
  Play,
  Sparkles,
  RefreshCw,
  Network,
  Cpu,
  Zap,
  Edit3,
  Eye,
  FolderTree,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ActiveFile,
  GeneratedDocs,
  CenterTab,
  RepoArchitectureDoc,
  DeepScanDocs,
} from '../types';
import { formatByteSize, calculateByteSize } from '../utils/tokenCalc';
import { highlightCode, getPrismLanguage } from '../utils/syntaxHighlight';

export type Docs4Tab = 'overview' | 'endpoints' | 'structure' | 'features';

interface CodeWorkspaceProps {
  activeFile: ActiveFile | null;
  onChangeFileContent: (content: string) => void;
  onSaveFile: () => void;
  generatedDocs: GeneratedDocs;
  deepScanDocs?: DeepScanDocs;
  onTriggerDeepScan: () => void;
  onAskGeminiAboutFile: (prompt: string) => void;
  isScanning: boolean;
  activeCenterTab: CenterTab;
  onChangeCenterTab: (tab: CenterTab) => void;
  architectureDoc?: RepoArchitectureDoc | null;
  onOpenFileInEditor?: (filePath: string) => void;
}

export function CodeWorkspace({
  activeFile,
  onChangeFileContent,
  onSaveFile,
  generatedDocs,
  deepScanDocs,
  onTriggerDeepScan,
  onAskGeminiAboutFile,
  isScanning,
  activeCenterTab,
  onChangeCenterTab,
  architectureDoc,
  onOpenFileInEditor,
}: CodeWorkspaceProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [activeDocSubTab, setActiveDocSubTab] = useState<Docs4Tab>('overview');
  const [codeDisplayMode, setCodeDisplayMode] = useState<'syntax' | 'edit'>('syntax');

  const handleCopy = (text: string, isDoc = false) => {
    navigator.clipboard.writeText(text);
    if (isDoc) {
      setCopiedDoc(true);
      setTimeout(() => setCopiedDoc(false), 1500);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    }
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download all 4 comprehensive docs together
  const handleDownloadAll4Docs = () => {
    const files = [
      { name: '1-project-overview.md', content: docContents.overview },
      { name: '2-all-endpoints.md', content: docContents.endpoints },
      { name: '3-codebase-structure-architecture.md', content: docContents.structure },
      { name: '4-features-catalog.md', content: docContents.features },
    ];

    files.forEach((f, idx) => {
      setTimeout(() => {
        handleDownload(f.name, f.content);
      }, idx * 250);
    });
  };

  // Active doc contents for the 4 comprehensive files
  const docContents = useMemo(() => {
    const overview =
      deepScanDocs?.projectOverview ||
      architectureDoc?.projectPurpose ||
      generatedDocs.architecture ||
      '# 📄 Project Overview\nClick **Run Full Project Deep Scan** to analyze why this website was built, target audience, and complete system vision.';

    const endpoints =
      deepScanDocs?.endpoints ||
      architectureDoc?.endpointsMarkdown ||
      generatedDocs.endpoints ||
      '# 🔌 Complete Endpoints Directory\nClick **Run Full Project Deep Scan** to scan and extract all API routes, handlers, and endpoints.';

    const structure =
      deepScanDocs?.structureArchitecture ||
      architectureDoc?.coreArchitecture ||
      '# 🏛️ Codebase Structure & Architecture\nClick **Run Full Project Deep Scan** to extract complete directory hierarchy and architectural designs.';

    const features =
      deepScanDocs?.featuresCatalog ||
      `# ⚡ Features & Capabilities Catalog\nClick **Run Full Project Deep Scan** to generate full feature inventory.`;

    return { overview, endpoints, structure, features };
  }, [deepScanDocs, architectureDoc, generatedDocs]);

  // Current active doc string
  const currentDocContent = useMemo(() => {
    switch (activeDocSubTab) {
      case 'overview':
        return docContents.overview;
      case 'endpoints':
        return docContents.endpoints;
      case 'structure':
        return docContents.structure;
      case 'features':
        return docContents.features;
      default:
        return docContents.overview;
    }
  }, [activeDocSubTab, docContents]);

  const currentDocFileName = useMemo(() => {
    switch (activeDocSubTab) {
      case 'overview':
        return 'project-overview.md';
      case 'endpoints':
        return 'endpoints-directory.md';
      case 'structure':
        return 'structure-architecture.md';
      case 'features':
        return 'features-catalog.md';
    }
  }, [activeDocSubTab]);

  // Syntax highlighted HTML with line numbers
  const highlightedCodeHtml = useMemo(() => {
    if (!activeFile || !activeFile.content) return '';
    return highlightCode(activeFile.content, activeFile.name || activeFile.language);
  }, [activeFile?.content, activeFile?.name, activeFile?.language]);

  const codeLineCount = useMemo(() => {
    if (!activeFile?.content) return 0;
    return activeFile.content.split('\n').length;
  }, [activeFile?.content]);

  return (
    <div
      id="code-center-workspace"
      className="flex-1 flex flex-col min-w-0 bg-slate-950 h-full overflow-hidden border-r border-slate-800/80"
    >
      {/* Top Workspace Tab Bar */}
      <div className="flex items-center justify-between px-3 border-b border-slate-800/80 bg-slate-900/70 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {/* Code Tab */}
          <button
            id="tab-code-editor"
            type="button"
            onClick={() => onChangeCenterTab('code')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeCenterTab === 'code'
                ? 'border-blue-500 text-blue-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{activeFile ? activeFile.name : 'Code Editor'}</span>
            {activeFile?.isModified && (
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" title="Unsaved changes"></span>
            )}
          </button>

          {/* 4 Docs Tab */}
          <button
            id="tab-docs-md"
            type="button"
            onClick={() => onChangeCenterTab('docs')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeCenterTab === 'docs'
                ? 'border-indigo-500 text-indigo-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>AI Project Docs (4 Files)</span>
            {isScanning && (
              <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin ml-1" />
            )}
          </button>

          {/* Live Preview Tab */}
          <button
            id="tab-preview"
            type="button"
            onClick={() => onChangeCenterTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeCenterTab === 'preview'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>

        {/* Right Top Action Bar */}
        <div className="flex items-center gap-2 py-1">
          {activeCenterTab === 'code' && activeFile && (
            <>
              {/* Switcher: Colorful VS Code View vs Edit Mode */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setCodeDisplayMode('syntax')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    codeDisplayMode === 'syntax'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="VS Code / GitHub Colorful Syntax Highlighting"
                >
                  <Eye className="w-3 h-3" />
                  <span>Colorful View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCodeDisplayMode('edit')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    codeDisplayMode === 'edit'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Edit Source Code"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Mode</span>
                </button>
              </div>

              {activeFile.isModified && (
                <button
                  type="button"
                  onClick={onSaveFile}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors shadow-xs cursor-pointer"
                  title="Save local changes"
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopy(activeFile.content)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Copy code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleDownload(activeFile.name, activeFile.content)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {activeCenterTab === 'docs' && (
            <>
              {/* Download All 4 Docs */}
              <button
                type="button"
                onClick={handleDownloadAll4Docs}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition-colors shadow-xs cursor-pointer"
                title="Download all 4 markdown documents"
              >
                <Download className="w-3 h-3 text-indigo-400" />
                <span>Download All 4 Docs</span>
              </button>

              {/* Re-Scan Button */}
              <button
                type="button"
                onClick={onTriggerDeepScan}
                disabled={isScanning}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning Entire Project...' : 'AI Deep Scan'}</span>
              </button>

              {/* Copy Current Doc */}
              <button
                type="button"
                onClick={() => handleCopy(currentDocContent, true)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Copy current document markdown"
              >
                {copiedDoc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Download Current Doc */}
              <button
                type="button"
                onClick={() => handleDownload(currentDocFileName, currentDocContent)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={`Download ${currentDocFileName}`}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* TAB 1: CODE EDITOR & COLORFUL VIEWER */}
        {activeCenterTab === 'code' && (
          <div className="flex-1 flex flex-col min-h-0">
            {activeFile ? (
              <>
                {/* File Sub-header */}
                <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-200 font-medium truncate">{activeFile.path}</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[10px]">
                      {getPrismLanguage(activeFile.name)}
                    </span>
                    <span className="text-slate-400 font-mono">{codeLineCount} lines</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-500">{formatByteSize(calculateByteSize(activeFile.content))}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onAskGeminiAboutFile(`Explain how "${activeFile.name}" works and suggest optimizations`)
                      }
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors text-[11px] font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Explain with AI</span>
                    </button>
                  </div>
                </div>

                {/* VIEW MODE 1: COLORFUL VS CODE / GITHUB SYNTAX HIGHLIGHTING */}
                {codeDisplayMode === 'syntax' && (
                  <div className="flex-1 overflow-auto bg-[#18181b] flex font-mono text-xs leading-relaxed selection:bg-blue-600 selection:text-white">
                    {/* Line numbers gutter */}
                    <div className="select-none py-4 px-3 text-right text-slate-600 bg-[#141416] border-r border-slate-800/60 shrink-0 font-mono text-xs leading-relaxed space-y-0">
                      {Array.from({ length: codeLineCount }, (_, i) => (
                        <div key={i + 1}>{i + 1}</div>
                      ))}
                    </div>

                    {/* Syntax highlighted code tokens */}
                    <div className="flex-1 p-4 overflow-x-auto">
                      <pre className="!bg-transparent !p-0 !m-0">
                        <code
                          className={`language-${getPrismLanguage(activeFile.name)} !bg-transparent`}
                          dangerouslySetInnerHTML={{ __html: highlightedCodeHtml }}
                        />
                      </pre>
                    </div>
                  </div>
                )}

                {/* VIEW MODE 2: FULL EDIT MODE */}
                {codeDisplayMode === 'edit' && (
                  <div className="flex-1 relative flex overflow-hidden bg-slate-950">
                    <textarea
                      id="code-editor-textarea"
                      value={activeFile.content}
                      onChange={(e) => onChangeFileContent(e.target.value)}
                      spellCheck={false}
                      className="w-full h-full p-4 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-0 border-0 selection:bg-blue-600 selection:text-white"
                      placeholder="Source code content..."
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                <FileCode className="w-10 h-10 text-slate-700 mb-2" />
                <h4 className="text-sm font-semibold text-slate-300">No file opened in editor</h4>
                <p className="text-xs max-w-sm">
                  Select a file from the repository tree on the left to inspect, highlight, and edit its source code.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: THE 4 COMPREHENSIVE AI GENERATED MARKDOWN DOCUMENTS */}
        {activeCenterTab === 'docs' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950">
            {/* The 4 Distinct Document Sub-tabs */}
            <div className="px-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center gap-1">
                {/* Doc 1: Overview (Kyu ban raha hai) */}
                <button
                  type="button"
                  onClick={() => setActiveDocSubTab('overview')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeDocSubTab === 'overview'
                      ? 'border-indigo-500 text-indigo-300 bg-slate-900/80'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>1. Project Overview (Kyu ban raha hai)</span>
                </button>

                {/* Doc 2: Endpoints */}
                <button
                  type="button"
                  onClick={() => setActiveDocSubTab('endpoints')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeDocSubTab === 'endpoints'
                      ? 'border-indigo-500 text-indigo-300 bg-slate-900/80'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Network className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. All Endpoints (Every Route)</span>
                </button>

                {/* Doc 3: Structure & Architecture */}
                <button
                  type="button"
                  onClick={() => setActiveDocSubTab('structure')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeDocSubTab === 'structure'
                      ? 'border-indigo-500 text-indigo-300 bg-slate-900/80'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5 text-sky-400" />
                  <span>3. Structure & Architecture</span>
                </button>

                {/* Doc 4: Features */}
                <button
                  type="button"
                  onClick={() => setActiveDocSubTab('features')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeDocSubTab === 'features'
                      ? 'border-indigo-500 text-indigo-300 bg-slate-900/80'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>4. Features Catalog</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pr-2">
                <span>{currentDocFileName}</span>
              </div>
            </div>

            {/* Markdown Doc Render View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 prose prose-invert max-w-none prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800">
              <div className="markdown-body bg-transparent text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentDocContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE PREVIEW / WEB VIEW */}
        {activeCenterTab === 'preview' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-950 space-y-3">
            <div className="p-3 rounded-full bg-slate-900 border border-slate-800">
              <Play className="w-6 h-6 text-emerald-400" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Live Preview Container</h4>
            <p className="text-xs max-w-md text-slate-500">
              Interactive workspace with real-time code updates, VS Code syntax highlighting, and dual AI vertical documentation workflows.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
