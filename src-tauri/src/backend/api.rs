use axum::extract::{Path, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};

use crate::backend::config::ConfigService;
use crate::backend::detector::ToolDetector;
use crate::backend::models::{
  AppConfigUpdate, CreateSkillBody, ImportBody, MergeExecuteBody, SkillFilePreview, SyncStatus,
  UpdateFileBody,
};
use crate::backend::skill_repo::SkillRepo;
use crate::backend::sync_service::SyncService;
use crate::backend::util::decode_url_path;

#[derive(Clone)]
pub struct ApiState {
  detector: Arc<ToolDetector>,
  config_service: Arc<Mutex<ConfigService>>,
  skill_repo: Arc<SkillRepo>,
  sync_service: Arc<SyncService>,
}

impl ApiState {
  pub fn new(config_dir: PathBuf) -> Self {
    let detector = Arc::new(ToolDetector::new());
    let config_service = Arc::new(Mutex::new(ConfigService::new(&config_dir)));
    let skill_repo = Arc::new(SkillRepo::new(config_service.clone()));
    let sync_service = Arc::new(SyncService::new(
      detector.clone(),
      config_service.clone(),
      skill_repo.clone(),
    ));
    Self {
      detector,
      config_service,
      skill_repo,
      sync_service,
    }
  }
}

pub fn build_router(state: ApiState) -> Router {
  let cors = CorsLayer::new()
    .allow_methods(Any)
    .allow_headers(Any)
    .allow_origin(Any);

  Router::new()
    .route("/api/health", get(api_health))
    .route("/api/tools", get(api_list_tools))
    .route("/api/tools/:id", get(api_get_tool))
    .route("/api/skills", get(api_list_skills).post(api_create_skill))
    .route("/api/skills/:id", get(api_get_skill).delete(api_delete_skill))
    .route("/api/skills/:id/files/*path", get(api_get_skill_file).put(api_update_skill_file))
    .route("/api/skills/:id/preview", get(api_preview_skill))
    .route("/api/config", get(api_get_config).put(api_update_config))
    .route("/api/sync/status", get(api_sync_status_all))
    .route("/api/sync/status/:toolId", get(api_sync_status_tool))
    .route("/api/sync/skill/:skillId/tool/:toolId", post(api_sync_skill_to_tool))
    .route("/api/sync/skill/:skillId/all", post(api_sync_skill_to_all))
    .route("/api/sync/tool/:toolId/all", post(api_sync_all_to_tool))
    .route("/api/sync/all", post(api_sync_all))
    .route("/api/merge/preview/:toolId", get(api_preview_merge))
    .route("/api/merge/execute", post(api_execute_merge))
    .route("/api/import/tools-skills", get(api_import_list_tools_skills))
    .route("/api/import/preview/:toolId/skill/:skillName", get(api_import_preview_skill))
    .route("/api/import/tool/:toolId/skill/:skillName", post(api_import_single_skill))
    .route("/api/import/restore/:toolId/skill/:skillName", post(api_restore_symlink))
    .route("/api/import/tool/:toolId/all", post(api_import_all_skills_from_tool))
    .with_state(state)
    .layer(cors)
}

async fn api_health() -> Json<Value> {
  Json(json!({
    "status": "ok",
    "timestamp": chrono::Utc::now().to_rfc3339(),
    "version": env!("CARGO_PKG_VERSION")
  }))
}

async fn api_list_tools(State(state): State<ApiState>) -> Json<Value> {
  api_ok(json!(state.detector.detect_all()))
}

async fn api_get_tool(Path(id): Path<String>, State(state): State<ApiState>) -> Json<Value> {
  let tool = state.detector.detect_all().into_iter().find(|t| t.id == id);
  match tool {
    Some(v) => api_ok(json!(v)),
    None => api_err(format!("Tool \"{}\" not found", id)),
  }
}

async fn api_list_skills(State(state): State<ApiState>) -> Json<Value> {
  api_ok(json!(state.skill_repo.list()))
}

async fn api_get_skill(Path(id): Path<String>, State(state): State<ApiState>) -> Json<Value> {
  match state.skill_repo.get(&id) {
    Some(skill) => api_ok(json!(skill)),
    None => api_err(format!("Skill \"{}\" not found", id)),
  }
}

