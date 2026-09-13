import {
  Sparkles,
  Key,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  FolderGit2,
  FolderTree,
  MessageSquare,
  Github,
  GitCommit,
} from 'lucide-react';
import { FIXED_MODEL } from '../types';

interface HeaderProps {
  hasCustomKey: boolean;
  hasEnvKeyFallback: boolean;
  hasGithubToken: boolean;
  onOpenApiKeyModal: () => void;
  onNewChat: () => void;
  onDeleteChat: () => void;
  onExportChat: () => void;
  messageCount: number;
  isTokenSidebarOpen: boolean;
  onToggleTokenSidebar: () => void;
  totalTokensCount: number;
  isRepoSidebarOpen: boolean;
  onToggleRepoSidebar: () => void;
  isFileSidebarOpen: boolean;
  onToggleFileSidebar: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  isActivityPanelOpen: boolean;
  onToggleActivityPanel: () => void;
}

export function Header({
  hasCustomKey,
  hasEnvKeyFallback,
  hasGithubToken,
  onOpenApiKeyModal,
  onNewChat,
  onDeleteChat,
  onExportChat,
  messageCount,
  isTokenSidebarOpen,
  onToggleTokenSidebar,
  totalTokensCount,
  isRepoSidebarOpen,
  onToggleRepoSidebar,
  isFileSidebarOpen,
  onToggleFileSidebar,
  isChatOpen,
  onToggleChat,
  isActivityPanelOpen,
  onToggleActivityPanel,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Brand & Sidebar Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight">Gemini Chat</h1>
              {/* Fixed Single Model Badge */}
              <div
                id="fixed-model-badge"
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 text-[11px] font-semibold"
                title="Active Model: Gemini 3.5 Flash-Lite"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{FIXED_MODEL.name}</span>
              </div>
            </div>
          </div>

          {/* Panel Toggle Icons */}
          <div className="flex items-center gap-1 ml-1 sm:ml-2 pl-2 border-l border-slate-800">
            <button
              type="button"
              onClick={onToggleRepoSidebar}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isRepoSidebarOpen
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle GitHub Repos Panel"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleFileSidebar}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isFileSidebarOpen
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle Files & Folders Panel"
            >
              <FolderTree className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleChat}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isChatOpen
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle AI Chat & Code Studio Panel"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleActivityPanel}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isActivityPanelOpen
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle Right GitHub Live Activity (Commits, Diffs, PRs, Issues)"
            >
              <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline text-[11px]">Live Activity</span>
            </button>
          </div>
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* "+ New Chat" Button */}
          <button
            id="new-chat-btn"
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-600/30 active:scale-95 cursor-pointer"
            title="Start a new fresh chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          {/* "Delete Chat" Button */}
          <button
            id="delete-chat-btn"
            type="button"
            onClick={onDeleteChat}
            disabled={messageCount === 0}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              messageCount > 0
                ? 'text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 active:scale-95'
                : 'text-slate-500 bg-slate-900/30 border border-slate-800/30 cursor-not-allowed opacity-40'
            }`}
            title={messageCount > 0 ? 'Delete all messages' : 'No messages to delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* API Keys & GitHub Token Modal Button */}
          <button
            id="open-api-key-modal-btn"
            type="button"
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all shadow-xs border cursor-pointer ${
              hasCustomKey || hasGithubToken
                ? 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-600'
                : 'bg-amber-950/40 text-amber-300 border-amber-700/60 hover:bg-amber-900/40 animate-pulse'
            }`}
            title="Configure Gemini Key & GitHub Token"
          >
            <Key className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Keys</span>
            {hasGithubToken && <Github className="w-3 h-3 text-slate-400 hidden sm:inline" />}
            {hasCustomKey ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : !hasEnvKeyFallback ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            ) : null}
          </button>

          {/* Export chat button */}
          {messageCount > 0 && (
            <button
              id="export-chat-btn"
              type="button"
              onClick={onExportChat}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors hidden sm:flex items-center justify-center cursor-pointer"
              title="Export conversation as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Toggle Token Sidebar button */}
          <button
            id="toggle-token-sidebar-btn"
            type="button"
            onClick={onToggleTokenSidebar}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
              isTokenSidebarOpen
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Toggle Token Counter Sidebar"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[11px] hidden sm:inline">
              {totalTokensCount > 0 ? `${totalTokensCount.toLocaleString()} t` : 'Tokens'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
