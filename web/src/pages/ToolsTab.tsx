import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Terminal, Monitor, Code, Puzzle, Check, X, RefreshCw, Download, Folder, Link, CheckSquare, Square, Plus, Trash2, FileText, Eye, Upload, Link2Off, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import SkillPreviewModal from '../components/SkillPreviewModal';
import type { Tool, SyncResult, ImportedSkill, Skill, SkillFilePreview } from '../lib/api';

const categoryIcons = {
  cli: Terminal,
  ide: Monitor,
  vscode: Code,
  jetbrains: Puzzle,
};

const toolIcons: Record<string, React.FC<{ className?: string }>> = {
  claude: ({ className }) => (
    <svg className={className} height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fillRule="nonzero"></path>
    </svg>
  ),
  cursor: ({ className }) => (
    <svg className={className} fill="currentColor" fillRule="evenodd" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z"></path>
    </svg>
  ),
  windsurf: ({ className }) => (
    <svg className={className} fill="currentColor" fillRule="evenodd" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path clipRule="evenodd" d="M23.78 5.004h-.228a2.187 2.187 0 00-2.18 2.196v4.912c0 .98-.804 1.775-1.76 1.775a1.818 1.818 0 01-1.472-.773L13.168 5.95a2.197 2.197 0 00-1.81-.95c-1.134 0-2.154.972-2.154 2.173v4.94c0 .98-.797 1.775-1.76 1.775-.57 0-1.136-.289-1.472-.773L.408 5.098C.282 4.918 0 5.007 0 5.228v4.284c0 .216.066.426.188.604l5.475 7.889c.324.466.8.812 1.351.938 1.377.316 2.645-.754 2.645-2.117V11.89c0-.98.787-1.775 1.76-1.775h.002c.586 0 1.135.288 1.472.773l4.972 7.163a2.15 2.15 0 001.81.95c1.158 0 2.151-.973 2.151-2.173v-4.939c0-.98.787-1.775 1.76-1.775h.194c.122 0 .22-.1.22-.222V5.225a.221.221 0 00-.22-.222z"></path>
    </svg>
  ),
  trae: ({ className }) => (
    <svg className={className} height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 20.541H3.428v-3.426H0V3.4h24V20.54zM3.428 17.115h17.144V6.827H3.428v10.288zm8.573-5.196l-2.425 2.424-2.424-2.424 2.424-2.424 2.425 2.424zm6.857-.001l-2.424 2.423-2.425-2.423 2.425-2.425 2.424 2.425z" fill="#32F08C"></path>
    </svg>
  ),
  kiro: ({ className }) => (
    <svg className={className} height="1em" viewBox="0 0 1200 1200" width="1em" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1200" rx="260" fill="#9046FF"/>
      <path d="M398.554 818.914C316.315 1001.03 491.477 1046.74 620.672 940.156C658.687 1059.66 801.052 970.473 852.234 877.795C964.787 673.567 919.318 465.357 907.64 422.374C827.637 129.443 427.623 128.946 358.8 423.865C342.651 475.544 342.402 534.18 333.458 595.051C328.986 625.86 325.507 645.488 313.83 677.785C306.873 696.424 297.68 712.819 282.773 740.645C259.915 783.881 269.604 867.113 387.87 823.883L399.051 818.914H398.554Z" fill="white"/>
      <path d="M636.123 549.353C603.328 549.353 598.359 510.097 598.359 486.742C598.359 465.623 602.086 448.977 609.293 438.293C615.504 428.852 624.697 424.131 636.123 424.131C647.555 424.131 657.492 428.852 664.447 438.541C672.398 449.474 676.623 466.12 676.623 486.742C676.623 525.998 661.471 549.353 636.375 549.353H636.123Z" fill="black"/>
      <path d="M771.24 549.353C738.445 549.353 733.477 510.097 733.477 486.742C733.477 465.623 737.203 448.977 744.41 438.293C750.621 428.852 759.814 424.131 771.24 424.131C782.672 424.131 792.609 428.852 799.564 438.541C807.516 449.474 811.74 466.12 811.74 486.742C811.74 525.998 796.588 549.353 771.492 549.353H771.24Z" fill="black"/>
    </svg>
  ),
  gemini: ({ className }) => (
    <svg className={className} height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="#3186FF"></path>
    </svg>
  ),
  github: ({ className }) => (
    <svg className={className} fill="currentColor" fillRule="evenodd" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0c6.63 0 12 5.276 12 11.79-.001 5.067-3.29 9.567-8.175 11.187-.6.118-.825-.25-.825-.56 0-.398.015-1.665.015-3.242 0-1.105-.375-1.813-.81-2.181 2.67-.295 5.475-1.297 5.475-5.822 0-1.297-.465-2.344-1.23-3.169.12-.295.54-1.503-.12-3.125 0 0-1.005-.324-3.3 1.209a11.32 11.32 0 00-3-.398c-1.02 0-2.04.133-3 .398-2.295-1.518-3.3-1.209-3.3-1.209-.66 1.622-.24 2.83-.12 3.125-.765.825-1.23 1.887-1.23 3.169 0 4.51 2.79 5.527 5.46 5.822-.345.294-.66.81-.765 1.577-.69.31-2.415.81-3.495-.973-.225-.354-.9-1.223-1.845-1.209-1.005.015-.405.56.015.781.51.28 1.095 1.327 1.23 1.666.24.663 1.02 1.93 4.035 1.385 0 .988.015 1.916.015 2.196 0 .31-.225.664-.825.56C3.303 21.374-.003 16.867 0 11.791 0 5.276 5.37 0 12 0z"></path>
    </svg>
  ),
  openai: ({ className }) => (
    <svg className={className} fill="currentColor" fillRule="evenodd" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z"></path>
    </svg>
  ),
  cline: ({ className }) => (
    <svg className={className} fill="currentColor" fillRule="evenodd" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.035 3.991c2.75 0 4.98 2.24 4.98 5.003v1.667l1.45 2.896a1.01 1.01 0 01-.002.909l-1.448 2.864v1.668c0 2.762-2.23 5.002-4.98 5.002H7.074c-2.751 0-4.98-2.24-4.98-5.002V17.33l-1.48-2.855a1.01 1.01 0 01-.003-.927l1.482-2.887V8.994c0-2.763 2.23-5.003 4.98-5.003h9.962zM8.265 9.6a2.274 2.274 0 00-2.274 2.274v4.042a2.274 2.274 0 004.547 0v-4.042A2.274 2.274 0 008.265 9.6zm7.326 0a2.274 2.274 0 00-2.274 2.274v4.042a2.274 2.274 0 104.548 0v-4.042A2.274 2.274 0 0015.59 9.6z"></path>
      <path d="M12.054 5.558a2.779 2.779 0 100-5.558 2.779 2.779 0 000 5.558z"></path>
    </svg>
  ),
  copilot: ({ className }) => (
    <svg className={className} fill="currentColor" fillRule="evenodd" height="1em" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 23l.073-.001a2.53 2.53 0 01-2.347-1.838l-.697-2.433a2.529 2.529 0 00-2.426-1.839h-.497l-.104-.002c-4.485 0-2.935-5.278-1.75-9.225l.162-.525C2.412 3.99 3.883 1 6.25 1h8.86c1.12 0 2.106.745 2.422 1.829l.715 2.453a2.53 2.53 0 002.247 1.823l.147.005.534.001c3.557.115 3.088 3.745 2.156 7.206l-.113.413c-.154.548-.315 1.089-.47 1.607l-.163.525C21.588 20.01 20.116 23 17.75 23h-8.75zm8.22-15.89l-3.856.001a2.526 2.526 0 00-2.35 1.615L9.21 15.04a2.529 2.529 0 01-2.43 1.847l3.853.002c1.056 0 1.992-.661 2.361-1.644l1.796-6.287a2.529 2.529 0 012.43-1.848z"></path>
    </svg>
  ),
};

