use crate::backend::config::ConfigService;
use crate::backend::detector::ToolDetector;
use crate::backend::models::{
  ConflictInfo, ImportAllResult, ImportSingleResult, ImportedSkill, MergeFile, MergePreview,
  RestoreResult, SkillFilePreview, SyncResult, SyncStatus, Tool,
};
use crate::backend::skill_repo::SkillRepo;
use crate::backend::util::{
  compute_hash_bytes, copy_dir, create_dir_symlink, now_millis, parse_first_heading, path_basename,
  path_to_string, remove_path, resolve_symlink_target, system_time_to_iso,
};
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use walkdir::WalkDir;

pub struct SyncService {
  detector: Arc<ToolDetector>,
  config_service: Arc<Mutex<ConfigService>>,
  skill_repo: Arc<SkillRepo>,
}

impl SyncService {
  pub fn new(
    detector: Arc<ToolDetector>,
    config_service: Arc<Mutex<ConfigService>>,
    skill_repo: Arc<SkillRepo>,
  ) -> Self {
    Self {
      detector,
      config_service,
      skill_repo,
    }
  }

  pub fn list_tools_skills(&self) -> Vec<ImportedSkill> {
    let tools = self.detector.detect_all();
    let installed_tools: Vec<Tool> = tools.into_iter().filter(|t| t.installed).collect();
    let mut imported: Vec<ImportedSkill> = Vec::new();

    for tool in installed_tools {
      let Some(tool_skill_path) = self.detector.get_tool_skill_path(&tool.id) else {
        continue;
      };
      if !tool_skill_path.exists() {
        continue;
      }

      let Ok(entries) = fs::read_dir(&tool_skill_path) else {
        continue;
      };
      for entry in entries.flatten() {
        let skill_dir = entry.path();
        let Ok(file_type) = entry.file_type() else {
          continue;
        };
        if !file_type.is_dir() && !file_type.is_symlink() {
          continue;
        }

        let mut is_symlink = false;
        let mut actual_path = skill_dir.clone();
        if let Ok(meta) = fs::symlink_metadata(&skill_dir) {
          if meta.file_type().is_symlink() {
            is_symlink = true;
            if let Ok(link_target) = fs::read_link(&skill_dir) {
              actual_path = resolve_symlink_target(&skill_dir, &link_target);
            }
          }
        }

        let stats = self.get_dir_stats(&actual_path);
        let description = self.get_skill_description(&actual_path);
        imported.push(ImportedSkill {
          name: path_basename(&skill_dir),
          tool_id: tool.id.clone(),
          tool_name: tool.display_name.clone(),
          skill_path: path_to_string(&skill_dir),
          file_count: stats.0,
          size: stats.1,
          description,
          is_symlink: Some(is_symlink),
        });
      }
    }

    imported
  }

  pub fn preview_skill_files(&self, tool_id: &str, skill_name: &str) -> Vec<SkillFilePreview> {
    let Some(tool_skill_path) = self.detector.get_tool_skill_path(tool_id) else {
      return Vec::new();
    };
    let skill_path = tool_skill_path.join(skill_name);
    let mut actual_path = skill_path.clone();
    if let Ok(meta) = fs::symlink_metadata(&skill_path) {
      if meta.file_type().is_symlink() {
        if let Ok(link_target) = fs::read_link(&skill_path) {
          actual_path = resolve_symlink_target(&skill_path, &link_target);
        }
      }
    }
    if !actual_path.exists() {
      return Vec::new();
    }

    let mut files: Vec<SkillFilePreview> = Vec::new();
    for entry in WalkDir::new(&actual_path).follow_links(true).into_iter().flatten() {
      if !entry.file_type().is_file() {
        continue;
      }
      let full = entry.path();
      let rel = match full.strip_prefix(&actual_path) {
        Ok(v) => v,
        Err(_) => continue,
      };
      if let Ok(bytes) = fs::read(full) {
        files.push(SkillFilePreview {
          path: rel.to_string_lossy().replace('\\', "/"),
          content: String::from_utf8_lossy(&bytes).to_string(),
          size: bytes.len() as u64,
        });
      }
    }
    files
  }

