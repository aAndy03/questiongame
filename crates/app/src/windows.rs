//! The webviews, and where each one stands.
//!
//! ```text
//! main   Studio. Created at boot, a normal window.
//! stage  Fullscreen, undecorated, audience-facing. Created on **first Control
//!        Load**, not at boot (§9) — there is nothing to show before a recipe
//!        is in Control, and an empty black fullscreen window on the projector
//!        while the operator is still picking a game is worse than no window.
//! stats  Optional, off unless the operator picks a display (§11.K, P11).
//!        **Studio's Statistics page, in a window of its own** — same bundle,
//!        same tokens, `?stats` on the URL — so it can never become a second
//!        Stage. `guard::STATS_COMMANDS` is what it may ask for: reads.
//! ```
//!
//! Both are created from Rust rather than declared in `tauri.conf.json`,
//! because Stage's existence depends on a Play, not on boot. Both use
//! `WebviewUrl::App`, which resolves against `devUrl` in dev and
//! `frontendDist` in the bundle — **there is no dev/prod branch here**, and
//! that is deliberate: a webview pointed at an *external* URL is `remote` to
//! Tauri's ACL even when it is `localhost`, and a remote webview is denied
//! every command and `event.listen`. The two Vite configs serve each app under
//! the same path it occupies in the bundle so that one URL works in both.
//!
//! Moving Stage between displays is a three-step dance, not a `set_position`:
//! a fullscreen window keeps its monitor, so it has to leave fullscreen, move,
//! and go back.

use questiongame_host::{MonitorKey, StageMove};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::error::AppResult;
use crate::guard::{MAIN, STAGE, STATS};
use crate::monitors;

/// The two frontends, at the path each occupies under `frontendDist` — and,
/// because both Vite configs set a matching `base`, under `devUrl` too.
const STUDIO_PATH: &str = "studio/index.html";
const STAGE_PATH: &str = "stage/index.html";
/// Studio again, told by its query string to render Statistics alone.
const STATS_PATH: &str = "studio/index.html?stats";
/// A **mirror** of the Stage window: the same bundle, told it is a mirror.
///
/// `?mirror` rather than reading the label at runtime, the way `?viewer`
/// already works: a webview then knows what it is **synchronously**, on its
/// first render, with no async label fetch to sequence against mounting the
/// audio. Mounting Howler and unmounting it a tick later is exactly the shape
/// P11.8 was about.
const MIRROR_PATH: &str = "stage/index.html?mirror";

/// Studio. A normal window: one display is a valid configuration, and then
/// Studio is an Alt-Tab away from a fullscreen Stage (§9).
/// Studio's window title. The dev build says so, because the two can run side
/// by side and the taskbar is where the operator tells them apart (P12.1).
pub fn studio_title(is_dev: bool) -> &'static str {
    if is_dev {
        "questiongame Studio (dev)"
    } else {
        "questiongame Studio"
    }
}

pub fn open_studio(app: &AppHandle) -> AppResult<WebviewWindow> {
    crate::state::assert_unlocked("windows::open_studio");
    if let Some(existing) = app.get_webview_window(MAIN) {
        return Ok(existing);
    }
    Ok(debuggable(
        WebviewWindowBuilder::new(app, MAIN, WebviewUrl::App(STUDIO_PATH.into()))
            .title(studio_title(tauri::is_dev()))
            .inner_size(1440.0, 920.0)
            .min_inner_size(1100.0, 720.0),
        app,
    )
    .build()?)
}

/// A second launch of the app (P12.2): bring the running Studio to the front
/// rather than start a second copy of the library. Takes no host lock.
pub fn focus_studio(app: &AppHandle) {
    crate::state::assert_unlocked("windows::focus_studio");
    if let Some(main) = app.get_webview_window(MAIN) {
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();
    }
}

/// The switches wry hands WebView2 when nobody else does — the "mini menu"
/// and SmartScreen off. Passing our own replaces them, so they are repeated.
#[cfg(all(windows, debug_assertions))]
const WRY_DEFAULT_BROWSER_ARGS: &str =
    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

