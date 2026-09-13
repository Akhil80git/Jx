import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Code2,
  ChevronRight,
  FileCode,
  Layers,
  Compass,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  ChatMessage,
  ActiveFile,
  RepoArchitectureDoc,
  FileAnalysisDoc,
  ChatHubTab,
  GitHubRepo,
} from '../types';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { ChatMessageItem } from './ChatMessageItem';
import { RepoFileDocsViewer } from './RepoFileDocsViewer';
import { RepoArchitectureViewer } from './RepoArchitectureViewer';
import { getPayloadAnalytics } from '../utils/tokenCalc';

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string, options?: { mode?: 'chat' | 'code'; includeFile?: boolean }) => void;
  onStopStreaming: () => void;
  hasKeyReady: boolean;
  onOpenApiKeyModal: () => void;
  activeFile: ActiveFile | null;
  onApplyCodeToFile: (code: string, targetPath?: string) => void;
  onDraftChange: (analytics: ReturnType<typeof getPayloadAnalytics> | null) => void;
  isOpen: boolean;
  onToggle: () => void;

  // Automated Repo Analysis Props
  selectedRepo: GitHubRepo | null;
  repoAnalysisState: {
    isAnalyzing: boolean;
    statusMessage: string;
    progress: { current: number; total: number };
    fileDocs: Record<string, FileAnalysisDoc>;
    architectureDoc: RepoArchitectureDoc | null;
    activeFileDocPath: string | null;
  };
  onSelectFileDocPath: (path: string) => void;
  onOpenInEditor: (path: string) => void;
  onTriggerReAnalysis: () => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  hasKeyReady,
  onOpenApiKeyModal,
  activeFile,
  onApplyCodeToFile,
  onDraftChange,
  isOpen,
  onToggle,
  selectedRepo,
  repoAnalysisState,
  onSelectFileDocPath,
  onOpenInEditor,
  onTriggerReAnalysis,
}: ChatPanelProps) {
  // Hub Mode Tab: File MD Docs vs Full Architecture/Endpoints vs Interactive Chat
  const [activeHubTab, setActiveHubTab] = useState<ChatHubTab>('file_docs');
  const [chatMode, setChatMode] = useState<'chat' | 'code'>('chat');
  const [attachFileContext, setAttachFileContext] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeHubTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, activeHubTab]);

  // When a new repo starts analyzing, default to file docs or architecture
  useEffect(() => {
    if (repoAnalysisState.isAnalyzing && activeHubTab === 'chat' && messages.length === 0) {
      setActiveHubTab('file_docs');
    }
  }, [repoAnalysisState.isAnalyzing]);

  const handleSend = (text: string) => {
    onSendMessage(text, {
      mode: chatMode,
      includeFile: attachFileContext && Boolean(activeFile),
    });
  };

  const handleAskAboutFile = (filePath: string, prompt: string) => {
    setActiveHubTab('chat');
    onSendMessage(`Regarding file "${filePath}": ${prompt}`, {
      mode: 'chat',
      includeFile: true,
    });
  };

  if (!isOpen) return null;

  const totalFilesCount = repoAnalysisState.progress.total || Object.keys(repoAnalysisState.fileDocs).length;
  const analyzedFilesCount = repoAnalysisState.progress.current;

  return (
    <div
      id="gemini-chat-panel"
      className="w-full sm:w-[480px] md:w-[540px] lg:w-[600px] xl:w-[680px] shrink-0 bg-slate-950 flex flex-col h-full overflow-hidden border-l border-slate-800/80 relative z-20"
    >
      {/* Panel Top Header with 3 Core Modes */}
      <div className="p-2.5 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                <span>Gemini 3.5 Repo Intelligence</span>
              </h3>
              <p className="text-[10px] text-slate-400 truncate">
                {selectedRepo ? selectedRepo.full_name : 'Select a repo to auto-generate docs'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer shrink-0"
            title="Collapse AI Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Top Vertical / Workflow Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
          {/* Tab 1: File MD Docs */}
          <button
            id="hub-tab-file-docs"
            type="button"
            onClick={() => setActiveHubTab('file_docs')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
              activeHubTab === 'file_docs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">File MDs ({totalFilesCount})</span>
            {repoAnalysisState.isAnalyzing && (
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-300 ml-0.5 shrink-0" />
            )}
          </button>

          {/* Tab 2: Architecture & Endpoints */}
          <button
            id="hub-tab-architecture"
            type="button"
            onClick={() => setActiveHubTab('architecture')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
              activeHubTab === 'architecture'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Architecture & Endpoints</span>
          </button>

          {/* Tab 3: Interactive Chat */}
          <button
            id="hub-tab-chat"
            type="button"
            onClick={() => setActiveHubTab('chat')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
              activeHubTab === 'chat'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ask AI</span>
          </button>
        </div>

        {/* Live Auto-Analysis Banner */}
        {repoAnalysisState.isAnalyzing && (
          <div className="mt-2 p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/50 flex items-center justify-between gap-2 text-[11px] animate-pulse">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
              <span className="text-indigo-200 font-medium truncate">
                {repoAnalysisState.statusMessage || 'AI analyzing repository...'}
              </span>
            </div>
            <span className="font-mono font-bold text-indigo-300 text-[10px] shrink-0">
              {analyzedFilesCount}/{totalFilesCount || '?'} files
            </span>
          </div>
        )}
      </div>

      {/* Main Hub Body by Tab */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* VIEW 1: All Repo Files MD Docs */}
        {activeHubTab === 'file_docs' && (
          <RepoFileDocsViewer
            fileDocs={repoAnalysisState.fileDocs}
            activeFilePath={repoAnalysisState.activeFileDocPath}
            onSelectFilePath={onSelectFileDocPath}
            onOpenInEditor={onOpenInEditor}
            onAskAiAboutFile={handleAskAboutFile}
            isAnalyzing={repoAnalysisState.isAnalyzing}
            progress={repoAnalysisState.progress}
          />
        )}

        {/* VIEW 2: Complete Project Architecture & Endpoints Directory */}
        {activeHubTab === 'architecture' && (
          <RepoArchitectureViewer
            architectureDoc={repoAnalysisState.architectureDoc}
            repoFullName={selectedRepo?.full_name || 'Repository'}
            isAnalyzing={repoAnalysisState.isAnalyzing}
            onReAnalyze={onTriggerReAnalysis}
          />
        )}

        {/* VIEW 3: Interactive Chat Assistant & Code Studio */}
        {activeHubTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Chat sub-controls */}
            <div className="p-2 border-b border-slate-800/60 bg-slate-900/30 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setChatMode('chat')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    chatMode === 'chat'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Chat Q&A
                </button>
                <button
                  type="button"
                  onClick={() => setChatMode('code')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    chatMode === 'code'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Code Studio
                </button>
              </div>

              {activeFile && (
                <button
                  type="button"
                  onClick={() => setAttachFileContext(!attachFileContext)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                    attachFileContext
                      ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  <FileCode className="w-3 h-3 text-blue-400" />
                  <span>{activeFile.name}</span>
                  <span>{attachFileContext ? '✓' : '+'}</span>
                </button>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <EmptyState
                  onSelectPrompt={(p) => handleSend(p)}
                  hasCustomKey={hasKeyReady}
                  onOpenApiKeyModal={onOpenApiKeyModal}
                />
              ) : (
                messages.map((msg, index) => (
                  <ChatMessageItem
                    key={msg.id || index}
                    message={msg}
                    isStreaming={isStreaming && index === messages.length - 1}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Box */}
            <ChatInput
              onSendMessage={handleSend}
              isStreaming={isStreaming}
              onStopStreaming={onStopStreaming}
              hasKeyReady={hasKeyReady}
              onOpenApiKeyModal={onOpenApiKeyModal}
              selectedModelName="Gemini 3.5 Flash-Lite"
              onDraftChange={onDraftChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