  fn get_dir_stats(&self, dir: &Path) -> (u64, u64) {
    let mut file_count = 0u64;
    let mut size = 0u64;
    for entry in WalkDir::new(dir).follow_links(true).into_iter().flatten() {
      if entry.file_type().is_file() {
        file_count += 1;
        size += entry.metadata().map(|m| m.len()).unwrap_or(0);
      }
    }
    (file_count, size)
  }

  fn get_skill_description(&self, skill_dir: &Path) -> Option<String> {
    let md = skill_dir.join("SKILL.md");
    let content = fs::read_to_string(md).ok()?;
    parse_first_heading(&content)
  }

  pub fn import_from_tool(
    &self,
    tool_id: &str,
    skill_name: &str,
    overwrite: bool,
    use_symlink: bool,
  ) -> ImportSingleResult {
    let Some(tool_skill_path) = self.detector.get_tool_skill_path(tool_id) else {
      return ImportSingleResult {
        success: false,
        error: Some(format!("Tool \"{}\" not supported", tool_id)),
        imported: None,
      };
    };
    let source_path = tool_skill_path.join(skill_name);
    if !source_path.exists() {
      return ImportSingleResult {
        success: false,
        error: Some(format!("Skill \"{}\" not found in tool directory", skill_name)),
        imported: None,
      };
    }

    let target_repo = match self.config_service.lock() {
      Ok(cfg) => cfg.get_skill_repo_path(),
      Err(err) => {
        return ImportSingleResult {
          success: false,
          error: Some(err.to_string()),
          imported: None,
        }
      }
    };
    let target_path = target_repo.join(skill_name);
    if target_path.exists() && !overwrite {
      return ImportSingleResult {
        success: false,
        error: Some(format!(
          "Skill \"{}\" already exists. Use overwrite=true to replace.",
          skill_name
        )),
        imported: None,
      };
    }

    if target_path.exists() {
      let _ = remove_path(&target_path);
    }

    let mut actual_source_path = source_path.clone();
    if let Ok(meta) = fs::symlink_metadata(&source_path) {
      if meta.file_type().is_symlink() {
        if let Ok(link_target) = fs::read_link(&source_path) {
          actual_source_path = resolve_symlink_target(&source_path, &link_target);
        }
      }
    }

    if let Err(err) = copy_dir(&actual_source_path, &target_path) {
      return ImportSingleResult {
        success: false,
        error: Some(err),
        imported: None,
      };
    }

    if use_symlink && self.can_use_symlink() {
      let backup_path = PathBuf::from(format!("{}.backup", path_to_string(&source_path)));
      if source_path.exists() {
        if let Ok(meta) = fs::symlink_metadata(&source_path) {
          if meta.file_type().is_symlink() {
            let _ = remove_path(&source_path);
            if let Err(err) = create_dir_symlink(&target_path, &source_path) {
              return ImportSingleResult {
                success: false,
                error: Some(err.to_string()),
                imported: None,
              };
            }
          } else {
            if let Err(err) = fs::rename(&source_path, &backup_path) {
              return ImportSingleResult {
                success: false,
                error: Some(err.to_string()),
                imported: None,
              };
            }
            if let Err(err) = create_dir_symlink(&target_path, &source_path) {
              let _ = fs::rename(&backup_path, &source_path);
              return ImportSingleResult {
                success: false,
                error: Some(err.to_string()),
                imported: None,
              };
            }
            let _ = remove_path(&backup_path);
          }
        }
      } else if let Err(err) = create_dir_symlink(&target_path, &source_path) {
        return ImportSingleResult {
          success: false,
          error: Some(err.to_string()),
          imported: None,
        };
      }
    }

    ImportSingleResult {
      success: true,
      error: None,
      imported: Some(true),
    }
  }

