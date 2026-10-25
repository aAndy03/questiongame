//! Bulk edits and *Manage tags* (Beta, P15): one transaction, refused whole,
//! the one-by-one rules, and copies left alone. Ids from the test list.

use questiongame_host::catalog::{
    ArchiveScope, BoardDomain, BulkEdit, CatalogItem, CatalogKind, CatalogLocation, CatalogService,
    CopyOptions, Domain, DomainMember, Question, QuestionOption, Recipe, SearchQuery, Selection,
};
use questiongame_host::flags::{FlagService, GameSettings};
use questiongame_host::{DomainId, PlayId, QuestionId, RecipeId};

const NOW: u64 = 1_790_000_000_000;

fn question(id: &str, difficulty: u8, tags: &[&str]) -> Question {
    let mut q = Question::new(id, format!("Question {id}"), difficulty);
    q.options = vec![
        QuestionOption::new(format!("{id}-a"), "Yes", true),
        QuestionOption::new(format!("{id}-b"), "No", false),
    ];
    q.tags = tags.iter().map(|t| t.to_string()).collect();
    q
}
fn get_q(c: &CatalogService, id: &str) -> Question {
    match c.catalog_get(CatalogKind::Question, id).unwrap() {
        CatalogItem::Question(q) => *q,
        other => panic!("{other:?}"),
    }
}
fn domain(c: &CatalogService, id: &str) -> Domain {
    match c.catalog_get(CatalogKind::Domain, id).unwrap() {
        CatalogItem::Domain(d) => *d,
        other => panic!("{other:?}"),
    }
}
fn ids(list: &[&str]) -> Vec<QuestionId> {
    list.iter().map(|i| QuestionId::from(*i)).collect()
}
fn members(c: &CatalogService, d: &str) -> Vec<String> {
    domain(c, d)
        .questions
        .into_iter()
        .map(|m| m.question_id.to_string())
        .collect()
}

/// q1..q5 (difficulty 10..50), D1 = {q1, q2, q3}, D2 = {}.
fn setup() -> CatalogService {
    let c = CatalogService::open(CatalogLocation::Memory).unwrap();
    for (i, id) in ["q1", "q2", "q3", "q4", "q5"].iter().enumerate() {
        c.catalog_upsert(&question(id, (i as u8 + 1) * 10, &[]).into(), NOW)
            .unwrap();
    }
    let mut d1 = Domain::new("d1", "History", "HIS");
    d1.questions = ["q1", "q2", "q3"]
        .iter()
        .enumerate()
        .map(|(i, q)| DomainMember {
            question_id: QuestionId::from(*q),
            sort_key: i as i64,
            group_id: None,
        })
        .collect();
    c.catalog_upsert(&d1.into(), NOW).unwrap();
    c.catalog_upsert(&Domain::new("d2", "Science", "SCI").into(), NOW)
        .unwrap();
    c
}
fn edit(c: &CatalogService, list: &[&str], e: BulkEdit) -> questiongame_host::catalog::BulkReport {
    c.catalog_bulk_edit(&ids(list), &e, true, NOW).unwrap()
}

#[test]
fn b10_tag_adds_to_those_lacking_it_once() {
    let c = setup();
    c.catalog_upsert(&question("q1", 10, &["Christmas"]).into(), NOW)
        .unwrap();
    let r = edit(
        &c,
        &["q1", "q2", "q3"],
        BulkEdit::Tag {
            tag: "christmas".into(),
        },
    );
    assert_eq!((r.changed.len(), r.unchanged.len()), (2, 1));
    assert_eq!(get_q(&c, "q2").tags, ["Christmas"], "the spelling in view");
}

