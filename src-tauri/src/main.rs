#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;

use std::io::{Error, ErrorKind, Result, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, RunEvent};
use tokio::sync::oneshot;

const API_PORT: u16 = 31337;
const API_HOST: &str = "127.0.0.1";

struct ApiServerHandle(Mutex<Option<oneshot::Sender<()>>>);

fn append_startup_log(app: &AppHandle, message: &str) {
  let mut candidates: Vec<PathBuf> = Vec::new();
  if let Ok(log_dir) = app.path().app_log_dir() {
    candidates.push(log_dir);
  }
  candidates.push(std::env::temp_dir().join("skill-sync-gui-rust"));

  for dir in candidates {
    if std::fs::create_dir_all(&dir).is_ok() {
      let file_path = dir.join("startup.log");
      if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(file_path)
      {
        let _ = writeln!(file, "{}", message);
        break;
      }
    }
  }
}

fn start_embedded_server(app: &AppHandle) -> Result<oneshot::Sender<()>> {
  let config_dir = app.path().app_config_dir().map_err(|err| {
    Error::new(
      ErrorKind::NotFound,
      format!("Failed to resolve app config directory: {err}"),
    )
  })?;
  std::fs::create_dir_all(&config_dir)?;

  let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
  let state = backend::api::ApiState::new(config_dir);
  let router = backend::api::build_router(state);

  std::thread::spawn(move || {
    let runtime = match tokio::runtime::Builder::new_multi_thread()
      .enable_all()
      .build()
    {
      Ok(v) => v,
      Err(err) => {
        eprintln!("Failed to build tokio runtime: {}", err);
        return;
      }
    };

    runtime.block_on(async move {
      let listener = match tokio::net::TcpListener::bind((API_HOST, API_PORT)).await {
        Ok(v) => v,
        Err(err) => {
          eprintln!("Failed to bind embedded API server: {}", err);
          return;
        }
      };
      let server = axum::serve(listener, router);
      let graceful = server.with_graceful_shutdown(async move {
        let _ = shutdown_rx.await;
      });
      if let Err(err) = graceful.await {
        eprintln!("Embedded API server error: {}", err);
      }
    });
  });

  Ok(shutdown_tx)
}

fn shutdown_server(app: &AppHandle) {
  if let Some(state) = app.try_state::<ApiServerHandle>() {
    if let Ok(mut lock) = state.0.lock() {
      if let Some(shutdown_tx) = lock.take() {
        let _ = shutdown_tx.send(());
      }
    }
  }
}

fn main() {
  let app = tauri::Builder::default()
    .setup(|app| {
      append_startup_log(app.handle(), "setup: start");
      let shutdown_tx = start_embedded_server(app.handle())?;
      app.manage(ApiServerHandle(Mutex::new(Some(shutdown_tx))));
      append_startup_log(
        app.handle(),
        &format!("setup: embedded rust server started at http://{}:{}", API_HOST, API_PORT),
      );
      append_startup_log(app.handle(), "setup: done");
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while running tauri application");

  app.run(|app, event| {
    if matches!(event, RunEvent::Exit) {
      shutdown_server(app);
    }
  });
}

