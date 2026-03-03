use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ToolCategory {
  Cli,
  Ide,
  Vscode,
  Jetbrains,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tool {
  pub id: String,
  pub name: String,
  pub display_name: String,
  pub category: ToolCategory,
  pub skill_path: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub config_path: Option<String>,
  pub detected: bool,
  pub installed: bool,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub icon: Option<String>,
}

#[derive(Clone)]
pub struct ToolDefinition {
  pub id: &'static str,
  pub name: &'static str,
  pub display_name: &'static str,
  pub category: ToolCategory,
  pub skill_path: &'static str,
  pub config_path: Option<&'static str>,
  pub icon: Option<&'static str>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillFile {
  pub name: String,
  pub path: String,
  pub size: u64,
  pub hash: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
  pub id: String,
  pub name: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  pub category: String,
  pub tags: Vec<String>,
  pub files: Vec<SkillFile>,
  pub created_at: String,
  pub updated_at: String,
  pub version: u32,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub source_tool: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
  pub tool_id: String,
  pub skill_id: String,
  pub synced_at: String,
  pub status: String,
  pub method: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
  pub tool_id: String,
  pub skill_id: String,
  pub success: bool,
  pub method: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MergeFile {
  pub name: String,
  pub source_path: String,
  pub target_path: String,
  pub action: String,
  pub exists: bool,
  pub source_hash: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub target_hash: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConflictInfo {
  pub file_name: String,
  pub source_hash: String,
  pub target_hash: String,
  pub auto_resolvable: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MergePreview {
  pub skill_name: String,
  pub source_tool: String,
  pub target_path: String,
  pub files: Vec<MergeFile>,
  pub conflicts: Vec<ConflictInfo>,
  pub has_conflicts: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImportedSkill {
  pub name: String,
  pub tool_id: String,
  pub tool_name: String,
  pub skill_path: String,
  pub file_count: u64,
  pub size: u64,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub is_symlink: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkillFilePreview {
  pub path: String,
  pub content: String,
  pub size: u64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
  pub skill_repo_path: String,
  pub tools: Vec<Tool>,
  pub sync_interval: u64,
  pub auto_sync: bool,
  pub theme: String,
}

impl Default for AppConfig {
  fn default() -> Self {
    Self {
      skill_repo_path: String::new(),
      tools: Vec::new(),
      sync_interval: 30000,
      auto_sync: false,
      theme: "system".to_string(),
    }
  }
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppConfigUpdate {
  pub skill_repo_path: Option<String>,
  pub tools: Option<Vec<Tool>>,
  pub sync_interval: Option<u64>,
  pub auto_sync: Option<bool>,
  pub theme: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CreateSkillBody {
  pub name: String,
  pub description: Option<String>,
  pub source_tool: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFileBody {
  pub content: String,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MergeExecuteBody {
  pub tool_id: String,
  pub skill_name: String,
  pub overwrite: Option<bool>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportBody {
  pub overwrite: Option<bool>,
  pub symlink: Option<bool>,
}

#[derive(Default)]
pub struct ImportSingleResult {
  pub success: bool,
  pub error: Option<String>,
  pub imported: Option<bool>,
}

#[derive(Default)]
pub struct RestoreResult {
  pub success: bool,
  pub error: Option<String>,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportAllResult {
  pub success: bool,
  pub error: Option<String>,
  pub imported: u64,
  pub failed: u64,
}

pub fn tool_definitions() -> Vec<ToolDefinition> {
  vec![
    ToolDefinition { id: "claude-code", name: "claude-code", display_name: "Claude Code", category: ToolCategory::Cli, skill_path: ".claude/skills", config_path: None, icon: Some("claude") },
    ToolDefinition { id: "cursor", name: "cursor", display_name: "Cursor", category: ToolCategory::Ide, skill_path: ".cursor/skills", config_path: None, icon: Some("cursor") },
    ToolDefinition { id: "windsurf", name: "windsurf", display_name: "Windsurf", category: ToolCategory::Ide, skill_path: ".windsurf/skills", config_path: None, icon: Some("windsurf") },
    ToolDefinition { id: "trae", name: "trae", display_name: "Trae", category: ToolCategory::Ide, skill_path: ".trae/skills", config_path: None, icon: Some("trae") },
    ToolDefinition { id: "kiro", name: "kiro", display_name: "Kiro", category: ToolCategory::Ide, skill_path: ".kiro/skills", config_path: None, icon: Some("kiro") },
    ToolDefinition { id: "gemini-cli", name: "gemini-cli", display_name: "Gemini CLI", category: ToolCategory::Cli, skill_path: ".gemini/skills", config_path: None, icon: Some("gemini") },
    ToolDefinition { id: "copilot", name: "copilot", display_name: "GitHub Copilot", category: ToolCategory::Vscode, skill_path: ".github/copilot/skills", config_path: Some(".vscode/settings.json"), icon: Some("github") },
    ToolDefinition { id: "codex", name: "codex", display_name: "OpenAI Codex", category: ToolCategory::Cli, skill_path: ".codex/skills", config_path: None, icon: Some("openai") },
    ToolDefinition { id: "aider", name: "aider", display_name: "Aider", category: ToolCategory::Cli, skill_path: ".aider/skills", config_path: None, icon: Some("aider") },
    ToolDefinition { id: "continue", name: "continue", display_name: "Continue", category: ToolCategory::Vscode, skill_path: ".continue/skills", config_path: None, icon: Some("continue") },
    ToolDefinition { id: "cline", name: "cline", display_name: "Cline", category: ToolCategory::Vscode, skill_path: ".cline/skills", config_path: None, icon: Some("cline") },
    ToolDefinition { id: "roo-code", name: "roo-code", display_name: "Roo Code", category: ToolCategory::Vscode, skill_path: ".roo/skills", config_path: None, icon: Some("roo") },
    ToolDefinition { id: "amazon-q", name: "amazon-q", display_name: "Amazon Q", category: ToolCategory::Vscode, skill_path: ".amazonq/skills", config_path: None, icon: Some("amazon") },
    ToolDefinition { id: "jetbrains-ai", name: "jetbrains-ai", display_name: "JetBrains AI", category: ToolCategory::Jetbrains, skill_path: ".jetbrains/ai/skills", config_path: None, icon: Some("jetbrains") },
  ]
}

