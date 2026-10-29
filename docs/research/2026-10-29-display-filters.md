# Live display filters for pupils with visual impairments (Stage on a classroom projector/TV)

Researched 2026-10-29. Evidence labels: **[V]** = read on the cited page during this research; **[K]** = from established knowledge, not re-read this session (verify before quoting); **[W]** = weak or contested.

## Summary

- **No standard prescribes a "filter set".** WCAG / ISO/IEC 40500 / EN 301 549 require *content* to be accessible by design (contrast, no colour-only meaning, resizable, no needless motion). ISO 9241-171 asks software to let users adjust colour, contrast and size. What exists as a tested, shipped set of *filters* is what the OS vendors ship: invert, grayscale, grayscale-inverted, three CVD colour filters, increase contrast, reduce white point / extra dim, reduce motion.
- Strongest evidence: **contrast** (WCAG 1.4.3/1.4.6/1.4.11), **not relying on colour alone** (1.4.1), **magnification**, **reduced motion** (2.3.3 / `prefers-reduced-motion`). Weakest: **daltonisation** ("correction") and **inverted polarity** (helps some, hurts others; individual).
- Hence the only defensible design: a small set mirroring OS filters, each off by default, plus guarantees built into Stage itself (non-colour cues for correct/incorrect). A filter is an aid, not the compliance mechanism.
- Caveat on method: filtering Stage with CSS/SVG is not what OS filters do (they work on the final composited frame, after gamma). Within a web view this is an approximation; a teacher can always use the OS filter on the projector PC instead (Windows: Win+Ctrl+C).

## 1. Standards and what they require

| Source | What it says | Relevance |
| --- | --- | --- |
| WCAG 2.2 SC 1.4.3 Contrast (Minimum), AA **[V]** | Text/images of text >= 4.5:1; large text (18 pt or 14 pt bold) >= 3:1. Rationale in the Understanding doc: 3:1 baseline from ISO/ANSI, 4.5:1 compensates the ~1.5x contrast-sensitivity loss of about 20/40 acuity. | Stage is black on white (21:1). Coloured text on tinted backgrounds is where it can fail. |
| SC 1.4.6 Contrast (Enhanced), AAA **[K]** | 7:1 (4.5:1 large). | Target for Stage text. |
| SC 1.4.11 Non-text Contrast, AA (2.1+) **[K]** | UI components and graphical objects needed to understand content >= 3:1 against adjacent colours. | Result cards, timer ring, domain tiles, decorative shapes only if they carry meaning. |
| SC 1.4.1 Use of Color, A **[V]** | Colour must not be the only visual means of conveying information; add text, shape or pattern. Benefits colour-vision deficiency, partial sight, older users, monochrome displays. | **Core rule for correct/incorrect.** Any filter that changes hue relies on this holding. |
| SC 1.4.4 Resize text (200%), 1.4.10 Reflow, 1.4.12 Text spacing **[K]** | Content usable at 200% text size etc. | Magnification: the web-view equivalent is scaling, not a filter. |
| SC 2.3.3 Animation from Interactions, AAA **[V]** | Motion triggered by interaction can be disabled unless essential; vestibular disorders cause dizziness, nausea, headaches. Ways: avoid, provide control, honour `prefers-reduced-motion`. | Stage reveals/transitions. Auto-playing motion falls under 2.2.2 Pause, Stop, Hide (AA, > 5 s). |
| SC 2.3.1 Three Flashes or Below Threshold, A **[K]** | No more than 3 flashes per second (or below general/red flash thresholds). | Seizure safety, separate from vestibular. |
| ISO/IEC 40500:2012 **[K]** | Is WCAG 2.0 verbatim; the live standard is W3C WCAG 2.2. | Cite WCAG 2.2 for requirements, ISO/IEC 40500 for formal reference. |
| EN 301 549 **[K]** | European ICT procurement standard; web content clause 9 maps to WCAG 2.1 AA (v3.2.1); later versions track newer WCAG. | Legal anchor for schools in the EU; says nothing about filters. |
| ISO 9241-171 (software accessibility) **[V for scope]** | Guidance for software accessible to the widest range of abilities incl. elderly; sections on user preference settings (8.2), visual output and displays (10.2), text and fonts (10.3), colour (10.4). A 2025 edition exists. The detailed clause text is paywalled and was not read; from memory it asks that users can change/adjust colour, contrast, size and that colour not be the sole carrier of information **[K, unverified]**. | Supports offering user-adjustable display settings in principle. |
| ISO 24505-1 (colour/luminance for older users) **[not verified]** | Search returned nothing; do not cite beyond "exists" until checked against iso.org. | Do not rely on. |