/// Debug builds only: let a debugger reach the webview **from outside**.
///
/// A webview that has stopped responding cannot be inspected from inside it —
/// the context menu is drawn by the page that is hung — and the log can only
/// say which step did not return, not where inside it. With
/// `--remote-debugging-port`, `scripts/js-stack.mjs` attaches over the Chrome
/// DevTools Protocol, interrupts the busy thread, and prints the JavaScript
/// stack it was on. That is the difference between a night of bisecting and
/// one look. It goes through the builder rather than
/// `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` because wry sets
/// `AdditionalBrowserArguments` itself, and the option is what the browser
/// process reads. All webviews share one browser process, so the first window
/// built decides; every window says it anyway. Release builds add nothing: an
/// open debug port on a shipped app is a hole, not a feature.
/// `QUESTIONGAME_DEBUG_PORT` overrides the port (default 9222).
fn debuggable<'a>(
    builder: WebviewWindowBuilder<'a, tauri::Wry, AppHandle>,
    app: &AppHandle,
) -> WebviewWindowBuilder<'a, tauri::Wry, AppHandle> {
    // The e2e build is driven by msedgedriver, which launches WebView2 on a
    // debugging port of its own and waits for it (P12.15); a second port
    // asked for here is one more thing for it to lose.
    if app.config().identifier == crate::identity::E2E_IDENTIFIER {
        return builder;
    }
    #[cfg(all(windows, debug_assertions))]
    {
        let port = std::env::var("QUESTIONGAME_DEBUG_PORT").unwrap_or_else(|_| "9222".into());
        let args = format!("{WRY_DEFAULT_BROWSER_ARGS} --remote-debugging-port={port}");
        return builder.additional_browser_args(&args);
    }
    #[allow(unreachable_code)]
    builder
}

/// Stage, ready. Created on first Control Load and then left alone: it sits
/// fullscreen on the primary display and waits until the operator sends it
/// somewhere (§9 — the host never picks a display).
/// `on` is where the host believes Stage stands — `StageDisplay::current()`,
/// `None` for primary. **Required, not optional**, because forgetting it was a
/// bug that lasted from P6 to P11.11 and could not correct itself:
///
/// ```text
/// the monitor watch runs before Control Load, sees the remembered display
///   connected, sets `on = that display` and returns a move
/// `apply` finds no Stage window and does nothing
/// Control Load builds the window fullscreen on primary, asking nothing
/// every later watch tick sees `on` already claimed, so no move is returned
/// ```
///
/// Stage then sits on primary for the whole show while the host, and Settings
/// ▸ Monitors with it, insist it is somewhere else. Placing the window at
/// birth makes the claim true the moment there is something to claim.
pub fn ensure_stage(app: &AppHandle, on: Option<&MonitorKey>) -> AppResult<WebviewWindow> {
    crate::state::assert_unlocked("windows::ensure_stage");
    if let Some(existing) = app.get_webview_window(STAGE) {
        return Ok(existing);
    }
    let window = debuggable(
        WebviewWindowBuilder::new(app, STAGE, WebviewUrl::App(STAGE_PATH.into()))
            .title("questiongame Stage")
            .decorations(false)
            // Built windowed and made fullscreen **on its display** by
            // `move_to` (beta.10): built fullscreen, a Mac put it on the
            // laptop and lost the move behind the fullscreen animation.
            .fullscreen(false)
            // Nobody clicks Stage; a focus steal mid-question is a lost lock.
            .focused(false),
        app,
    )
    .build()?;
    move_to(app, &window, on)?;
    Ok(window)
}

/// **Stage up** (beta.10): the pacer where it belongs, the remembered mirrors
/// with it, and Studio told. Control Load, *Open Stage* and a send all come
/// here, so none of them leaves the displays strip saying "no Stage" while one
/// is on screen. The lock is taken only around decisions, never across a
/// window being built.
pub fn stage_up(app: &AppHandle, state: &crate::state::AppState) -> AppResult<()> {
    crate::state::assert_unlocked("windows::stage_up");
    let on = state.lock().display.current().cloned();
    let pacer = ensure_stage(app, on.as_ref())?;
    settle_pacer(app, state, on.as_ref(), landed(app, &pacer));
    let mirrors = {
        let mut host = state.lock();
        host.display.set_open(true);
        host.display.live_mirrors()
    };
    reconcile_mirrors(app, &mirrors)?;
    tell_studio(app, state);
    Ok(())
}

/// *Close Stage* (beta.10): every Stage window goes. Marked closed **first**,
/// so the windows' own `Destroyed` events are already accounted for; the
/// display and the mirrors asked for are kept for the next *Open Stage*.
pub fn stage_down(app: &AppHandle, state: &crate::state::AppState) -> AppResult<()> {
    crate::state::assert_unlocked("windows::stage_down");
    state.lock().display.set_open(false);
    reconcile_mirrors(app, &[])?;
    if let Some(pacer) = app.get_webview_window(STAGE) {
        pacer.close()?;
    }
    tell_studio(app, state);
    Ok(())
}

/// Which Stage window a label is: `stage` the pacer, `stage-N` the mirror at
/// `N - 2` of the live list. Anything else is not a Stage window.
pub fn stage_window_of(label: &str) -> Option<questiongame_host::StageWindow> {
    if label == STAGE {
        return Some(questiongame_host::StageWindow::Pacer);
    }
    let n: usize = label.strip_prefix("stage-")?.parse().ok()?;
    n.checked_sub(2).map(questiongame_host::StageWindow::Mirror)
}