async fn api_create_skill(State(state): State<ApiState>, Json(body): Json<CreateSkillBody>) -> Json<Value> {
  if body.name.trim().is_empty() {
    return api_err("Skill name is required");
  }
  match state.skill_repo.create(&body.name, body.description, body.source_tool) {
    Ok(skill) => api_ok_with_message(json!(skill), format!("Skill \"{}\" created", body.name)),
    Err(err) => api_err(err),
  }
}

async fn api_delete_skill(Path(id): Path<String>, State(state): State<ApiState>) -> Json<Value> {
  if state.skill_repo.delete(&id) {
    api_message(format!("Skill \"{}\" deleted", id))
  } else {
    api_err(format!("Skill \"{}\" not found", id))
  }
}

async fn api_get_skill_file(
  Path((id, raw_path)): Path<(String, String)>,
  State(state): State<ApiState>,
) -> Json<Value> {
  let file_path = decode_url_path(&raw_path);
  match state.skill_repo.get_file_content(&id, &file_path) {
    Some(content) => api_ok(json!(content)),
    None => api_err("File not found"),
  }
}

async fn api_preview_skill(Path(id): Path<String>, State(state): State<ApiState>) -> Json<Value> {
  let Some(skill) = state.skill_repo.get(&id) else {
    return api_err(format!("Skill \"{}\" not found", id));
  };
  let mut previews: Vec<SkillFilePreview> = Vec::new();
  for file in &skill.files {
    previews.push(SkillFilePreview {
      path: file.path.clone(),
      content: state.skill_repo.get_file_content(&id, &file.path).unwrap_or_default(),
      size: file.size,
    });
  }
  api_ok(json!(previews))
}

async fn api_update_skill_file(
  Path((id, raw_path)): Path<(String, String)>,
  State(state): State<ApiState>,
  Json(body): Json<UpdateFileBody>,
) -> Json<Value> {
  let file_path = decode_url_path(&raw_path);
  if state.skill_repo.update_file(&id, &file_path, &body.content) {
    api_message("File updated")
  } else {
    api_err("Failed to update file")
  }
}

async fn api_get_config(State(state): State<ApiState>) -> Json<Value> {
  match state.config_service.lock() {
    Ok(cfg) => api_ok(json!(cfg.get_config())),
    Err(err) => api_err(err.to_string()),
  }
}

async fn api_update_config(
  State(state): State<ApiState>,
  Json(updates): Json<AppConfigUpdate>,
) -> Json<Value> {
  let Ok(mut cfg) = state.config_service.lock() else {
    return api_err("Failed to update config");
  };
  match cfg.update_config(updates) {
    Ok(config) => api_ok_with_message(json!(config), "Config updated".to_string()),
    Err(err) => api_err(err),
  }
}

async fn api_sync_status_all(State(state): State<ApiState>) -> Json<Value> {
  let tools = state.detector.detect_all();
  let mut all_status: Vec<SyncStatus> = Vec::new();
  for tool in tools.into_iter().filter(|t| t.detected) {
    all_status.extend(state.sync_service.get_sync_status(&tool.id));
  }
  api_ok(json!(all_status))
}

async fn api_sync_status_tool(Path(tool_id): Path<String>, State(state): State<ApiState>) -> Json<Value> {
  api_ok(json!(state.sync_service.get_sync_status(&tool_id)))
}

async fn api_sync_skill_to_tool(
  Path((skill_id, tool_id)): Path<(String, String)>,
  State(state): State<ApiState>,
) -> Json<Value> {
  let result = state.sync_service.sync_skill_to_tool(&skill_id, &tool_id);
  if result.success {
    api_ok_with_message(
      json!(result),
      format!("Skill \"{}\" synced to \"{}\"", skill_id, tool_id),
    )
  } else {
    api_err(result.error.unwrap_or_else(|| "Sync failed".to_string()))
  }
}

async fn api_sync_skill_to_all(Path(skill_id): Path<String>, State(state): State<ApiState>) -> Json<Value> {
  let results = state.sync_service.sync_skill_to_all_tools(&skill_id);
  let failed = results.iter().filter(|r| !r.success).count();
  if failed == 0 {
    api_ok_with_message(json!(results), format!("Skill \"{}\" synced to all tools", skill_id))
  } else {
    Json(json!({"success": false, "data": results, "error": format!("{} sync(s) failed", failed)}))
  }
}