Conclusion: standards justify *adjustability* and *non-colour cues*, not any specific filter.

## 2. What operating systems ship (the established, user-tested set)

- **Windows 11 Color filters** **[V]** (Settings > Accessibility > Color filters; Win+Ctrl+C shortcut once enabled): Microsoft says filters "change the color palette" to help distinguish things that differ only by colour, and are also recommended for light sensitivity. The set (third-party sources, consistent): Inverted, Grayscale, Grayscale inverted, Red-green (deuteranopia), Red-green (protanopia), Blue-yellow (tritanopia). Windows also ships Contrast themes (High Contrast) **[K]**. Microsoft does not publish the filter matrices.
- **Apple (iOS/iPadOS; macOS equivalent in Accessibility > Display)** **[V]**: Smart Invert (reverses colours except images, media, dark-style apps), Classic Invert (everything), Increase Contrast, Reduce Transparency, Differentiate Without Color (shows non-colour cues for colour-dependent UI), Color Filters (Grayscale, Red/Green protanopia, Green/Red deuteranopia, Blue/Yellow tritanopia, adjustable intensity; a colour tint exists **[K]**), Reduce White Point (dims bright colours). Reduce Motion is in Accessibility > Motion **[K]**.
- **Android** **[W: official page not retrieved]**: Colour correction (deuteranomaly, protanomaly, tritanomaly), Colour inversion, Extra dim, Grayscale (via Colour and motion in Accessibility; AbilityNet documents the correction modes). Exact algorithm not documented in sources read.

Take-away: three families have been user-tested across billions of devices: **polarity inversion**, **greyscale**, **CVD colour filters**, plus **dimming** and **increase contrast**. Nothing else (sepia, blur, custom hue sliders) has comparable provenance for this purpose.

## 3. Research evidence

**(a) CVD simulation vs "correction".**
- Simulation (what a CVD viewer sees) is well-founded: Brettel, Viénot & Mollon 1997; Viénot, Brettel & Mollon 1999; Machado, Oliveira & Fernandes 2009 (physiologically based, severity 0-1, one 3x3 matrix per colour in linear RGB) **[V for Machado]**. Machado's tritanomaly is an approximation (shift paradigm), less rigorous than protan/deutan **[V via `colour` docs]**.
- Daltonisation (recolouring so CVD viewers can discriminate) is **not standardised and weakly validated [W]**: Simon-Liedtke & Farup 2016 evaluated methods with a behavioural visual-search task and could rank them, but a review-style source notes recolouring tools are insufficiently tested with real CVD observers; a 2025 study states findings are insufficient to conclude effectiveness beyond basic discrimination; a 2022 Optics Express review discusses limits. The Windows/Apple CVD "filters" are in this category, and they are also known to suit some users and not others (hence intensity sliders and "try each" advice).
- Honest reading: CVD filters are a personal-preference aid. Simulation is for *designers* (checking Stage), not for the audience.

**(b) Contrast and polarity.**
- Contrast magnitude is the dominant factor for low-vision reading (Legge, Rubin et al. 1980s-90s **[K]**; WCAG rationale above). Polarity: some low-vision readers read faster with light-on-dark (Rubin & Legge 1989 studied both; a 2024 study of 48 children with vision impairment found some gain from reverse polarity and recommends individual assessment **[V via search]**). For normal vision, positive polarity usually gives better proofreading/acuity **[W]**; a 2024 study found preference and performance did not always match. Verdict: **inversion helps a minority; it must be a switch, not a default.**

**(c) Magnification.** Large print is the long-standing primary aid (WCAG 1.4.4; ISO 9241-171 size adjustment). Stage already uses very large type; a "zoom" option is a layout scale, not a filter.

**(d) Glare/photophobia.** Reduced brightness / white point is shipped by Apple (Reduce White Point **[V]**), Android (Extra dim) and Microsoft recommends colour filters for light sensitivity **[V]**. Specific controlled evidence for projector classrooms was not found **[W]**; the case rests on vendor practice and clinical convention (light-on-dark or dimmed for photophobia).

