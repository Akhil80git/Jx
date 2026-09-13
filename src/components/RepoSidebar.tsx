import { useState, useEffect } from 'react';
import { Search, FolderGit2, Star, GitFork, RefreshCw, Lock, ExternalLink, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { GitHubRepo } from '../types';

interface RepoSidebarProps {
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  onSelectRepo: (repo: GitHubRepo) => void;
  username: string;
  onChangeUsername: (username: string) => void;
  onFetchRepos: (user: string) => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  error?: string | null;
}

const PRESET_USERS = ['octocat', 'vercel', 'shadcn', 'facebook'];

export function RepoSidebar({
  repos,
  selectedRepo,
  onSelectRepo,
  username,
  onChangeUsername,
  onFetchRepos,
  isLoading,
  isOpen,
  onToggle,
  error,
}: RepoSidebarProps) {
  const [searchInput, setSearchInput] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    setSearchInput(username);
  }, [username]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    onChangeUsername(searchInput.trim());
    onFetchRepos(searchInput.trim());
  };

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div
      id="github-repos-sidebar"
      className={`${
        isOpen ? 'w-56 sm:w-60 md:w-64' : 'w-0'
      } shrink-0 border-r border-slate-800/80 bg-slate-950/95 flex flex-col h-full transition-all duration-200 overflow-hidden relative z-20`}
    >
      {/* Top Header */}
      <div className="p-2.5 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <FolderGit2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-100 uppercase tracking-wider truncate">
              GitHub Repos
            </span>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer shrink-0"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Username Search Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-1.5">
          <div className="relative">
            <User className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              id="github-username-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Username / Org..."
              className="w-full pl-7 pr-14 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              id="fetch-repos-btn"
              type="submit"
              disabled={isLoading}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Load'}
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
            <span className="text-[10px] text-slate-500 shrink-0">Try:</span>
            {PRESET_USERS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setSearchInput(preset);
                  onChangeUsername(preset);
                  onFetchRepos(preset);
                }}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                  username.toLowerCase() === preset.toLowerCase()
                    ? 'bg-blue-950 text-blue-300 border-blue-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Filter inside repos */}
      {repos.length > 0 && (
        <div className="p-1.5 border-b border-slate-800/60 bg-slate-900/30">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter repos..."
              className="w-full pl-6 pr-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-2.5 m-1.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-[11px] text-rose-300">
          {error}
        </div>
      )}

      {/* Repos List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 divide-y-0">
        {isLoading ? (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto text-blue-400" />
            <p>Fetching repositories...</p>
          </div>
        ) : repos.length === 0 ? (
          <div className="py-8 text-center px-3">
            <FolderGit2 className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400 font-medium">Koi repo nahi mila</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Top par username dalein aur 'Load' karein.
            </p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No repos matching "{filterQuery}"
          </div>
        ) : (
          filteredRepos.map((repo) => {
            const isSelected = selectedRepo?.id === repo.id;
            return (
              <button
                key={repo.id}
                id={`repo-item-${repo.id}`}
                type="button"
                onClick={() => onSelectRepo(repo)}
                className={`w-full text-left p-2 rounded-lg transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-blue-950/60 border-blue-600/70 text-white shadow-xs'
                    : 'bg-slate-900/40 border-transparent hover:bg-slate-900/80 hover:border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="font-semibold text-xs text-slate-200 truncate flex items-center gap-1">
                    {repo.private && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                    <span className="truncate">{repo.name}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] text-slate-400 font-mono shrink-0">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                    <span>{repo.stargazers_count}</span>
                  </div>
                </div>

                {repo.description && (
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                    {repo.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                  {repo.language && (
                    <span className="flex items-center gap-1 text-slate-400 font-mono truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                      <span className="truncate">{repo.language}</span>
                    </span>
                  )}
                  <span className="text-slate-600">•</span>
                  <span className="truncate">{repo.default_branch}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between bg-slate-950">
        <span>{filteredRepos.length} Repos</span>
        {username && <span className="font-mono text-slate-400">@{username}</span>}
      </div>
    </div>
  );
}