/// Carry out what a Stage window going away means (beta.10): the OS closed
/// one, or the operator unticked a display. Remember the outcome, make the
/// windows match, tell Studio.
pub fn carry_out(
    app: &AppHandle,
    state: &crate::state::AppState,
    closed: &questiongame_host::StageClosed,
) -> AppResult<()> {
    use questiongame_host::StageClosed;
    crate::state::assert_unlocked("windows::carry_out");
    if *closed == StageClosed::Ignored {
        return Ok(());
    }
    let mirrors = {
        let mut host = state.lock();
        remember_stage(&mut host)?;
        host.display.live_mirrors()
    };
    match closed {
        StageClosed::Promoted(next) => {
            // The pacer may still be standing (the operator unticked it) or be
            // gone (the OS closed it): moved, or built, where the mirror was.
            match app.get_webview_window(STAGE) {
                Some(pacer) => {
                    let at = move_to(app, &pacer, Some(next))?;
                    settle_pacer(app, state, Some(next), at);
                }
                None => {
                    let pacer = ensure_stage(app, Some(next))?;
                    settle_pacer(app, state, Some(next), landed(app, &pacer));
                }
            }
            reconcile_mirrors(app, &mirrors)?;
        }
        StageClosed::Closed => {
            reconcile_mirrors(app, &[])?;
            if let Some(pacer) = app.get_webview_window(STAGE) {
                pacer.close()?;
            }
        }
        StageClosed::MirrorDropped(_) => reconcile_mirrors(app, &mirrors)?,
        StageClosed::Ignored => {}
    }
    tell_studio(app, state);
    Ok(())
}

/// The pick and the mirrors, as `StageDisplay` now has them, saved.
fn remember_stage(host: &mut crate::state::Host) -> AppResult<()> {
    use questiongame_host::flags::GlobalSetting;
    let pick = host.display.current().map(|k| k.as_str().to_owned());
    let mirrors: Vec<String> = host
        .display
        .wanted_mirrors()
        .iter()
        .map(|k| k.as_str().to_owned())
        .collect();
    let ctx = host.runtime();
    host.flags.settings_set_global(GlobalSetting::StageMonitorId(pick), ctx)?;
    let ctx = host.runtime();
    host.flags.settings_set_global(GlobalSetting::StageMirrorIds(mirrors), ctx)?;
    let globals = host.flags.globals().clone();
    host.catalog.settings_store(&globals)?;
    Ok(())
}

/// `monitors-changed`, with the window map read before the lock is taken.
pub fn tell_studio(app: &AppHandle, state: &crate::state::AppState) {
    let stats_open = stats_is_open(app);
    let stage_open = stage_is_open(app);
    let host = state.lock();
    crate::emit::monitors_changed(app, &host, stats_open, stage_open);
}

/// The label of the n-th mirror. Positional, starting at 2, so the pacer keeps
/// the bare `stage` label that `emit`, `guard`, the capabilities file and every
/// doc name.
pub fn mirror_label(index: usize) -> String {
    format!("stage-{}", index + 2)
}

/// Make the mirror windows match `wanted` — [`StageDisplay::live_mirrors`],
/// the connected displays that should carry one right now (§9, P11.11).
///
/// **Idempotent by construction:** it opens what is missing, moves what is in
/// the wrong place, and closes anything past the end of the list. Calling it
/// twice changes nothing the second time, which is what lets the monitor watch
/// call it on every display change without tracking what it did last time.
///
/// **The caller must not hold the host lock.** Building and moving a webview
/// pumps the Windows message loop, and that dispatches whatever IPC the new
/// window has already queued — with the lock held, that is a wait on ourselves
/// (2026-09-08). `assert_unlocked` makes the mistake a panic naming this
/// function rather than a hang.
pub fn reconcile_mirrors(app: &AppHandle, wanted: &[MonitorKey]) -> AppResult<()> {
    crate::state::assert_unlocked("windows::reconcile_mirrors");

    for (index, key) in wanted.iter().enumerate() {
        let label = mirror_label(index);
        let window = match app.get_webview_window(&label) {
            Some(existing) => existing,
            None => debuggable(
                WebviewWindowBuilder::new(app, &label, WebviewUrl::App(MIRROR_PATH.into()))
                    .title("questiongame Stage")
                    .decorations(false)
                    // Windowed, then fullscreen on its display (`move_to`).
                    .fullscreen(false)
                    // Nobody clicks a mirror either, and a focus steal
                    // mid-question is a lost lock.
                    .focused(false),
                app,
            )
            .build()?,
        };
        move_to(app, &window, Some(key))?;
    }

    // Anything past the end is a mirror the operator removed, or one whose
    // display went away. Closing from the end down keeps the labels dense, so
    // `wanted[i]` is always `stage-(i+2)`.
    let mut index = wanted.len();
    while let Some(extra) = app.get_webview_window(&mirror_label(index)) {
        extra.close()?;
        index += 1;
    }
    Ok(())
}