**(e) Motion.** WCAG 2.3.3 and 2.2.2 **[V]**; `prefers-reduced-motion` is the platform mechanism. Strong consensus.

## 4. Implementation in a web view

All applied to the Stage root (`filter:` on the root element, or an SVG `<filter>` referenced via `filter:url(#id)`). Default `color-interpolation-filters` for SVG is `linearRGB`, which is correct for Machado (linear RGB) but means `feColorMatrix` results differ from CSS `filter` shorthand (which operates in sRGB) for the same matrix **[K]**.

- **Invert (classic):** `filter: invert(1)`.
- **Smart-ish invert (keeps hues roughly, flips lightness):** `filter: invert(1) hue-rotate(180deg)`. Not identical to Apple's Smart Invert (which excludes images by content type); apply a second `invert(1) hue-rotate(180deg)` to images/decor to restore them **[K]**.
- **Grayscale:** `filter: grayscale(1)` (spec matrix: luminance 0.2126/0.7152/0.0722 weights **[K]**).
- **Grayscale inverted:** `filter: grayscale(1) invert(1)`.
- **High contrast boost:** `filter: contrast(1.4)` (CSS `contrast(n)`: slope n, intercept 0.5-0.5n). Already max for black-on-white; useful only for coloured/grey elements. Not a substitute for real tokens.
- **Dim / reduce white point:** `filter: brightness(0.7)` (Extra-dim-like; Apple's reduction is adjustable).
- **CVD simulation (Machado 2009, severity 1.0, linear RGB; source: UFRGS page [V]):**

```
Protanopia            Deuteranopia          Tritanopia
 0.152286  1.052583 -0.204868    0.367322  0.860646 -0.227968    1.255528 -0.076749 -0.178779
 0.114503  0.786281  0.099216    0.280085  0.672501  0.047413   -0.078411  0.930809  0.147602
-0.003882 -0.048116  1.051998   -0.011820  0.042940  0.968881    0.004733  0.691367  0.303900
```
```html
<filter id="sim-deutan" color-interpolation-filters="linearRGB">
  <feColorMatrix type="matrix" values="0.367322 0.860646 -0.227968 0 0
                                       0.280085 0.672501  0.047413 0 0
                                      -0.011820 0.042940  0.968881 0 0
                                       0        0         0        1 0"/>
</filter>
```
  These simulate; they do not correct. Use them in the dev/QA preview to check Stage, not as an audience aid.
- **CVD "correction" (daltonisation):** there is no published vendor matrix (Microsoft and Apple do not document theirs). The widely circulated Fidaner/Lin/Ozguven-style approach (simulate, compute error, add `[0 0 0; 0.7 1 0; 0.7 0 1] x error` to the original) is a community recipe **[K, W]**, requires per-pixel logic that a single `feColorMatrix` cannot express exactly. **Recommendation: do not ship an invented correction matrix.** If a CVD aid is wanted, either document that the teacher should use the OS filter, or offer the OS-named filter with a clear "approximate" label and rely on non-colour cues.
- **Reduced motion:** not a filter; set a Stage mode that maps to the existing `motionConfig.immediate` seam and honours `prefers-reduced-motion`.

**Caveats that matter for a quiz:**
1. **Invert flips semantics:** mint/green correct becomes magenta/pink, coral/red incorrect becomes cyan; gold becomes blue. Under inversion or any CVD filter, green/red are unreliable. Correct/incorrect must therefore carry an icon/word/shape (SC 1.4.1), which Stage should do regardless of any filter.
2. **Greyscale** removes all hue: result and leader cues must remain distinguishable by shape/label/position.
3. **Filters reduce frame rate** on large surfaces in some webviews: test on the actual projector machine; `will-change: filter` costs memory.
4. **The Studio preview** should show the same filter (apply to the same root) so the teacher sees what pupils see; the preview should be filtered, but Studio controls must not be.
5. **Screen recordings**: the show is recorded; make the filter apply to the display capture only if intended (default: it should be a live audience aid and not baked into exports **[design decision, not researched]**).

## 5. Recommended set (all off by default, live toggle, one active at a time except Dim/Motion)

| # | Name | Helps | Rests on | Implementation | Risks |
| --- | --- | --- | --- | --- | --- |
| 1 | **Invert** (light on dark) | Light sensitivity, some low-vision readers | Vendor sets (Windows Inverted, Apple Classic/Smart Invert) [V]; polarity research is individual [W] | `invert(1) hue-rotate(180deg)` (restore decor/images with the same on the element) | Flips green/red meaning; relies on 1.4.1 cues |
| 2 | **Grayscale** | Colour-vision deficiency, colour-overload | Windows/Apple/Android grayscale [V] | `grayscale(1)` | Loses hue cues entirely |
| 3 | **Grayscale inverted** | Photophobia + monochrome | Windows "Grayscale inverted" [V] | `grayscale(1) invert(1)` | As 1 and 2 |
| 4 | **Red-green (deutan / protan) and Blue-yellow (tritan)** | CVD users who like it | Windows and Apple colour filters [V]; effectiveness weak [W] | Not shippable faithfully (no published matrices). Option: link to OS filter; or include only with "approximate" label | Cannot be validated here; do not invent |
| 5 | **Dim** (reduce white point) | Photophobia, glare on bright projectors | Apple Reduce White Point [V], Android Extra dim [K], Microsoft light-sensitivity advice [V] | `brightness(0.7)` with a slider 0.5-1.0 | Lowers contrast ratio in projector ambient light; keep >= 4.5:1 |
| 6 | **Higher contrast** | Low vision | WCAG 1.4.3/1.4.6/1.4.11 [V/K]; Apple Increase Contrast [V] | Swap to a token set (strict black on white, thicker outlines), not `contrast()` | Needs design tokens, not just a filter |
| 7 | **Reduce motion** | Vestibular, photosensitivity | WCAG 2.3.3, 2.2.2 [V]; `prefers-reduced-motion` | Map to `motionConfig.immediate`; stop decor physics | Timer must still read; non-motion cue for reveals |
| 8 | **Larger text/zoom** | Low vision | WCAG 1.4.4/1.4.10, ISO 9241-171 size adjustment [K] | Layout scale (e.g. 125-200%), not a filter | Reflow and fitting on Stage |

Items 1, 2, 3, 5, 7 are the minimum faithful set. 4 is the only one the maintainer's "do not invent filters" rule says to hold back or delegate to the OS. A CVD **simulation** toggle (Machado matrices above) is worth including as a *Studio-only dev/QA preview* for checking Stage's colours.

## References

- W3C WCAG 2.2 SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C WCAG 2.2 SC 1.4.1 Use of Color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- W3C WCAG 2.2 SC 2.3.3 Animation from Interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- W3C WCAG 1.4.6, 1.4.11, 1.4.4, 2.3.1 Understanding docs (same path pattern under /WAI/WCAG22/Understanding/) [not re-read]
- ISO 9241-171:2008 (catalogue entry): https://www.boutique.afnor.org/en-gb/standard/iso-92411712008/ergonomics-of-humansystem-interaction-part-171-guidance-on-software-accessi/xs116074/114940
- ISO/IEC 40500:2012 (WCAG 2.0) and EN 301 549 (ETSI): https://www.iso.org/standard/58625.html , https://www.etsi.org/deliver/etsi_en/301500_301599/301549/ [not re-read]
- Microsoft, Use color filters in Windows: https://support.microsoft.com/en-us/accessibility/windows/use-color-filters-in-windows
- Apple, Use display and text size preferences: https://support.apple.com/111773
- AbilityNet, Android colour correction: https://mcmw.abilitynet.org.uk/how-to-use-colour-correction-to-adapt-for-colour-blindness-in-android-16
- Machado, Oliveira, Fernandes (2009), IEEE TVCG 15(6):1291-1298, and matrices: https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
- `colour` library implementation of Machado 2009: https://colour.readthedocs.io/en/master/_modules/colour/blindness/machado2009.html
- Brettel, Viénot, Mollon (1997), JOSA A 14(10):2647 ; Viénot, Brettel, Mollon (1999), Color Res. Appl. 24:243 [not re-read]
- Simon-Liedtke & Farup (2016), Evaluating colour vision deficiency daltonization methods using a behavioural visual-search method: https://ntnuopen.ntnu.no/ntnu-xmlui/handle/11250/2461824
- Reverse polarity text for children with vision impairment (2024): https://pmc.ncbi.nlm.nih.gov/articles/PMC11175232/ (PMC id from search result; confirm)
- Rubin & Legge (1989), Psychophysics of reading IV: contrast and polarity [not re-read]
- CSS Filter Effects Module Level 1 (filter functions and matrices): https://www.w3.org/TR/filter-effects-1/ [not re-read]
