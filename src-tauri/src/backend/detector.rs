use crate::backend::models::{tool_definitions, Tool, ToolCategory, ToolDefinition};
use crate::backend::util::{home_dir, path_to_string};
use std::fs;
use std::process::{Command, Stdio};

pub struct ToolDetector {
  home_dir: std::path::PathBuf,
}

impl ToolDetector {
  pub fn new() -> Self {
    Self { home_dir: home_dir() }
  }

  pub fn detect_all(&self) -> Vec<Tool> {
    tool_definitions()
      .iter()
      .map(|def| self.detect_tool(def))
      .collect()
  }

  fn detect_tool(&self, def: &ToolDefinition) -> Tool {
    let resolved_skill_path = self.get_tool_skill_path(def.id);
    let detected = self.is_tool_detected(def);
    let installed = resolved_skill_path
      .as_ref()
      .map(|v| v.exists())
      .unwrap_or(false);

    Tool {
      id: def.id.to_string(),
      name: def.name.to_string(),
      display_name: def.display_name.to_string(),
      category: def.category.clone(),
      skill_path: if def.id == "copilot" {
        resolved_skill_path
          .as_ref()
          .map(|v| path_to_string(v))
          .unwrap_or_else(|| def.skill_path.to_string())
      } else {
        def.skill_path.to_string()
      },
      config_path: def.config_path.map(|v| v.to_string()),
      detected,
      installed,
      icon: def.icon.map(|v| v.to_string()),
    }
  }

  fn is_tool_detected(&self, def: &ToolDefinition) -> bool {
    match def.category {
      ToolCategory::Cli => self.is_cli_tool_detected(def.name),
      ToolCategory::Ide => self.is_ide_detected(def.name),
      ToolCategory::Vscode => self.is_vscode_extension_detected(def.name),
      ToolCategory::Jetbrains => self.is_jetbrains_plugin_detected(def.name),
    }
  }

  fn is_cli_tool_detected(&self, name: &str) -> bool {
    let commands: Vec<&str> = match name {
      "claude-code" => vec!["claude", "claude-code"],
      "gemini-cli" => vec!["gemini", "gemini-cli"],
      "codex" => vec!["codex"],
      "aider" => vec!["aider", "aider-chat"],
      _ => vec![name],
    };

    for cmd in commands {
      if cfg!(target_os = "windows") {
        if run_command_exists("where", &[cmd]) {
          return true;
        }
      } else if run_command_exists("which", &[cmd]) || run_command_exists("where", &[cmd]) {
        return true;
      }
    }
    false
  }

  fn is_ide_detected(&self, name: &str) -> bool {
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();
    match name {
      "cursor" => {
        candidates.push(self.home_dir.join("AppData").join("Local").join("Programs").join("cursor"));
        candidates.push(self.home_dir.join(".cursor"));
        candidates.push(std::path::PathBuf::from("/Applications/Cursor.app"));
        candidates.push(std::path::PathBuf::from("/usr/local/bin/cursor"));
      }
      "windsurf" => {
        candidates.push(self.home_dir.join("AppData").join("Local").join("Programs").join("windsurf"));
        candidates.push(self.home_dir.join(".windsurf"));
        candidates.push(std::path::PathBuf::from("/Applications/Windsurf.app"));
      }
      "trae" => {
        candidates.push(self.home_dir.join("AppData").join("Local").join("Programs").join("trae"));
        candidates.push(self.home_dir.join(".trae"));
      }
      "kiro" => {
        candidates.push(self.home_dir.join("AppData").join("Local").join("Programs").join("kiro"));
        candidates.push(self.home_dir.join(".kiro"));
      }
      _ => {}
    }
    candidates.iter().any(|p| p.exists())
  }

