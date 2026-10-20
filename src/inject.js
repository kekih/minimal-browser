(function () {
  if (window.__mbToolbar) return;
  window.__mbToolbar = true;

  var THEME = "dark";

  function post(obj) {
    try {
      window.ipc.postMessage(JSON.stringify(obj));
    } catch (e) {
      console.warn("ipc", e);
    }
  }

  function applyTheme(t) {
    THEME = t || "dark";
    var dark = THEME !== "light";
    var bar = document.getElementById("__mb_bar");
    var panel = document.getElementById("__mb_panel");
    if (bar) {
      bar.style.background = dark ? "#252525" : "#e8e8e8";
      bar.style.borderBottom = dark ? "1px solid #333" : "1px solid #ccc";
      bar.querySelectorAll("button").forEach(function (b) {
        b.style.background = dark ? "#333" : "#ddd";
        b.style.color = dark ? "#e0e0e0" : "#222";
      });
      var inp = document.getElementById("__mb_url");
      if (inp) {
        inp.style.background = dark ? "#1e1e1e" : "#fff";
        inp.style.color = dark ? "#e0e0e0" : "#111";
        inp.style.border = dark ? "1px solid #444" : "1px solid #bbb";
      }
    }
    if (panel) {
      panel.style.background = dark ? "#2a2a2a" : "#fff";
      panel.style.color = dark ? "#e0e0e0" : "#1a1a1a";
      panel.style.border = dark ? "1px solid #444" : "1px solid #ccc";
    }
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }

  window.__mbSetTheme = applyTheme;

  function ensureBar() {
    if (document.getElementById("__mb_bar")) return;
    if (!document.body) return;

    var bar = document.createElement("div");
    bar.id = "__mb_bar";
    bar.innerHTML =
      '<button type="button" id="__mb_back" title="Back">&#9664;</button>' +
      '<button type="button" id="__mb_fwd" title="Forward">&#9654;</button>' +
      '<button type="button" id="__mb_rel" title="Reload">&#8635;</button>' +
      '<input type="text" id="__mb_url" placeholder="URL or search..." spellcheck="false" />' +
      '<button type="button" id="__mb_go" title="Go">&#8594;</button>' +
      '<button type="button" id="__mb_set" title="Settings">&#9881;</button>';

    Object.assign(bar.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      height: "48px",
      zIndex: "2147483646",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "0 10px",
      boxSizing: "border-box",
      fontFamily: "system-ui,sans-serif",
    });

    document.body.appendChild(bar);
    document.body.style.paddingTop = "48px";

    var styleBtn = function (b) {
      Object.assign(b.style, {
        width: "32px",
        height: "32px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px",
        flexShrink: "0",
      });
    };
    bar.querySelectorAll("button").forEach(styleBtn);

    var inp = document.getElementById("__mb_url");
    Object.assign(inp.style, {
      flex: "1",
      height: "32px",
      borderRadius: "16px",
      padding: "0 14px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    });
    try {
      inp.value = location.href;
    } catch (e) {}

    function go() {
      post({ action: "navigate", url: inp.value });
    }
    document.getElementById("__mb_go").onclick = go;
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") go();
    });
    document.getElementById("__mb_back").onclick = function () {
      history.back();
    };
    document.getElementById("__mb_fwd").onclick = function () {
      history.forward();
    };
    document.getElementById("__mb_rel").onclick = function () {
      location.reload();
    };
    document.getElementById("__mb_set").onclick = function () {
      post({ action: "open_settings" });
    };

    applyTheme(THEME);
  }

  window.__mbOpenSettings = function (jsonStr) {
    ensureBar();
    var data = {};
    try {
      data = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr || {};
    } catch (e) {}

    var old = document.getElementById("__mb_panel");
    if (old) old.remove();
    var bd = document.getElementById("__mb_bd");
    if (bd) bd.remove();

    bd = document.createElement("div");
    bd.id = "__mb_bd";
    Object.assign(bd.style, {
      position: "fixed",
      inset: "48px 0 0 0",
      background: "rgba(0,0,0,0.4)",
      zIndex: "2147483646",
    });
    bd.onclick = closePanel;

    var panel = document.createElement("div");
    panel.id = "__mb_panel";
    panel.innerHTML =
      "<h2 style=\"margin:0 0 12px;font-size:18px\">Settings</h2>" +
      '<label style="display:block;margin:10px 0;font-size:13px">Homepage<br><input id="__mb_home" style="width:100%;margin-top:4px;padding:6px 8px;border-radius:6px;border:1px solid #444;background:#1e1e1e;color:#e0e0e0"/></label>' +
      '<label style="display:block;margin:10px 0;font-size:13px">Theme<br><select id="__mb_theme" style="width:100%;margin-top:4px;padding:6px 8px;border-radius:6px;border:1px solid #444;background:#1e1e1e;color:#e0e0e0"><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>' +
      '<label style="display:flex;align-items:center;gap:8px;margin:10px 0;font-size:13px"><input type="checkbox" id="__mb_max"/> Start maximized</label>' +
      '<label style="display:flex;align-items:center;gap:8px;margin:10px 0;font-size:13px"><input type="checkbox" id="__mb_clear"/> Clear data on exit</label>' +
      '<div style="display:flex;gap:8px;margin-top:14px">' +
      '<button type="button" id="__mb_save" style="flex:1;padding:8px;border:none;border-radius:6px;background:#0a84ff;color:#fff;cursor:pointer">Save</button>' +
      '<button type="button" id="__mb_close" style="flex:1;padding:8px;border:none;border-radius:6px;background:#444;color:#e0e0e0;cursor:pointer">Close</button>' +
      "</div>" +
      '<p style="margin-top:12px;font-size:11px;color:#999;line-height:1.4">Bitwarden: use the desktop app. System WebView does not load Chrome extensions.</p>';

    Object.assign(panel.style, {
      position: "fixed",
      top: "58px",
      right: "10px",
      width: "340px",
      maxHeight: "calc(100vh - 70px)",
      overflowY: "auto",
      zIndex: "2147483647",
      borderRadius: "10px",
      padding: "16px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      fontFamily: "system-ui,sans-serif",
      boxSizing: "border-box",
    });

    document.body.appendChild(bd);
    document.body.appendChild(panel);

    document.getElementById("__mb_home").value = data.homepage || "https://duckduckgo.com";
    document.getElementById("__mb_theme").value = data.theme || "dark";
    document.getElementById("__mb_max").checked = !!data.start_maximized;
    document.getElementById("__mb_clear").checked = !!data.clear_on_exit;

    document.getElementById("__mb_save").onclick = function () {
      post({
        action: "save_settings",
        data: {
          homepage: document.getElementById("__mb_home").value,
          theme: document.getElementById("__mb_theme").value,
          start_maximized: document.getElementById("__mb_max").checked,
          clear_on_exit: document.getElementById("__mb_clear").checked,
        },
      });
      closePanel();
    };
    document.getElementById("__mb_close").onclick = closePanel;

    applyTheme(data.theme || THEME);

    function closePanel() {
      var p = document.getElementById("__mb_panel");
      var b = document.getElementById("__mb_bd");
      if (p) p.remove();
      if (b) b.remove();
    }

    document.addEventListener(
      "keydown",
      function esc(e) {
        if (e.key === "Escape") {
          closePanel();
          document.removeEventListener("keydown", esc);
        }
      },
      { once: true }
    );
  };

  function boot() {
    ensureBar();
    applyTheme(THEME);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 100);
  setTimeout(boot, 500);
})();
