export interface Tool {
  id: string;
  name: string;
  displayName: string;
  category: 'cli' | 'ide' | 'vscode' | 'jetbrains';
  skillPath: string;
  configPath?: string;
  detected: boolean;
  installed: boolean;
  icon?: string;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  files: SkillFile[];
  createdAt: string;
  updatedAt: string;
  version: number;
  sourceTool?: string;
}

export interface SkillFile {
  name: string;
  path: string;
  size: number;
  hash: string;
  content?: string;
}

export interface SyncStatus {
  toolId: string;
  skillId: string;
  syncedAt: string;
  status: 'synced' | 'pending' | 'conflict' | 'error';
  method: 'symlink' | 'copy';
  error?: string;
}

export interface SyncResult {
  toolId: string;
  skillId: string;
  success: boolean;
  method: 'symlink' | 'copy';
  error?: string;
}

export interface MergePreview {
  skillName: string;
  sourceTool: string;
  targetPath: string;
  files: MergeFile[];
  conflicts: ConflictInfo[];
  hasConflicts: boolean;
}

export interface MergeFile {
  name: string;
  sourcePath: string;
  targetPath: string;
  action: 'create' | 'skip' | 'overwrite';
  exists: boolean;
  sourceHash: string;
  targetHash?: string;
}

export interface ConflictInfo {
  fileName: string;
  sourceHash: string;
  targetHash: string;
  autoResolvable: boolean;
}

export interface AppConfig {
  skillRepoPath: string;
  tools: Tool[];
  syncInterval: number;
  autoSync: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface ImportedSkill {
  name: string;
  toolId: string;
  toolName: string;
  skillPath: string;
  fileCount: number;
  size: number;
  description?: string;
  isSymlink?: boolean;
}

export interface SkillFilePreview {
  path: string;
  content: string;
  size: number;
}

export interface ImportResult {
  imported: number;
  failed: number;
  success: boolean;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const method = options?.method || 'GET';
    const isJsonMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    
    const finalOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    };
    
    if (isJsonMethod && !finalOptions.body) {
      finalOptions.body = '{}';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, finalOptions);
    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export const api = {
  health: () => fetchApi<{ status: string; timestamp: string; version: string }>('/health'),

  tools: {
    list: () => fetchApi<Tool[]>('/tools'),
    get: (id: string) => fetchApi<Tool>(`/tools/${id}`),
  },

  skills: {
    list: () => fetchApi<Skill[]>('/skills'),
    get: (id: string) => fetchApi<Skill>(`/skills/${id}`),
    create: (name: string, description?: string, sourceTool?: string) =>
      fetchApi<Skill>('/skills', {
        method: 'POST',
        body: JSON.stringify({ name, description, sourceTool }),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/skills/${id}`, { method: 'DELETE' }),
    getFile: (skillId: string, filePath: string) =>
      fetchApi<string>(`/skills/${skillId}/files/${encodeURIComponent(filePath)}`),
    updateFile: (skillId: string, filePath: string, content: string) =>
      fetchApi<void>(`/skills/${skillId}/files/${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
    preview: (skillId: string) =>
      fetchApi<SkillFilePreview[]>(`/skills/${skillId}/preview`),
  },

  config: {
    get: () => fetchApi<AppConfig>('/config'),
    update: (updates: Partial<AppConfig>) =>
      fetchApi<AppConfig>('/config', {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
  },

  sync: {
    status: () => fetchApi<SyncStatus[]>('/sync/status'),
    statusByTool: (toolId: string) => fetchApi<SyncStatus[]>(`/sync/status/${toolId}`),
    syncSkillToTool: (skillId: string, toolId: string) =>
      fetchApi<SyncResult>(`/sync/skill/${skillId}/tool/${toolId}`, { method: 'POST' }),
    syncSkillToAll: (skillId: string) =>
      fetchApi<SyncResult[]>(`/sync/skill/${skillId}/all`, { method: 'POST' }),
    syncAllToTool: (toolId: string) =>
      fetchApi<SyncResult[]>(`/sync/tool/${toolId}/all`, { method: 'POST' }),
    syncAll: () => fetchApi<SyncResult[]>('/sync/all', { method: 'POST' }),
  },

  merge: {
    preview: (toolId: string) => fetchApi<MergePreview[]>(`/merge/preview/${toolId}`),
    execute: (toolId: string, skillName: string, overwrite: boolean = false) =>
      fetchApi<void>('/merge/execute', {
        method: 'POST',
        body: JSON.stringify({ toolId, skillName, overwrite }),
      }),
  },

  import: {
    listToolsSkills: () => fetchApi<ImportedSkill[]>('/import/tools-skills'),
    previewSkill: (toolId: string, skillName: string) =>
      fetchApi<SkillFilePreview[]>(`/import/preview/${toolId}/skill/${encodeURIComponent(skillName)}`),
    importSkill: (toolId: string, skillName: string, overwrite: boolean = false, symlink: boolean = false) =>
      fetchApi<void>(`/import/tool/${toolId}/skill/${encodeURIComponent(skillName)}`, {
        method: 'POST',
        body: JSON.stringify({ overwrite, symlink }),
      }),
    importAllFromTool: (toolId: string, overwrite: boolean = false, symlink: boolean = false) =>
      fetchApi<ImportResult>(`/import/tool/${toolId}/all`, {
        method: 'POST',
        body: JSON.stringify({ overwrite, symlink }),
      }),
    restoreFromSymlink: (toolId: string, skillName: string) =>
      fetchApi<void>(`/import/restore/${toolId}/skill/${encodeURIComponent(skillName)}`, {
        method: 'POST',
      }),
  },
};
