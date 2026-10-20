/// HTML shell: toolbar + iframe for page content + settings panel.
/// Dark theme by default. IPC via window.ipc.postMessage (wry).
pub fn shell_html(homepage: &str) -> String {
    let home = homepage.replace('"', "&quot;");
    format!(r#