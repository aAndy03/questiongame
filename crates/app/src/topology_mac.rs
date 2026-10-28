//! The macOS half of the display topology (beta.10).
//!
//! tao names every Mac display `Monitor #<model number>` — not the name the
//! operator sees in System Settings, and the same for two displays of one
//! model; virtual displays (Sidecar, AirPlay) are as anonymous. And a
//! **mirror set** is one display to the list: an Apple TV in AirPlay *Mirror*
//! shows the laptop's picture and is nowhere in `available_monitors`, which
//! reads as the app ignoring it — the case a friend's MacBook met on
//! 2026-10-27.
//!
//! This reads what the OS does know — each online display's CoreGraphics
//! record (its bounds, whether it mirrors another) and each screen's
//! localized name (`NSScreen.localizedName`, on the main thread) — and folds
//! it into the same [`Topology`](crate::topology::Topology) the Windows half
//! fills, joined by the display's **physical origin**, since tao's name is no
//! use as a join key here. The fold is pure and tested on every OS; only the
//! reading is macOS.

use std::collections::BTreeMap;

/// One online display, as CoreGraphics and AppKit describe it.
#[derive(Debug, Clone, PartialEq)]
pub struct MacScreen {
    /// `CGDirectDisplayID`.
    pub id: u32,
    /// The top-left corner in points (`CGDisplayBounds`), the space tao
    /// converts to physical pixels with the display's own scale.
    pub origin_points: (f64, f64),
    pub scale: f64,
    /// The display this one shows the picture of, in a mirror set; `None` for
    /// a display that draws its own (the master of a set included).
    pub mirrors: Option<u32>,
    pub builtin: bool,
    /// `NSScreen.localizedName` — *Built-in Retina Display*, *LG UltraFine*,
    /// *Sidecar Display (iPad)*, an AirPlay receiver's name. Only displays
    /// that draw their own picture have a screen, so a mirror has none.
    pub name: Option<String>,
}

/// What the fold makes of a display that draws its own picture.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct MacDisplay {
    /// Its localized name, for the key and for the operator.
    pub name: Option<String>,
    /// The displays mirroring this one: they show its picture and are in no
    /// list. Named as well as can be — a mirror has no screen to ask.
    pub also_on: Vec<String>,
}

/// The physical origin tao reports for a display: its points × its scale.
pub fn physical_origin(screen: &MacScreen) -> (i32, i32) {
    (
        (screen.origin_points.0 * screen.scale).round() as i32,
        (screen.origin_points.1 * screen.scale).round() as i32,
    )
}

/// Fold the online displays into what each listed one is called and what
/// mirrors it, keyed by physical origin.
pub fn fold(screens: &[MacScreen]) -> BTreeMap<(i32, i32), MacDisplay> {
    let mut out: BTreeMap<(i32, i32), MacDisplay> = BTreeMap::new();
    for screen in screens.iter().filter(|s| s.mirrors.is_none()) {
        out.insert(
            physical_origin(screen),
            MacDisplay { name: screen.name.clone(), also_on: Vec::new() },
        );
    }
    for mirror in screens.iter().filter(|s| s.mirrors.is_some()) {
        let Some(master) = screens.iter().find(|s| Some(s.id) == mirror.mirrors && s.mirrors.is_none()) else {
            continue;
        };
        let label = mirror.name.clone().unwrap_or_else(|| {
            if mirror.builtin { "the built-in display".to_owned() } else { "a mirrored display".to_owned() }
        });
        if let Some(display) = out.get_mut(&physical_origin(master)) {
            display.also_on.push(label);
        }
    }
    out
}

/// The online displays and whether "Displays have separate Spaces" is on.
/// Empty, and `None`, off macOS.
pub fn read(app: &tauri::AppHandle) -> (Vec<MacScreen>, Option<bool>) {
    os::read(app)
}

#[cfg(target_os = "macos")]
mod os {
    use super::MacScreen;
    use core_graphics::display::{CGDirectDisplayID, CGDisplay};
    use std::sync::mpsc;
    use std::time::Duration;

    #[link(name = "CoreGraphics", kind = "framework")]
    unsafe extern "C" {
        fn CGGetOnlineDisplayList(max: u32, displays: *mut CGDirectDisplayID, count: *mut u32) -> i32;
    }

    /// Every display the OS has online — mirrors included, which the active
    /// list (and therefore tao's) leaves out.
    fn online() -> Vec<CGDirectDisplayID> {
        let mut ids = [0 as CGDirectDisplayID; 32];
        let mut count = 0u32;
        // SAFETY: the buffer holds 32 ids and the call writes at most `max`.
        let err = unsafe { CGGetOnlineDisplayList(32, ids.as_mut_ptr(), &mut count) };
        if err != 0 {
            return CGDisplay::active_displays().unwrap_or_default();
        }
        ids[..count as usize].to_vec()
    }