/// The Statistics window's title: it names the workspace it shows, because
/// on another display nothing else says which library the numbers are from
/// (beta.2). An unnamed workspace leaves the plain title.
pub fn stats_title(workspace: Option<&str>) -> String {
    match workspace.map(str::trim).filter(|n| !n.is_empty()) {
        Some(name) => format!("questiongame Statistics — {name}"),
        None => "questiongame Statistics".to_owned(),
    }
}

/// Retitle the Statistics window, if it is open.
pub fn retitle_stats(app: &AppHandle, title: &str) {
    if let Some(window) = app.get_webview_window(STATS) {
        let _ = window.set_title(title);
    }
}

/// Open the Statistics window, on the remembered display (§11.K, P11).
///
/// **Only the operator calls this.** Nothing in the host opens this window:
/// not a setting, not a display coming back, not the monitor watch. Choosing a
/// display says *where* it would go; `stats_window` is what makes it appear,
/// and closing it — by the button or by the window's own close box — means it
/// stays closed (revised 2026-09-07).
///
/// Fullscreen is the operator's choice (`stats.fullscreen`): right on a wall
/// display, wrong on the single display a laptop has, where it would bury
/// Studio behind a screen of numbers.
///
/// **The caller must not hold the host lock.** Building a webview pumps the
/// Windows message loop, and the new window's first act is to `invoke` — which
/// wants the same lock. That is what left the window white and unresponsive
/// when it was built inside `monitors_list`.
pub fn open_stats(app: &AppHandle, key: Option<&MonitorKey>, fullscreen: bool, title: &str) -> AppResult<()> {
    crate::state::assert_unlocked("windows::open_stats");
    if let Some(window) = app.get_webview_window(STATS) {
        // Already there: place it again, because the operator may have picked
        // another display since, and raise it — pressing Show on a window
        // hiding behind Studio should bring it forward.
        place(app, &window, key, fullscreen)?;
        window.set_title(title)?;
        window.set_focus()?;
        return Ok(());
    }

    // Built, then placed (beta.10): the builder's position is *logical*, and
    // it was handed the display's physical corner — the wrong place at any
    // scaling but 100%.
    let window = debuggable(
        WebviewWindowBuilder::new(app, STATS, WebviewUrl::App(STATS_PATH.into()))
            .title(title)
            .inner_size(1280.0, 800.0)
            .focused(false),
        app,
    )
    .build()?;
    place(app, &window, key, fullscreen)?;
    Ok(())
}

/// Close the Statistics window if it is open. Closing it changes nothing about
/// the Play — there is nothing on the other side of it but numbers.
pub fn close_stats(app: &AppHandle) -> AppResult<()> {
    crate::state::assert_unlocked("windows::close_stats");
    if let Some(window) = app.get_webview_window(STATS) {
        window.close()?;
    }
    Ok(())
}

/// Is it on screen right now? The one piece of Statistics-window state, and it
/// lives where it actually is — in the window list, not in the settings
/// document. Studio reads it through `monitors_list` / `monitors-changed`.
pub fn stage_is_open(app: &AppHandle) -> bool {
    app.get_webview_window(STAGE).is_some()
}

/// Is it on screen right now? The one piece of Statistics-window state.
pub fn stats_is_open(app: &AppHandle) -> bool {
    app.get_webview_window(STATS).is_some()
}

/// Move an **already open** Statistics window; never create one.
///
/// Called from the monitor watch, where creating a window would be the host
/// deciding to show something. A window whose display is gone is closed, and
/// the operator is told.
fn follow_stats(
    app: &AppHandle,
    list: &[questiongame_host::MonitorInfo],
    stats_monitor_id: Option<String>,
    fullscreen: bool,
) -> AppResult<()> {
    let Some(window) = app.get_webview_window(STATS) else {
        return Ok(());
    };
    let Some(id) = stats_monitor_id else {
        // No remembered display: it opened on primary and stays there.
        return Ok(());
    };
    let key = MonitorKey::new(id.clone());
    if list.iter().any(|m| m.matches(&key)) {
        place(app, &window, Some(&key), fullscreen)?;
        return Ok(());
    }

    close_stats(app)?;
    crate::emit::notice(
        app,
        &questiongame_host::notice::Notice::new(
            "stats.monitor_lost",
            questiongame_host::notice::Severity::Warn,
            &["pick_monitor"],
        )
        .at("stats.monitor_id")
        .with("monitor", id),
    );
    Ok(())
}

