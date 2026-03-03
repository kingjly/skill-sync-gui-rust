import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import type { AppConfig } from '../lib/api';
import { useAppStore } from '../store';

export default function Settings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: configResponse, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: api.config.get,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<AppConfig>) => api.config.update(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const { setTheme } = useAppStore();
  const [localConfig, setLocalConfig] = useState<Partial<AppConfig>>({});

  const config = configResponse?.data;

  useEffect(() => {
    if (config) {
      setLocalConfig({
        skillRepoPath: config.skillRepoPath,
        autoSync: config.autoSync,
        syncInterval: config.syncInterval,
        theme: config.theme,
      });
      setTheme(config.theme);
    }
  }, [config, setTheme]);

  const handleSave = () => {
    updateMutation.mutate(localConfig);
  };

  const handleReset = () => {
    if (config) {
      setLocalConfig({
        skillRepoPath: config.skillRepoPath,
        autoSync: config.autoSync,
        syncInterval: config.syncInterval,
        theme: config.theme,
      });
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          Configure Skill Sync preferences
        </p>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Skill Repository Path</label>
          <input
            type="text"
            value={localConfig.skillRepoPath || ''}
            onChange={(e) => setLocalConfig({ ...localConfig, skillRepoPath: e.target.value })}
            className="input w-full"
            placeholder="~/.skill-sync/skills"
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Path where skills are stored centrally
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            value={localConfig.theme || 'system'}
            onChange={(e) => {
              const newTheme = e.target.value as AppConfig['theme'];
              setLocalConfig({ ...localConfig, theme: newTheme });
              setTheme(newTheme);
              document.documentElement.classList.toggle(
                'dark',
                newTheme === 'dark' ||
                  (newTheme === 'system' &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches)
              );
            }}
            className="input w-full"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sync Interval (ms)</label>
          <input
            type="number"
            value={localConfig.syncInterval || 30000}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, syncInterval: parseInt(e.target.value) || 30000 })
            }
            className="input w-full"
            min={5000}
            step={1000}
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            How often to check for changes (minimum 5000ms)
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium">Auto Sync</label>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Automatically sync skills when changes are detected
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.autoSync || false}
              onChange={(e) => setLocalConfig({ ...localConfig, autoSync: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
          </label>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            <Save size={16} />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={handleReset} className="btn btn-secondary btn-md flex items-center gap-2">
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
          <p>
            <strong>Skill Sync</strong> - Unified skill manager for AI coding assistants
          </p>
          <p>Version: 1.0.0</p>
          <p>Supported tools: Claude Code, Cursor, Windsurf, Trae, Kiro, and 10+ more</p>
        </div>
      </div>
    </div>
  );
}