function getToolIcon(tool: Tool): React.FC<{ className?: string }> | null {
  if (tool.icon && toolIcons[tool.icon]) {
    return toolIcons[tool.icon] ?? null;
  }
  return null;
}

export default function ToolsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'skills' | 'tools'>('skills');
  
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
  const [previewCentralSkill, setPreviewCentralSkill] = useState<Skill | null>(null);

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

  const handlePreviewCentralSkill = async (skill: Skill) => {
    setPreviewCentralSkill(skill);
    setPreviewLoading(true);
    setPreviewFiles([]);
    try {
      const response = await api.skills.preview(skill.id);
      setPreviewFiles(response.data || []);
    } catch (error) {
      console.error('Failed to preview skill:', error);
      setPreviewFiles([]);
    } finally {
      setPreviewLoading(false);
    }
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
        {activeTab === 'tools' && (
          <button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            <RefreshCw size={18} className={syncAllMutation.isPending ? 'animate-spin' : ''} />
            {syncAllMutation.isPending ? 'Syncing...' : 'Sync All'}
          </button>
        )}
      </div>

      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('skills')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'skills'
                ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            Skills Management
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tools'
                ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            Tools Sync
          </button>
        </div>
      </div>

      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-secondary btn-md flex items-center gap-2"
            >
              <Download size={18} />
              Import from Tools
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-secondary btn-md flex items-center gap-2"
            >
              <Plus size={18} />
              New Skill
            </button>
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

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="card">
                <div className="p-3 border-b">
                  <h3 className="font-semibold">Central Repository ({centralSkills.length})</h3>
                </div>
                <div className="divide-y max-h-[500px] overflow-y-auto">
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
            </div>

            <div className="lg:col-span-2">
              {selectedCentralSkill ? (
                <div className="card">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedCentralSkill.name}</h3>
                      {selectedCentralSkill.description && (
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                          {selectedCentralSkill.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreviewCentralSkill(selectedCentralSkill)}
                        className="btn btn-secondary btn-sm flex items-center gap-1"
                      >
                        <Eye size={14} />
                        Preview
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(selectedCentralSkill.id)}
                        disabled={deleteMutation.isPending}
                        className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedCentralSkill.tags.map((tag) => (
                        <span key={tag} className="badge badge-secondary">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <h4 className="text-sm font-semibold mb-2">Files ({selectedCentralSkill.files.length})</h4>
                    <div className="space-y-1">
                      {[...selectedCentralSkill.files].sort((a, b) => {
                        const aBasename = a.path.split('/').pop() || a.path;
                        const bBasename = b.path.split('/').pop() || b.path;
                        if (aBasename.toLowerCase() === 'skill.md') return -1;
                        if (bBasename.toLowerCase() === 'skill.md') return 1;
                        const aIsMd = a.path.toLowerCase().endsWith('.md');
                        const bIsMd = b.path.toLowerCase().endsWith('.md');
                        if (aIsMd && !bIsMd) return -1;
                        if (!aIsMd && bIsMd) return 1;
                        return a.path.localeCompare(b.path, undefined, { numeric: true });
                      }).map((file) => {
                        const parts = file.path.split('/');
                        const filename = parts.pop() || file.path;
                        const dirPath = parts.length > 0 ? parts.join('/') : '';
                        const isSkillMd = filename.toLowerCase() === 'skill.md';
                        
                        return (
                          <div
                            key={file.path}
                            className="flex items-center justify-between p-2 rounded bg-[hsl(var(--muted))] text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} className={`${isSkillMd ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'} shrink-0`} />
                              <div className="flex flex-col min-w-0">
                                <span className="truncate font-medium">{filename}</span>
                                {dirPath && (
                                  <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">{dirPath}</span>
                                )}
                              </div>
                              {isSkillMd && (
                                <span className="badge badge-primary text-[10px] px-1.5 py-0.5 shrink-0">SKILL</span>
                              )}
                            </div>
                            <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0 ml-2">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                      <p>Created: {new Date(selectedCentralSkill.createdAt).toLocaleString()}</p>
                      <p>Updated: {new Date(selectedCentralSkill.updatedAt).toLocaleString()}</p>
                      {selectedCentralSkill.sourceTool && <p>Source: {selectedCentralSkill.sourceTool}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <Folder className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))] opacity-50" />
                  <p className="text-[hsl(var(--muted-foreground))]">
                    Select a skill to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="space-y-6">
          {Object.entries(groupedTools).map(([category, categoryTools]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons] || Puzzle;
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                  <h2 className="text-xl font-semibold">{categoryLabels[category] || category}</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...categoryTools].filter(t => t.detected).map((tool) => {
                    const isSyncing = syncingTools.has(tool.id);
                    const toolResults = syncResults.get(tool.id);
                    const successCount = toolResults?.filter((r) => r.success).length || 0;
                    const failCount = toolResults?.filter((r) => !r.success).length || 0;
                    const toolSkills = skillsByTool.get(tool.id) || [];
                    const isExpanded = expandedTools.has(tool.id);
                    const linkedSkills = toolSkills.filter(s => s.isSymlink);
                    const ToolIcon = getToolIcon(tool);

                    return (
                      <div key={tool.id} className="card p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {ToolIcon ? (
                                <ToolIcon className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                              ) : (
                                <Folder size={16} className="text-[hsl(var(--muted-foreground))]" />
                              )}
                              <h3 className="font-semibold">{tool.displayName}</h3>
                            </div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 truncate ml-7">
                              {tool.skillPath}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <span className="badge badge-success flex items-center gap-1">
                              <Check size={12} /> Detected
                            </span>
                          </div>
                        </div>

                        {toolSkills.length > 0 && (
                          <div className="mt-3">
                            <button
                              onClick={() => toggleExpand(tool.id)}
                              className="flex items-center gap-2 text-sm hover:text-[hsl(var(--primary))] transition-colors"
                            >
                              <Folder size={14} />
                              <span className="font-medium">{toolSkills.length} skills</span>
                              {linkedSkills.length > 0 && (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <Link size={10} />
                                  {linkedSkills.length} linked
                                </span>
                              )}
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                                {toolSkills.map((skill) => (
                                  <div
                                    key={skill.name}
                                    className="flex items-center justify-between py-1 px-2 rounded bg-[hsl(var(--muted))]/50 text-xs"
                                  >
                                    <span className="truncate font-medium">{skill.name}</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handlePreview(skill)}
                                        className="p-1 hover:bg-[hsl(var(--background))] rounded transition-colors"
                                        title="Preview"
                                      >
                                        <Eye size={12} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" />
                                      </button>
                                      <span className={`flex items-center gap-1 ${skill.isSymlink ? 'text-green-600' : 'text-[hsl(var(--muted-foreground))]'}`}>
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
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            {toolSkills.length > 0 
                              ? `${toolSkills.length} skill${toolSkills.length > 1 ? 's' : ''} in directory`
                              : tool.installed ? 'Skills directory exists' : 'No skills directory'
                            }
                          </span>
                          <button
                            onClick={() => openSyncModal(tool.id)}
                            disabled={isSyncing}
                            className="btn btn-primary btn-sm flex items-center gap-1"
                          >
                            {isSyncing ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Download size={14} />
                                Sync
                              </>
                            )}
                          </button>
                        </div>

                        {toolResults && toolResults.length > 0 && (
                          <div className="mt-3 pt-3 border-t text-xs">
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

                {categoryTools.filter(t => !t.detected).length > 0 && (
                  <div className="pt-2">
                    <div className="flex flex-wrap gap-2">
                      {categoryTools.filter(t => !t.detected).map((tool) => (
                        <div 
                          key={tool.id} 
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] border border-dashed border-[hsl(var(--border))]"
                        >
                          <X size={10} />
                          <span>{tool.displayName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
                <button onClick={() => setShowImportModal(false)} className="btn btn-ghost btn-sm">
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {isLoadingImported ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))] mx-auto" />
                </div>
              ) : importedSkills.length === 0 ? (
                <p className="text-center text-[hsl(var(--muted-foreground))]">
                  No skills found in your installed tools.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-2 text-left w-10">
                          <button
                            onClick={toggleImportSelectAll}
                            className="p-1 hover:bg-[hsl(var(--muted))] rounded"
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
                            onClick={() => toggleImportSelect(key)}
                          >
                            <td className="py-2 px-2">
                              {isSelected ? (
                                <CheckSquare size={16} className="text-[hsl(var(--primary))]" />
                              ) : (
                                <Square size={16} />
                              )}
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
        <SkillPreviewModal
          skillName={previewSkill.name}
          skillDescription={`${previewSkill.toolName} - ${previewSkill.fileCount} files`}
          files={previewFiles}
          loading={previewLoading}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {previewCentralSkill && (
        <SkillPreviewModal
          skillName={previewCentralSkill.name}
          skillDescription={previewCentralSkill.description}
          files={previewFiles}
          loading={previewLoading}
          onClose={() => {
            setPreviewCentralSkill(null);
            setPreviewFiles([]);
          }}
        />
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