    /// The screens' names and the Spaces setting, read on the main thread
    /// (AppKit's rule), with a short wait so a busy loop never stalls a
    /// refresh: no answer is no names, not a hang.
    fn appkit(app: &tauri::AppHandle) -> (Vec<(u32, String)>, Option<bool>) {
        let (tx, rx) = mpsc::channel();
        let sent = app.run_on_main_thread(move || {
            let Some(mtm) = objc2::MainThreadMarker::new() else {
                return;
            };
            let mut names = Vec::new();
            for screen in objc2_app_kit::NSScreen::screens(mtm).iter() {
                let description = screen.deviceDescription();
                let key = objc2_foundation::NSString::from_str("NSScreenNumber");
                let id = description
                    .objectForKey(&key)
                    .and_then(|value| value.downcast::<objc2_foundation::NSNumber>().ok())
                    .map(|n| n.unsignedIntValue());
                if let Some(id) = id {
                    names.push((id, screen.localizedName().to_string()));
                }
            }
            let separate = objc2_app_kit::NSScreen::screensHaveSeparateSpaces(mtm);
            let _ = tx.send((names, Some(separate)));
        });
        if sent.is_err() {
            return (Vec::new(), None);
        }
        rx.recv_timeout(Duration::from_millis(500)).unwrap_or((Vec::new(), None))
    }

    pub fn read(app: &tauri::AppHandle) -> (Vec<MacScreen>, Option<bool>) {
        let (names, separate) = appkit(app);
        let screens = online()
            .into_iter()
            .map(|id| {
                let display = CGDisplay::new(id);
                let bounds = display.bounds();
                let mirrors = display.mirrors_display();
                let scale = {
                    let wide = display.pixels_wide() as f64;
                    if bounds.size.width > 0.0 { wide / bounds.size.width } else { 1.0 }
                };
                MacScreen {
                    id,
                    origin_points: (bounds.origin.x, bounds.origin.y),
                    scale,
                    mirrors: (mirrors != 0).then_some(mirrors),
                    builtin: display.is_builtin(),
                    name: names.iter().find(|(n, _)| *n == id).map(|(_, name)| name.clone()),
                }
            })
            .collect();
        (screens, separate)
    }
}

#[cfg(not(target_os = "macos"))]
mod os {
    pub fn read(_app: &tauri::AppHandle) -> (Vec<super::MacScreen>, Option<bool>) {
        (Vec::new(), None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn screen(id: u32, origin: (f64, f64), scale: f64, mirrors: Option<u32>, name: Option<&str>) -> MacScreen {
        MacScreen { id, origin_points: origin, scale, mirrors, builtin: id == 1, name: name.map(str::to_owned) }
    }

    /// A Retina laptop (scale 2) and a 1× TV to its right, at 1512 points:
    /// tao reports the TV at physical x = 1512 × 1, the laptop at 0.
    #[test]
    fn displays_are_joined_by_their_physical_origin_with_their_own_scale() {
        let t = fold(&[
            screen(1, (0.0, 0.0), 2.0, None, Some("Built-in Retina Display")),
            screen(2, (1512.0, 0.0), 1.0, None, Some("Living Room")),
        ]);
        assert_eq!(t.get(&(0, 0)).and_then(|d| d.name.as_deref()), Some("Built-in Retina Display"));
        assert_eq!(t.get(&(1512, 0)).and_then(|d| d.name.as_deref()), Some("Living Room"));
    }

    /// AirPlay *Mirror* to an Apple TV: the TV mirrors the laptop, is in no
    /// list, and the laptop says it is also shown there.
    #[test]
    fn a_mirror_is_said_on_the_display_it_copies_and_listed_nowhere() {
        let t = fold(&[
            screen(1, (0.0, 0.0), 2.0, None, Some("Built-in Retina Display")),
            screen(7, (0.0, 0.0), 1.0, Some(1), None),
        ]);
        assert_eq!(t.len(), 1, "the mirror is not a display of its own");
        assert_eq!(t.get(&(0, 0)).map(|d| d.also_on.clone()), Some(vec!["a mirrored display".to_owned()]));
    }

    #[test]
    fn a_mirror_of_a_display_that_is_not_there_is_dropped() {
        let t = fold(&[screen(7, (0.0, 0.0), 1.0, Some(99), None)]);
        assert!(t.is_empty());
    }

    #[test]
    fn a_display_with_no_screen_name_keeps_none() {
        let t = fold(&[screen(3, (-1920.0, 0.0), 1.0, None, None)]);
        assert_eq!(t.get(&(-1920, 0)), Some(&MacDisplay::default()));
    }
}