#[test]
fn b12_tag_is_refused_whole_when_one_question_is_full() {
    let c = setup();
    let twenty: Vec<String> = (0..20).map(|i| format!("t{i}")).collect();
    let refs: Vec<&str> = twenty.iter().map(String::as_str).collect();
    c.catalog_upsert(&question("q3", 30, &refs).into(), NOW)
        .unwrap();
    assert!(
        c.catalog_bulk_edit(
            &ids(&["q1", "q2", "q3"]),
            &BulkEdit::Tag { tag: "new".into() },
            true,
            NOW
        )
        .is_err()
    );
    assert!(get_q(&c, "q1").tags.is_empty(), "nothing written");
}

#[test]
fn b15_b16_untag_removes_it_ignoring_case_and_keeps_the_rest() {
    let c = setup();
    c.catalog_upsert(&question("q1", 10, &["a", "Christmas", "b"]).into(), NOW)
        .unwrap();
    let r = edit(
        &c,
        &["q1", "q2"],
        BulkEdit::Untag {
            tag: "CHRISTMAS".into(),
        },
    );
    assert_eq!((r.changed.len(), r.unchanged.len()), (1, 1));
    assert_eq!(get_q(&c, "q1").tags, ["a", "b"]);
}

#[test]
fn b20_b21_b22_group_puts_the_selection_in_a_group_and_back_out() {
    let c = setup();
    let romans = c
        .domain_group_create(&DomainId::from("d1"), "Romans", NOW)
        .unwrap();
    let r = edit(
        &c,
        &["q1", "q2", "q4"],
        BulkEdit::Group {
            domain_id: DomainId::from("d1"),
            group_id: Some(romans.id.clone()),
        },
    );
    assert_eq!(
        (r.changed.len(), r.unchanged.len()),
        (2, 1),
        "q4 is not in History: skipped"
    );
    let d = domain(&c, "d1");
    assert_eq!(
        d.questions
            .iter()
            .filter(|m| m.group_id.as_ref() == Some(&romans.id))
            .count(),
        2
    );
    let again = edit(
        &c,
        &["q1"],
        BulkEdit::Group {
            domain_id: DomainId::from("d1"),
            group_id: Some(romans.id.clone()),
        },
    );
    assert_eq!(again.unchanged.len(), 1);
    edit(
        &c,
        &["q1", "q2"],
        BulkEdit::Group {
            domain_id: DomainId::from("d1"),
            group_id: None,
        },
    );
    assert!(
        domain(&c, "d1")
            .questions
            .iter()
            .all(|m| m.group_id.is_none())
    );
}

#[test]
fn b23_a_group_of_another_domain_is_refused() {
    let c = setup();
    let other = c
        .domain_group_create(&DomainId::from("d2"), "Physics", NOW)
        .unwrap();
    assert!(
        c.catalog_bulk_edit(
            &ids(&["q1"]),
            &BulkEdit::Group {
                domain_id: DomainId::from("d1"),
                group_id: Some(other.id)
            },
            true,
            NOW
        )
        .is_err()
    );
}

#[test]
fn b30_b31_b37_add_to_domain_appends_in_selection_order_ungrouped() {
    let c = setup();
    let r = edit(
        &c,
        &["q5", "q1", "q4"],
        BulkEdit::AddToDomain {
            domain_id: DomainId::from("d1"),
        },
    );
    assert_eq!((r.changed.len(), r.unchanged.len()), (2, 1));
    assert_eq!(members(&c, "d1"), ["q1", "q2", "q3", "q5", "q4"]);
    assert!(
        domain(&c, "d1")
            .questions
            .iter()
            .all(|m| m.group_id.is_none())
    );
}

#[test]
fn b38_b39_b40_remove_from_domain_keeps_the_question_and_its_other_domains() {
    let c = setup();
    edit(
        &c,
        &["q1"],
        BulkEdit::AddToDomain {
            domain_id: DomainId::from("d2"),
        },
    );
    c.catalog_upsert(&question("q1", 10, &["Rome"]).into(), NOW)
        .unwrap();
    let r = edit(
        &c,
        &["q1", "q4"],
        BulkEdit::RemoveFromDomain {
            domain_id: DomainId::from("d1"),
        },
    );
    assert_eq!((r.changed.len(), r.unchanged.len()), (1, 1));
    assert_eq!(members(&c, "d1"), ["q2", "q3"]);
    assert_eq!(members(&c, "d2"), ["q1"]);
    assert_eq!(get_q(&c, "q1").tags, ["Rome"]);
}