/// Put Statistics on a display (`None`: primary). Fullscreen goes through
/// [`move_to`], as Stage does (beta.10); windowed, it is moved to the
/// display's corner in the coordinates the OS places windows in — logical on
/// a Mac (where a physical position was converted back with the wrong scale),
/// physical on Windows.
fn place(app: &AppHandle, window: &WebviewWindow, key: Option<&MonitorKey>, fullscreen: bool) -> AppResult<()> {
    if fullscreen {
        move_to(app, window, key)?;
        return Ok(());
    }
    let monitor = match key {
        Some(key) => monitors::monitor_of(app, key),
        None => app.primary_monitor()?,
    };
    let Some(monitor) = monitor else {
        tracing::warn!("statistics was sent to a display that is no longer listed");
        return Ok(());
    };
    use std::sync::atomic::Ordering;
    PLACING.fetch_add(1, Ordering::SeqCst);
    let result = (|| -> AppResult<()> {
        if window.is_fullscreen().unwrap_or(false) {
            window.set_fullscreen(false)?;
            wait_until(|| !window.is_fullscreen().unwrap_or(true), 2_000);
        }
        let inset = 40.0;
        if cfg!(target_os = "macos") {
            let at = monitor.position().to_logical::<f64>(monitor.scale_factor());
            window.set_position(tauri::LogicalPosition::new(at.x + inset, at.y + inset))?;
        } else {
            let at = *monitor.position();
            let px = (inset * monitor.scale_factor()).round() as i32;
            window.set_position(tauri::PhysicalPosition::new(at.x + px, at.y + px))?;
        }
        Ok(())
    })();
    std::thread::sleep(std::time::Duration::from_millis(150));
    PLACING.fetch_sub(1, Ordering::SeqCst);
    result
}

/// Re-read the OS display list, run the §9 policy over it, and **act on the
/// result** — move the window, raise the notice, tell `main`.
///
/// One function, because a caller that only refreshed the list would leave
/// `StageDisplay` believing Stage had moved when the window had not: the policy
/// decides and the window follows, always together.
///
/// # Read the OS, then decide, then act — and never under the lock
///
/// Every OS call in here — `available_monitors`, `primary_monitor`,
/// `set_position`, `set_fullscreen`, closing a window — pumps the platform's
/// message loop, and pumping it dispatches whatever IPC the webview has
/// queued. If that turns out to be one of the **synchronous** commands
/// (`get_state`, `settings_get`, `health_get`, `monitors_list`,
/// `catalog_seed_status`) it runs on this very thread and takes the host lock,
/// which is a plain `Mutex` and is not reentrant. Holding the lock across any
/// of these deadlocks the app against itself, with no second thread to blame:
/// the window stops repainting, stops taking input, and does not even reload.
///
/// This function therefore takes `&AppState` and not a guard, and it takes the
/// lock exactly once, for the decision, with no OS call inside it. Do not
/// "simplify" it back to a `&mut Host` parameter — the caller would then be
/// holding the lock for the whole of it, which is the bug this shape exists to
/// prevent (§9, 2026-09-08).
pub fn refresh(app: &AppHandle, state: &crate::state::AppState) -> AppResult<()> {
    let (list, topology) = crate::monitors::list_with_topology(app);
    // The one line that says what the OS handed over. Before it existed, a
    // display the app "did not detect" left no evidence either way.
    tracing::info!(
        displays = ?list
            .iter()
            .map(|m| format!(
                "{} {}x{} @{} {}{}",
                m.label(),
                m.physical_size.0,
                m.physical_size.1,
                m.scale_factor,
                if m.primary { "primary" } else { "" },
                if m.also_on.is_empty() { String::new() } else { format!(" also_on={:?}", m.also_on) },
            ))
            .collect::<Vec<_>>(),
        unused = ?topology.unused,
        "displays"
    );
    warn_separate_spaces(app, &topology, list.len());
    let stats_open = stats_is_open(app);
    let stage_open = stage_is_open(app);

    let (mv, mirrors, stats_monitor_id, stats_fullscreen) = {
        let mut host = state.lock();
        let control = host.flags.control();
        let wanted = control.stage_monitor_id.clone().map(MonitorKey::new);
        let wanted_mirrors: Vec<MonitorKey> = control
            .stage_mirror_ids
            .iter()
            .cloned()
            .map(MonitorKey::new)
            .collect();
        let reattach = control.stage_reattach;
        let stats_monitor_id = control.stats_monitor_id.clone();
        let stats_fullscreen = control.stats_fullscreen;
        let play_is_open = host.runtime().play_is_open();
        host.health.inputs.unused_displays = topology.unused.clone();
        host.display.set_wanted_mirrors(wanted_mirrors);
        let mv =
            host.display
                .monitors_changed(list.clone(), wanted.as_ref(), reattach, play_is_open);
        let mirrors = host.display.live_mirrors();
        (mv, mirrors, stats_monitor_id, stats_fullscreen)
    };

    apply(app, state, &mv)?;
    // After `apply`, so a mirror is never opened on the display the pacer is
    // about to be moved onto.
    reconcile_mirrors(app, &mirrors)?;
    if let Some(notice) = &mv.notice {
        crate::emit::notice(app, notice);
    }

    // The Statistics window follows its own display and is never opened by
    // this path: it is on screen because the operator asked for it, and it
    // goes when its display does (§11.K).
    follow_stats(app, &list, stats_monitor_id, stats_fullscreen)?;

    {
        let host = state.lock();
        crate::emit::monitors_changed(app, &host, stats_open, stage_open);
    }
    // A panel appearing or leaving the unused list is a health change.
    crate::tick::health_once(app);
    Ok(())
}

