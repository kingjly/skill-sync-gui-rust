use crate::backend::config::ConfigService;
use crate::backend::models::{Skill, SkillFile};
use crate::backend::util::{
  compute_hash_bytes, normalize_rel_path, parse_first_heading, path_basename, system_time_to_iso,
};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use walkdir::WalkDir;

pub struct SkillRepo {
  config_service: Arc<Mutex<ConfigService>>,
}

impl SkillRepo {
  pub fn new(config_service: Arc<Mutex<ConfigService>>) -> Self {
    Self { config_service }
  }

  fn get_skill_repo_path(&self) -> Result<PathBuf, String> {
    self
      .config_service
      .lock()
      .map_err(|e| e.to_string())?
      .ensure_skill_repo_exists()
  }

  pub fn list(&self) -> Vec<Skill> {
    let Ok(repo_path) = self.get_skill_repo_path() else {
      return Vec::new();
    };
    let mut skills: Vec<Skill> = Vec::new();
    let entries = match fs::read_dir(repo_path) {
      Ok(v) => v,
      Err(_) => return Vec::new(),
    };
    for entry in entries.flatten() {
      if !entry.path().is_dir() {
        continue;
      }
      if let Some(skill) = self.load_skill(&entry.path()) {
        skills.push(skill);
      }
    }
    skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    skills
  }

  pub fn get(&self, skill_id: &str) -> Option<Skill> {
    let repo_path = self.get_skill_repo_path().ok()?;
    self.load_skill(&repo_path.join(skill_id))
  }

  fn load_skill(&self, skill_path: &Path) -> Option<Skill> {
    if !skill_path.is_dir() {
      return None;
    }
    let skill_id = path_basename(skill_path);
    let files = self.load_skill_files(skill_path);
    let meta_path = skill_path.join("SKILL.md");

    let mut description: Option<String> = None;
    let mut category = "general".to_string();
    let mut tags: Vec<String> = Vec::new();
    let mut source_tool: Option<String> = None;

    if meta_path.exists() {
      if let Ok(content) = fs::read_to_string(&meta_path) {
        description = parse_first_heading(&content);
        for line in content.lines() {
          let trimmed = line.trim();
          let lower = trimmed.to_ascii_lowercase();
          if lower.starts_with("category:") {
            category = trimmed[9..].trim().to_string();
          } else if lower.starts_with("tags:") {
            tags = trimmed[5..]
              .split(',')
              .map(|v| v.trim().to_string())
              .filter(|v| !v.is_empty())
              .collect();
          } else if lower.starts_with("source:") {
            let source = trimmed[7..].trim();
            if !source.is_empty() {
              source_tool = Some(source.to_string());
            }
          }
        }
      }
    }

    let metadata = fs::metadata(skill_path).ok()?;
    let created_at = metadata
      .created()
      .or_else(|_| metadata.modified())
      .map(system_time_to_iso)
      .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339());
    let updated_at = metadata
      .modified()
      .map(system_time_to_iso)
      .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339());

    Some(Skill {
      id: skill_id.clone(),
      name: skill_id,
      description,
      category,
      tags,
      files,
      created_at,
      updated_at,
      version: 1,
      source_tool,
    })
  }

  fn load_skill_files(&self, skill_path: &Path) -> Vec<SkillFile> {
    let mut files: Vec<SkillFile> = Vec::new();
    for entry in WalkDir::new(skill_path).follow_links(false).into_iter().flatten() {
      if !entry.file_type().is_file() {
        continue;
      }
      let full_path = entry.path().to_path_buf();
      let rel = match full_path.strip_prefix(skill_path) {
        Ok(v) => v,
        Err(_) => continue,
      };
      let bytes = match fs::read(&full_path) {
        Ok(v) => v,
        Err(_) => continue,
      };
      files.push(SkillFile {
        name: path_basename(&full_path),
        path: normalize_rel_path(rel),
        size: bytes.len() as u64,
        hash: compute_hash_bytes(&bytes),
      });
    }
    files
  }

  pub fn create(
    &self,
    name: &str,
    description: Option<String>,
    source_tool: Option<String>,
  ) -> Result<Skill, String> {
    let repo_path = self.get_skill_repo_path()?;
    let skill_path = repo_path.join(name);
    if skill_path.exists() {
      return Err(format!("Skill \"{}\" already exists", name));
    }
    fs::create_dir_all(&skill_path).map_err(|e| e.to_string())?;
    let mut skill_md = format!(
      "# {}\n\n{}\n\nCategory: general\nTags:\n",
      name,
      description.unwrap_or_else(|| "A new skill for AI coding assistants.".to_string())
    );
    if let Some(source) = source_tool {
      skill_md.push_str(&format!("Source: {}\n", source));
    }
    fs::write(skill_path.join("SKILL.md"), skill_md).map_err(|e| e.to_string())?;
    self
      .get(name)
      .ok_or_else(|| "Failed to load created skill".to_string())
  }

  pub fn delete(&self, skill_id: &str) -> bool {
    let Ok(repo_path) = self.get_skill_repo_path() else {
      return false;
    };
    let skill_path = repo_path.join(skill_id);
    if !skill_path.exists() {
      return false;
    }
    fs::remove_dir_all(skill_path).is_ok()
  }

  pub fn get_file_content(&self, skill_id: &str, file_path: &str) -> Option<String> {
    let repo_path = self.get_skill_repo_path().ok()?;
    let full_path = repo_path.join(skill_id).join(file_path);
    let bytes = fs::read(full_path).ok()?;
    Some(String::from_utf8_lossy(&bytes).to_string())
  }

  pub fn update_file(&self, skill_id: &str, file_path: &str, content: &str) -> bool {
    let Ok(repo_path) = self.get_skill_repo_path() else {
      return false;
    };
    let full_path = repo_path.join(skill_id).join(file_path);
    if let Some(parent) = full_path.parent() {
      if fs::create_dir_all(parent).is_err() {
        return false;
      }
    }
    fs::write(full_path, content).is_ok()
  }
}

