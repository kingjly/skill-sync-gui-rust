use chrono::{DateTime, Utc};
use percent_encoding::percent_decode_str;
use sha2::{Digest, Sha256};
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

pub fn path_to_string(path: &Path) -> String {
  path.to_string_lossy().to_string()
}

pub fn normalize_rel_path(path: &Path) -> String {
  path.to_string_lossy().replace('\\', "/")
}

pub fn home_dir() -> PathBuf {
  dirs::home_dir().unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

pub fn now_millis() -> u128 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis()
}

pub fn system_time_to_iso(time: SystemTime) -> String {
  let dt: DateTime<Utc> = DateTime::<Utc>::from(time);
  dt.to_rfc3339()
}

pub fn compute_hash_bytes(bytes: &[u8]) -> String {
  let mut hasher = Sha256::new();
  hasher.update(bytes);
  let hash = hasher.finalize();
  format!("{:x}", hash)[..16].to_string()
}

pub fn parse_first_heading(content: &str) -> Option<String> {
  for line in content.lines() {
    let trimmed = line.trim();
    if trimmed.starts_with("# ") {
      return Some(trimmed.trim_start_matches("# ").trim().to_string());
    }
  }
  None
}

pub fn decode_url_path(raw: &str) -> String {
  percent_decode_str(raw.trim_start_matches('/'))
    .decode_utf8_lossy()
    .to_string()
}

pub fn resolve_symlink_target(link_path: &Path, target: &Path) -> PathBuf {
  if target.is_absolute() {
    target.to_path_buf()
  } else {
    link_path
      .parent()
      .map(|p| p.join(target))
      .unwrap_or_else(|| target.to_path_buf())
  }
}

pub fn copy_dir(src: &Path, dest: &Path) -> Result<(), String> {
  if !src.exists() {
    return Err(format!("Source path does not exist: {}", path_to_string(src)));
  }
  for entry in WalkDir::new(src).follow_links(true).into_iter().flatten() {
    let rel = entry
      .path()
      .strip_prefix(src)
      .map_err(|e| e.to_string())?;
    let target = dest.join(rel);
    if entry.file_type().is_dir() {
      fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    } else if entry.file_type().is_file() {
      if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
      }
      fs::copy(entry.path(), &target).map_err(|e| e.to_string())?;
    }
  }
  Ok(())
}

pub fn remove_path(path: &Path) -> Result<(), String> {
  let meta = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
  if meta.file_type().is_symlink() || meta.is_file() {
    fs::remove_file(path).map_err(|e| e.to_string())
  } else if meta.is_dir() {
    fs::remove_dir_all(path).map_err(|e| e.to_string())
  } else {
    Ok(())
  }
}

pub fn path_basename(path: &Path) -> String {
  path
    .file_name()
    .and_then(OsStr::to_str)
    .unwrap_or_default()
    .to_string()
}

#[cfg(target_os = "windows")]
pub fn create_dir_symlink(target: &Path, link: &Path) -> std::io::Result<()> {
  std::os::windows::fs::symlink_dir(target, link)
}

#[cfg(not(target_os = "windows"))]
pub fn create_dir_symlink(target: &Path, link: &Path) -> std::io::Result<()> {
  std::os::unix::fs::symlink(target, link)
}