#[test]
fn b50_b51_b53_set_difficulty_one_to_a_hundred_or_not_set() {
    let c = setup();
    let r = edit(
        &c,
        &["q1", "q2"],
        BulkEdit::SetDifficulty {
            difficulty: Some(20),
        },
    );
    assert_eq!((r.changed.len(), r.unchanged.len()), (1, 1));
    assert_eq!(get_q(&c, "q1").difficulty, Some(20));
    edit(&c, &["q1"], BulkEdit::SetDifficulty { difficulty: None });
    assert_eq!(get_q(&c, "q1").difficulty, None);
    for bad in [0, 101] {
        assert!(
            c.catalog_bulk_edit(
                &ids(&["q2"]),
                &BulkEdit::SetDifficulty {
                    difficulty: Some(bad)
                },
                true,
                NOW
            )
            .is_err()
        );
    }
}

#[test]
fn b52_set_difficulty_adds_no_refusal_load_reports_the_clash() {
    let c = setup();
    let mut game = Recipe::new("g", "Game", GameSettings::default());
    game.board = vec![BoardDomain {
        domain_id: DomainId::from("d1"),
        question_ids: ids(&["q1", "q2"]),
    }];
    c.recipe_upsert(&game, NOW).unwrap();
    edit(
        &c,
        &["q1", "q2"],
        BulkEdit::SetDifficulty {
            difficulty: Some(40),
        },
    );
    let mut flags = FlagService::default();
    flags.load_recipe(GameSettings::default()).unwrap();
    assert!(
        c.build_snapshot(
            &RecipeId::from("g"),
            PlayId::from("p"),
            flags.freeze().unwrap()
        )
        .is_err(),
        "Load says so, as for one edit"
    );
}

#[test]
fn b0_a_bad_id_refuses_every_edit_whole() {
    let c = setup();
    let edits = [
        BulkEdit::Tag { tag: "x".into() },
        BulkEdit::Untag { tag: "x".into() },
        BulkEdit::Group {
            domain_id: DomainId::from("d1"),
            group_id: None,
        },
        BulkEdit::AddToDomain {
            domain_id: DomainId::from("d2"),
        },
        BulkEdit::RemoveFromDomain {
            domain_id: DomainId::from("d1"),
        },
        BulkEdit::SetDifficulty {
            difficulty: Some(99),
        },
    ];
    for e in edits {
        assert!(
            c.catalog_bulk_edit(&ids(&["q1", "missing"]), &e, true, NOW)
                .is_err(),
            "{e:?}"
        );
    }
    assert_eq!(get_q(&c, "q1").difficulty, Some(10));
    assert!(members(&c, "d2").is_empty());
    assert!(
        c.catalog_bulk_edit(&[], &BulkEdit::Tag { tag: "x".into() }, true, NOW)
            .is_err(),
        "B1"
    );
}

#[test]
fn b2_b8_a_preview_writes_nothing_and_counts_duplicates_once() {
    let c = setup();
    let r = c
        .catalog_bulk_edit(
            &ids(&["q1", "q1", "q2"]),
            &BulkEdit::Tag { tag: "x".into() },
            false,
            NOW,
        )
        .unwrap();
    assert_eq!(r.changed.len(), 2);
    assert!(get_q(&c, "q1").tags.is_empty());
}