/// Said once while it lasts: the Spaces setting is off.
static SPACES_WARNED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// macOS (beta.10): with "Displays have separate Spaces" off, a full-screen
/// window on a second display blanks every other one — Stage on the TV takes
/// Studio's laptop screen with it. Said once (and again after it was turned
/// on and off), only with more than one display, never on Windows.
fn warn_separate_spaces(app: &AppHandle, topology: &crate::topology::Topology, displays: usize) {
    use std::sync::atomic::Ordering;
    match topology.separate_spaces {
        Some(false) if displays > 1 => {
            if !SPACES_WARNED.swap(true, Ordering::SeqCst) {
                crate::emit::notice(
                    app,
                    &questiongame_host::notice::Notice::new(
                        "stage.separate_spaces_off",
                        questiongame_host::notice::Severity::Warn,
                        &["open_spaces_settings", "dismiss"],
                    ),
                );
            }
        }
        Some(true) => SPACES_WARNED.store(false, Ordering::SeqCst),
        _ => {}
    }
}

/// **The display report** (beta.10, Settings ▸ Monitors ▸ *Copy display
/// report*): what the app sees, as plain text an operator can paste into a
/// bug report — each display as the OS lists it and as the app names it,
/// what mirrors what, the Spaces setting, and where Stage and Statistics
/// **really** are (their windows' displays, not what was asked). Nobody here
/// owns every setup; this is how the one that misbehaves is described.
pub fn report(app: &AppHandle, state: &crate::state::AppState) -> String {
    use std::fmt::Write as _;
    let (list, topology) = monitors::list_with_topology(app);
    let mut out = String::new();
    let _ = writeln!(out, "questiongame {} on {} ({})", app.package_info().version, std::env::consts::OS, std::env::consts::ARCH);
    let _ = writeln!(out, "displays: {}", list.len());
    for m in &list {
        let _ = writeln!(
            out,
            "- {} | key {} | {}x{} physical, {}x{} logical @{} | at {},{} logical{}{}",
            m.label(),
            m.key,
            m.physical_size.0,
            m.physical_size.1,
            m.size.0,
            m.size.1,
            m.scale_factor,
            m.position.0,
            m.position.1,
            if m.primary { " | primary" } else { "" },
            if m.also_on.is_empty() { String::new() } else { format!(" | also shown on {}", m.also_on.join(", ")) },
        );
    }
    if !topology.unused.is_empty() {
        let _ = writeln!(out, "connected, not drawn on: {}", topology.unused.join(", "));
    }
    if let Some(separate) = topology.separate_spaces {
        let _ = writeln!(out, "macOS separate Spaces: {}", if separate { "on" } else { "OFF" });
    }
    let where_is = |label: &str| -> String {
        app.get_webview_window(label)
            .and_then(|w| landed(app, &w))
            .map_or_else(|| "closed".to_owned(), |k| k.to_string())
    };
    let host = state.lock();
    let control = host.flags.control();
    let _ = writeln!(out, "stage: {} (remembered {}; host believes {})", where_is(STAGE),
        control.stage_monitor_id.as_deref().unwrap_or("primary"),
        host.display.current().map_or_else(|| "primary".to_owned(), ToString::to_string));
    for (i, key) in host.display.live_mirrors().iter().enumerate() {
        let _ = writeln!(out, "mirror {}: asked {}, window on {}", i + 1, key, where_is(&mirror_label(i)));
    }
    let _ = writeln!(out, "statistics: {} (remembered {})", where_is(STATS), control.stats_monitor_id.as_deref().unwrap_or("primary"));
    out
}

/// Carry out a [`StageMove`]. Does nothing if Stage has not been created yet —
/// the pick is remembered either way, and [`ensure_stage`] plus the next
/// monitor event will land it. Where the window really lands is settled
/// (beta.10): remembered, and said when it is not where it was sent.
pub fn apply(app: &AppHandle, state: &crate::state::AppState, mv: &StageMove) -> AppResult<()> {
    crate::state::assert_unlocked("windows::apply");
    let Some(target) = mv.to.as_ref() else {
        return Ok(());
    };
    let Some(window) = app.get_webview_window(STAGE) else {
        return Ok(());
    };
    let at = move_to(app, &window, target.as_ref())?;
    settle_pacer(app, state, target.as_ref(), at);
    Ok(())
}

