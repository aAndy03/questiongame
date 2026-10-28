//! P11.11: several displays showing the same Stage.
//!
//! The operator has two audience displays and no HDMI splitter, so the app is
//! the splitter. One **pacer** — the Stage window that has always existed —
//! and N **mirrors** showing the identical picture.
//!
//! `StageDisplay` answers one question for the app crate: **which connected
//! displays should carry a mirror right now**. The app crate then makes the
//! windows match. Declarative rather than a diff of opens and closes:
//! reconciling to a set is idempotent, so the monitor watch can call it on
//! every display change without remembering what it did last time, and a
//! missed close cannot leave a window standing on a display that is gone.
//!
//! Nothing in this module can reach a Play, which is the property §9 asks of
//! it and every test here inherits.

use questiongame_host::{MonitorInfo, MonitorKey, StageClosed, StageDisplay, StageReattach, StageWindow};

fn monitor(name: &str, primary: bool, size: (u32, u32)) -> MonitorInfo {
    MonitorInfo {
        key: MonitorKey::derive(Some(name), size.0, size.1),
        name: Some(name.to_owned()),
        primary,
        position: (0, 0),
        size,
        physical_size: size,
        scale_factor: 1.0,
        friendly_name: None,
        also_on: Vec::new(),
    }
}

fn key(name: &str, size: (u32, u32)) -> MonitorKey {
    MonitorKey::derive(Some(name), size.0, size.1)
}

/// The operator's desk: a laptop and two audience displays, one of them a
/// different resolution — which is the case that made P11.6 load-bearing.
fn desk() -> Vec<MonitorInfo> {
    vec![
        monitor("built-in", true, (1920, 1080)),
        monitor("tv-left", false, (1366, 768)),
        monitor("tv-right", false, (1920, 1080)),
    ]
}

fn left() -> MonitorKey {
    key("tv-left", (1366, 768))
}

fn right() -> MonitorKey {
    key("tv-right", (1920, 1080))
}

fn loaded() -> StageDisplay {
    let mut display = StageDisplay::new();
    display.monitors_changed(desk(), None, StageReattach::default(), false);
    // A Control Load opened Stage (beta.10: mirrors are live only while it is up).
    display.set_open(true);
    display
}

#[test]
fn a_fresh_display_mirrors_nowhere() {
    assert!(loaded().live_mirrors().is_empty());
}

#[test]
fn a_mirror_is_added_and_removed_by_key() {
    let mut display = loaded();

    let wanted = display.add_mirror(left()).expect("connected");
    assert_eq!(wanted, vec![left()]);
    assert_eq!(display.live_mirrors(), vec![left()]);

    let wanted = display.remove_mirror(&left());
    assert!(wanted.is_empty());
    assert!(display.live_mirrors().is_empty());
}

#[test]
fn removing_one_that_is_not_mirroring_is_not_an_error() {
    let mut display = loaded();
    assert!(display.remove_mirror(&left()).is_empty());
}

#[test]
fn two_mirrors_keep_the_order_they_were_added_in() {
    let mut display = loaded();
    display.add_mirror(right()).unwrap();
    display.add_mirror(left()).unwrap();
    assert_eq!(display.live_mirrors(), vec![right(), left()]);
}

#[test]
fn a_display_that_is_not_connected_is_refused() {
    let mut display = loaded();
    assert!(display.add_mirror(key("projector", (1024, 768))).is_err());
    assert!(
        display.live_mirrors().is_empty(),
        "a refused write remembers nothing"
    );
}

#[test]
fn the_pacers_own_display_cannot_also_mirror() {
    let mut display = loaded();
    display.set_monitor(Some(left())).unwrap();
    assert!(
        display.add_mirror(left()).is_err(),
        "one pane per display, or two windows fight over one screen"
    );
}

#[test]
fn the_same_display_twice_is_refused() {
    let mut display = loaded();
    display.add_mirror(left()).unwrap();
    assert!(display.add_mirror(left()).is_err());
    assert_eq!(display.live_mirrors().len(), 1);
}

/// §9 preserved, per pane: unplugging a mirror's display takes that mirror
/// away and leaves the others standing. The pick is remembered, so the cable
/// coming back restores it.
#[test]
fn unplugging_a_mirrors_display_drops_only_that_mirror() {
    let mut display = loaded();
    display.add_mirror(left()).unwrap();
    display.add_mirror(right()).unwrap();

    let without_left = vec![
        monitor("built-in", true, (1920, 1080)),
        monitor("tv-right", false, (1920, 1080)),
    ];
    display.monitors_changed(without_left, None, StageReattach::default(), true);
    assert_eq!(display.live_mirrors(), vec![right()]);
    assert_eq!(
        display.wanted_mirrors(),
        [left(), right()],
        "waited for, not forgotten"
    );

    display.monitors_changed(desk(), None, StageReattach::default(), true);
    assert_eq!(display.live_mirrors(), vec![left(), right()]);
}