  fn is_vscode_extension_detected(&self, name: &str) -> bool {
    let patterns: Vec<&str> = match name {
      "copilot" => vec!["github.copilot", "github.copilot-chat"],
      "continue" => vec!["continue.continue"],
      "cline" => vec!["saoudrizwan.claude-dev"],
      "roo-code" => vec!["rooveterinaryinc.roo-cline"],
      "amazon-q" => vec!["amazonwebservices.amazon-q-vscode"],
      _ => Vec::new(),
    };

    for root in self.get_vscode_extension_roots() {
      if !root.exists() {
        continue;
      }
      if let Ok(entries) = fs::read_dir(root) {
        let names: Vec<String> = entries
          .filter_map(|e| e.ok())
          .filter_map(|e| e.file_name().to_str().map(|v| v.to_lowercase()))
          .collect();
        if patterns
          .iter()
          .any(|pattern| names.iter().any(|v| v.starts_with(&pattern.to_lowercase())))
        {
          return true;
        }
      }
    }
    false
  }

  fn is_jetbrains_plugin_detected(&self, name: &str) -> bool {
    let jetbrains_path = if cfg!(target_os = "windows") {
      self.home_dir.join("AppData").join("JetBrains")
    } else {
      self.home_dir.join(".config").join("JetBrains")
    };
    if !jetbrains_path.exists() {
      return false;
    }

    if let Ok(ide_dirs) = fs::read_dir(jetbrains_path) {
      for ide in ide_dirs.flatten() {
        let plugins_dir = ide.path().join("plugins");
        if !plugins_dir.exists() {
          continue;
        }
        if name == "jetbrains-ai" {
          if let Ok(plugins) = fs::read_dir(plugins_dir) {
            for plugin in plugins.flatten() {
              if let Some(v) = plugin.file_name().to_str() {
                let lower = v.to_lowercase();
                if lower.contains("ai") || lower.contains("jetbrains") {
                  return true;
                }
              }
            }
          }
        }
      }
    }
    false
  }

  fn get_vscode_extension_roots(&self) -> Vec<std::path::PathBuf> {
    vec![
      self.home_dir.join(".vscode").join("extensions"),
      self.home_dir.join(".vscode-insiders").join("extensions"),
    ]
  }

  fn resolve_copilot_skill_path(&self) -> Option<std::path::PathBuf> {
    let mut candidates: Vec<(std::path::PathBuf, u128)> = Vec::new();

    for root in self.get_vscode_extension_roots() {
      if !root.exists() {
        continue;
      }
      let entries = match fs::read_dir(&root) {
        Ok(v) => v,
        Err(_) => continue,
      };
      for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
          continue;
        };
        if !file_type.is_dir() {
          continue;
        }
        let Some(name) = entry.file_name().to_str().map(|v| v.to_lowercase()) else {
          continue;
        };
        if name != "github.copilot-chat" && !name.starts_with("github.copilot-chat-") {
          continue;
        }
        let extension_dir = entry.path();
        let skills_path = extension_dir.join("assets").join("prompts").join("skills");
        if !skills_path.is_dir() {
          continue;
        }
        let modified_ms = fs::metadata(&extension_dir)
          .and_then(|m| m.modified())
          .ok()
          .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
          .map(|d| d.as_millis())
          .unwrap_or(0);
        candidates.push((skills_path, modified_ms));
      }
    }

    candidates.sort_by(|a, b| b.1.cmp(&a.1));
    candidates.into_iter().next().map(|v| v.0)
  }

  pub fn get_tool_skill_path(&self, tool_id: &str) -> Option<std::path::PathBuf> {
    let definitions = tool_definitions();
    let def = definitions.iter().find(|d| d.id == tool_id)?;
    if tool_id == "copilot" {
      return self.resolve_copilot_skill_path();
    }
    Some(self.home_dir.join(def.skill_path))
  }

  pub fn ensure_tool_skill_path(&self, tool_id: &str) -> Option<std::path::PathBuf> {
    let path = self.get_tool_skill_path(tool_id)?;
    let _ = fs::create_dir_all(&path);
    Some(path)
  }
}

fn run_command_exists(program: &str, args: &[&str]) -> bool {
  let mut command = Command::new(program);
  command.args(args).stdout(Stdio::null()).stderr(Stdio::null());
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    command.creation_flags(CREATE_NO_WINDOW);
  }
  command.status().map(|v| v.success()).unwrap_or(false)
}
