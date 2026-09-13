import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

function extractCleanErrorMessage(error: any): string {
  if (!error) return "Failed to communicate with Gemini API.";
  let msg = typeof error === "string" ? error : error?.message || "";
  try {
    let parsed = JSON.parse(msg);
    if (parsed.error && typeof parsed.error === "object") {
      if (parsed.error.message) {
        try {
          const nested = JSON.parse(parsed.error.message);
          if (nested.error?.message) return nested.error.message;
        } catch {
          return parsed.error.message;
        }
      }
    }
    if (parsed.message) return parsed.message;
  } catch {
    // string is not JSON, use directly
  }
  return msg || "An unexpected error occurred while communicating with Gemini.";
}

function isRateLimitError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error?.message || JSON.stringify(error);
  return (
    error?.status === 429 ||
    error?.code === 429 ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('Quota exceeded') ||
    msg.includes('rate-limits')
  );
}

async function executeGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelayMs = 2500
): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      if (isRateLimitError(err) && attempt < maxRetries) {
        attempt++;
        const waitTime = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini Rate Limit 429] Retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Maximum retry attempts reached.");
}

function getGeminiModelForSdk(requestedModel?: string): string {
  if (!requestedModel) return "gemini-3.1-flash-lite";
  const m = requestedModel.toLowerCase().trim();
  if (
    m === "gemini-3.5-flash-lite" ||
    m.includes("3.5-flash-lite") ||
    m.includes("flash-lite") ||
    m.includes("flashlight") ||
    m.includes("lite")
  ) {
    return "gemini-3.1-flash-lite";
  }
  if (m === "gemini-3.5-flash" || m.includes("3.5-flash")) {
    return "gemini-flash-latest";
  }
  if (m === "gemini-3.7-flash" || m.includes("3.7")) {
    return "gemini-3.8-flash";
  }
  if (m === "gemini-3.8-flash" || m.includes("3.8")) {
    return "gemini-3.8-flash";
  }
  return requestedModel;
}

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "15mb" }));

  // Health and config status endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasEnvKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    });
  });

  function getGitHubHeaders(token?: string) {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Gemini-GitHub-Studio-App",
    };
    if (token && token.trim()) {
      headers["Authorization"] = `Bearer ${token.trim()}`;
    }
    return headers;
  }

  // GitHub Repos list endpoint
  app.get("/api/github/repos", async (req, res) => {
    try {
      const username = (req.query.username as string)?.trim();
      const token = ((req.headers["x-github-token"] as string) || (req.query.token as string))?.trim();

      if (!username && !token) {
        return res.status(400).json({ error: "Username ya GitHub Token required hai." });
      }

      let url = "";
      if (username) {
        url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
      } else {
        url = `https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator`;
      }

      const ghRes = await fetch(url, { headers: getGitHubHeaders(token) });
      if (!ghRes.ok) {
        const errJson = await ghRes.json().catch(() => ({}));
        return res.status(ghRes.status).json({
          error: errJson.message || `GitHub API error: ${ghRes.statusText}`,
        });
      }

      const repos = await ghRes.json();
      res.json({ repos: Array.isArray(repos) ? repos : [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch repositories." });
    }
  });

  // GitHub Recursive Repo Tree endpoint with .gitignore awareness
  app.get("/api/github/tree", async (req, res) => {
    try {
      const owner = (req.query.owner as string)?.trim();
      const repo = (req.query.repo as string)?.trim();
      let branch = (req.query.branch as string)?.trim();
      const token = ((req.headers["x-github-token"] as string) || (req.query.token as string))?.trim();

      if (!owner || !repo) {
        return res.status(400).json({ error: "Owner and repo are required." });
      }

      // If branch not supplied, get default branch
      if (!branch) {
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: getGitHubHeaders(token),
        });
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          branch = repoData.default_branch || "main";
        } else {
          branch = "main";
        }
      }

      // Fetch recursive tree
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
        { headers: getGitHubHeaders(token) }
      );

      if (!treeRes.ok) {
        const errJson = await treeRes.json().catch(() => ({}));
        return res.status(treeRes.status).json({
          error: errJson.message || `Failed to fetch tree: ${treeRes.statusText}`,
        });
      }

      const treeData = await treeRes.json();
      const items = treeData.tree || [];

      // Check for .gitignore
      let gitignorePatterns: string[] = ["node_modules", "dist", ".git", ".next", "build", ".cache", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
      let gitignoreRaw = "";
      const gitignoreItem = items.find((i: any) => i.path === ".gitignore");

      if (gitignoreItem) {
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/.gitignore`,
          { headers: getGitHubHeaders(token) }
        );
        if (rawRes.ok) {
          gitignoreRaw = await rawRes.text();
          const parsed = gitignoreRaw
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("#"));
          gitignorePatterns = Array.from(new Set([...gitignorePatterns, ...parsed]));
        }
      }

      res.json({
        branch,
        truncated: Boolean(treeData.truncated),
        items,
        gitignorePatterns,
        gitignoreRaw,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch repository tree." });
    }
  });

  // GitHub File Content endpoint
  app.get("/api/github/file", async (req, res) => {
    try {
      const owner = (req.query.owner as string)?.trim();
      const repo = (req.query.repo as string)?.trim();
      const filePath = (req.query.path as string)?.trim();
      const ref = (req.query.ref as string)?.trim() || "main";
      const token = ((req.headers["x-github-token"] as string) || (req.query.token as string))?.trim();

      if (!owner || !repo || !filePath) {
        return res.status(400).json({ error: "Owner, repo and path are required." });
      }

      const fileRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
        { headers: getGitHubHeaders(token) }
      );

      if (!fileRes.ok) {
        const errJson = await fileRes.json().catch(() => ({}));
        return res.status(fileRes.status).json({
          error: errJson.message || `Failed to fetch file: ${fileRes.statusText}`,
        });
      }

      const fileData = await fileRes.json();
      let content = "";
      if (fileData.encoding === "base64" && fileData.content) {
        content = Buffer.from(fileData.content, "base64").toString("utf-8");
      } else if (typeof fileData.content === "string") {
        content = fileData.content;
      }

      res.json({
        name: fileData.name,
        path: fileData.path,
        sha: fileData.sha,
        size: fileData.size,
        content,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load file content." });
    }
  });

  // GitHub Commits list endpoint
  app.get("/api/github/commits", async (req, res) => {
    try {
      const owner = (req.query.owner as string)?.trim();
      const repo = (req.query.repo as string)?.trim();
      const branch = (req.query.branch as string)?.trim();
      const perPage = parseInt((req.query.per_page as string) || "30", 10);
      const token = ((req.headers["x-github-token"] as string) || (req.query.token as string))?.trim();

      if (!owner || !repo) {
        return res.status(400).json({ error: "Owner and repo are required." });
      }

      let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}`;
      if (branch) {
        url += `&sha=${encodeURIComponent(branch)}`;
      }

      const ghRes = await fetch(url, { headers: getGitHubHeaders(token) });
      if (!ghRes.ok) {
        const errJson = await ghRes.json().catch(() => ({}));
        return res.status(ghRes.status).json({
          error: errJson.message || `GitHub API error: ${ghRes.statusText}`,
        });
      }

      const commits = await ghRes.json();
      res.json({ commits: Array.isArray(commits) ? commits : [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch commits." });
    }
  });

  // GitHub Commit Detail & Diff endpoint
  app.get("/api/github/commit-detail", async (req, res) => {
    try {
      const owner = (req.query.owner as string)?.trim();
      const repo = (req.query.repo as string)?.trim();
      const ref = (req.query.ref as string)?.trim();
      const token = ((req.headers["x-github-token"] as string) || (req.query.token as string))?.trim();

      if (!owner || !repo || !ref) {
        return res.status(400).json({ error: "Owner, repo and commit ref are required." });
      }

      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`, {
        headers: getGitHubHeaders(token),
      });

      if (!ghRes.ok) {
        const errJson = await ghRes.json().catch(() => ({}));
        return res.status(ghRes.status).json({
          error: errJson.message || `Failed to fetch commit: ${ghRes.statusText}`,
        });
      }

      const data = await ghRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch commit diff." });
    }
  });

  // GitHub Pull Requests endpoint
  app.get("/api/github/pulls", async (req, res) => {
    try {
      const owner = (req.query.owner as string)?.trim();
      const repo = (req.query.repo as string)?.trim();
      const state = (req.query.state as string)?.trim() || "all";
      const token = ((req.headers["x-github-token"] as string) || (req.query.token as string))?.trim();

      if (!owner || !repo) {
        return res.status(400).json({ error: "Owner and repo are required." });
      }

      const ghRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(state)}&per_page=30&sort=updated`,
        { headers: getGitHubHeaders(token) }
      );

      if (!ghRes.ok) {
        const errJson = await ghRes.json().catch(() => ({}));
        return res.status(ghRes.status).json({
          error: errJson.message || `Failed to fetch pull requests: ${ghRes.statusText}`,
        });
      }

      const pulls = await ghRes.json();
      res.json({ pulls: Array.isArray(pulls) ? pulls : [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch pull requests." });
    }
  });

  // GitHub Issues endpoint
  app.get("/api/github/issues", async (req, res) => {
    try {
      const owner = (req.query.owner as string)?.trim();
      const repo = (req.query.repo as string)?.trim();
      const state = (req.query.state as string)?.trim() || "all";
      const token = ((req.headers["x-github-token"] as string) || (req.query.token as string))?.trim();

      if (!owner || !repo) {
        return res.status(400).json({ error: "Owner and repo are required." });
      }

      const ghRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=${encodeURIComponent(state)}&per_page=30&sort=updated`,
        { headers: getGitHubHeaders(token) }
      );

      if (!ghRes.ok) {
        const errJson = await ghRes.json().catch(() => ({}));
        return res.status(ghRes.status).json({
          error: errJson.message || `Failed to fetch issues: ${ghRes.statusText}`,
        });
      }

      const issues = await ghRes.json();
      // Filter out pull requests which GitHub returns in issues endpoint
      const pureIssues = Array.isArray(issues) ? issues.filter((i: any) => !i.pull_request) : [];
      res.json({ issues: pureIssues });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch issues." });
    }
  });

  // AI Commit Explainer Document generator
  app.post("/api/github/explain-commit", async (req, res) => {
    try {
      const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
      const bodyKey = req.body.apiKey as string | undefined;
      const effectiveKey = (headerKey && headerKey.trim()) || (bodyKey && bodyKey.trim()) || process.env.GEMINI_API_KEY;

      if (!effectiveKey || !effectiveKey.trim()) {
        return res.status(400).json({
          error: "Gemini API key is required. Please set GEMINI_API_KEY or configure it in Settings.",
        });
      }

      const { commitSha, commitMessage, authorName, stats, files, repoFullName, model } = req.body;
      const targetModel = getGeminiModelForSdk(model || "gemini-3.5-flash-lite");

      const ai = new GoogleGenAI({
        apiKey: effectiveKey.trim(),
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      // Format file changes and sample patch diffs
      const fileListSummary = (files || [])
        .map((f: any) => {
          let str = `- **${f.filename}** (${f.status}, +${f.additions} -${f.deletions})`;
          if (f.patch) {
            str += `\n\`\`\`diff\n${f.patch.slice(0, 1500)}\n\`\`\``;
          }
          return str;
        })
        .slice(0, 10)
        .join("\n\n");

      const prompt = `You are a Senior Software Engineer and Git Code Reviewer.
Analyze this GitHub commit in repository "${repoFullName || 'Repository'}":

Commit SHA: ${commitSha}
Author: ${authorName}
Commit Message: "${commitMessage}"
Stats: Total changed: ${stats?.total || 0} (+${stats?.additions || 0}, -${stats?.deletions || 0})

Changed Files & Diffs:
${fileListSummary || "No patch data provided."}

Generate a clear, thorough, and highly readable Markdown explanation of this commit covering:
1. 📌 **Commit Purpose (Kyu kiya gaya change)**: Why this commit was made and what problem/feature it targets.
2. 📂 **Files & Folders Modified**: Exact breakdown of which directories and files were touched and why.
3. 🔍 **Code Changes & Diff Highlights**: Clear explanation of code additions (+), deletions (-), refactors, or fixes.
4. 💡 **Architectural & Functional Impact**: How this modifies the system behavior or application workflow.

Format as a pristine Markdown document with headers, bold text, bullet points, and code blocks.`;

      let response: any;
      try {
        response = await executeGeminiWithRetry(() =>
          ai.models.generateContent({
            model: targetModel,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              systemInstruction: "You are an expert Git reviewer and technical architect. Provide deep, accurate, and easy-to-understand explanations of code diffs and commits in bilingual clear English/Hinglish.",
            },
          })
        );
      } catch (genErr: any) {
        console.warn(`[Commit Explainer Model ${targetModel} failed, retrying with gemini-3.8-flash]:`, genErr?.message);
        response = await executeGeminiWithRetry(() =>
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              systemInstruction: "You are an expert Git reviewer and technical architect. Provide deep, accurate, and easy-to-understand explanations of code diffs and commits in bilingual clear English/Hinglish.",
            },
          })
        );
      }

      const markdown = response.text || `# Commit Analysis: \`${commitSha?.slice(0, 7)}\`\n\n${commitMessage}`;
      res.json({
        sha: commitSha,
        commitMessage,
        authorName,
        markdown,
        modelUsed: model || "gemini-3.5-flash-lite",
      });
    } catch (error: any) {
      console.error("Commit analysis error:", error);
      res.status(500).json({ error: extractCleanErrorMessage(error) });
    }
  });

  // Project Unified Deep Scan (Whole project scanned together -> 4 Large Documents)
  app.post("/api/repo/deep-scan", async (req, res) => {
    try {
      const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
      const bodyKey = req.body.apiKey as string | undefined;
      const effectiveKey = (headerKey && headerKey.trim()) || (bodyKey && bodyKey.trim()) || process.env.GEMINI_API_KEY;

      if (!effectiveKey || !effectiveKey.trim()) {
        return res.status(400).json({
          error: "Gemini API key is required. Please set GEMINI_API_KEY or enter your key in Settings.",
        });
      }

      const { repoFullName, repoName, description, fileList, sampleFilesContent } = req.body;

      const ai = new GoogleGenAI({
        apiKey: effectiveKey.trim(),
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const fileListFormatted = Array.isArray(fileList) ? fileList.join("\n") : fileList;

      const prompt = `You are a Principal Software Architect and Lead Systems Engineer.
Perform an exhaustive, deep scan of the entire repository "${repoFullName || repoName}" in one unified pass.
Repository Description: ${description || "No description provided"}

Here is the complete file list of the entire project:
${fileListFormatted}

Key source files content overview:
${sampleFilesContent || "No sample content provided."}

Generate 4 SEPARATE, LARGE, COMPREHENSIVE MARKDOWN DOCUMENTS for this project:

1. **PROJECT OVERVIEW (Kyu ban raha hai / Purpose & Vision)**:
   - Detailed explanation of why this website/project exists (kyu aur kis liye banaya gaya hai).
   - Core problem statement, target audience, and business/technical goals.
   - Comprehensive system walkthrough explaining the entire concept from scratch.
   - User journey and execution workflows.

2. **ALL ENDPOINTS DIRECTORY (All API & Route Endpoints across whole site)**:
   - Exhaustive table and individual breakdowns of EVERY endpoint, API route, server controller, client fetch handler, and GitHub API integration.
   - Method (GET/POST/PUT/DELETE/WS), Path, Description, Authentication, Request Params/Body, Response format, and File Location.
   - If frontend-only or hybrid, include all routing endpoints, fetch endpoints, and GitHub REST API integration points.

3. **STRUCTURE & ARCHITECTURE (Complete Codebase Structure & System Design)**:
   - Full directory layout and folder organization breakdown.
   - Technical stack (Frontend, Backend, Styling, State Management, Build tools).
   - Data flow diagrams (ASCII/Mermaid) showing how state moves across components and server.
   - Design patterns, component hierarchy, and dependency relationships.

4. **FEATURES CATALOG (Kya kya features hain - Complete feature breakdown)**:
   - Detailed catalog of every single feature and capability implemented in this site.
   - For each feature: what it does, how it works, files implementing it, user interactions, and technical highlights.

Return the response in the following EXACT JSON format:
\`\`\`json
{
  "projectOverviewDoc": "# 📄 Project Overview: ${repoName || repoFullName}\\n\\n## 🎯 Why This Project Exists (Kyu ban raha hai)\\n...",
  "endpointsDoc": "# 🔌 Complete Endpoints Directory: ${repoName || repoFullName}\\n\\n## 📋 Endpoints Overview Table\\n...",
  "structureArchitectureDoc": "# 🏛️ Codebase Structure & Architecture: ${repoName || repoFullName}\\n\\n## 📁 Directory Structure Breakdown\\n...",
  "featuresCatalogDoc": "# ⚡ Features & Capabilities Catalog: ${repoName || repoFullName}\\n\\n## 🚀 Complete Feature Inventory\\n..."
}
\`\`\``;

      const response = await executeGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: "You are an elite technical documentation writer and principal system architect. Deliver large, rich, production-grade technical documents with pristine markdown formatting.",
          },
        })
      );

      const responseText = response.text || "";
      let jsonResult: any = null;

      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonResult = JSON.parse(jsonMatch[1]);
        } else {
          jsonResult = JSON.parse(responseText);
        }
      } catch {
        jsonResult = {
          projectOverviewDoc: `# 📄 Project Overview: ${repoName || repoFullName}\n\n## 🎯 Why This Project Exists\n\n${responseText}`,
          endpointsDoc: `# 🔌 Endpoints Directory\n\n${responseText}`,
          structureArchitectureDoc: `# 🏛️ Architecture & Structure\n\n${responseText}`,
          featuresCatalogDoc: `# ⚡ Features Catalog\n\n${responseText}`,
        };
      }

      res.json(jsonResult);
    } catch (error: any) {
      console.error("Deep scan error:", error);
      res.status(500).json({ error: extractCleanErrorMessage(error) });
    }
  });

  // Server-side Gemini Architecture & Endpoints Deep Analysis
  app.post("/api/repo/analyze-architecture", async (req, res) => {
    try {
      const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
      const bodyKey = req.body.apiKey as string | undefined;
      const effectiveKey = (headerKey && headerKey.trim()) || (bodyKey && bodyKey.trim()) || process.env.GEMINI_API_KEY;

      if (!effectiveKey || !effectiveKey.trim()) {
        return res.status(400).json({
          error: "Gemini API key is required. Please set GEMINI_API_KEY or provide your API key in Settings.",
        });
      }

      const { repoFullName, repoName, fileList, sampleFilesContent, description } = req.body;

      const ai = new GoogleGenAI({
        apiKey: effectiveKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `You are a Principal Software Architect conducting an in-depth codebase audit of the GitHub repository "${repoFullName || repoName}".
Repository Description: ${description || "No description provided"}

Here is the complete filtered list of files in the repository:
${Array.isArray(fileList) ? fileList.slice(0, 150).join("\n") : fileList}

Key files content overview:
${sampleFilesContent || "No extra file content provided."}

Perform an exhaustive, deep analysis of this project and generate a structured report covering:
1. Why the project exists (kyu aur kis liye banaya gaya hai).
2. Its complete technical architecture (frontend, backend, state, styling, data flow).
3. EVERY API/route/endpoint in the application.
4. An index/breakdown for each file listed above (purpose, what is inside, key exports, dependencies).

Return the response in the following exact JSON format:
\`\`\`json
{
  "projectName": "${repoName || repoFullName}",
  "projectPurpose": "Detailed explanation of why this project is built (kyu aur kis liye banaya gaya hai), its core vision, target users, and key problem it solves.",
  "coreArchitecture": "Step-by-step technical architecture explanation: frontend, backend, state management, build system, styling, external services, folder layout breakdown.",
  "techStack": [
    { "category": "Frontend / UI", "items": ["React", "TypeScript", "Tailwind CSS", "Vite"] },
    { "category": "Backend / Server", "items": ["Node.js", "Express"] },
    { "category": "AI / APIs", "items": ["Google Gemini API", "GitHub REST API"] },
    { "category": "Tools & Build", "items": ["esbuild", "PostCSS"] }
  ],
  "dataFlow": "Detailed walkthrough of the end-to-end data flow from user action to server processing to response display.",
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/example",
      "description": "Clear explanation of what this endpoint does",
      "fileLocation": "server.ts",
      "payload": "Query parameters or JSON body",
      "response": "JSON payload structure",
      "auth": "Public / Bearer Token"
    }
  ],
  "endpointsMarkdown": "A complete, beautifully formatted Markdown table & breakdown of all discovered endpoints, routes, controllers, or API handlers.",
  "fullMarkdown": "A complete, comprehensive standalone Markdown document summarizing the whole architecture, why it was made, data flow, endpoints, and deployment instructions.",
  "setupGuide": "Step-by-step setup, installation, environment variable configuration, and deployment instructions.",
  "filesSummary": {
    "src/App.tsx": {
      "purpose": "Main React application component orchestrating state and layout.",
      "summary": "Handles repo selection, active files, dual vertical tabs, and chat workspace.",
      "keyExports": ["App"],
      "dependencies": ["react", "lucide-react"]
    }
  }
}
\`\`\`

IMPORTANT: Include EVERY endpoint and summarize the purpose of files in "filesSummary".`;

      const response = await executeGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: "You are an expert software architect and technical writer. Provide precise, accurate, and structured insights about repositories.",
          },
        })
      );

      const responseText = response.text || "";
      let jsonResult: any = null;

      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonResult = JSON.parse(jsonMatch[1]);
        } else {
          jsonResult = JSON.parse(responseText);
        }
      } catch (parseErr) {
        // Fallback structured object from raw text
        jsonResult = {
          projectName: repoName || repoFullName,
          projectPurpose: `Analysis for ${repoFullName}. Full technical overview generated by Gemini.`,
          coreArchitecture: responseText,
          techStack: [],
          dataFlow: "Standard client-server architecture.",
          endpoints: [],
          endpointsMarkdown: responseText,
          fullMarkdown: responseText,
          setupGuide: "See repository README.md for setup instructions.",
          filesSummary: {},
        };
      }

      res.json(jsonResult);
    } catch (error: any) {
      console.error("Architecture analysis error:", error);
      res.status(500).json({ error: extractCleanErrorMessage(error) });
    }
  });

  // Server-side Gemini Single File Markdown Doc Generator
  app.post("/api/repo/analyze-file", async (req, res) => {
    try {
      const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
      const bodyKey = req.body.apiKey as string | undefined;
      const effectiveKey = (headerKey && headerKey.trim()) || (bodyKey && bodyKey.trim()) || process.env.GEMINI_API_KEY;

      if (!effectiveKey || !effectiveKey.trim()) {
        return res.status(400).json({
          error: "Gemini API key is required. Please set GEMINI_API_KEY or enter your API key in Settings.",
        });
      }

      const { repoFullName, filePath, fileName, fileContent, language } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "filePath is required." });
      }

      const ai = new GoogleGenAI({
        apiKey: effectiveKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `You are an elite software documentation engineer.
Analyze the following source file from repository "${repoFullName || 'Repository'}":

File Path: \`${filePath}\`
Language: \`${language || 'text'}\`

Source Code:
\`\`\`${language || ''}
${(fileContent || '').slice(0, 25000)}
\`\`\`

Generate a comprehensive Markdown documentation for this single file.
Your response MUST be in this JSON structure:
\`\`\`json
{
  "path": "${filePath}",
  "name": "${fileName || filePath.split('/').pop()}",
  "language": "${language || 'text'}",
  "purpose": "A clear, concise 1-2 sentence summary of what this file is for (kam kya hai - exact role in the project).",
  "summary": "Detailed explanation of what is inside this file (kya kya hai is file me): internal logic, state variables, key mechanisms, and behavior.",
  "keyExports": ["ExportedFunction1", "ExportedComponent", "TypeInterface", "RouteHandler"],
  "dependencies": ["react", "lucide-react", "../types"],
  "mdContent": "# Markdown documentation for ${filePath}\\n\\n## 📌 Purpose (Kam kya hai)\\n...\\n\\n## 🔍 What is Inside (Kya kya code hai)\\n...\\n\\n## ⚙️ Key Functions & Exports\\n...\\n\\n## 🔗 Dependencies & Connections\\n..."
}
\`\`\``;

      let docResult: any = null;
      try {
        const response = await executeGeminiWithRetry(() =>
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              systemInstruction: "You are a senior code analyst. Create structured, high-clarity markdown documentation for source code files.",
            },
          }),
          2,
          2000
        );

        const responseText = response.text || "";
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          docResult = JSON.parse(jsonMatch[1]);
        } else {
          docResult = JSON.parse(responseText);
        }
      } catch (aiErr: any) {
        console.warn(`[File Analysis AI Warning] for ${filePath}:`, extractCleanErrorMessage(aiErr));
        // Graceful fallback markdown so 429 doesn't fail the whole app
        const ext = filePath.split('.').pop() || '';
        const name = fileName || filePath.split('/').pop() || filePath;
        docResult = {
          path: filePath,
          name,
          language: language || ext,
          purpose: `Source code file \`${name}\` in ${repoFullName || 'the project'}.`,
          summary: `Handles module implementation for ${filePath}.`,
          keyExports: [name],
          dependencies: [],
          mdContent: `# 📄 \`${filePath}\`\n\n## 📌 Purpose (Kam kya hai)\nSource code module for \`${name}\`.\n\n## 🔍 What is Inside (Kya kya code hai)\nImplements code logic and export definitions for \`${filePath}\`.\n\n- **Path**: \`${filePath}\`\n- **Type**: \`.${ext}\``,
          quotaFallback: true,
        };
      }

      res.json(docResult);
    } catch (error: any) {
      console.error("File doc analysis error:", error);
      res.status(500).json({ error: extractCleanErrorMessage(error) });
    }
  });

  // Chat completion endpoint (supports SSE streaming)
  app.post("/api/chat", async (req, res) => {
    try {
      const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
      const bodyKey = req.body.apiKey as string | undefined;
      const effectiveKey = (headerKey && headerKey.trim()) || (bodyKey && bodyKey.trim()) || process.env.GEMINI_API_KEY;

      if (!effectiveKey || !effectiveKey.trim()) {
        return res.status(400).json({
          error: "Gemini API key is required. Please enter your API key in the top settings or provide GEMINI_API_KEY.",
        });
      }

      const { messages, model = "gemini-3.5-flash-lite", systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const primaryModel = getGeminiModelForSdk(model);

      const ai = new GoogleGenAI({
        apiKey: effectiveKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Prepare formatted contents for Gemini
      const formattedContents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Setup Server-Sent Events headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      let responseStream: any;
      try {
        responseStream = await ai.models.generateContentStream({
          model: primaryModel,
          contents: formattedContents,
          config: {
            systemInstruction:
              systemInstruction ||
              `You are a helpful, knowledgeable, and polite AI assistant powered by Google ${model || 'Gemini 3.5 Flash-Lite'}. Use clear markdown formatting (bolding, lists, code blocks) when beneficial.`,
          },
        });
      } catch (streamInitErr: any) {
        console.warn(`[Stream Model Error for ${primaryModel}, falling back to gemini-3.8-flash]:`, streamInitErr?.message);
        responseStream = await ai.models.generateContentStream({
          model: "gemini-3.8-flash",
          contents: formattedContents,
          config: {
            systemInstruction:
              systemInstruction ||
              "You are a helpful, knowledgeable, and polite AI assistant powered by Google Gemini. Use clear markdown formatting (bolding, lists, code blocks) when beneficial.",
          },
        });
      }

      let latestUsage: any = null;

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
        if (chunk.usageMetadata) {
          latestUsage = chunk.usageMetadata;
        }
      }

      if (latestUsage) {
        res.write(
          `data: ${JSON.stringify({
            usage: {
              promptTokens: latestUsage.promptTokenCount || 0,
              candidatesTokens: latestUsage.candidatesTokenCount || 0,
              totalTokens: latestUsage.totalTokenCount || 0,
            },
          })}\n\n`
        );
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Gemini API stream error:", error);
      const errorMessage = extractCleanErrorMessage(error);
      
      if (!res.headersSent) {
        return res.status(500).json({ error: errorMessage });
      } else {
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
      }
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gemini Chat server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
