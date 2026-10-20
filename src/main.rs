mod settings;
mod ui;

use settings::Settings;
use std::sync::{Arc, Mutex};
use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop, EventLoopBuilder},
    window::WindowBuilder,
};
use wry::{
    http::{header::CONTENT_TYPE, Request, Response},
    WebViewBuilder,
};

enum UserEvent {
    Navigate(String),
    GoBack,
    GoForward,
    Reload,
    OpenSettings,
    SaveSettings(String),
    CloseSettings,
    GetSettings,
}

fn main() -> wry::Result<()> {
    let settings = Arc::new(Mutex::new(Settings::load()));
    {
        let s = settings.lock().unwrap();
        // Theme is applied via HTML/CSS; dark is default
        let _ = s.theme.clone();
    }

    let event_loop: EventLoop<UserEvent> = EventLoopBuilder::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let homepage = settings.lock().unwrap().homepage.clone();
    let start_max = settings.lock().unwrap().start_maximized;

    let window = WindowBuilder::new()
        .with_title("Minimal Browser")
        .with_inner_size(tao::dpi::LogicalSize::new(1200.0, 800.0))
        .with_min_inner_size(tao::dpi::LogicalSize::new(400.0, 300.0))
        .build(&event_loop)
        .expect("Failed to create window");

    if start_max {
        window.set_maximized(true);
    }

    let settings_for_ipc = settings.clone();
    let proxy_nav = proxy.clone();
    let proxy_back = proxy.clone();
    let proxy_fwd = proxy.clone();
    let proxy_reload = proxy.clone();
    let proxy_settings = proxy.clone();
    let proxy_save = proxy.clone();
    let proxy_close = proxy.clone();

    let builder = WebViewBuilder::new()
        .with_html(ui::shell_html(&homepage))
        .with_ipc_handler(move |message| {
            let msg = message.body();
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(msg) {
                let action = v.get("action").and_then(|a| a.as_str()).unwrap_or("");
                match action {
                    "navigate" => {
                        if let Some(url) = v.get("url").and_then(|u| u.as_str()) {
                            let _ = proxy_nav.send_event(UserEvent::Navigate(url.to_string()));
                        }
                    }
                    "back" => {
                        let _ = proxy_back.send_event(UserEvent::GoBack);
                    }
                    "forward" => {
                        let _ = proxy_fwd.send_event(UserEvent::GoForward);
                    }
                    "reload" => {
                        let _ = proxy_reload.send_event(UserEvent::Reload);
                    }
                    "open_settings" => {
                        let _ = proxy_settings.send_event(UserEvent::OpenSettings);
                    }
                    "save_settings" => {
                        if let Some(data) = v.get("data") {
                            let _ = proxy_save.send_event(UserEvent::SaveSettings(data.to_string()));
                        }
                    }
                    "close_settings" => {
                        let _ = proxy_close.send_event(UserEvent::CloseSettings);
                    }
                    "get_settings" => {
                        // handled via custom protocol below is harder; push settings on open
                    }
                    _ => {}
                }
            }
        })
        .with_custom_protocol("mb".to_string(), move |_webview_id, request| {
            proto_handler(request, &settings_for_ipc)
        });

    #[cfg(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "ios",
        target_os = "android"
    ))]
    let webview = builder.build(&window)?;

    #[cfg(not(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "ios",
        target_os = "android"
    )))]
    let webview = {
        use tao::platform::unix::WindowExtUnix;
        use wry::WebViewBuilderExtUnix;
        let vbox = window.default_vbox().unwrap();
        builder.build_gtk(vbox)?
    };

    // Track current page URL for display
    let current_url = Arc::new(Mutex::new(homepage.clone()));

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::UserEvent(user_event) => match user_event {
                UserEvent::Navigate(raw) => {
                    let url = normalize_url(&raw);
                    if let Ok(mut u) = current_url.lock() {
                        *u = url.clone();
                    }
                    let js = format(
                        "window.__mbNavigate({});",
                        serde_json::to_string(&url).unwrap_or_else(|_| "\"about:blank\"".into())
                    );
                    let _ = webview.evaluate_script(&js);
                }
                UserEvent::GoBack => {
                    let _ = webview.evaluate_script("window.__mbBack && window.__mbBack();");
                }
                UserEvent::GoForward => {
                    let _ = webview.evaluate_script("window.__mbForward && window.__mbForward();");
                }
                UserEvent::Reload => {
                    let _ = webview.evaluate_script("window.__mbReload && window.__mbReload();");
                }
                UserEvent::OpenSettings => {
                    let s = settings.lock().unwrap().clone();
                    let json = serde_json::to_string(&s).unwrap_or_else(|_| "{}".into());
                    let js = format!(
                        "window.__mbShowSettings({});",
                        serde_json::to_string(&json).unwrap_or_else(|_| "\"{}\"".into())
                    );
                    let _ = webview.evaluate_script(&js);
                }
                UserEvent::SaveSettings(data) => {
                    if let Ok(partial) = serde_json::from_str::<serde_json::Value>(&data) {
                        let mut s = settings.lock().unwrap();
                        if let Some(v) = partial.get("homepage").and_then(|x| x.as_str()) {
                            s.homepage = v.to_string();
                        }
                        if let Some(v) = partial.get("theme").and_then(|x| x.as_str()) {
                            s.theme = v.to_string();
                        }
                        if let Some(v) = partial.get("start_maximized").and_then(|x| x.as_bool()) {
                            s.start_maximized = v;
                        }
                        if let Some(v) = partial.get("clear_on_exit").and_then(|x| x.as_bool()) {
                            s.clear_on_exit = v;
                        }
                        let _ = s.save();
                        let theme = s.theme.clone();
                        drop(s);
                        let js = format!(
                            "window.__mbApplyTheme({});",
                            serde_json::to_string(&theme).unwrap_or_else(|_| "\"dark\"".into())
                        );
                        let _ = webview.evaluate_script(&js);
                    }
                }
                UserEvent::CloseSettings => {
                    let _ = webview.evaluate_script("window.__mbHideSettings && window.__mbHideSettings();");
                }
                UserEvent::GetSettings => {}
            },
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                let clear = settings.lock().unwrap().clear_on_exit;
                if clear {
                    // Best-effort: clear browsing data is limited on system webviews
                    let _ = webview.evaluate_script(
                        "try{localStorage.clear();sessionStorage.clear();}catch(e){}",
                    );
                }
                // Save window state if needed in future
                *control_flow = ControlFlow::Exit;
            }
            Event::WindowEvent {
                event: WindowEvent::Resized(_),
                ..
            } => {
                // wry handles resize with the window
            }
            _ => {}
        }
    });
}