async fn api_sync_all_to_tool(Path(tool_id): Path<String>, State(state): State<ApiState>) -> Json<Value> {
  let results = state.sync_service.sync_all_skills_to_tool(&tool_id);
  let failed = results.iter().filter(|r| !r.success).count();
  if failed == 0 {
    api_ok_with_message(json!(results), format!("All skills synced to \"{}\"", tool_id))
  } else {
    Json(json!({"success": false, "data": results, "error": format!("{} sync(s) failed", failed)}))
  }
}

async fn api_sync_all(State(state): State<ApiState>) -> Json<Value> {
  let results = state.sync_service.sync_all();
  let failed = results.iter().filter(|r| !r.success).count();
  if failed == 0 {
    api_ok_with_message(json!(results), "All skills synced to all tools".to_string())
  } else {
    Json(json!({"success": false, "data": results, "error": format!("{} sync(s) failed", failed)}))
  }
}

async fn api_preview_merge(Path(tool_id): Path<String>, State(state): State<ApiState>) -> Json<Value> {
  api_ok(json!(state.sync_service.preview_merge(&tool_id)))
}

async fn api_execute_merge(State(state): State<ApiState>, Json(body): Json<MergeExecuteBody>) -> Json<Value> {
  let overwrite = body.overwrite.unwrap_or(false);
  match state
    .sync_service
    .execute_merge(&body.tool_id, &body.skill_name, overwrite)
  {
    Ok(_) => api_message(format!("Skill \"{}\" merged successfully", body.skill_name)),
    Err(err) => api_err(err),
  }
}

async fn api_import_list_tools_skills(State(state): State<ApiState>) -> Json<Value> {
  api_ok(json!(state.sync_service.list_tools_skills()))
}

async fn api_import_preview_skill(
  Path((tool_id, raw_skill_name)): Path<(String, String)>,
  State(state): State<ApiState>,
) -> Json<Value> {
  let skill_name = decode_url_path(&raw_skill_name);
  api_ok(json!(state.sync_service.preview_skill_files(&tool_id, &skill_name)))
}

async fn api_import_single_skill(
  Path((tool_id, raw_skill_name)): Path<(String, String)>,
  State(state): State<ApiState>,
  Json(body): Json<ImportBody>,
) -> Json<Value> {
  let skill_name = decode_url_path(&raw_skill_name);
  let result = state.sync_service.import_from_tool(
    &tool_id,
    &skill_name,
    body.overwrite.unwrap_or(false),
    body.symlink.unwrap_or(false),
  );
  if result.success {
    api_message(format!("Skill \"{}\" imported successfully", skill_name))
  } else {
    api_err(result.error.unwrap_or_else(|| "Import failed".to_string()))
  }
}

async fn api_restore_symlink(
  Path((tool_id, raw_skill_name)): Path<(String, String)>,
  State(state): State<ApiState>,
) -> Json<Value> {
  let skill_name = decode_url_path(&raw_skill_name);
  let result = state.sync_service.restore_from_symlink(&tool_id, &skill_name);
  if result.success {
    api_message(format!("Skill \"{}\" restored from symlink", skill_name))
  } else {
    api_err(result.error.unwrap_or_else(|| "Restore failed".to_string()))
  }
}

async fn api_import_all_skills_from_tool(
  Path(tool_id): Path<String>,
  State(state): State<ApiState>,
  Json(body): Json<ImportBody>,
) -> Json<Value> {
  let result = state
    .sync_service
    .import_all_from_tool(&tool_id, body.overwrite.unwrap_or(false));
  if result.success {
    api_ok_with_message(
      json!(result),
      format!("Imported {} skills, {} failed", result.imported, result.failed),
    )
  } else {
    Json(json!({"success": false, "error": result.error, "data": result}))
  }
}

fn api_ok(data: Value) -> Json<Value> {
  Json(json!({"success": true, "data": data}))
}

fn api_ok_with_message(data: Value, message: String) -> Json<Value> {
  Json(json!({"success": true, "data": data, "message": message}))
}

fn api_message<T: ToString>(message: T) -> Json<Value> {
  Json(json!({"success": true, "message": message.to_string()}))
}

fn api_err<T: ToString>(error: T) -> Json<Value> {
  Json(json!({"success": false, "error": error.to_string()}))
}
