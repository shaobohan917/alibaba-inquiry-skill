use std::sync::{Arc, Mutex};
#[cfg(not(debug_assertions))]
use tauri::Manager;
use tauri::RunEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_health,
            get_sales_overview,
            get_sales_leads,
            create_reply_draft
        ]);

    let app_handle = app.build(tauri::generate_context!())
        .expect("error while building tauri application");

    let backend_child: Arc<Mutex<Option<std::process::Child>>> = Arc::new(Mutex::new(None));

    #[cfg(not(debug_assertions))]
    {
        let child = start_backend(&app_handle);
        *backend_child.lock().expect("backend child lock poisoned") = child;
    }

    app_handle.run(move |_app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(mut child) = backend_child
                .lock()
                .expect("backend child lock poisoned")
                .take()
            {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    });
}

#[cfg(not(debug_assertions))]
fn start_backend(app: &tauri::App) -> Option<std::process::Child> {
    use std::fs;
    use std::io::Write;
    use std::net::{SocketAddr, TcpStream};
    use std::process::{Command, Stdio};
    use std::time::Duration;

    let app_data_dir = match app.path().app_data_dir() {
        Ok(path) => path,
        Err(error) => {
            eprintln!("Failed to resolve app data directory: {error}");
            return None;
        }
    };
    if let Err(error) = fs::create_dir_all(&app_data_dir) {
        eprintln!("Failed to create app data directory {:?}: {error}", app_data_dir);
        return None;
    }

    let logs_dir = app_data_dir.join("logs");
    if let Err(error) = fs::create_dir_all(&logs_dir) {
        eprintln!("Failed to create backend logs directory {:?}: {error}", logs_dir);
        return None;
    }

    let launcher_log_path = logs_dir.join("backend-launcher.log");
    let log_launcher = |message: &str| {
        if let Ok(mut file) = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&launcher_log_path)
        {
            let _ = writeln!(file, "{message}");
        }
    };

    log_launcher("Starting backend launcher");
    log_launcher(&format!("App data directory: {:?}", app_data_dir));

    let backend_addr: SocketAddr = "127.0.0.1:3001".parse().ok()?;
    if TcpStream::connect_timeout(&backend_addr, Duration::from_millis(300)).is_ok() {
        println!("Backend already listening on http://127.0.0.1:3001");
        log_launcher("Backend already listening on http://127.0.0.1:3001; skip spawn");
        return None;
    }

    let resource_dir = match app.path().resource_dir() {
        Ok(path) => path,
        Err(error) => {
            eprintln!("Failed to resolve app resource directory: {error}");
            log_launcher(&format!("Failed to resolve app resource directory: {error}"));
            return None;
        }
    };
    let resource_archive = resource_dir.join("backend-runtime.tar.gz");
    log_launcher(&format!("Backend runtime archive: {:?}", resource_archive));
    if !resource_archive.exists() {
        eprintln!("Bundled backend runtime archive missing: {:?}", resource_archive);
        log_launcher(&format!("Bundled backend runtime archive missing: {:?}", resource_archive));
        return None;
    }

    let runtime_dir = app_data_dir.join("backend-runtime");
    let version_file = runtime_dir.join(".runtime-version");
    let chrome_user_data_root = app_data_dir.join("chrome-user-data");
    let legacy_chrome_user_data_root = runtime_dir.join("app/.chrome-user-data");
    if let Err(error) = fs::create_dir_all(&chrome_user_data_root) {
        eprintln!("Failed to create Chrome user data root: {error}");
        log_launcher(&format!(
            "Failed to create Chrome user data root {:?}: {error}",
            chrome_user_data_root
        ));
        return None;
    }
    let archive_metadata = match fs::metadata(&resource_archive) {
        Ok(metadata) => metadata,
        Err(error) => {
            eprintln!(
                "Failed to read backend runtime archive metadata {:?}: {error}",
                resource_archive
            );
            log_launcher(&format!(
                "Failed to read backend runtime archive metadata {:?}: {error}",
                resource_archive
            ));
            return None;
        }
    };
    let archive_modified = archive_metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    let runtime_stamp = format!(
        "{}:{}:{}",
        env!("CARGO_PKG_VERSION"),
        archive_metadata.len(),
        archive_modified
    );

    if fs::read_to_string(&version_file).ok().as_deref() != Some(runtime_stamp.as_str()) {
        if runtime_dir.exists() {
            if legacy_chrome_user_data_root.exists() {
                match migrate_chrome_user_data(&legacy_chrome_user_data_root, &chrome_user_data_root) {
                    Ok(migrated_roles) if migrated_roles > 0 => {
                        log_launcher(&format!(
                            "Migrated {migrated_roles} Chrome user data profile(s) from {:?} to {:?} before runtime refresh",
                            legacy_chrome_user_data_root, chrome_user_data_root
                        ));
                    }
                    Ok(_) => {}
                    Err(error) => {
                        log_launcher(&format!(
                            "Failed to migrate Chrome user data from {:?} to {:?} before runtime refresh: {error}",
                            legacy_chrome_user_data_root, chrome_user_data_root
                        ));
                    }
                }
            }
            log_launcher(&format!("Removing stale backend runtime: {:?}", runtime_dir));
            if let Err(error) = fs::remove_dir_all(&runtime_dir) {
                eprintln!("Failed to remove stale backend runtime {:?}: {error}", runtime_dir);
                log_launcher(&format!("Failed to remove stale backend runtime {:?}: {error}", runtime_dir));
                return None;
            }
        }
        log_launcher("Extracting backend runtime archive");
        let extract_output = Command::new("/usr/bin/tar")
            .arg("-xzf")
            .arg(&resource_archive)
            .arg("-C")
            .arg(&app_data_dir)
            .output();
        match extract_output {
            Ok(output) if output.status.success() => {
                log_launcher("Backend runtime archive extracted successfully");
            }
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("Failed to extract backend runtime archive: {:?}", output.status);
                log_launcher(&format!("Failed to extract backend runtime archive: {:?}", output.status));
                if !stdout.trim().is_empty() {
                    log_launcher(&format!("tar stdout: {}", stdout.trim()));
                }
                if !stderr.trim().is_empty() {
                    log_launcher(&format!("tar stderr: {}", stderr.trim()));
                }
                return None;
            }
            Err(error) => {
                eprintln!("Failed to run tar for backend runtime archive: {error}");
                log_launcher(&format!("Failed to run tar for backend runtime archive: {error}"));
                return None;
            }
        }
        if !runtime_dir.exists() {
            eprintln!("Backend runtime extraction did not create {:?}", runtime_dir);
            log_launcher(&format!("Backend runtime extraction did not create {:?}", runtime_dir));
            return None;
        }
        if let Err(error) = fs::write(&version_file, &runtime_stamp) {
            eprintln!("Failed to write backend runtime version: {error}");
            log_launcher(&format!("Failed to write backend runtime version: {error}"));
        } else {
            log_launcher(&format!("Backend runtime stamp set to {runtime_stamp}"));
        }
    } else {
        log_launcher(&format!(
            "Backend runtime already prepared for stamp {runtime_stamp}"
        ));
    }

    let node_path = runtime_dir.join("bin/node");
    let app_root = runtime_dir.join("app");
    let backend_entry = app_root.join("backend/src/server.js");
    let data_dir = app_data_dir.join("data");

    if !node_path.exists() {
        eprintln!("Bundled Node binary missing: {:?}", node_path);
        log_launcher(&format!("Bundled Node binary missing: {:?}", node_path));
        return None;
    }
    if !backend_entry.exists() {
        eprintln!("Bundled backend entry missing: {:?}", backend_entry);
        log_launcher(&format!("Bundled backend entry missing: {:?}", backend_entry));
        return None;
    }

    if let Err(error) = fs::create_dir_all(&data_dir) {
        eprintln!("Failed to create backend data directory: {error}");
        log_launcher(&format!("Failed to create backend data directory {:?}: {error}", data_dir));
        return None;
    }
    if legacy_chrome_user_data_root.exists() {
        match migrate_chrome_user_data(&legacy_chrome_user_data_root, &chrome_user_data_root) {
            Ok(migrated_roles) if migrated_roles > 0 => {
                log_launcher(&format!(
                    "Migrated {migrated_roles} Chrome user data profile(s) from {:?} to {:?}",
                    legacy_chrome_user_data_root, chrome_user_data_root
                ));
            }
            Ok(_) => {}
            Err(error) => {
                log_launcher(&format!(
                    "Failed to migrate Chrome user data from {:?} to {:?}: {error}",
                    legacy_chrome_user_data_root, chrome_user_data_root
                ));
            }
        }
    }

    let stdout = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(logs_dir.join("backend.stdout.log"))
        .ok();
    let stderr = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(logs_dir.join("backend.stderr.log"))
        .ok();

    println!("Starting bundled backend from: {:?}", backend_entry);
    log_launcher(&format!("Starting bundled backend from: {:?}", backend_entry));
    log_launcher(&format!("Node binary: {:?}", node_path));
    log_launcher(&format!("Backend working directory: {:?}", app_root));
    log_launcher(&format!("Backend database path: {:?}", data_dir.join("ali-ai-agent-system.sqlite")));
    log_launcher(&format!("Chrome user data root: {:?}", chrome_user_data_root));
    let mut command = Command::new(node_path);
    command
        .arg(backend_entry)
        .current_dir(app_root)
        .env("NODE_ENV", "production")
        .env("API_HOST", "127.0.0.1")
        .env("API_PORT", "3001")
        .env("DB_PATH", data_dir.join("ali-ai-agent-system.sqlite"))
        .env("CHROME_USER_DATA_ROOT", &chrome_user_data_root);

    if let Some(file) = stdout {
        command.stdout(Stdio::from(file));
    } else {
        command.stdout(Stdio::null());
    }

    if let Some(file) = stderr {
        command.stderr(Stdio::from(file));
    } else {
        command.stderr(Stdio::null());
    }

    match command.spawn() {
        Ok(child) => {
            log_launcher(&format!("Bundled backend spawned with pid {}", child.id()));
            Some(child)
        }
        Err(error) => {
            eprintln!("Failed to start bundled backend: {error}");
            log_launcher(&format!("Failed to start bundled backend: {error}"));
            None
        }
    }
}