#[test]
fn b6_a_bulk_edit_leaves_copies_in_other_workspaces_alone() {
    let c = setup();
    let b = c.workspace_create("B", None, NOW).unwrap().id;
    c.catalog_copy_to(
        &Selection {
            questions: ids(&["q1"]),
            ..Selection::default()
        },
        &b,
        CopyOptions::default(),
        NOW,
    )
    .unwrap();
    edit(&c, &["q1"], BulkEdit::Tag { tag: "x".into() });
    edit(
        &c,
        &["q1"],
        BulkEdit::SetDifficulty {
            difficulty: Some(77),
        },
    );
    c.workspace_switch(&b).unwrap();
    let CatalogItem::Question(copy) = &c
        .catalog_list(CatalogKind::Question, ArchiveScope::All)
        .unwrap()[0]
    else {
        panic!()
    };
    assert!(copy.tags.is_empty());
    assert_eq!(copy.difficulty, Some(10));
}

// --------------------------------------------------------------- Manage tags

#[test]
fn mt1_mt8_rename_reaches_every_question_in_view() {
    let c = setup();
    c.catalog_upsert(&question("q1", 10, &["Rome"]).into(), NOW)
        .unwrap();
    c.catalog_upsert(&question("q2", 20, &["rome"]).into(), NOW)
        .unwrap();
    let preview = c.tag_rename("ROME", "Romans", false, NOW).unwrap();
    assert_eq!(preview.changed.len(), 2);
    assert_eq!(get_q(&c, "q1").tags, ["Rome"], "a preview writes nothing");
    c.tag_rename("ROME", "Romans", true, NOW).unwrap();
    for q in ["q1", "q2"] {
        assert_eq!(get_q(&c, q).tags, ["Romans"]);
    }
    let hits = c
        .catalog_search(&SearchQuery {
            text: "romans".into(),
            kinds: vec![CatalogKind::Question],
            scope: ArchiveScope::All,
            limit: 10,
        })
        .unwrap();
    assert_eq!(hits.len(), 2, "T15: search follows the rename");
}

#[test]
fn mt2_merging_into_a_tag_a_question_already_has_leaves_one() {
    let c = setup();
    c.catalog_upsert(&question("q1", 10, &["a", "B"]).into(), NOW)
        .unwrap();
    c.catalog_upsert(&question("q2", 20, &["a"]).into(), NOW)
        .unwrap();
    c.tag_rename("a", "b", true, NOW).unwrap();
    assert_eq!(get_q(&c, "q1").tags, ["B"]);
    assert_eq!(get_q(&c, "q2").tags, ["B"], "the target's spelling");
    assert_eq!(c.tag_list().unwrap().len(), 1);
}

#[test]
fn mt4_a_change_of_case_respells_it_everywhere() {
    let c = setup();
    c.catalog_upsert(&question("q1", 10, &["rome"]).into(), NOW)
        .unwrap();
    c.catalog_upsert(&question("q2", 20, &["rome"]).into(), NOW)
        .unwrap();
    c.tag_rename("rome", "Rome", true, NOW).unwrap();
    assert_eq!(get_q(&c, "q2").tags, ["Rome"]);
}

#[test]
fn mt6_mt12_delete_takes_it_off_every_question_and_an_unknown_tag_is_a_no_op() {
    let c = setup();
    c.catalog_upsert(&question("q1", 10, &["a", "x", "b"]).into(), NOW)
        .unwrap();
    c.catalog_upsert(&question("q2", 20, &["x"]).into(), NOW)
        .unwrap();
    assert_eq!(c.tag_delete("X", true, NOW).unwrap().changed.len(), 2);
    assert_eq!(get_q(&c, "q1").tags, ["a", "b"]);
    assert!(get_q(&c, "q2").tags.is_empty());
    assert!(
        c.tag_delete("nothing", true, NOW)
            .unwrap()
            .changed
            .is_empty()
    );
    assert!(
        c.tag_rename("nothing", "else", true, NOW)
            .unwrap()
            .changed
            .is_empty()
    );
}

