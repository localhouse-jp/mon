// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Mutex;
use tauri::State;

// APIベースURLを保持する状態
struct ApiConfig {
    base_url: Mutex<String>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// APIベースURLを設定するコマンド
#[tauri::command]
fn set_api_base_url(api_config: State<ApiConfig>, url: String) -> Result<(), String> {
    let mut base_url = api_config
        .base_url
        .lock()
        .map_err(|_| "Failed to lock API config".to_string())?;
    *base_url = url;
    Ok(())
}

// APIベースURLを取得するコマンド
#[tauri::command]
fn get_api_base_url(api_config: State<ApiConfig>) -> Result<String, String> {
    let base_url = api_config
        .base_url
        .lock()
        .map_err(|_| "Failed to lock API config".to_string())?;
    Ok(base_url.clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let api_config = ApiConfig {
        // 環境変数から初期値を取得するか、デフォルト値を設定
        base_url: Mutex::new(
            std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://localhost:3000".to_string()),
        ),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(api_config)
        .invoke_handler(tauri::generate_handler![
            greet,
            set_api_base_url,
            get_api_base_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
