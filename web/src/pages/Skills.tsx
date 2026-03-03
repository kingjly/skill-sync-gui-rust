import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText, FolderOpen, ChevronRight, Download, Upload, Eye, CheckSquare, Square, Link, Link2Off } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import type { Skill, ImportedSkill, SkillFilePreview } from '../lib/api';

export default function Skills() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importingSkill, setImportingSkill] = useState<string | null>(null);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [previewSkill, setPreviewSkill] = useState<ImportedSkill | null>(null);
  const [previewFiles, setPreviewFiles] = useState<SkillFilePreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const { data: skillsResponse, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: api.skills.list,
  });

  const { data: importedSkillsResponse, isLoading: isLoadingImported } = useQuery({
    queryKey: ['imported-skills'],
    queryFn: api.import.listToolsSkills,
    enabled: showImport,
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
      const deletedName = selectedSkill?.name;
      setSelectedSkill(null);
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
      setSelectedImports(new Set());
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

  const skills = skillsResponse?.data || [];
  const importedSkills = importedSkillsResponse?.data || [];

  const handleCreate = () => {
    if (newSkillName.trim()) {
      createMutation.mutate(newSkillName.trim());
    }
  };

  const handleImport = (skill: ImportedSkill, useSymlink: boolean = true) => {
    setImportingSkill(skill.name);
    importMutation.mutate({ toolId: skill.toolId, skillName: skill.name, symlink: useSymlink });
  };

  const toggleSelect = (key: string) => {
    const newSet = new Set(selectedImports);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedImports(newSet);
  };

  const toggleSelectAll = () => {
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

  const restoreMutation = useMutation({
    mutationFn: ({ toolId, skillName }: { toolId: string; skillName: string }) =>
      api.import.restoreFromSymlink(toolId, skillName),
    onSuccess: (response, { skillName }) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['imported-skills'] });
        toast.success(`Skill "${skillName}" restored from symlink`);
      } else {
        toast.error(`Restore failed: ${response.error || 'Unknown error'}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Restore failed: ${error.message}`);
    },
  });

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
          <h1 className="text-3xl font-bold">Skills</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            Manage your AI coding assistant skills
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn btn-secondary btn-md flex items-center gap-2"
          >
            <Download size={18} />
            Import
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            <Plus size={18} />
            New Skill
          </button>
        </div>
      </div>

      {showImport && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
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
              <button onClick={() => setShowImport(false)} className="btn btn-ghost btn-sm">
                ✕
              </button>
            </div>
          </div>
          
          {isLoadingImported ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--primary))] mx-auto" />
            </div>
          ) : importedSkills.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No skills found in your installed tools.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-2 text-left w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1 hover:bg-[hsl(var(--muted))] rounded"
                        title={selectedImports.size === importedSkills.length ? 'Deselect all' : 'Select all'}
                      >
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
                        className={`border-b hover:bg-[hsl(var(--muted))] cursor-pointer ${
                          isSelected ? 'bg-[hsl(var(--primary))]/10' : ''
                        }`}
                        onClick={() => toggleSelect(key)}
                      >
                        <td className="py-2 px-2">
                          {isSelected ? (
                            <CheckSquare size={16} className="text-[hsl(var(--primary))]" />
                          ) : (
                            <Square size={16} />
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <div>
                            <span className="font-medium">{skill.name}</span>
                            {skill.description && (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
                                {skill.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <span className="badge badge-secondary text-xs">{skill.toolName}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {skill.isSymlink ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <Link size={12} />
                              Linked
                            </span>
                          ) : (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">Local</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-[hsl(var(--muted-foreground))]">
                          {skill.fileCount}
                        </td>
                        <td className="py-2 px-2 text-right text-[hsl(var(--muted-foreground))]">
                          {(skill.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handlePreview(skill)}
                              className="btn btn-ghost btn-sm p-1"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                            {skill.isSymlink ? (
                              <button
                                onClick={() => handleRestore(skill)}
                                disabled={restoreMutation.isPending}
                                className="btn btn-ghost btn-sm p-1"
                                title="Restore from symlink"
                              >
                                <Link2Off size={14} />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleImport(skill, true)}
                                  disabled={isImporting}
                                  className="btn btn-ghost btn-sm p-1"
                                  title="Import (symlink)"
                                >
                                  {isImporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[hsl(var(--primary))]" />
                                  ) : (
                                    <Link size={14} />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleImport(skill, false)}
                                  disabled={isImporting}
                                  className="btn btn-ghost btn-sm p-1"
                                  title="Import (copy)"
                                >
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
              <button onClick={() => setShowPreviewModal(false)} className="btn btn-ghost btn-sm">
                ✕
              </button>
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
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
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
              <button onClick={() => setShowPreviewModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  handleImport(previewSkill, true);
                }}
                className="btn btn-primary btn-sm flex items-center gap-1"
              >
                <Link size={14} />
                Import (Symlink)
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  handleImport(previewSkill, false);
                }}
                className="btn btn-primary btn-sm flex items-center gap-1"
              >
                <Upload size={14} />
                Import (Copy)
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="p-3 border-b">
              <h3 className="font-semibold">All Skills ({skills.length})</h3>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {skills.length === 0 ? (
                <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No skills yet. Create or import one!
                </div>
              ) : (
                skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkill(skill)}
                    className={`w-full p-3 text-left hover:bg-[hsl(var(--muted))] transition-colors ${
                      selectedSkill?.id === skill.id ? 'bg-[hsl(var(--muted))]' : ''
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
        </div>

        <div className="lg:col-span-2">
          {selectedSkill ? (
            <div className="card">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedSkill.name}</h3>
                  {selectedSkill.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      {selectedSkill.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete skill "${selectedSkill.name}"?`)) {
                      deleteMutation.mutate(selectedSkill.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedSkill.tags.map((tag) => (
                    <span key={tag} className="badge badge-secondary">
                      {tag}
                    </span>
                  ))}
                </div>

                <h4 className="text-sm font-semibold mb-2">Files ({selectedSkill.files.length})</h4>
                <div className="space-y-1">
                  {selectedSkill.files.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between p-2 rounded bg-[hsl(var(--muted))] text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[hsl(var(--muted-foreground))]" />
                        <span>{file.path}</span>
                      </div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                  <p>Created: {new Date(selectedSkill.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedSkill.updatedAt).toLocaleString()}</p>
                  {selectedSkill.sourceTool && <p>Source: {selectedSkill.sourceTool}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))] opacity-50" />
              <p className="text-[hsl(var(--muted-foreground))]">
                Select a skill to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
