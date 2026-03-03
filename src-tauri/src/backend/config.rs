use crate::backend::models::{AppConfig, AppConfigUpdate};
use crate::backend::util::home_dir;
use std::fs;
use std::path::{Path, PathBuf};

pub struct ConfigService {
  config_path: PathBuf,
  config: AppConfig,
}

impl ConfigService {
  pub fn new(config_dir: &Path) -> Self {
    let _ = fs::create_dir_all(config_dir);
    let config_path = config_dir.join("config.json");
    let mut service = Self {
      config_path,
      config: AppConfig::default(),
    };
    service.config = service.load_config();
    let _ = service.save_config();
    service
  }

  fn load_config(&self) -> AppConfig {
    match fs::read_to_string(&self.config_path) {
      Ok(content) => serde_json::from_str::<AppConfig>(&content).unwrap_or_default(),
      Err(_) => AppConfig::default(),
    }
  }

  fn save_config(&self) -> Result<(), String> {
    if let Some(parent) = self.config_path.parent() {
      fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&self.config).map_err(|e| e.to_string())?;
    fs::write(&self.config_path, content).map_err(|e| e.to_string())?;
    Ok(())
  }

  pub fn get_config(&self) -> AppConfig {
    self.config.clone()
  }

  pub fn update_config(&mut self, updates: AppConfigUpdate) -> Result<AppConfig, String> {
    if let Some(v) = updates.skill_repo_path {
      self.config.skill_repo_path = v;
    }
    if let Some(v) = updates.tools {
      self.config.tools = v;
    }
    if let Some(v) = updates.sync_interval {
      self.config.sync_interval = v;
    }
    if let Some(v) = updates.auto_sync {
      self.config.auto_sync = v;
    }
    if let Some(v) = updates.theme {
      self.config.theme = v;
    }
    self.save_config()?;
    Ok(self.get_config())
  }

  pub fn get_skill_repo_path(&self) -> PathBuf {
    if let Ok(v) = std::env::var("SKILL_SYNC_REPO_PATH") {
      if !v.trim().is_empty() {
        return PathBuf::from(v);
      }
    }
    if !self.config.skill_repo_path.trim().is_empty() {
      return PathBuf::from(self.config.skill_repo_path.clone());
    }
    home_dir().join(".skill-sync").join("skills")
  }

  pub fn ensure_skill_repo_exists(&self) -> Result<PathBuf, String> {
    let path = self.get_skill_repo_path();
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
  }
}

