import { useQuery } from '@tanstack/react-query';
import { Wrench, FileCode, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function Dashboard() {
  const { data: toolsResponse } = useQuery({
    queryKey: ['tools'],
    queryFn: api.tools.list,
  });

  const { data: skillsResponse } = useQuery({
    queryKey: ['skills'],
    queryFn: api.skills.list,
  });

  const tools = toolsResponse?.data || [];
  const skills = skillsResponse?.data || [];

  const detectedTools = tools.filter((t) => t.detected);
  const installedTools = tools.filter((t) => t.installed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          Manage your AI coding assistant skills
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Supported Tools</p>
              <p className="text-2xl font-bold">{tools.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Detected</p>
              <p className="text-2xl font-bold">{detectedTools.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <AlertCircle className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Installed</p>
              <p className="text-2xl font-bold">{installedTools.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <FileCode className="h-6 w-6 text-orange-600 dark:text-orange-300" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Skills</p>
              <p className="text-2xl font-bold">{skills.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Detected Tools</h2>
          <div className="space-y-2">
            {detectedTools.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No tools detected. Install an AI coding assistant to get started.
              </p>
            ) : (
              detectedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{tool.displayName}</span>
                    <span className="badge badge-secondary">{tool.category}</span>
                  </div>
                  {tool.installed ? (
                    <span className="badge badge-success">Installed</span>
                  ) : (
                    <span className="badge badge-warning">Not Installed</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Skills</h2>
          <div className="space-y-2">
            {skills.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No skills yet. Create your first skill to get started.
              </p>
            ) : (
              skills.slice(0, 5).map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))]"
                >
                  <div>
                    <span className="font-medium">{skill.name}</span>
                    {skill.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {skill.description.slice(0, 60)}
                        {skill.description.length > 60 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {skill.files.length} files
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