  pub fn restore_from_symlink(&self, tool_id: &str, skill_name: &str) -> RestoreResult {
    let Some(tool_skill_path) = self.detector.get_tool_skill_path(tool_id) else {
      return RestoreResult {
        success: false,
        error: Some(format!("Tool \"{}\" not supported", tool_id)),
      };
    };
    let skill_path = tool_skill_path.join(skill_name);
    let Ok(meta) = fs::symlink_metadata(&skill_path) else {
      return RestoreResult {
        success: false,
        error: Some(format!("\"{}\" is not a symlink", skill_name)),
      };
    };
    if !meta.file_type().is_symlink() {
      return RestoreResult {
        success: false,
        error: Some(format!("\"{}\" is not a symlink", skill_name)),
      };
    }
    let Ok(link_target) = fs::read_link(&skill_path) else {
      return RestoreResult {
        success: false,
        error: Some("Failed to read symlink target".to_string()),
      };
    };
    let target_path = resolve_symlink_target(&skill_path, &link_target);
    if !target_path.exists() {
      return RestoreResult {
        success: false,
        error: Some(format!(
          "Symlink target does not exist: {}",
          path_to_string(&target_path)
        )),
      };
    }
    if !target_path.is_dir() {
      return RestoreResult {
        success: false,
        error: Some("Symlink target is not a directory".to_string()),
      };
    }
    let _ = remove_path(&skill_path);
    if let Err(err) = copy_dir(&target_path, &skill_path) {
      return RestoreResult {
        success: false,
        error: Some(err),
      };
    }
    let Ok(verify_meta) = fs::symlink_metadata(&skill_path) else {
      return RestoreResult {
        success: false,
        error: Some("Restore failed".to_string()),
      };
    };
    if verify_meta.file_type().is_symlink() {
      return RestoreResult {
        success: false,
        error: Some("Restore failed: path is still a symlink".to_string()),
      };
    }
    RestoreResult {
      success: true,
      error: None,
    }
  }

  pub fn import_all_from_tool(&self, tool_id: &str, overwrite: bool) -> ImportAllResult {
    let Some(tool_skill_path) = self.detector.get_tool_skill_path(tool_id) else {
      return ImportAllResult {
        success: false,
        error: Some(format!(
          "Tool \"{}\" not found or skills directory doesn't exist",
          tool_id
        )),
        imported: 0,
        failed: 0,
      };
    };
    if !tool_skill_path.exists() {
      return ImportAllResult {
        success: false,
        error: Some(format!(
          "Tool \"{}\" not found or skills directory doesn't exist",
          tool_id
        )),
        imported: 0,
        failed: 0,
      };
    }

    let mut imported = 0u64;
    let mut failed = 0u64;
    let Ok(entries) = fs::read_dir(&tool_skill_path) else {
      return ImportAllResult {
        success: false,
        error: Some("Failed to read tool skills directory".to_string()),
        imported,
        failed,
      };
    };
    for entry in entries.flatten() {
      let Ok(meta) = entry.file_type() else {
        continue;
      };
      if !meta.is_dir() {
        continue;
      }
      let skill_name = entry.file_name().to_string_lossy().to_string();
      let result = self.import_from_tool(tool_id, &skill_name, overwrite, false);
      if result.success && result.imported.unwrap_or(false) {
        imported += 1;
      } else {
        failed += 1;
      }
    }

    ImportAllResult {
      success: failed == 0,
      error: None,
      imported,
      failed,
    }
  }

