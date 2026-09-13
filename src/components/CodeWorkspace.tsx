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
  Code2,
  ExternalLink,
  Layers,
  Network,
  Cpu,
  Terminal,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ActiveFile,
  GeneratedDocs,
  DocsSubTab,
  CenterTab,
  RepoArchitectureDoc,
  FileAnalysisDoc,
} from '../types';
import { formatByteSize, calculateByteSize } from '../utils/tokenCalc';

interface CodeWorkspaceProps {
  activeFile: ActiveFile | null;
  onChangeFileContent: (content: string) => void;
  onSaveFile: () => void;
  generatedDocs: GeneratedDocs;
  onTriggerDeepScan: () => void;
  onAskGeminiAboutFile: (prompt: string) => void;
  isScanning: boolean;
  activeCenterTab: CenterTab;
  onChangeCenterTab: (tab: CenterTab) => void;
  architectureDoc?: RepoArchitectureDoc | null;
  activeFileDoc?: FileAnalysisDoc | null;
}

export function CodeWorkspace({
  activeFile,
  onChangeFileContent,
  onSaveFile,
  generatedDocs,
  onTriggerDeepScan,
  onAskGeminiAboutFile,
  isScanning,
  activeCenterTab,
  onChangeCenterTab,
  architectureDoc,
  activeFileDoc,
}: CodeWorkspaceProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeDocSubTab, setActiveDocSubTab] = useState<DocsSubTab>('architecture');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeDocContent = useMemo(() => {
    if (activeDocSubTab === 'architecture') {
      return (
        architectureDoc?.fullMarkdown ||
        architectureDoc?.coreArchitecture ||
        generatedDocs.architecture ||
        '# Architecture\nScan repo to generate architecture documentation.'
      );
    }
    if (activeDocSubTab === 'endpoints') {
      return (
        architectureDoc?.endpointsMarkdown ||
        generatedDocs.endpoints ||
        '# Endpoints\nScan repo to generate endpoints directory.'
      );
    }
    if (activeDocSubTab === 'setup') {
      return (
        architectureDoc?.setupGuide ||
        generatedDocs.setupGuide ||
        '# Setup Guide\nScan repo to generate setup instructions.'
      );
    }
    return (
      activeFileDoc?.mdContent ||
      generatedDocs.bugAudit ||
      '# File Analysis\nSelect a file to inspect its Markdown breakdown.'
    );
  }, [activeDocSubTab, architectureDoc, activeFileDoc, generatedDocs]);

  return (
    <div
      id="code-center-workspace"
      className="flex-1 flex flex-col min-w-0 bg-slate-950 h-full overflow-hidden border-r border-slate-800/80"
    >
      {/* Top Workspace Tab Bar */}
      <div className="flex items-center justify-between px-3 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
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

          {/* Docs Tab */}
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
            <span>AI Docs (.md)</span>
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

        {/* Right Tab Controls */}
        <div className="flex items-center gap-1.5 py-1">
          {activeCenterTab === 'code' && activeFile && (
            <>
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
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
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
              <button
                type="button"
                onClick={onTriggerDeepScan}
                disabled={isScanning}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Re-Scan'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(activeDocContent)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Copy markdown"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* TAB 1: CODE EDITOR */}
        {activeCenterTab === 'code' && (
          <div className="flex-1 flex flex-col min-h-0">
            {activeFile ? (
              <>
                {/* File Sub-header */}
                <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-300 truncate">{activeFile.path}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]">
                      {activeFile.language || 'txt'}
                    </span>
                    <span className="text-slate-500">{formatByteSize(calculateByteSize(activeFile.content))}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAskGeminiAboutFile(`Explain how "${activeFile.name}" works and suggest optimizations`)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Explain with AI</span>
                    </button>
                  </div>
                </div>

                {/* Editor Textarea */}
                <div className="flex-1 relative flex overflow-hidden">
                  <textarea
                    id="code-editor-textarea"
                    value={activeFile.content}
                    onChange={(e) => onChangeFileContent(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full p-4 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-0 border-0 selection:bg-blue-600 selection:text-white"
                    placeholder="Source code content..."
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                <FileCode className="w-10 h-10 text-slate-700 mb-2" />
                <h4 className="text-sm font-semibold text-slate-300">No file opened in editor</h4>
                <p className="text-xs max-w-sm">
                  Select a file from the repository tree on the left or click any file in the File MDs view to inspect and edit its code.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI GENERATED MARKDOWN DOCS */}
        {activeCenterTab === 'docs' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Sub-tabs for MD Docs */}
            <div className="px-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setActiveDocSubTab('architecture')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                  activeDocSubTab === 'architecture'
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>Architecture & Purpose</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDocSubTab('endpoints')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                  activeDocSubTab === 'endpoints'
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Network className="w-3 h-3" />
                <span>API Endpoints</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDocSubTab('setup')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                  activeDocSubTab === 'setup'
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3 h-3" />
                <span>Setup Guide</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDocSubTab('audit')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                  activeDocSubTab === 'audit'
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>File MD ({activeFileDoc?.name || 'Current File'})</span>
              </button>
            </div>

            {/* Markdown Doc Render View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 prose prose-invert max-w-none prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800">
              <div className="markdown-body bg-transparent text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeDocContent}
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
              Interactive workspace with real-time code updates and dual AI vertical documentation workflows.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