/// Set while the app itself is placing a Stage or Statistics window, so the
/// `Moved` events its own move raises are not taken for the operator's hand
/// (beta.10, [`window_moved`]).
static PLACING: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

/// Fullscreen on a display, and **check it took** (beta.10). `None` is the
/// primary display. Returns the display the window really stands on.
///
/// What it replaced did `set_fullscreen(false)`, `set_position(physical)`,
/// `set_fullscreen(true)` back to back, and on a Mac that put Stage on the
/// laptop: tao converts a physical position back with the *window's* scale
/// (a Retina laptop's 2 against a 1× TV's), and macOS fullscreen is an
/// animation tao queues requests behind, so the move in the middle was lost.
/// Now: leave fullscreen and **wait** for it, then Tauri's
/// `set_fullscreen_on_monitor`, which hands tao the monitor itself
/// (`Borderless(Some(monitor))`) — tao moves the window there in its own
/// coordinates — then wait for the window to be on that display, and try once
/// more if it is not. A failure is the caller's to say; it is not silent.
fn move_to(app: &AppHandle, window: &WebviewWindow, target: Option<&MonitorKey>) -> AppResult<Option<MonitorKey>> {
    use std::sync::atomic::Ordering;
    let origin = match target {
        Some(key) => monitors::physical_origin(app, key),
        None => app.primary_monitor()?.map(|m| *m.position()),
    };
    let Some(origin) = origin else {
        tracing::warn!(?target, "a window was sent to a display that is no longer listed");
        return Ok(landed(app, window));
    };
    PLACING.fetch_add(1, Ordering::SeqCst);
    let result = (|| -> AppResult<()> {
        for _attempt in 0..2 {
            if is_on(window, origin) && window.is_fullscreen().unwrap_or(false) {
                return Ok(());
            }
            if window.is_fullscreen().unwrap_or(false) {
                window.set_fullscreen(false)?;
                wait_until(|| !window.is_fullscreen().unwrap_or(true), 2_000);
            }
            window.set_fullscreen_on_monitor(tauri::PhysicalPosition::new(
                f64::from(origin.x) + 1.0,
                f64::from(origin.y) + 1.0,
            ))?;
            wait_until(|| is_on(window, origin) && window.is_fullscreen().unwrap_or(false), 3_000);
        }
        Ok(())
    })();
    // Settled before the flag goes, so the last `Moved` is still the app's own.
    std::thread::sleep(std::time::Duration::from_millis(150));
    PLACING.fetch_sub(1, Ordering::SeqCst);
    result?;
    Ok(landed(app, window))
}

/// Is the window on the display whose top-left corner is `origin`?
fn is_on(window: &WebviewWindow, origin: tauri::PhysicalPosition<i32>) -> bool {
    matches!(window.current_monitor(), Ok(Some(m)) if *m.position() == origin)
}

/// The display a window stands on, as a key; `None` if the OS will not say.
fn landed(app: &AppHandle, window: &WebviewWindow) -> Option<MonitorKey> {
    let monitor = window.current_monitor().ok().flatten()?;
    monitors::key_at(app, *monitor.position())
}

