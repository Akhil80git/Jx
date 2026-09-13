import { useState, useMemo } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Save,
  Play,
  Sparkles,
  Edit3,
  Eye,
  Terminal,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ActiveFile, CenterTab } from '../types';
import { formatByteSize } from '../utils/tokenCalc';
import { highlightCode } from '../utils/syntaxHighlight';

interface CodeWorkspaceProps {
  activeFile: ActiveFile | null;
  onChangeFileContent: (content: string) => void;
  onSaveFile: () => void;
  onAskGeminiAboutFile: (prompt: string) => void;
  activeCenterTab: CenterTab;
  onChangeCenterTab: (tab: CenterTab) => void;
  onOpenFileInEditor?: (filePath: string) => void;
}

export function CodeWorkspace({
  activeFile,
  onChangeFileContent,
  onSaveFile,
  onAskGeminiAboutFile,
  activeCenterTab,
  onChangeCenterTab,
}: CodeWorkspaceProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeDisplayMode, setCodeDisplayMode] = useState<'syntax' | 'edit'>('syntax');
  const [askPrompt, setAskPrompt] = useState('');

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

  // Syntax highlighted HTML with line numbers
  const highlightedCodeHtml = useMemo(() => {
    if (!activeFile || !activeFile.content) return '';
    return highlightCode(activeFile.content, activeFile.name || activeFile.language);
  }, [activeFile?.content, activeFile?.name, activeFile?.language]);

  const codeLineCount = useMemo(() => {
    if (!activeFile?.content) return 0;
    return activeFile.content.split('\n').length;
  }, [activeFile?.content]);

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askPrompt.trim() || !activeFile) return;
    onAskGeminiAboutFile(`Regarding file "${activeFile.path}": ${askPrompt}`);
    setAskPrompt('');
  };

  return (
    <div
      id="code-center-workspace"
      className="flex-1 flex flex-col min-w-0 bg-slate-950 h-full overflow-hidden border-r border-slate-800/80"
    >
      {/* Top Workspace Tab Bar */}
      <div className="flex items-center justify-between px-3 border-b border-slate-800/80 bg-slate-900/70 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {/* Code Editor Tab */}
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

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 py-1">
          {activeFile && activeCenterTab === 'code' && (
            <>
              {/* Switcher: Colorful Syntax View vs Edit Mode */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setCodeDisplayMode('syntax')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    codeDisplayMode === 'syntax'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="VS Code Colorful Syntax Highlighting"
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
                  title="Interactive Code Editor"
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
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Tab 1: Code View / Edit */}
        {activeCenterTab === 'code' && (
          activeFile ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* File Info Bar */}
              <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-200 font-semibold truncate">{activeFile.path}</span>
                  <span className="text-slate-500">•</span>
                  <span>{activeFile.language}</span>
                  <span className="text-slate-500">•</span>
                  <span>{codeLineCount} lines</span>
                  <span className="text-slate-500">•</span>
                  <span>{formatByteSize(activeFile.size || activeFile.content.length)}</span>
                </div>

                {activeFile.isModified && (
                  <span className="text-amber-400 font-sans font-medium text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                    Modified Locally
                  </span>
                )}
              </div>

              {/* Code Content Area */}
              <div className="flex-1 overflow-auto bg-slate-950 p-3 font-mono text-xs leading-relaxed">
                {codeDisplayMode === 'syntax' ? (
                  <div
                    className="prism-code-container text-slate-200 select-text overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: highlightedCodeHtml }}
                  />
                ) : (
                  <textarea
                    value={activeFile.content}
                    onChange={(e) => onChangeFileContent(e.target.value)}
                    className="w-full h-full min-h-[400px] bg-transparent text-slate-100 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-0 border-0 p-0 selection:bg-blue-600 selection:text-white"
                    placeholder="Type or paste code here..."
                    spellCheck={false}
                  />
                )}
              </div>

              {/* Ask Gemini About File Assistant Bar */}
              <form
                onSubmit={handleAskSubmit}
                className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 shrink-0"
              >
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Ask Gemini:</span>
                </div>
                <input
                  type="text"
                  placeholder={`Ask questions, request changes or refactor for ${activeFile.name}...`}
                  value={askPrompt}
                  onChange={(e) => setAskPrompt(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!askPrompt.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  Send to Chat
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <FileCode className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">No File Selected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Select any file from the repository tree on the left to view colorful syntax highlighting, edit code, and chat with Gemini.
                </p>
              </div>
            </div>
          )
        )}

        {/* Tab 2: Live Preview */}
        {activeCenterTab === 'preview' && (
          <div className="flex-1 overflow-auto bg-slate-950 p-4">
            {activeFile?.name.endsWith('.md') || activeFile?.name.endsWith('.markdown') ? (
              <div className="max-w-4xl mx-auto markdown-body text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeFile.content}
                </ReactMarkdown>
              </div>
            ) : activeFile?.name.endsWith('.html') || activeFile?.name.endsWith('.svg') ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <iframe
                  srcDoc={activeFile.content}
                  className="w-full h-full bg-white rounded-lg border border-slate-800"
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                <Play className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300 font-medium">Code Preview Mode</p>
                <p className="text-xs text-slate-500 max-w-md">
                  Select a Markdown (.md) or HTML (.html) file to preview its rendered layout here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