fn normalize_url(raw: &str) -> String {
    let t = raw.trim();
    if t.is_empty() {
        return "https://duckduckgo.com".to_string();
    }
    if t.starts_with("http://")
        || t.starts_with("https://")
        || t.starts_with("file://")
        || t.starts_with("about:")
        || t.starts_with("data:")
    {
        return t.to_string();
    }
    if t.contains('.') && !t.contains(' ') {
        format!("https://{t}")
    } else {
        format!(
            "https://duckduckgo.com/?q={}",
            urlencoding_minimal(t)
        )
    }
}

fn urlencoding_minimal(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            b' ' => out.push_str("%20"),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn proto_handler(
    request: Request<Vec<u8>>,
    settings: &Arc<Mutex<Settings>>,
) -> Result<Response<std::borrow::Cow<'static, [u8]>>, wry::http::Error> {
    let path = request.uri().path();
    if path == "/settings" || path.ends_with("/settings") {
        let s = settings.lock().unwrap().clone();
        let body = serde_json::to_vec(&s).unwrap_or_else(|_| b"{}".to_vec());
        Response::builder()
            .header(CONTENT_TYPE, "application/json")
            .body(std::borrow::Cow::Owned(body))
    } else {
        Response::builder()
            .status(404)
            .body(std::borrow::Cow::Borrowed(b"not found" as &[u8]))
    }
}
