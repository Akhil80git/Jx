export type Role = 'user' | 'assistant';

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  error?: boolean;
  tokenUsage?: TokenUsage;
  inputTokens?: number;
  byteSize?: number;
  formattedSize?: string;
  actionType?: 'chat' | 'code_edit' | 'file_created' | 'repo_scan';
  targetFile?: string;
  modelId?: string;
  modelName?: string;
}

export interface GeminiModelOption {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  speed: string;
  description: string;
  tagColor: string;
}

export const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    shortName: '3.5 Flash',
    badge: 'Fast & Efficient',
    speed: 'High Speed',
    description: 'Ultra-fast and efficient intelligence for everyday code generation, chat queries, and file audits',
    tagColor: 'text-blue-300 border-blue-500/40 bg-blue-950/40',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    shortName: '3.7 Flash',
    badge: 'Advanced Reasoning',
    speed: 'Deep Logic',
    description: 'Hybrid reasoning and deep logic analysis for complex multi-hop code architecture and debugging',
    tagColor: 'text-purple-300 border-purple-500/40 bg-purple-950/40',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    shortName: '3.8 Flash',
    badge: 'Flagship Intelligence',
    speed: 'Next-Gen Speed',
    description: 'Next-generation multimodal performance for large codebases, full repository scanning, and complex refactors',
    tagColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40',
  },
];

// Default model is Gemini 3.5 Flash
export const DEFAULT_GEMINI_MODEL: GeminiModelOption = GEMINI_MODELS[0];

// Backwards compatibility alias
export const FIXED_MODEL = DEFAULT_GEMINI_MODEL;

export interface AttachedChatFile {
  path: string;
  name: string;
  content?: string;
  size?: number;
  language?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  default_branch: string;
  updated_at: string;
  private: boolean;
  html_url: string;
  clone_url?: string;
}

export interface CloneRepoOptions {
  sourceOwner: string;
  sourceRepo: string;
  sourceBranch?: string;
  targetRepoName: string;
  targetDescription?: string;
  isPrivate?: boolean;
  cloneType?: 'standalone' | 'fork';
  token?: string;
}

export interface CloneRepoResult {
  success: boolean;
  method?: 'standalone' | 'fork';
  repo: GitHubRepo;
  filesCount?: number;
  message?: string;
  error?: string;
}

export interface GitHubTreeItem {
  path: string;
  mode?: string;
  type: 'blob' | 'tree';
  sha?: string;
  size?: number;
  ignored?: boolean;
}

export interface ActiveFile {
  path: string;
  name: string;
  content: string;
  size: number;
  language: string;
  isModified?: boolean;
}

export interface GeneratedDocs {
  architecture: string;
  endpoints: string;
  setupGuide: string;
  bugAudit: string;
  isGenerating?: boolean;
  generatedAt?: number;
}

// File-by-File Markdown Analysis for all repo files
export interface FileAnalysisDoc {
  path: string;
  name: string;
  language: string;
  size?: number;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  purpose: string; // What this file is for (kam kya hai)
  summary: string; // What is inside this file (kya kya hai is file me)
  keyExports: string[]; // functions, classes, components, routes, types
  dependencies: string[]; // key imports / connections
  mdContent: string; // Full markdown documentation for this specific file
  analyzedAt?: number;
  error?: string;
}

// Endpoint specification
export interface EndpointItem {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'WS' | 'ROUTE' | string;
  path: string;
  description: string;
  fileLocation?: string;
  payload?: string;
  response?: string;
  auth?: string;
}

// Full Repository Architecture & Endpoints Deep Dive
export interface RepoArchitectureDoc {
  projectName: string;
  projectPurpose: string; // Kyu aur kis liye project banaya gaya hai
  coreArchitecture: string; // Step-by-step system architecture
  techStack: Array<{ category: string; items: string[] }>;
  dataFlow: string; // Flow of data and component interaction
  endpoints: EndpointItem[];
  endpointsMarkdown: string; // Complete endpoints documentation
  fullMarkdown: string; // Complete architecture documentation
  setupGuide: string;
  securityAudit?: string;
  isGenerating?: boolean;
  generatedAt?: number;
}

// Overall Repository Analysis State
export interface RepoAnalysisState {
  repoFullName: string;
  isAnalyzing: boolean;
  currentStep: 'idle' | 'scanning_tree' | 'analyzing_architecture' | 'analyzing_files' | 'completed';
  statusMessage: string;
  progress: { current: number; total: number };
  fileDocs: Record<string, FileAnalysisDoc>; // path -> FileAnalysisDoc
  architectureDoc: RepoArchitectureDoc | null;
  activeFileDocPath: string | null;
  error?: string | null;
}

export type CenterTab = 'code' | 'docs' | 'preview';
export type DocsSubTab = 'overview' | 'endpoints' | 'structure' | 'features';
export type ChatHubTab = 'architecture' | 'activity' | 'chat';

export interface DeepScanDocs {
  projectOverview: string; // Doc 1: Kyu ban raha hai & deep overview
  endpoints: string; // Doc 2: All endpoints in whole site
  structureArchitecture: string; // Doc 3: Complete architecture & codebase structure
  featuresCatalog: string; // Doc 4: All features & capabilities in project
  isScanning: boolean;
  generatedAt?: number;
}

export interface GitHubCommitItem {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email?: string;
      date: string;
    };
  };
  author?: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
}

export interface CommitFileChange {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

export interface GitHubCommitDetail {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author?: {
    login: string;
    avatar_url: string;
  };
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  files?: CommitFileChange[];
  html_url: string;
}

export interface GitHubPullRequestItem {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  body?: string | null;
}

export interface GitHubIssueItem {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    avatar_url?: string;
  };
  created_at: string;
  comments: number;
  html_url: string;
  body?: string | null;
}

export interface CommitAiAnalysisDoc {
  sha: string;
  commitMessage: string;
  authorName: string;
  purpose: string;
  filesSummary: string;
  codeChanges: string;
  impact: string;
  fullMarkdown: string;
  createdAt: number;
  modelUsed?: string;
}
