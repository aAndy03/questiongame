play-state fixtures that drive Stage before the host exists.
Frozen by the P1 contract; P6 made them integration assertions — `crates/host/tests/stage_contract.rs` checks every real `play-state` emission against them.

`import/` is not a play-state fixture: `import/template.json` is Studio's *Copy template* (beta.9), which `IMPORT.template` must equal and a host test imports whole. The contract readers take only this folder's own `*.json`, never a subfolder.
