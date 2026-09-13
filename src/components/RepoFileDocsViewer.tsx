import { useState, useMemo } from 'react';
import {
  FileCode,
  FileText,
  FileJson,
  File,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Copy,
  Check,
  Download,
  ExternalLink,
  Code2,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileAnalysisDoc } from '../types';

interface RepoFileDocsViewerProps {
  fileDocs: Record<string, FileAnalysisDoc>;
  activeFilePath: string | null;
  onSelectFilePath: (path: string) => void;
  onOpenInEditor: (path: string) => void;
  onAskAiAboutFile: (filePath: string, prompt: string) => void;
  isAnalyzing: boolean;
  progress: { current: number; total: number };
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
  }
  if (['py', 'rb', 'go', 'rs', 'java', 'c', 'cpp'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) {
    return <FileJson className="w-4 h-4 text-amber-400 shrink-0" />;
  }
  if (['md', 'txt', 'markdown', 'rst'].includes(ext)) {
    return <FileText className="w-4 h-4 text-purple-400 shrink-0" />;
  }
  return <File className="w-4 h-4 text-slate-400 shrink-0" />;
}

export function RepoFileDocsViewer({
  fileDocs,
  activeFilePath,
  onSelectFilePath,
  onOpenInEditor,
  onAskAiAboutFile,
  isAnalyzing,
  progress,
}: RepoFileDocsViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const fileDocList = useMemo(() => {
    return Object.values(fileDocs);
  }, [fileDocs]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return fileDocList;
    const q = searchQuery.toLowerCase();
    return fileDocList.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.purpose.toLowerCase().includes(q)
    );
  }, [fileDocList, searchQuery]);

  const currentActiveDoc =
    (activeFilePath && fileDocs[activeFilePath]) || fileDocList[0] || null;

  const handleCopyDoc = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  const handleDownloadDoc = (fileDoc: FileAnalysisDoc) => {
    const filename = `${fileDoc.name.replace(/\.[^/.]+$/, '')}.doc.md`;
    const blob = new Blob([fileDoc.mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllDocs = () => {
    let combined = `# Complete Repository File Documentation Bundle\n*Generated with Gemini 3.5 AI*\n\n---\n\n`;
    fileDocList.forEach((f) => {
      combined += `\n\n=========================================\n# FILE: ${f.path}\n=========================================\n\n${f.mdContent}\n\n`;
    });
    const blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repository-all-files-docs.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Left Vertical Sub-Navigation: All Repo Files (e.g. 20 files list) */}
      <div className="w-72 sm:w-80 md:w-84 shrink-0 border-r border-slate-800/80 flex flex-col bg-slate-950/80">
        {/* Header & Stats */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-200 truncate">
                  Repo Files MD Docs
                </h4>
                <p className="text-[10px] text-slate-400">
                  {progress.current}/{progress.total} Files Analyzed
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadAllDocs}
              disabled={fileDocList.length === 0}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Download all Markdown docs in a single file"
            >
              <Download className="w-3 h-3" />
              <span>All .md</span>
            </button>
          </div>

          {/* Progress Bar if analyzing */}
          {isAnalyzing && (
            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between text-[10px] text-indigo-300">
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Generating per-file Markdown docs...
                </span>
                <span className="font-mono">{Math.round((progress.current / (progress.total || 1)) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{
                    width: `${Math.max(5, (progress.current / (progress.total || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file name or purpose..."
              className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Files Vertical List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y-0">
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No files found matching filter.
            </div>
          ) : (
            filteredList.map((doc) => {
              const isSelected = currentActiveDoc?.path === doc.path;
              return (
                <button
                  key={doc.path}
                  type="button"
                  onClick={() => onSelectFilePath(doc.path)}
                  className={`w-full text-left p-2 rounded-lg transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500/70 text-white shadow-xs'
                      : 'bg-slate-900/30 border-transparent hover:bg-slate-900/70 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getFileIcon(doc.name)}
                      <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                        {doc.name}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {doc.status === 'completed' ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>MD Ready</span>
                      </span>
                    ) : doc.status === 'analyzing' ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60 shrink-0">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-400" />
                        <span>Scanning</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] text-slate-400 bg-slate-900 border border-slate-800 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Queued</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 leading-snug">
                    {doc.purpose || 'Analyzing code role & responsibilities...'}
                  </p>

                  <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500 font-mono">
                    <span className="truncate">{doc.path}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Selected File Markdown Documentation Viewer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {currentActiveDoc ? (
          <>
            {/* Top Toolbar for Active File */}
            <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(currentActiveDoc.name)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono truncate">
                      {currentActiveDoc.name}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      .{currentActiveDoc.language || 'txt'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    {currentActiveDoc.path}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenInEditor(currentActiveDoc.path)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                  title="Open source code in editor"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Open Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyDoc(currentActiveDoc.mdContent, currentActiveDoc.path)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  title="Copy markdown documentation"
                >
                  {copiedPath === currentActiveDoc.path ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy MD</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDoc(currentActiveDoc)}
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Download .md file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Purpose & Key Exports Highlight Card */}
            <div className="p-4 border-b border-slate-800/60 bg-indigo-950/20 grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  File Purpose (Kam kya hai)
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {currentActiveDoc.purpose || 'Generating purpose breakdown...'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Key Exports / Elements
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentActiveDoc.keyExports && currentActiveDoc.keyExports.length > 0 ? (
                    currentActiveDoc.keyExports.map((exp, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700/80 text-blue-300"
                      >
                        {exp}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      Module internals & declarations
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rendered Markdown Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 prose prose-invert max-w-none prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-headings:text-slate-100 prose-a:text-blue-400">
              <div className="markdown-body bg-transparent text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentActiveDoc.mdContent || `# ${currentActiveDoc.name}\n\n*Documentation is currently being generated by Gemini AI...*`}
                </ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No file selected</p>
            <p className="text-xs max-w-xs">
              Select any file from the vertical navigation list on the left to read its AI Markdown documentation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
