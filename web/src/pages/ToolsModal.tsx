import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Terminal, Monitor, Code, Puzzle, Check, X, RefreshCw, Download, Folder, Link, CheckSquare, Square, Plus, Trash2, FileText, Eye, Upload, Link2Off, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import type { Tool, SyncResult, ImportedSkill, Skill, SkillFilePreview } from '../lib/api';

const categoryIcons = {
  cli: Terminal,
  ide: Monitor,
  vscode: Code,
  jetbrains: Puzzle,
};

export default function ToolsModal() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [syncingTools, setSyncingTools] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<Map<string, SyncResult[]>>(new Map());
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [showSyncModal, setShowSyncModal] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedCentralSkill, setSelectedCentralSkill] = useState<Skill | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingSkill, setImportingSkill] = useState<string | null>(null);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [previewSkill, setPreviewSkill] = useState<ImportedSkill | null>(null);
  const [previewFiles, setPreviewFiles] = useState<SkillFilePreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const { data: toolsResponse, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: api.tools.list,
  });

  const { data: toolsSkillsResponse } = useQuery({
    queryKey: ['tools-skills'],
    queryFn: api.import.listToolsSkills,
  });

  const { data: skillsResponse } = useQuery({
    queryKey: ['skills'],
    queryFn: api.skills.list,
  });

  const { data: importedSkillsResponse, isLoading: isLoadingImported } = useQuery({
    queryKey: ['imported-skills'],
    queryFn: api.import.listToolsSkills,
    enabled: showImportModal,
  });

  const syncAllMutation = useMutation({
    mutationFn: () => api.sync.syncAll(),
    onSuccess: (response) => {
      if (response.data) {
        const resultsByTool = new Map<string, SyncResult[]>();
        let successCount = 0;
        let failCount = 0;
        for (const result of response.data) {
          const existing = resultsByTool.get(result.toolId) || [];
          existing.push(result);
          resultsByTool.set(result.toolId, existing);
          if (result.success) successCount++;
          else failCount++;
        }
        setSyncResults(resultsByTool);
        
        if (failCount === 0) {
          toast.success(`All ${successCount} skills synced successfully`);
        } else {
          toast.warning(`Sync complete: ${successCount} succeeded, ${failCount} failed`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const syncSelectedMutation = useMutation({
    mutationFn: ({ toolId, skillIds }: { toolId: string; skillIds: string[] }) =>
      Promise.all(skillIds.map(skillId => api.sync.syncSkillToTool(skillId, toolId))),
    onMutate: ({ toolId }) => {
      setSyncingTools((prev) => new Set(prev).add(toolId));
    },
    onSettled: (_, __, { toolId }) => {
      setSyncingTools((prev) => {
        const next = new Set(prev);
        next.delete(toolId);
        return next;
      });
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      if (failCount === 0) {
        toast.success(`${successCount} skills synced`);
      } else {
        toast.warning(`${successCount} succeeded, ${failCount} failed`);
      }
      setShowSyncModal(null);
      setSelectedSkills(new Set());
      queryClient.invalidateQueries({ queryKey: ['tools-skills'] });
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.skills.create(name),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setShowCreate(false);
      setNewSkillName('');
      toast.success(`Skill "${response.data?.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create skill: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.skills.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      const deletedName = selectedCentralSkill?.name;
      setSelectedCentralSkill(null);
      toast.success(`Skill "${deletedName}" deleted`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete skill: ${error.message}`);
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ toolId, skillName, symlink }: { toolId: string; skillName: string; symlink?: boolean }) =>
      api.import.importSkill(toolId, skillName, false, symlink),
    onSuccess: (_, { skillName, symlink }) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['imported-skills'] });
      queryClient.invalidateQueries({ queryKey: ['tools-skills'] });
      setImportingSkill(null);
      toast.success(`Skill "${skillName}" imported ${symlink ? 'as symlink' : 'by copy'}`);
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
      setImportingSkill(null);
    },
  });

  const batchImportMutation = useMutation({
    mutationFn: (skills: { toolId: string; skillName: string }[]) =>
      Promise.all(skills.map(s => api.import.importSkill(s.toolId, s.skillName, false, true))),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['imported-skills'] });
      queryClient.invalidateQueries({ queryKey: ['tools-skills'] });
      setSelectedImports(new Set());
      setShowImportModal(false);
      const success = results.filter(r => r.success).length;
      const failed = results.length - success;
      if (failed === 0) {
        toast.success(`All ${success} skills imported successfully`);
      } else {
        toast.warning(`Batch import: ${success} succeeded, ${failed} failed`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Batch import failed: ${error.message}`);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ toolId, skillName }: { toolId: string; skillName: string }) =>
      api.import.restoreFromSymlink(toolId, skillName),
    onSuccess: (response, { skillName }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['imported-skills'] });
        queryClient.invalidateQueries({ queryKey: ['tools-skills'] });
        toast.success(`Skill "${skillName}" restored from symlink`);
      } else {
        toast.error(`Restore failed: ${response.error || 'Unknown error'}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Restore failed: ${error.message}`);
    },
  });

  const tools = toolsResponse?.data || [];
  const detectedTools = tools.filter((t) => t.detected);
  const centralSkills = skillsResponse?.data || [];

  const groupedTools = tools.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category]!.push(tool);
      return acc;
    },
    {} as Record<string, Tool[]>
  );

  const categoryLabels: Record<string, string> = {
    cli: 'CLI Tools',
    ide: 'IDE',
    vscode: 'VS Code Extensions',
    jetbrains: 'JetBrains Plugins',
  };

  const toolsSkills = toolsSkillsResponse?.data || [];
  const importedSkills = importedSkillsResponse?.data || [];
  
  const skillsByTool = useMemo(() => {
    const map = new Map<string, ImportedSkill[]>();
    for (const skill of toolsSkills) {
      const existing = map.get(skill.toolId) || [];
      existing.push(skill);
      map.set(skill.toolId, existing);
    }
    return map;
  }, [toolsSkills]);

  const toggleExpand = (toolId: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  const toggleSkillSelection = (skillId: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const toggleSelectAllSkills = () => {
    if (selectedSkills.size === centralSkills.length) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(centralSkills.map(s => s.id)));
    }
  };

  const handleSyncSelected = (toolId: string) => {
    if (selectedSkills.size === 0) {
      toast.warning('Please select skills to sync');
      return;
    }
    syncSelectedMutation.mutate({ toolId, skillIds: Array.from(selectedSkills) });
  };

  const openSyncModal = (toolId: string) => {
    setSelectedSkills(new Set(centralSkills.map(s => s.id)));
    setShowSyncModal(toolId);
  };

  const handleCreate = () => {
    if (newSkillName.trim()) {
      createMutation.mutate(newSkillName.trim());
    }
  };

  const handleImport = (skill: ImportedSkill, useSymlink: boolean = true) => {
    setImportingSkill(skill.name);
    importMutation.mutate({ toolId: skill.toolId, skillName: skill.name, symlink: useSymlink });
  };

  const toggleImportSelect = (key: string) => {
    const newSet = new Set(selectedImports);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedImports(newSet);
  };

  const toggleImportSelectAll = () => {
    if (selectedImports.size === importedSkills.length) {
      setSelectedImports(new Set());
    } else {
      setSelectedImports(new Set(importedSkills.map(s => `${s.toolId}-${s.name}`)));
    }
  };

  const handleBatchImport = () => {
    const toImport = importedSkills
      .filter(s => selectedImports.has(`${s.toolId}-${s.name}`))
      .map(s => ({ toolId: s.toolId, skillName: s.name }));
    if (toImport.length === 0) {
      toast.warning('Please select skills to import');
      return;
    }
    batchImportMutation.mutate(toImport);
  };

  const handlePreview = async (skill: ImportedSkill) => {
    setPreviewSkill(skill);
    setPreviewLoading(true);
    setShowPreviewModal(true);
    try {
      const response = await api.import.previewSkill(skill.toolId, skill.name);
      setPreviewFiles(response.data || []);
    } catch (error) {
      console.error('Failed to preview skill:', error);
      setPreviewFiles([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRestore = (skill: ImportedSkill) => {
    restoreMutation.mutate({ toolId: skill.toolId, skillName: skill.name });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tools & Skills</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            Manage skills and sync to AI tools ({detectedTools.length}/{tools.length} detected)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary btn-md flex items-center gap-2"
          >
            <Download size={18} />
            Import
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-secondary btn-md flex items-center gap-2"
          >
            <Plus size={18} />
            New Skill
          </button>
          <button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            <RefreshCw size={18} className={syncAllMutation.isPending ? 'animate-spin' : ''} />
            {syncAllMutation.isPending ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Create New Skill</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Skill name"
              className="input flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={!newSkillName.trim() || createMutation.isPending}
              className="btn btn-primary btn-md"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewSkillName('');
              }}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="card">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-semibold">Central Repository ({centralSkills.length})</h3>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {centralSkills.length === 0 ? (
                <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No skills yet. Create or import one!
                </div>
              ) : (
                centralSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedCentralSkill(skill)}
                    className={`w-full p-3 text-left hover:bg-[hsl(var(--muted))] transition-colors ${
                      selectedCentralSkill?.id === skill.id ? 'bg-[hsl(var(--muted))]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[hsl(var(--muted-foreground))]" />
                        <span className="font-medium">{skill.name}</span>
                      </div>
                      <ChevronRight size={16} className="text-[hsl(var(--muted-foreground))]" />
                    </div>
                    {skill.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate">
                        {skill.description}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedCentralSkill && (
            <div className="card mt-4">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">{selectedCentralSkill.name}</h3>
                <button
                  onClick={() => deleteMutation.mutate(selectedCentralSkill.id)}
                  disabled={deleteMutation.isPending}
                  className="btn btn-ghost btn-sm text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="p-3 text-xs">
                {selectedCentralSkill.description && (
                  <p className="text-[hsl(var(--muted-foreground))] mb-2">
                    {selectedCentralSkill.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedCentralSkill.tags.map((tag) => (
                    <span key={tag} className="badge badge-secondary text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-[hsl(var(--muted-foreground))]">
                  {selectedCentralSkill.files.length} files
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {Object.entries(groupedTools).map(([category, categoryTools]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons] || Puzzle;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <h2 className="text-lg font-semibold">{categoryLabels[category] || category}</h2>
                </div>

                <div className="space-y-2">
                  {categoryTools.map((tool) => {
                    const isSyncing = syncingTools.has(tool.id);
                    const toolResults = syncResults.get(tool.id);
                    const successCount = toolResults?.filter((r) => r.success).length || 0;
                    const failCount = toolResults?.filter((r) => !r.success).length || 0;
                    const toolSkills = skillsByTool.get(tool.id) || [];
                    const isExpanded = expandedTools.has(tool.id);
                    const linkedSkills = toolSkills.filter(s => s.isSymlink);

                    return (
                      <div key={tool.id} className="card p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              {tool.detected ? (
                                <span className="badge badge-success flex items-center gap-1 text-xs">
                                  <Check size={10} /> Detected
                                </span>
                              ) : (
                                <span className="badge badge-secondary flex items-center gap-1 text-xs">
                                  <X size={10} /> Not Found
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm">{tool.displayName}</h3>
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                {tool.skillPath}
                              </p>
                            </div>
                          </div>
                          {tool.detected && (
                            <button
                              onClick={() => openSyncModal(tool.id)}
                              disabled={isSyncing}
                              className="btn btn-primary btn-sm flex items-center gap-1 ml-2"
                            >
                              {isSyncing ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Download size={12} />
                              )}
                            </button>
                          )}
                        </div>

                        {tool.detected && toolSkills.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleExpand(tool.id)}
                              className="flex items-center gap-2 text-xs hover:text-[hsl(var(--primary))] transition-colors"
                            >
                              <Folder size={12} />
                              <span>{toolSkills.length} skills</span>
                              {linkedSkills.length > 0 && (
                                <span className="text-green-600 flex items-center gap-1">
                                  <Link size={10} />
                                  {linkedSkills.length} linked
                                </span>
                              )}
                              <span className="text-[hsl(var(--muted-foreground))]">
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                                {toolSkills.map((skill) => (
                                  <div
                                    key={skill.name}
                                    className="flex items-center justify-between py-1 px-2 rounded bg-[hsl(var(--muted))]/50 text-xs"
                                  >
                                    <span className="truncate font-medium">{skill.name}</span>
                                    <span className={`flex items-center gap-1 ml-2 ${skill.isSymlink ? 'text-green-600' : 'text-[hsl(var(--muted-foreground))]'}`}>
                                      {skill.isSymlink ? (
                                        <>
                                          <Link size={10} />
                                          <span>Linked</span>
                                        </>
                                      ) : (
                                        <span>{(skill.size / 1024).toFixed(1)} KB</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {toolResults && toolResults.length > 0 && (
                          <div className="mt-2 pt-2 border-t text-xs">
                            {successCount > 0 && (
                              <span className="text-green-600 dark:text-green-400 mr-2">
                                ✓ {successCount} synced
                              </span>
                            )}
                            {failCount > 0 && (
                              <span className="text-red-600 dark:text-red-400">
                                ✗ {failCount} failed
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
          <div className="bg-[hsl(var(--card))] rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Import Skills from Tools</h3>
              <div className="flex items-center gap-2">
                {selectedImports.size > 0 && (
                  <button
                    onClick={handleBatchImport}
                    disabled={batchImportMutation.isPending}
                    className="btn btn-primary btn-sm flex items-center gap-1"
                  >
                    {batchImportMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Import Selected ({selectedImports.size})
                      </>
                    )}
                  </button>
                )}
                <button onClick={() => setShowImportModal(false)} className="btn btn-ghost btn-sm">✕</button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {isLoadingImported ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto" />
                </div>
              ) : importedSkills.length === 0 ? (
                <p className="text-center text-[hsl(var(--muted-foreground))]">No skills found in your installed tools.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-2 text-left w-10">
                          <button onClick={toggleImportSelectAll} className="p-1 hover:bg-[hsl(var(--muted))] rounded">
                            {selectedImports.size === importedSkills.length ? (
                              <CheckSquare size={16} className="text-[hsl(var(--primary))]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </th>
                        <th className="py-2 px-2 text-left">Name</th>
                        <th className="py-2 px-2 text-left">Tool</th>
                        <th className="py-2 px-2 text-center">Status</th>
                        <th className="py-2 px-2 text-right">Files</th>
                        <th className="py-2 px-2 text-right">Size</th>
                        <th className="py-2 px-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedSkills.map((skill) => {
                        const key = `${skill.toolId}-${skill.name}`;
                        const isSelected = selectedImports.has(key);
                        const isImporting = importingSkill === skill.name;
                        
                        return (
                          <tr
                            key={key}
                            className={`border-b hover:bg-[hsl(var(--muted))] cursor-pointer ${isSelected ? 'bg-[hsl(var(--primary))]/10' : ''}`}
                            onClick={() => toggleImportSelect(key)}
                          >
                            <td className="py-2 px-2">
                              {isSelected ? <CheckSquare size={16} className="text-[hsl(var(--primary))]" /> : <Square size={16} />}
                            </td>
                            <td className="py-2 px-2 font-medium">{skill.name}</td>
                            <td className="py-2 px-2">
                              <span className="badge badge-secondary text-xs">{skill.toolName}</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              {skill.isSymlink ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <Link size={12} /> Linked
                                </span>
                              ) : (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">Local</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right text-[hsl(var(--muted-foreground))]">{skill.fileCount}</td>
                            <td className="py-2 px-2 text-right text-[hsl(var(--muted-foreground))]">{(skill.size / 1024).toFixed(1)} KB</td>
                            <td className="py-2 px-2">
                              <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handlePreview(skill)} className="btn btn-ghost btn-sm p-1" title="Preview">
                                  <Eye size={14} />
                                </button>
                                {skill.isSymlink ? (
                                  <button onClick={() => handleRestore(skill)} className="btn btn-ghost btn-sm p-1" title="Restore">
                                    <Link2Off size={14} />
                                  </button>
                                ) : (
                                  <>
                                    <button onClick={() => handleImport(skill, true)} disabled={isImporting} className="btn btn-ghost btn-sm p-1" title="Import (symlink)">
                                      <Link size={14} />
                                    </button>
                                    <button onClick={() => handleImport(skill, false)} disabled={isImporting} className="btn btn-ghost btn-sm p-1" title="Import (copy)">
                                      <Upload size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && previewSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-[hsl(var(--card))] rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{previewSkill.name}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {previewSkill.toolName} - {previewSkill.fileCount} files
                </p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {previewLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto" />
                </div>
              ) : previewFiles.length === 0 ? (
                <p className="text-center text-[hsl(var(--muted-foreground))]">No files to preview</p>
              ) : (
                <div className="space-y-4">
                  {previewFiles.map((file) => (
                    <div key={file.path} className="border rounded">
                      <div className="px-3 py-2 bg-[hsl(var(--muted))] text-sm font-medium flex items-center justify-between">
                        <span>{file.path}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <pre className="p-3 text-xs overflow-x-auto max-h-[200px] bg-[hsl(var(--background))]">
                        {file.content.slice(0, 5000)}
                        {file.content.length > 5000 && '\n... (truncated)'}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowPreviewModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button
                onClick={() => { setShowPreviewModal(false); handleImport(previewSkill, true); }}
                className="btn btn-primary btn-sm flex items-center gap-1"
              >
                <Link size={14} /> Import (Symlink)
              </button>
              <button
                onClick={() => { setShowPreviewModal(false); handleImport(previewSkill, false); }}
                className="btn btn-primary btn-sm flex items-center gap-1"
              >
                <Upload size={14} /> Import (Copy)
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSyncModal(null)}>
          <div className="bg-[hsl(var(--card))] rounded-lg max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Sync Skills to Tool</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Select skills from central repo to sync</p>
              </div>
              <button onClick={() => setShowSyncModal(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            
            <div className="p-4">
              {centralSkills.length === 0 ? (
                <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
                  No skills in central repository. Import skills first.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={toggleSelectAllSkills} className="flex items-center gap-2 text-sm hover:text-[hsl(var(--primary))]">
                      {selectedSkills.size === centralSkills.length ? (
                        <CheckSquare size={16} className="text-[hsl(var(--primary))]" />
                      ) : (
                        <Square size={16} />
                      )}
                      <span>Select All</span>
                    </button>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">{selectedSkills.size} selected</span>
                  </div>
                  
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {centralSkills.map((skill) => {
                      const isSelected = selectedSkills.has(skill.id);
                      return (
                        <div
                          key={skill.id}
                          onClick={() => toggleSkillSelection(skill.id)}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-[hsl(var(--muted))] ${
                            isSelected ? 'bg-[hsl(var(--primary))]/10' : ''
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-[hsl(var(--primary))]" />
                          ) : (
                            <Square size={16} />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{skill.name}</span>
                            {skill.description && (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{skill.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{skill.files?.length || 0} files</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowSyncModal(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button
                onClick={() => handleSyncSelected(showSyncModal)}
                disabled={selectedSkills.size === 0 || syncSelectedMutation.isPending}
                className="btn btn-primary btn-sm flex items-center gap-1"
              >
                {syncSelectedMutation.isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <Download size={14} /> Sync {selectedSkills.size > 0 && `(${selectedSkills.size})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