#[cfg(not(debug_assertions))]
fn migrate_chrome_user_data(
    legacy_root: &std::path::Path,
    stable_root: &std::path::Path,
) -> std::io::Result<usize> {
    let mut migrated_roles = 0;

    for entry in std::fs::read_dir(legacy_root)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() {
            continue;
        }

        let source = entry.path();
        let target = stable_root.join(entry.file_name());
        if target.exists() {
            continue;
        }

        copy_dir_all(&source, &target)?;
        migrated_roles += 1;
    }

    Ok(migrated_roles)
}

#[cfg(not(debug_assertions))]
fn copy_dir_all(source: &std::path::Path, target: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(target)?;

    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());

        if file_type.is_dir() {
            copy_dir_all(&source_path, &target_path)?;
        } else if file_type.is_file() {
            std::fs::copy(&source_path, &target_path)?;
        } else if file_type.is_symlink() {
            if let Ok(link_target) = std::fs::read_link(&source_path) {
                let _ = std::os::unix::fs::symlink(link_target, &target_path);
            }
        }
    }

    Ok(())
}


#[tauri::command]
fn app_health() -> &'static str {
    "ok"
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SalesOverview {
    inquiry_count: u32,
    new_inquiry_count: u32,
    urgent_inquiry_count: u32,
    high_intent_customer_count: u32,
    follow_up_task_count: u32,
    customer_count: u32,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SalesLead {
    id: String,
    customer: String,
    contact_name: Option<String>,
    country: Option<String>,
    intent: String,
    score: u32,
    action: String,
    status: String,
    priority: String,
    inquiry_count: u32,
    last_contacted_at: Option<String>,
    latest_inquiry_at: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReplyDraftRequest {
    message: String,
    customer_name: Option<String>,
    product_name: Option<String>,
    quantity: Option<String>,
    target_price: Option<String>,
    currency: Option<String>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ReplyDraft {
    reply: String,
    intent: String,
    intent_score: u32,
    strategy: String,
    next_actions: Vec<String>,
    generated_at: String,
}

#[tauri::command]
fn get_sales_overview() -> SalesOverview {
    SalesOverview {
        inquiry_count: 128,
        new_inquiry_count: 16,
        urgent_inquiry_count: 5,
        high_intent_customer_count: 23,
        follow_up_task_count: 11,
        customer_count: 74,
    }
}

#[tauri::command]
fn get_sales_leads(limit: Option<u32>) -> Vec<SalesLead> {
    let leads = vec![
        SalesLead {
            id: "lead-001".into(),
            customer: "Apex Trading".into(),
            contact_name: Some("Michael Chen".into()),
            country: Some("United States".into()),
            intent: "高".into(),
            score: 92,
            action: "优先发送阶梯报价并确认交期".into(),
            status: "待回复".into(),
            priority: "高".into(),
            inquiry_count: 4,
            last_contacted_at: Some("2026-04-18 16:20".into()),
            latest_inquiry_at: Some("2026-04-19 09:12".into()),
        },
        SalesLead {
            id: "lead-002".into(),
            customer: "Nordic Retail Group".into(),
            contact_name: Some("Emma Larsen".into()),
            country: Some("Denmark".into()),
            intent: "中".into(),
            score: 76,
            action: "补充认证资料和包装方案".into(),
            status: "跟进中".into(),
            priority: "中".into(),
            inquiry_count: 2,
            last_contacted_at: Some("2026-04-17 11:05".into()),
            latest_inquiry_at: Some("2026-04-18 18:40".into()),
        },
        SalesLead {
            id: "lead-003".into(),
            customer: "Pacific Importers".into(),
            contact_name: Some("Sarah Miller".into()),
            country: Some("Australia".into()),
            intent: "高".into(),
            score: 88,
            action: "安排样品寄送并同步运费".into(),
            status: "待报价".into(),
            priority: "高".into(),
            inquiry_count: 3,
            last_contacted_at: Some("2026-04-18 10:30".into()),
            latest_inquiry_at: Some("2026-04-19 08:55".into()),
        },
    ];

    leads
        .into_iter()
        .take(limit.unwrap_or(20) as usize)
        .collect()
}

#[tauri::command]
fn create_reply_draft(payload: ReplyDraftRequest) -> ReplyDraft {
    let customer = payload
        .customer_name
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("客户");
    let product = payload
        .product_name
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("产品");
    let quantity = payload
        .quantity
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("确认数量");
    let currency = payload.currency.as_deref().unwrap_or("USD");
    let target_price = payload
        .target_price
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(|value| format!("，目标价 {} {}", value, currency))
        .unwrap_or_default();

    ReplyDraft {
        reply: format!(
            "Dear {customer},\n\nThank you for your inquiry about {product}. We reviewed your requirements: {message}\n\nFor {quantity}{target_price}, we can prepare a tailored quotation with lead time, packing details, and shipping options. Please confirm the destination port and any certification requirements so we can provide the most accurate offer.\n\nBest regards,",
            message = payload.message.trim()
        ),
        intent: "高".into(),
        intent_score: 86,
        strategy: "客户已提供明确需求，建议先确认关键交易条件，再发送分层报价和样品方案。".into(),
        next_actions: vec![
            "确认目的港和贸易条款".into(),
            "发送阶梯报价".into(),
            "同步样品与交期".into(),
        ],
        generated_at: "2026-04-19T00:00:00+08:00".into(),
    }
}