/// Poll `done` every 50ms until it holds or `limit_ms` passes. Window state
/// changes arrive on the event loop; this thread is never the event loop.
fn wait_until(done: impl Fn() -> bool, limit_ms: u64) {
    let start = std::time::Instant::now();
    while !done() && start.elapsed() < std::time::Duration::from_millis(limit_ms) {
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
}

/// After the app moved the pacer: where it **really** is becomes what the host
/// believes and what is remembered, and the operator hears when that is not
/// where it was sent (beta.10: "Stage on TV" while it sat on the laptop was a
/// lie the old code told).
fn settle_pacer(app: &AppHandle, state: &crate::state::AppState, wanted: Option<&MonitorKey>, landed: Option<MonitorKey>) {
    let Some(landed) = landed else { return };
    let wanted_key = wanted.cloned().or_else(|| state.lock().display.primary().map(|m| m.key.clone()));
    if wanted_key.as_ref() == Some(&landed) {
        return;
    }
    {
        let mut host = state.lock();
        host.display.adopt(landed.clone());
        if let Err(error) = remember_stage(&mut host) {
            tracing::warn!(?error, "could not remember where Stage is");
        }
    }
    crate::emit::notice(
        app,
        &questiongame_host::notice::Notice::new(
            "stage.move_failed",
            questiongame_host::notice::Severity::Warn,
            &["pick_monitor", "dismiss"],
        )
        .at("stage.monitor_id")
        .with("monitor", wanted_key.map(|k| k.to_string()).unwrap_or_default())
        .with("landed", landed.to_string()),
    );
}

/// **A Stage or Statistics window moved** (beta.10). The app's own moves are
/// marked by [`PLACING`]; anything else is the operator's hand — dragged,
/// Win+Shift+Arrow, the macOS window menu — and the display it lands on is
/// taken as the answer: remembered, fullscreen there, Studio told. A friend
/// dragged Stage to his TV by hand and Studio went on saying it was on the
/// laptop; it now follows.
pub fn window_moved(app: &AppHandle, label: &str) {
    use std::sync::atomic::Ordering;
    if label != STAGE && label != STATS {
        return;
    }
    if PLACING.load(Ordering::SeqCst) > 0 {
        return;
    }
    let app = app.clone();
    let label = label.to_owned();
    tauri::async_runtime::spawn_blocking(move || {
        // A drag raises a stream of `Moved`; wait for it to come to rest.
        std::thread::sleep(std::time::Duration::from_millis(400));
        if PLACING.load(Ordering::SeqCst) > 0 {
            return;
        }
        let Some(window) = app.get_webview_window(&label) else { return };
        let Some(state) = app.try_state::<crate::state::AppState>() else { return };
        let Some(key) = landed(&app, &window) else { return };
        let changed = {
            let mut host = state.lock();
            if label == STAGE {
                let now = host.display.current().cloned().or_else(|| host.display.primary().map(|m| m.key.clone()));
                if now.as_ref() == Some(&key) {
                    false
                } else {
                    host.display.adopt(key.clone());
                    remember_stage(&mut host).is_ok()
                }
            } else {
                remember_stats(&mut host, &key).unwrap_or(false)
            }
        };
        if changed {
            if label == STAGE && !window.is_fullscreen().unwrap_or(true) {
                let _ = window.set_fullscreen(true);
            }
            tell_studio(&app, &state);
        }
    });
}

/// Statistics was moved by hand: its display becomes the remembered one.
fn remember_stats(host: &mut crate::state::Host, key: &MonitorKey) -> AppResult<bool> {
    use questiongame_host::flags::GlobalSetting;
    if host.flags.control().stats_monitor_id.as_deref() == Some(key.as_str()) {
        return Ok(false);
    }
    let ctx = host.runtime();
    host.flags
        .settings_set_global(GlobalSetting::StatsMonitorId(Some(key.as_str().to_owned())), ctx)?;
    let globals = host.flags.globals().clone();
    host.catalog.settings_store(&globals)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// P11 exit criterion: the Statistics window is never a second Stage. It
    /// loads Studio's bundle with `?stats`, so it has Studio's tokens, Studio's
    /// chrome and no screen at all — and `guard::STATS_COMMANDS` keeps it from
    /// asking for anything but reads.
    /// The host never decides to put something on a display (§9, §11.K). The
    /// monitor watch may *follow* the Statistics window and close it when its
    /// display goes, but opening one is `stats_window`'s alone — a display
    /// coming back must not raise a window the operator closed.
    #[test]
    fn nothing_but_the_command_opens_the_statistics_window() {
        const SOURCE: &str = include_str!("windows.rs");
        let refresh = SOURCE
            .split_once("pub fn refresh(")
            .expect("refresh exists")
            .1;
        let refresh = refresh
            .split_once(
                "
/// ",
            )
            .map_or(refresh, |(body, _)| body);
        assert!(
            !refresh.contains("open_stats"),
            "the monitor watch opened a window"
        );
        assert!(
            refresh.contains("follow_stats"),
            "it should still follow one"
        );
    }

    /// beta.10: a window's label says which Stage window it was, so the host
    /// can account for it when the OS closes it.
    #[test]
    fn a_label_names_the_stage_window_it_was() {
        use questiongame_host::StageWindow;
        assert_eq!(stage_window_of("stage"), Some(StageWindow::Pacer));
        assert_eq!(stage_window_of("stage-2"), Some(StageWindow::Mirror(0)));
        assert_eq!(stage_window_of("stage-5"), Some(StageWindow::Mirror(3)));
        assert_eq!(stage_window_of(&mirror_label(1)), Some(StageWindow::Mirror(1)));
        assert_eq!(stage_window_of("main"), None);
        assert_eq!(stage_window_of("stats"), None);
        assert_eq!(stage_window_of("stage-x"), None);
        assert_eq!(stage_window_of("stage-1"), None);
    }

    #[test]
    fn the_statistics_window_is_studio_not_stage() {
        assert!(STATS_PATH.starts_with("studio/"), "{STATS_PATH}");
        assert!(STATS_PATH.ends_with("?stats"), "{STATS_PATH}");
        assert_ne!(STATS_PATH, STAGE_PATH);
        assert!(!crate::guard::stats_may_call("show_screen"));
        assert!(!crate::guard::stats_may_call("overlay_ack_complete"));
    }
}

#[cfg(test)]
mod title_tests {
    #[test]
    fn the_dev_window_says_it_is_dev() {
        assert_eq!(super::studio_title(true), "questiongame Studio (dev)");
        assert_eq!(super::studio_title(false), "questiongame Studio");
    }
}
