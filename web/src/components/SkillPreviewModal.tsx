import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, FileCode, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import type { SkillFilePreview } from '../lib/api';

interface SkillPreviewModalProps {
  skillName: string;
  skillDescription?: string;
  files: SkillFilePreview[];
  loading: boolean;
  onClose: () => void;
}

interface ParsedFrontmatter {
  name?: string;
  description?: string;
  [key: string]: string | undefined;
}

function parseYamlFrontmatter(content: string): { frontmatter: ParsedFrontmatter; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, content };
  }
  
  const frontmatterStr = match[1] ?? '';
  const remainingContent = match[2] ?? '';
  const frontmatter: ParsedFrontmatter = {};
  
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }
  
  return { frontmatter, content: remainingContent };
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'md') return FileText;
  return FileCode;
}

function isMarkdownFile(filename: string) {
  return filename.toLowerCase().endsWith('.md');
}

function sortFiles(files: SkillFilePreview[]): SkillFilePreview[] {
  return [...files].sort((a, b) => {
    const aBasename = a.path.split('/').pop() || a.path;
    const bBasename = b.path.split('/').pop() || b.path;
    
    if (aBasename.toLowerCase() === 'skill.md') return -1;
    if (bBasename.toLowerCase() === 'skill.md') return 1;
    
    const aIsMd = isMarkdownFile(a.path);
    const bIsMd = isMarkdownFile(b.path);
    if (aIsMd && !bIsMd) return -1;
    if (!aIsMd && bIsMd) return 1;
    
    return a.path.localeCompare(b.path, undefined, { numeric: true });
  });
}

function FilePreview({ file, defaultExpanded = false }: { file: SkillFilePreview; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const FileIcon = getFileIcon(file.path);
  const isMarkdown = isMarkdownFile(file.path);
  const isSkillMd = file.path.split('/').pop()?.toLowerCase() === 'skill.md';
  
  const { frontmatter, content: processedContent } = useMemo(() => {
    if (isSkillMd && isMarkdown) {
      return parseYamlFrontmatter(file.content);
    }
    return { frontmatter: {}, content: file.content };
  }, [isSkillMd, isMarkdown, file.content]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown size={16} className="text-[hsl(var(--muted-foreground))]" />
          ) : (
            <ChevronRight size={16} className="text-[hsl(var(--muted-foreground))]" />
          )}
          <FileIcon size={16} className="text-[hsl(var(--muted-foreground))]" />
          <span className="font-medium text-sm">{file.path}</span>
          {isSkillMd && (
            <span className="badge badge-primary text-[10px] px-1.5 py-0.5">SKILL</span>
          )}
          {isMarkdown && !isSkillMd && (
            <span className="badge badge-secondary text-[10px] px-1.5 py-0.5">MD</span>
          )}
        </div>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {(file.size / 1024).toFixed(1)} KB
        </span>
      </button>
      
      {expanded && (
        <div className="border-t max-h-[400px] overflow-auto">
          {isMarkdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none p-4">
              {isSkillMd && frontmatter.name && (
                <div className="mb-4 p-3 bg-[hsl(var(--primary))]/10 rounded-lg border border-[hsl(var(--primary))]/20">
                  <div className="text-lg font-semibold text-[hsl(var(--primary))]">{frontmatter.name}</div>
                  {frontmatter.description && (
                    <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{frontmatter.description}</div>
                  )}
                </div>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {processedContent}
              </ReactMarkdown>
            </div>
          ) : (
            <pre className="p-4 text-xs overflow-x-auto bg-[hsl(var(--background))] font-mono">
              {file.content.slice(0, 10000)}
              {file.content.length > 10000 && '\n... (truncated)'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function SkillPreviewModal({
  skillName,
  skillDescription,
  files,
  loading,
  onClose,
}: SkillPreviewModalProps) {
  const sortedFiles = useMemo(() => sortFiles(files), [files]);
  
  const skillMdFile = useMemo(() => {
    return files.find(f => f.path.split('/').pop()?.toLowerCase() === 'skill.md');
  }, [files]);
  
  const parsedMetadata = useMemo(() => {
    if (skillMdFile) {
      const { frontmatter } = parseYamlFrontmatter(skillMdFile.content);
      return frontmatter;
    }
    return {};
  }, [skillMdFile]);
  
  const displayName = parsedMetadata.name || skillName;
  const displayDescription = parsedMetadata.description || skillDescription;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[hsl(var(--card))] rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between bg-[hsl(var(--muted))]/30">
          <div>
            <h3 className="font-semibold text-lg">{displayName}</h3>
            {displayDescription && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {displayDescription}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {files.length} files
            </span>
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(var(--primary))] mx-auto" />
              <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No files to preview</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedFiles.map((file, index) => (
                <FilePreview 
                  key={file.path} 
                  file={file} 
                  defaultExpanded={index === 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
