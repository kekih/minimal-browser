use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub homepage: String,
    pub theme: String,
    pub start_maximized: bool,
    pub clear_on_exit: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            homepage: "https://duckduckgo.com".to_string(),
            theme: "dark".to_string(),
            start_maximized: false,
            clear_on_exit: false,
        }
    }
}

impl Settings {
    fn path() -> PathBuf {
        let dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("minimal-browser");
        let _ = fs::create_dir_all(&dir);
        dir.join("settings.json")
    }

    pub fn load() -> Self {
        let path = Self::path();
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(s) = serde_json::from_str::<Settings>(&data) {
                return s;
            }
        }
        let s = Self::default();
        let _ = s.save();
        s
    }

    pub fn save(&self) -> std::io::Result<()> {
        let path = Self::path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let data = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        fs::write(path, data)
    }
}