  pub fn sync_skill_to_tool(&self, skill_id: &str, tool_id: &str) -> SyncResult {
    if self.skill_repo.get(skill_id).is_none() {
      return SyncResult {
        tool_id: tool_id.to_string(),
        skill_id: skill_id.to_string(),
        success: false,
        method: "copy".to_string(),
        error: Some(format!("Skill \"{}\" not found", skill_id)),
      };
    }
    let Some(tool_skill_path) = self.detector.ensure_tool_skill_path(tool_id) else {
      return SyncResult {
        tool_id: tool_id.to_string(),
        skill_id: skill_id.to_string(),
        success: false,
        method: "copy".to_string(),
        error: Some(format!("Tool \"{}\" not supported", tool_id)),
      };
    };

    let source_path = match self.config_service.lock() {
      Ok(cfg) => cfg.get_skill_repo_path().join(skill_id),
      Err(_) => {
        return SyncResult {
          tool_id: tool_id.to_string(),
          skill_id: skill_id.to_string(),
          success: false,
          method: "copy".to_string(),
          error: Some("Failed to access config".to_string()),
        }
      }
    };
    let target_path = tool_skill_path.join(skill_id);
    let method = if self.can_use_symlink() {
      "symlink".to_string()
    } else {
      "copy".to_string()
    };

    if target_path.exists() {
      let _ = remove_path(&target_path);
    }
    let result = if method == "symlink" {
      create_dir_symlink(&source_path, &target_path).map_err(|e| e.to_string())
    } else {
      copy_dir(&source_path, &target_path)
    };

    match result {
      Ok(_) => SyncResult {
        tool_id: tool_id.to_string(),
        skill_id: skill_id.to_string(),
        success: true,
        method,
        error: None,
      },
      Err(err) => SyncResult {
        tool_id: tool_id.to_string(),
        skill_id: skill_id.to_string(),
        success: false,
        method,
        error: Some(err),
      },
    }
  }

  pub fn sync_all_skills_to_tool(&self, tool_id: &str) -> Vec<SyncResult> {
    self
      .skill_repo
      .list()
      .iter()
      .map(|s| self.sync_skill_to_tool(&s.id, tool_id))
      .collect()
  }

  pub fn sync_skill_to_all_tools(&self, skill_id: &str) -> Vec<SyncResult> {
    self
      .detector
      .detect_all()
      .iter()
      .filter(|t| t.detected)
      .map(|t| self.sync_skill_to_tool(skill_id, &t.id))
      .collect()
  }

  pub fn sync_all(&self) -> Vec<SyncResult> {
    let skills = self.skill_repo.list();
    let tools: Vec<Tool> = self.detector.detect_all().into_iter().filter(|t| t.detected).collect();
    let mut results: Vec<SyncResult> = Vec::new();
    for skill in skills {
      for tool in &tools {
        results.push(self.sync_skill_to_tool(&skill.id, &tool.id));
      }
    }
    results
  }

  pub fn get_sync_status(&self, tool_id: &str) -> Vec<SyncStatus> {
    let Some(tool_skill_path) = self.detector.get_tool_skill_path(tool_id) else {
      return Vec::new();
    };

    self
      .skill_repo
      .list()
      .iter()
      .map(|skill| {
        let target = tool_skill_path.join(&skill.id);
        if !target.exists() {
          return SyncStatus {
            tool_id: tool_id.to_string(),
            skill_id: skill.id.clone(),
            synced_at: String::new(),
            status: "pending".to_string(),
            method: "copy".to_string(),
            error: None,
          };
        }
        match fs::symlink_metadata(&target) {
          Ok(meta) => {
            let method = if meta.file_type().is_symlink() {
              "symlink".to_string()
            } else {
              "copy".to_string()
            };
            let synced_at = meta
              .modified()
              .map(system_time_to_iso)
              .unwrap_or_else(|_| String::new());
            SyncStatus {
              tool_id: tool_id.to_string(),
              skill_id: skill.id.clone(),
              synced_at,
              status: "synced".to_string(),
              method,
              error: None,
            }
          }
          Err(_) => SyncStatus {
            tool_id: tool_id.to_string(),
            skill_id: skill.id.clone(),
            synced_at: String::new(),
            status: "error".to_string(),
            method: "copy".to_string(),
            error: Some("Failed to check sync status".to_string()),
          },
        }
      })
      .collect()
  }

