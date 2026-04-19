#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_health,
            get_sales_overview,
            get_sales_leads,
            create_reply_draft
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
