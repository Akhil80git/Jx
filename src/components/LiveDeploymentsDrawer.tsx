import React, { useState, useEffect } from 'react';
import {
  Globe,
  ExternalLink,
  RefreshCw,
  X,
  Smartphone,
  Tablet,
  Monitor,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { GitHubRepo, ProductionDeploymentItem } from '../types';
import { fetchRepoDeployments } from '../services/apiClient';

interface LiveDeploymentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  githubToken?: string;
}

export function LiveDeploymentsDrawer({
  isOpen,
  onClose,
  repos,
  selectedRepo,
  githubToken,
}: LiveDeploymentsDrawerProps) {
  const [deploymentsList, setDeploymentsList] = useState<ProductionDeploymentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProductionDeploymentItem | null>(null);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // New Custom URL input
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customTitleInput, setCustomTitleInput] = useState('');

  // Collect URLs from repos (homepage) & fetch GitHub deployments
  useEffect(() => {
    let isCancelled = false;

    async function loadAllDeployments() {
      setIsLoading(true);
      const items: ProductionDeploymentItem[] = [];

      // 1. Gather all repo homepage URLs
      repos.forEach((r) => {
        if (r.homepage && (r.homepage.startsWith('http://') || r.homepage.startsWith('https://'))) {
          let provider = 'Deployed App';
          if (r.homepage.includes('vercel.app')) provider = 'Vercel';
          else if (r.homepage.includes('netlify.app')) provider = 'Netlify';
          else if (r.homepage.includes('github.io')) provider = 'GitHub Pages';
          else if (r.homepage.includes('pages.dev')) provider = 'Cloudflare';
          else if (r.homepage.includes('onrender.com')) provider = 'Render';
          else if (r.homepage.includes('railway.app')) provider = 'Railway';

          items.push({
            id: `homepage-${r.id}`,
            repoFullName: r.full_name,
            repoName: r.name,
            environment: 'Production',
            url: r.homepage,
            provider,
            createdAt: r.updated_at,
          });
        }
      });

      // 2. If a repo is selected, fetch its official GitHub deployments
      if (selectedRepo) {
        try {
          const apiDeployments = await fetchRepoDeployments(
            selectedRepo.owner.login,
            selectedRepo.name,
            githubToken
          );
          apiDeployments.forEach((dep) => {
            if (!items.some((i) => i.url.toLowerCase() === dep.url.toLowerCase())) {
              items.push({
                id: dep.id,
                repoFullName: dep.repoFullName,
                repoName: dep.repoName,
                environment: dep.environment,
                url: dep.url,
                provider: dep.provider,
                createdAt: dep.createdAt,
                creator: dep.creator,
              });
            }
          });
        } catch {
          // ignore
        }
      }

      // 3. Fallback demo items if list is empty so user immediately experiences the feature
      if (items.length === 0 && selectedRepo) {
        const cleanName = selectedRepo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const cleanOwner = selectedRepo.owner.login.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        items.push({
          id: `preview-gh-${selectedRepo.id}`,
          repoFullName: selectedRepo.full_name,
          repoName: selectedRepo.name,
          environment: 'GitHub Pages',
          url: `https://${cleanOwner}.github.io/${cleanName}`,
          provider: 'GitHub Pages',
          createdAt: selectedRepo.updated_at,
        });

        items.push({
          id: `preview-vercel-${selectedRepo.id}`,
          repoFullName: selectedRepo.full_name,
          repoName: selectedRepo.name,
          environment: 'Vercel Production',
          url: `https://${cleanName}.vercel.app`,
          provider: 'Vercel',
          createdAt: selectedRepo.updated_at,
        });
      }

      if (!isCancelled) {
        setDeploymentsList(items);
        if (items.length > 0 && !selectedItem) {
          setSelectedItem(items[0]);
        }
        setIsLoading(false);
      }
    }

    if (isOpen) {
      loadAllDeployments();
    }

    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedRepo?.full_name, repos.length]);

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;

    let formattedUrl = customUrlInput.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let provider = 'Custom URL';
    if (formattedUrl.includes('vercel.app')) provider = 'Vercel';
    else if (formattedUrl.includes('netlify.app')) provider = 'Netlify';
    else if (formattedUrl.includes('github.io')) provider = 'GitHub Pages';
    else if (formattedUrl.includes('pages.dev')) provider = 'Cloudflare';
    else if (formattedUrl.includes('onrender.com')) provider = 'Render';

    const newItem: ProductionDeploymentItem = {
      id: `custom-${Date.now()}`,
      repoFullName: selectedRepo ? selectedRepo.full_name : 'Custom Link',
      repoName: customTitleInput.trim() || 'Live Web App',
      environment: 'Live Preview',
      url: formattedUrl,
      provider,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    setDeploymentsList((prev) => [newItem, ...prev]);
    setSelectedItem(newItem);
    setCustomUrlInput('');
    setCustomTitleInput('');
    setIsAddingCustom(false);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeploymentsList((prev) => prev.filter((item) => item.id !== id));
    if (selectedItem?.id === id) {
      const remaining = deploymentsList.filter((item) => item.id !== id);
      setSelectedItem(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'vercel':
        return {
          badgeClass: 'bg-black text-white border border-slate-700',
          symbol: '▲',
        };
      case 'netlify':
        return {
          badgeClass: 'bg-teal-950/80 text-teal-300 border border-teal-700/60',
          symbol: '◆',
        };
      case 'github pages':
        return {
          badgeClass: 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60',
          symbol: '🐙',
        };
      case 'cloudflare':
        return {
          badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-700/60',
          symbol: '⚡',
        };
      case 'render':
        return {
          badgeClass: 'bg-purple-950/80 text-purple-300 border border-purple-700/60',
          symbol: '🚀',
        };
      case 'railway':
        return {
          badgeClass: 'bg-rose-950/80 text-rose-300 border border-rose-700/60',
          symbol: '🚂',
        };
      case 'heroku':
        return {
          badgeClass: 'bg-violet-950/80 text-violet-300 border border-violet-700/60',
          symbol: '🟣',
        };
      case 'fly.io':
        return {
          badgeClass: 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-700/60',
          symbol: '🎈',
        };
      case 'firebase':
        return {
          badgeClass: 'bg-orange-950/80 text-orange-300 border border-orange-700/60',
          symbol: '🔥',
        };
      case 'surge':
        return {
          badgeClass: 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60',
          symbol: '🌊',
        };
      case 'aws amplify':
        return {
          badgeClass: 'bg-sky-950/80 text-sky-300 border border-sky-700/60',
          symbol: '☁️',
        };
      case 'supabase':
        return {
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60',
          symbol: '⚡',
        };
      default:
        return {
          badgeClass: 'bg-blue-950/70 text-blue-300 border border-blue-700/60',
          symbol: '🌐',
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="live-deployments-overlay"
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        id="live-deployments-container"
        className={`bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none border-none' : 'w-[96vw] max-w-7xl h-[92vh]'
        }`}
      >
        {/* Top Header Bar with Mobile / Tablet / Desktop & Action Controls */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/95 shrink-0 z-10">
          {/* Left: Branding & Active Item Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 tracking-tight">Live Output Sandbox</h2>
                {selectedItem && (
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="truncate max-w-[200px]">{selectedItem.repoName}</span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-300 text-[10px] font-semibold">
                  {deploymentsList.length} {deploymentsList.length === 1 ? 'URL' : 'URLs'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Device Viewport Switcher, Open in New Tab, Refresh, Fullscreen, Close */}
          <div className="flex items-center gap-2">
            {/* Viewport Mode Switcher (Mobile / Tablet / Desktop) */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  viewportMode === 'desktop'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Desktop View (Full Screen Output)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('tablet')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  viewportMode === 'tablet'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  viewportMode === 'mobile'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {selectedItem && (
              <>
                {/* Reload Preview */}
                <button
                  type="button"
                  onClick={() => {
                    setIsIframeLoading(true);
                    setIframeKey((prev) => prev + 1);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Reload Live Preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Open in New Tab Button */}
                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                  title="Open live site in new browser tab"
                >
                  <span className="hidden sm:inline">Open in Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            )}

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close Live Sites Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body: Left Vertical Links Rail & Pure Full Output on Right */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Vertical Rail: All Live Links */}
          <div className="w-60 sm:w-64 md:w-72 shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col overflow-hidden">
            <div className="p-2.5 border-b border-slate-800/70 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Production Links
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className="px-2 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Add Custom Live URL"
              >
                <Plus className="w-3 h-3" />
                <span>Add URL</span>
              </button>
            </div>

            {/* Add Custom URL Form */}
            {isAddingCustom && (
              <form onSubmit={handleAddCustom} className="p-2.5 border-b border-slate-800/80 bg-slate-900/60 space-y-2 shrink-0">
                <input
                  type="text"
                  placeholder="Website Name (e.g. My App)"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="https://my-app.vercel.app"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Add Site
                  </button>
                </div>
              </form>
            )}

            {/* Sites List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {isLoading && (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Scanning deployments...</span>
                </div>
              )}

              {deploymentsList.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const badge = getProviderBadge(item.provider);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (selectedItem?.id !== item.id) {
                        setIsIframeLoading(true);
                      }
                      setSelectedItem(item);
                      setIframeKey((prev) => prev + 1);
                    }}
                    className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500/70 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                        : 'bg-slate-950 border-slate-800/60 hover:bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Icon Avatar */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${badge.badgeClass}`}
                      >
                        {badge.symbol}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-100 truncate">
                            {item.repoName}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${badge.badgeClass}`}
                          >
                            {item.provider}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {item.url.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                    </div>

                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity cursor-pointer shrink-0"
                        title="Delete custom link"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {deploymentsList.length === 0 && !isLoading && (
                <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                  <Globe className="w-6 h-6 mx-auto opacity-40 text-sky-400" />
                  <p>No live production deployments found yet.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Add Live URL
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Area: Pure Full Live Output with Black Screen URL Transitions */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden relative">
            {selectedItem ? (
              <div className="w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 relative">
                {/* Black Screen Transition Overlay while switching URLs or loading */}
                {isIframeLoading && (
                  <div
                    id="iframe-dark-loading-screen"
                    className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center gap-3.5 p-6 animate-in fade-in duration-150"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Globe className="w-5 h-5 animate-pulse" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                      </span>
                    </div>

                    <div className="text-center space-y-1 max-w-xs">
                      <p className="text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>Loading {selectedItem.repoName}...</span>
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-[260px] mx-auto">
                        {selectedItem.url}
                      </p>
                    </div>
                  </div>
                )}

                {viewportMode === 'desktop' ? (
                  /* 100% Edge-to-Edge Pure Dark Canvas Output */
                  <iframe
                    key={iframeKey}
                    src={selectedItem.url}
                    onLoad={() => setIsIframeLoading(false)}
                    className="w-full h-full bg-slate-950 border-0"
                    title={`Live output of ${selectedItem.repoName}`}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                  />
                ) : (
                  /* Mobile or Tablet Centered Output Frame */
                  <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900/40">
                    <div
                      className={`h-full max-h-[96vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 transition-all duration-300 flex flex-col relative ${
                        viewportMode === 'mobile' ? 'w-[375px]' : 'w-[768px]'
                      }`}
                    >
                      <iframe
                        key={iframeKey}
                        src={selectedItem.url}
                        onLoad={() => setIsIframeLoading(false)}
                        className="w-full flex-1 bg-slate-950 border-0"
                        title={`Live output of ${selectedItem.repoName}`}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
                <Globe className="w-10 h-10 text-sky-400/50" />
                <p className="text-sm font-medium text-slate-400">No live deployment selected</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Select a live deployment from the left rail or click Add URL to preview any web application.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