  pub fn preview_merge(&self, tool_id: &str) -> Vec<MergePreview> {
    let Some(tool_skill_path) = self.detector.get_tool_skill_path(tool_id) else {
      return Vec::new();
    };
    if !tool_skill_path.exists() {
      return Vec::new();
    }

    let target_repo = match self.config_service.lock() {
      Ok(cfg) => cfg.get_skill_repo_path(),
      Err(_) => return Vec::new(),
    };

    let mut previews: Vec<MergePreview> = Vec::new();
    let Ok(entries) = fs::read_dir(&tool_skill_path) else {
      return previews;
    };

    for entry in entries.flatten() {
      let Ok(ft) = entry.file_type() else {
        continue;
      };
      if !ft.is_dir() {
        continue;
      }
      let skill_name = entry.file_name().to_string_lossy().to_string();
      let source_path = entry.path();
      let target_path = target_repo.join(&skill_name);
      let files = self.analyze_merge_files(&source_path, &target_path);
      let conflicts: Vec<ConflictInfo> = files
        .iter()
        .filter(|f| {
          f.action == "overwrite"
            && f.target_hash.is_some()
            && f.source_hash != f.target_hash.clone().unwrap_or_default()
        })
        .map(|f| ConflictInfo {
          file_name: f.name.clone(),
          source_hash: f.source_hash.clone(),
          target_hash: f.target_hash.clone().unwrap_or_default(),
          auto_resolvable: false,
        })
        .collect();

      previews.push(MergePreview {
        skill_name: skill_name.clone(),
        source_tool: tool_id.to_string(),
        target_path: path_to_string(&target_path),
        files,
        conflicts: conflicts.clone(),
        has_conflicts: !conflicts.is_empty(),
      });
    }
    previews
  }

  pub fn execute_merge(&self, tool_id: &str, skill_name: &str, overwrite: bool) -> Result<(), String> {
    let result = self.import_from_tool(tool_id, skill_name, overwrite, false);
    if result.success {
      Ok(())
    } else {
      Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
    }
  }

  fn analyze_merge_files(&self, source_dir: &Path, target_dir: &Path) -> Vec<MergeFile> {
    let mut files: Vec<MergeFile> = Vec::new();
    for entry in WalkDir::new(source_dir).follow_links(true).into_iter().flatten() {
      if !entry.file_type().is_file() {
        continue;
      }
      let full_path = entry.path().to_path_buf();
      let rel = match full_path.strip_prefix(source_dir) {
        Ok(v) => v,
        Err(_) => continue,
      };
      let source_bytes = match fs::read(&full_path) {
        Ok(v) => v,
        Err(_) => continue,
      };
      let source_hash = compute_hash_bytes(&source_bytes);
      let target_full_path = target_dir.join(rel);
      let exists = target_full_path.exists();
      let target_hash = if exists {
        fs::read(&target_full_path).ok().map(|v| compute_hash_bytes(&v))
      } else {
        None
      };
      files.push(MergeFile {
        name: full_path
          .file_name()
          .and_then(OsStr::to_str)
          .unwrap_or_default()
          .to_string(),
        source_path: path_to_string(&full_path),
        target_path: path_to_string(&target_full_path),
        action: if exists {
          "overwrite".to_string()
        } else {
          "create".to_string()
        },
        exists,
        source_hash,
        target_hash,
      });
    }
    files
  }

  fn can_use_symlink(&self) -> bool {
    if cfg!(target_os = "windows") {
      self.can_create_symlinks_on_windows()
    } else {
      true
    }
  }

  fn can_create_symlinks_on_windows(&self) -> bool {
    let root = std::env::temp_dir().join(format!("skill-sync-symlink-test-{}", now_millis()));
    let target = root.join("target");
    let link = root.join("link");
    if fs::create_dir_all(&target).is_err() {
      return false;
    }
    let success = create_dir_symlink(&target, &link).is_ok();
    let _ = remove_path(&link);
    let _ = remove_path(&root);
    success
  }
}