#[test]
fn mt7_manage_tags_touches_only_questions_in_view() {
    let c = setup();
    let b = c.workspace_create("B", None, NOW).unwrap().id;
    c.workspace_switch(&b).unwrap();
    c.catalog_upsert(&question("qb", 10, &["Rome"]).into(), NOW)
        .unwrap();
    let a = c
        .workspace_list()
        .unwrap()
        .0
        .into_iter()
        .find(|w| w.id != b)
        .unwrap()
        .id;
    c.workspace_switch(&a).unwrap();
    c.catalog_upsert(&question("q1", 10, &["Rome"]).into(), NOW)
        .unwrap();
    c.tag_rename("Rome", "Romans", true, NOW).unwrap();
    c.workspace_switch(&b).unwrap();
    assert_eq!(get_q(&c, "qb").tags, ["Rome"]);
}

// ---- beta.9: Move to domain (a drag with Ctrl held, *Move to domain…*) ----

/// D3 = {q1, q4}, D4 (archived) = {q1}: q1 sits in D1, D3 and the archived D4.
fn spread(c: &CatalogService) {
    let member = |q: &str, k: i64| DomainMember { question_id: QuestionId::from(q), sort_key: k, group_id: None };
    let mut d3 = Domain::new("d3", "Science", "SCI");
    d3.questions = vec![member("q1", 0), member("q4", 1)];
    c.catalog_upsert(&d3.into(), NOW).unwrap();
    let mut d4 = Domain::new("d4", "Old", "OLD");
    d4.questions = vec![member("q1", 0)];
    c.catalog_upsert(&d4.into(), NOW).unwrap();
    c.catalog_archive(CatalogKind::Domain, "d4", NOW).unwrap();
}

#[test]
fn move_to_domain_leaves_every_other_domain_archived_ones_too() {
    let c = setup();
    spread(&c);
    let report = edit(&c, &["q1"], BulkEdit::MoveToDomain { domain_id: DomainId::from("d2") });
    assert_eq!(report.changed, ids(&["q1"]));
    assert_eq!(members(&c, "d2"), ["q1"]);
    assert!(!members(&c, "d1").contains(&"q1".to_string()));
    assert!(!members(&c, "d3").contains(&"q1".to_string()));
    assert!(members(&c, "d4").is_empty(), "the archived domain lets it go too");
    // The rest of each domain is untouched.
    assert_eq!(members(&c, "d1"), ["q2", "q3"]);
    assert_eq!(members(&c, "d3"), ["q4"]);
}

#[test]
fn move_to_domain_counts_a_question_already_only_there_as_unchanged_and_keeps_its_place() {
    let c = setup();
    edit(&c, &["q4"], BulkEdit::AddToDomain { domain_id: DomainId::from("d2") });
    let report = edit(&c, &["q2", "q4"], BulkEdit::MoveToDomain { domain_id: DomainId::from("d2") });
    assert_eq!(report.unchanged, ids(&["q4"]));
    assert_eq!(report.changed, ids(&["q2"]));
    assert_eq!(members(&c, "d2"), ["q4", "q2"], "joins at the end; one already there keeps its place");
}

#[test]
fn move_to_the_domain_a_question_is_in_still_takes_it_out_of_the_others() {
    let c = setup();
    spread(&c);
    // q1 is in D1 already: it stays there, once, and leaves D3 and D4.
    let report = edit(&c, &["q1"], BulkEdit::MoveToDomain { domain_id: DomainId::from("d1") });
    assert_eq!(report.changed, ids(&["q1"]));
    assert_eq!(members(&c, "d1").iter().filter(|q| *q == "q1").count(), 1);
    assert_eq!(members(&c, "d3"), ["q4"]);
}

#[test]
fn move_to_domain_preview_writes_nothing() {
    let c = setup();
    spread(&c);
    let report = c
        .catalog_bulk_edit(&ids(&["q1"]), &BulkEdit::MoveToDomain { domain_id: DomainId::from("d2") }, false, NOW)
        .unwrap();
    assert_eq!(report.changed, ids(&["q1"]));
    assert!(members(&c, "d2").is_empty());
    assert!(members(&c, "d1").contains(&"q1".to_string()));
}

