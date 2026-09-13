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
}

export const FIXED_MODEL = {
  id: 'gemini-3.5-flash-lite',
  name: 'Gemini 3.5 Flash-Lite',
  badge: 'Active Model',
  description: 'Ultra-low latency lightweight model from the Gemini 3.5 family',
};

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
export type DocsSubTab = 'architecture' | 'endpoints' | 'setup' | 'audit';
export type ChatHubTab = 'file_docs' | 'architecture' | 'chat';