/// Sending the pacer to a display that is mirroring takes the mirror off it:
/// the operator asked for the pacer there, and one pane per display is the
/// rule.
#[test]
fn sending_the_pacer_to_a_mirrored_display_retires_that_mirror() {
    let mut display = loaded();
    display.add_mirror(left()).unwrap();
    display.add_mirror(right()).unwrap();

    display.set_monitor(Some(left())).unwrap();
    assert_eq!(display.live_mirrors(), vec![right()]);
    assert_eq!(
        display.wanted_mirrors(),
        [right()],
        "and it is forgotten, not merely hidden — the operator moved Stage there"
    );
}

/// The wanted list is restored wholesale by a settings load, so `live_mirrors`
/// is a function of (wanted, connected, pacer) and nothing else.
#[test]
fn a_remembered_list_is_restored_wholesale() {
    let mut display = loaded();
    display.set_wanted_mirrors(vec![left(), key("gone", (800, 600))]);
    assert_eq!(
        display.live_mirrors(),
        vec![left()],
        "a remembered display that is not here yet is waited for, not dropped"
    );
}

/// The answer does not drift when asked twice — which is what lets the app
/// crate reconcile windows to it on every display change.
#[test]
fn live_mirrors_is_idempotent() {
    let mut display = loaded();
    display.add_mirror(left()).unwrap();
    let once = display.live_mirrors();
    assert_eq!(once, display.live_mirrors());
    display.monitors_changed(desk(), None, StageReattach::default(), false);
    assert_eq!(once, display.live_mirrors());
}

// ------------------------------------------------- beta.10: closing Stage

fn primary() -> MonitorKey {
    key("built-in", (1920, 1080))
}

/// Remembered mirrors wait for Stage: before the first Load, and after Close
/// Stage, none is live — so the monitor watch never opens one on its own.
#[test]
fn no_mirror_is_live_while_stage_is_closed() {
    let mut display = StageDisplay::new();
    display.monitors_changed(desk(), None, StageReattach::default(), false);
    display.set_wanted_mirrors(vec![left()]);
    assert!(display.live_mirrors().is_empty(), "not before Stage is up");
    display.set_open(true);
    assert_eq!(display.live_mirrors(), vec![left()]);
    display.set_open(false);
    assert!(display.live_mirrors().is_empty(), "not after it closes");
    assert_eq!(display.wanted_mirrors(), [left()], "still remembered for the next Open Stage");
}

#[test]
fn the_os_closing_a_lone_pacer_closes_stage_and_keeps_its_display() {
    let mut display = loaded();
    display.set_monitor(Some(right())).unwrap();
    assert_eq!(display.window_closed(StageWindow::Pacer), StageClosed::Closed);
    assert!(!display.is_open());
    assert_eq!(display.current(), Some(&right()), "Open Stage puts it back there");
}

#[test]
fn the_os_closing_the_pacer_hands_stage_to_the_first_mirror() {
    let mut display = loaded();
    display.set_monitor(Some(right())).unwrap();
    display.add_mirror(left()).unwrap();
    assert_eq!(display.window_closed(StageWindow::Pacer), StageClosed::Promoted(left()));
    assert!(display.is_open(), "Stage is still up where the audience sees it");
    assert_eq!(display.current(), Some(&left()));
    assert!(display.live_mirrors().is_empty());
}

#[test]
fn the_os_closing_a_mirror_drops_it_so_no_reconcile_reopens_it() {
    let mut display = loaded();
    display.add_mirror(left()).unwrap();
    display.add_mirror(right()).unwrap();
    assert_eq!(display.window_closed(StageWindow::Mirror(1)), StageClosed::MirrorDropped(right()));
    assert_eq!(display.live_mirrors(), vec![left()]);
    assert_eq!(display.wanted_mirrors(), [left()]);
}

/// The app closes windows too: a reconcile closing the label past the list,
/// and Close Stage closing everything after it has marked Stage closed.
#[test]
fn closes_the_app_made_itself_are_ignored() {
    let mut display = loaded();
    display.add_mirror(left()).unwrap();
    assert_eq!(display.window_closed(StageWindow::Mirror(1)), StageClosed::Ignored, "past the live list");
    display.set_open(false);
    assert_eq!(display.window_closed(StageWindow::Pacer), StageClosed::Ignored);
    assert_eq!(display.window_closed(StageWindow::Mirror(0)), StageClosed::Ignored);
    assert_eq!(display.wanted_mirrors(), [left()], "Close Stage forgets no mirror");
}

#[test]
fn unticking_a_display_stops_a_mirror_hands_the_pacer_over_or_closes_stage() {
    let mut display = loaded();
    display.add_mirror(left()).unwrap();
    display.add_mirror(right()).unwrap();
    // Stage is on primary (no pick): unticking primary hands over to the first mirror.
    assert_eq!(display.remove_display(&right()), StageClosed::MirrorDropped(right()));
    assert_eq!(display.remove_display(&primary()), StageClosed::Promoted(left()));
    assert_eq!(display.current(), Some(&left()));
    assert_eq!(display.remove_display(&left()), StageClosed::Closed);
    assert!(!display.is_open());
    assert_eq!(display.remove_display(&left()), StageClosed::Ignored, "already closed");
}

#[test]
fn unticking_a_display_stage_is_not_on_changes_nothing() {
    let mut display = loaded();
    assert_eq!(display.remove_display(&right()), StageClosed::Ignored);
    assert!(display.is_open());
}