#[test]
fn move_to_domain_joins_in_selection_order_and_leaves_its_group_behind() {
    let c = setup();
    let romans = c.domain_group_create(&DomainId::from("d1"), "Romans", NOW).unwrap();
    edit(&c, &["q3"], BulkEdit::Group { domain_id: DomainId::from("d1"), group_id: Some(romans.id) });
    edit(&c, &["q3", "q1"], BulkEdit::MoveToDomain { domain_id: DomainId::from("d2") });
    let d2 = domain(&c, "d2");
    assert_eq!(members(&c, "d2"), ["q3", "q1"], "the order they were picked in");
    assert!(d2.questions.iter().all(|m| m.group_id.is_none()), "a group belongs to its domain: it stays behind");
    assert_eq!(members(&c, "d1"), ["q2"]);
}

#[test]
fn move_to_domain_with_a_bad_id_or_domain_changes_nothing() {
    let c = setup();
    let move_to = |d: &str| BulkEdit::MoveToDomain { domain_id: DomainId::from(d) };
    assert!(c.catalog_bulk_edit(&ids(&["q1", "missing"]), &move_to("d2"), true, NOW).is_err());
    assert!(c.catalog_bulk_edit(&ids(&["q1"]), &move_to("nowhere"), true, NOW).is_err());
    assert_eq!(members(&c, "d1"), ["q1", "q2", "q3"]);
    assert!(members(&c, "d2").is_empty());
}

#[test]
fn move_to_domain_leaves_copies_in_other_workspaces_alone() {
    let c = setup();
    let b = c.workspace_create("B", None, NOW).unwrap().id;
    c.catalog_copy_to(&Selection { domains: vec![DomainId::from("d1")], ..Selection::default() }, &b, CopyOptions::default(), NOW)
        .unwrap();
    edit(&c, &["q1"], BulkEdit::MoveToDomain { domain_id: DomainId::from("d2") });
    c.workspace_switch(&b).unwrap();
    let copies = c.catalog_list(CatalogKind::Domain, ArchiveScope::All).unwrap();
    let CatalogItem::Domain(copy) = &copies[0] else { panic!() };
    assert_eq!(copy.questions.len(), 3, "the copy of History still holds all three");
}

#[test]
fn a_second_move_to_the_same_domain_changes_nothing() {
    let c = setup();
    spread(&c);
    let all = ["q1", "q2", "q3", "q4", "q5"];
    for target in ["d1", "d2", "d3"] {
        edit(&c, &all, BulkEdit::MoveToDomain { domain_id: DomainId::from(target) });
        for q in all {
            let homes: Vec<_> = ["d1", "d2", "d3", "d4"].into_iter().filter(|d| members(&c, d).contains(&q.to_string())).collect();
            assert_eq!(homes, [target], "{q} ends in {target} alone");
        }
        let again = edit(&c, &all, BulkEdit::MoveToDomain { domain_id: DomainId::from(target) });
        assert!(again.changed.is_empty());
        assert_eq!(again.unchanged.len(), all.len());
    }
}

#[test]
fn move_to_domain_adds_no_refusal_load_reports_a_board_clash() {
    // §2.31, as Set difficulty (b52): the edit goes through and Load says so.
    let c = setup();
    let mut game = Recipe::new("g", "Game", GameSettings::default());
    game.board = vec![BoardDomain { domain_id: DomainId::from("d2"), question_ids: vec![] }];
    c.recipe_upsert(&game, NOW).unwrap();
    edit(&c, &["q1"], BulkEdit::SetDifficulty { difficulty: Some(30) });
    // q1 and q3 now share difficulty 30; both into the board's domain is not refused.
    let report = c
        .catalog_bulk_edit(&ids(&["q1", "q3"]), &BulkEdit::MoveToDomain { domain_id: DomainId::from("d2") }, true, NOW)
        .expect("a Move is never refused over a board");
    assert_eq!(report.changed.len(), 2);
}
