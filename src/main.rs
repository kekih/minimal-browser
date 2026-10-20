mod settings;

use settings::Settings;
use std::sync::{Arc, Mutex};
use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::WindowBuilder,
};
use wry::WebViewBuilder;

#[derive(Debug)]
enum UserEvent {
    Navigate(String),
    OpenSettings,
    SaveSettings(String),
}

fn main() {
    let settings = Arc::new(Mutex::new(Settings::load()));
    let homepage = settings.lock().unwrap().homepage.clone();
    let start_max = settings.lock().unwrap().start_maximized;
    let theme = settings.lock().unwrap().theme.clone();

    let event_loop = EventLoopBuilder::<UserEvent>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let window = WindowBuilder::new()
        .with_title("Minimal Browser")
        .with_inner_size(tao::dpi::LogicalSize::new(1200.0, 800.0))
        .with_min_inner_size(tao::dpi::LogicalSize::new(400.0, 300.0))
        .build(&event_loop)
        .expect("Failed to create window");

    if start_max {
        window.set_maximized(true);
    }

    let proxy_ipc = proxy.clone();
    let init_script = inject_script(&theme);

    let builder = WebViewBuilder::new()
        .with_url(&homepage)
        .with_initialization_script(&init_script)
        .with_ipc_handler(move |req| {
            let body = req.body();
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(body) {
                let action = v.get("action").and_then(|a| a.as_str()).unwrap_or("");
                match action {
                    "navigate" => {
                        if let Some(url) = v.get("url").and_then(|u| u.as_str()) {
                            let _ = proxy_ipc.send_event(UserEvent::Navigate(url.to_string()));
                        }
                    }
                    "open_settings" => {
                        let _ = proxy_ipc.send_event(UserEvent::OpenSettings);
                    }
                    "save_settings" => {
                        if let Some(data) = v.get("data") {
                            let _ =
                                proxy_ipc.send_event(UserEvent::SaveSettings(data.to_string()));
                        }
                    }
                    _ => {}
                }
            }
        });

    #[cfg(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "ios",
        target_os = "android"
    ))]
    let webview = builder.build(&window).expect("Failed to create webview");

    #[cfg(target_os = "linux")]
    let webview = {
        use tao::platform::unix::WindowExtUnix;
        use wry::WebViewBuilderExtUnix;
        let vbox = window.default_vbox().expect("gtk vbox");
        builder.build_gtk(vbox).expect("Failed to create webview")
    };

    let settings_ev = settings.clone();

    event_loop.run(move |event, elwt| {
        elwt.set_control_flow(ControlFlow::Wait);

        match event {
            Event::UserEvent(UserEvent::Navigate(raw)) => {
                let url = normalize_url(&raw);
                let _ = webview.load_url(&url);
            }
            Event::UserEvent(UserEvent::OpenSettings) => {
                let s = settings_ev.lock().unwrap().clone();
                let json = serde_json::to_string(&s).unwrap_or_else(|_| "{}".into());
                let js = format!(
                    "window.__mbOpenSettings && window.__mbOpenSettings({});",
                    serde_json::to_string(&json).unwrap_or_else(|_| "\"{}\"".into())
                );
                let _ = webview.evaluate_script(&js);
            }
            Event::UserEvent(UserEvent::SaveSettings(data)) => {
                if let Ok(partial) = serde_json::from_str::<serde_json::Value>(&data) {
                    let mut s = settings_ev.lock().unwrap();
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
                    let theme = s.theme.clone();
                    let _ = s.save();
                    drop(s);
                    let js = format!(
                        "window.__mbSetTheme && window.__mbSetTheme({});",
                        serde_json::to_string(&theme).unwrap_or_else(|_| "\"dark\"".into())
                    );
                    let _ = webview.evaluate_script(&js);
                }
            }
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                let clear = settings_ev.lock().unwrap().clear_on_exit;
                if clear {
                    let _ = webview.evaluate_script(
                        "try{localStorage.clear();sessionStorage.clear();}catch(e){}",
                    );
                }
                elwt.exit();
            }
            _ => {}
        }
    });
}

fn normalize_url(raw: &str) -> String {
    let t = raw.trim();
    if t.is_empty() {
        return "https://duckduckgo.com".into();
    }
    if t.starts_with("http://")
        || t.starts_with("https://")
        || t.starts_with("file://")
        || t.starts_with("about:")
    {
        return t.to_string();
    }
    if t.contains('.') && !t.contains(' ') {
        format!("https://{t}")
    } else {
        let q: String = t
            .bytes()
            .map(|b| match b {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    (b as char).to_string()
                }
                b' ' => "%20".into(),
                _ => format!("%{b:02X}"),
            })
            .collect();
        format!("https://duckduckgo.com/?q={q}")
    }
}

fn inject_script(theme: &str) -> String {
    let theme_lit = serde_json::to_string(theme).unwrap_or_else(|_| "\"dark\"".into());
    let js = include_str!("inject.js");
    js.replacen("var THEME = \"dark\";", &format!("var THEME = {theme_lit};"), 1)
}
