# BLUEPRINT STANDARD v1.0
## The Executable Build Document Format for Sovereignty Hub
## Designed by C2 (The Architect) | April 27, 2026

---

## WHAT THIS DOCUMENT IS

This is the format specification that every blueprint in the sovereignty-hub repository must follow. A blueprint is NOT an overview, an audit, or a product catalog. A blueprint is a document you hand to someone who has never done this before, and they can execute it start to finish with no outside help.

**The test:** If two strangers in two different states follow the same blueprint, they should get the same result. If they can't, the blueprint is incomplete.

**The audience:** Someone with basic hand tools, an internet connection (for ordering parts), and willingness to learn. No assumed trade knowledge. No assumed experience. Every abbreviation defined. Every measurement specified. Every "obvious" step written out.

**The format:** Must work printed on paper. No video required (though video links are welcome as supplements). No interactive elements. A person in a garage with a printed stack of pages can execute this.

---

## TEMPLATE

Everything below between the `---START TEMPLATE---` and `---END TEMPLATE---` markers is the blueprint template. Copy it verbatim when creating a new blueprint. Replace all `[BRACKETED]` text with actual content. Delete all `<!-- INSTRUCTIONS: -->` comments before publishing.

---START TEMPLATE---

```markdown
# [BLUEPRINT TITLE]
## [One-sentence description of what this builds or accomplishes]

| Field | Value |
|-------|-------|
| **Pillar** | [Number and name, e.g., "09 - Transportation"] |
| **Layer** | [0-6, per the 7-layer model] |
| **Difficulty** | [1-5 wrenches: see scale below] |
| **Total Cost** | [$X - $Y range, not including tools] |
| **Time to Complete** | [X hours/days for first-timer, not an expert] |
| **People Required** | [Minimum hands needed, e.g., "1 (2 recommended for step 14)"] |
| **Permits/Legal** | [Required permits, inspections, or "None"] |
| **Last Verified** | [YYYY-MM-DD — date someone last built this successfully] |
| **Version** | [1.0.0] |
| **Contributors** | [Names or GitHub handles] |

<!-- INSTRUCTIONS: Difficulty scale:
  1 wrench = Anyone can do this. No tools beyond a screwdriver.
  2 wrenches = Basic hand tools. Some comfort with DIY.
  3 wrenches = Power tools required. Read the whole blueprint first.
  4 wrenches = Trade-level skill in at least one area. Mistakes are expensive.
  5 wrenches = Professional or supervised only. Safety-critical work.
-->

### SAFETY

<!-- INSTRUCTIONS: This section is NOT optional. Every blueprint has risks.
     If you think there are no risks, you haven't thought hard enough.
     List them in order of severity, worst first. -->

| Risk | Severity | Mitigation |
|------|----------|------------|
| [e.g., "Propane is heavier than air and pools in low spots"] | [CRITICAL / HIGH / MODERATE / LOW] | [e.g., "Work outdoors or in ventilated area. Never under a vehicle on a lift with propane lines open."] |
| [next risk] | [severity] | [mitigation] |

**Required PPE:** [List everything: gloves, eye protection, respirator, etc.]

**Stop-work conditions:** [Conditions under which you must stop and get help. E.g., "If you smell gas at any point after step 12, shut the tank valve, leave the area, and do not proceed until the leak is found."]

---

### PREREQUISITES

<!-- INSTRUCTIONS: What must already be true before starting this blueprint?
     Include skills, completed projects, physical requirements, and legal requirements.
     If this blueprint depends on another blueprint, link it. -->

**Must have:**
- [e.g., "A running vehicle with a carbureted or throttle-body-injected gasoline engine"]
- [e.g., "Completed: 'Basic Propane Safety' (blueprint link or equivalent knowledge)"]

**Must know:**
- [e.g., "How to identify your engine type (see Appendix A if unsure)"]
- [e.g., "How to disconnect a car battery (negative terminal first)"]

**Not required (but helpful):**
- [e.g., "Experience with fuel system work"]

---

### BILL OF MATERIALS

<!-- INSTRUCTIONS:
  - Every part must have a source. "Available at hardware stores" is not sufficient.
    Give the specific product name that works. If it's common enough to find anywhere
    (like a 3/8" bolt), say "any hardware store" but still specify the exact size.
  - Prices must include the date checked. Prices change.
  - The substitutes column prevents a single out-of-stock part from killing the project.
  - Group parts by where they're used in the build, not alphabetically.
-->

#### Parts

| # | Part | Specification | Qty | Source | Price | Substitutes |
|---|------|--------------|-----|--------|-------|-------------|
| P1 | [Part name] | [Size, material, rating — be exact] | [X] | [URL or "Amazon ASIN: BXXXXXXXXXX" or store + product name] | [$X.XX as of YYYY-MM] | [Alternative part that works, or "None — this is the only option"] |
| P2 | [Part name] | [Specification] | [X] | [Source] | [$X.XX as of YYYY-MM] | [Substitutes] |

**Parts subtotal:** $[X.XX] - $[Y.YY] (range accounts for substitutes and price variation)

#### Consumables

<!-- INSTRUCTIONS: Things that get used up during the build but aren't part of the finished product. -->

| # | Item | Specification | Qty | Source | Price |
|---|------|--------------|-----|--------|-------|
| C1 | [e.g., "Thread sealant tape"] | [e.g., "PTFE, 1/2 inch, yellow (gas-rated)"] | [1 roll] | [Source] | [$X.XX] |

**Consumables subtotal:** $[X.XX]

**TOTAL MATERIALS COST:** $[X.XX] - $[Y.YY]

---

### TOOLS REQUIRED

<!-- INSTRUCTIONS: Separate "must have" from "nice to have" so people know
     what stops the build vs. what makes it easier. Include sizes. -->

**Must have (build cannot proceed without these):**
- [ ] [Tool with size, e.g., "Ratchet set with 10mm, 12mm, 14mm sockets"]
- [ ] [Next tool]

**Nice to have (saves time or improves result):**
- [ ] [Tool, e.g., "Torque wrench, 10-80 ft-lb range"]
- [ ] [Next tool]

**Do NOT use:**
- [Tool that seems right but will cause problems, e.g., "Do not use an adjustable wrench on flare fittings — it rounds the brass and causes leaks. Use a flare nut wrench."]

---

### BUILD

<!-- INSTRUCTIONS:
  - One action per step. Not "remove the air cleaner and disconnect the vacuum lines."
    That is two steps.
  - Every measurement is specific. Not "tighten firmly" but "tighten to 25 ft-lb"
    or "tighten until snug plus 1/4 turn."
  - CHECK steps are verification gates. The builder must confirm the check passes
    before proceeding. If the check fails, they stop and troubleshoot.
  - PHOTO tags are placeholders. Describe what the photo should show so a future
    contributor can add the actual image.
  - MISTAKE tags call out the most common errors at the exact step where they happen.
  - Time estimates help the builder plan. A first-timer needs realistic times.
-->

#### Phase 1: [Phase name, e.g., "Preparation and Disassembly"]
*Estimated time: [X hours]*

**Step 1. [Action verb] [specific object]**
[Detailed instruction. Include direction (clockwise/counterclockwise), position (top/bottom/driver's side), and what it should look/feel/sound like when done correctly.]

> PHOTO: [Description of what the photo should show, e.g., "Air cleaner assembly removed, showing throttle body and vacuum port locations. Label the three ports."]

**Step 2. [Action verb] [specific object]**
[Detailed instruction.]

> MISTAKE: [Common error at this step and what happens if you make it. E.g., "If you skip disconnecting the battery, the fuel pump will pressurize the system when you turn the key. Fuel sprays."]

**Step 3. [Action verb] [specific object]**
[Detailed instruction.]

> CHECK: [What to verify before moving on. E.g., "Confirm no fuel drips from any disconnected line for 60 seconds. Wipe connections with a white paper towel and inspect for wetness."]

#### Phase 2: [Phase name, e.g., "Core Installation"]
*Estimated time: [X hours]*

**Step 4. [Continue numbering sequentially across phases]**
[Detailed instruction.]

<!-- INSTRUCTIONS: Continue steps through all phases. Do not skip steps that
     seem obvious. If someone needs to wait for sealant to cure, that is a step.
     If someone needs to wash their hands before handling a component, that is a step.
     The blueprint is the builder's brain. Leave nothing to assumption. -->

---

### TESTING AND VERIFICATION

<!-- INSTRUCTIONS: The build is not done when the last bolt is tightened.
     The build is done when it passes every test in this section. -->

#### Success Criteria

| Test | Method | Pass | Fail |
|------|--------|------|------|
| [e.g., "Leak check"] | [e.g., "Spray all connections with soapy water. Watch for 60 seconds."] | [e.g., "No bubbles anywhere."] | [e.g., "Bubbles at any fitting. See Troubleshooting T1."] |
| [e.g., "Engine start"] | [e.g., "Turn key to ON (not START). Listen for fuel pump prime (2-3 second hum). Then start."] | [e.g., "Engine starts within 5 seconds, idles at 650-750 RPM."] | [e.g., "Engine cranks but won't start. See Troubleshooting T2."] |

#### First-Run Procedure

<!-- INSTRUCTIONS: Many builds require a specific startup sequence the first time.
     Document it here step by step. -->

1. [First-run step]
2. [First-run step]
3. [First-run step]

#### Troubleshooting

| Code | Symptom | Likely Cause | Fix |
|------|---------|-------------|-----|
| T1 | [e.g., "Bubbles at mixer connection"] | [e.g., "Gasket not seated or bolts not torqued evenly"] | [e.g., "Remove mixer, inspect gasket for damage, reinstall with new gasket if scored. Torque in star pattern to 15 ft-lb."] |
| T2 | [e.g., "Engine cranks, won't start on propane"] | [e.g., "Lock-off solenoid not receiving power"] | [e.g., "Check 12V at solenoid connector with key ON. If no voltage, trace wire to switch. If voltage present, solenoid is bad — replace."] |
| T3 | [Symptom] | [Cause] | [Fix] |
| T4 | [Symptom] | [Cause] | [Fix] |
| T5 | [Symptom] | [Cause] | [Fix] |

---

### MAINTENANCE

<!-- INSTRUCTIONS: Everything wears out. Tell the builder what to check and when.
     Also tell them what to stockpile so they aren't waiting on a shipment
     when something fails. -->

#### Schedule

| Interval | What to Check | What to Do | Parts Needed |
|----------|--------------|------------|-------------|
| Monthly | [Component] | [Inspection/action] | None |
| Every 6 months | [Component] | [Inspection/action] | [Part if applicable] |
| Annually | [Component] | [Inspection/action] | [Part if applicable] |
| Every [X miles/hours/cycles] | [Component] | [Inspection/action] | [Part if applicable] |

#### Wear Items (Stockpile These)

| Part | Expected Life | Keep on Hand | Source | Price |
|------|--------------|-------------|--------|-------|
| [e.g., "Mixer diaphragm"] | [e.g., "2-3 years or 30,000 miles"] | [e.g., "1 spare"] | [Source] | [$X.XX] |

#### End-of-Life

[What happens when this system is done. How to decommission safely. What parts are reusable. What must be disposed of properly and how.]

---

### REVENUE

<!-- INSTRUCTIONS: Every blueprint has a business angle. Someone who masters this
     build can do it for others. Document the economics. -->

#### Service Pricing

| Service | Time | Suggested Price | Your Cost | Margin |
|---------|------|----------------|----------|--------|
| [e.g., "Full conversion install (customer supplies vehicle)"] | [X hours] | [$X] | [$X in materials + labor value] | [X%] |
| [e.g., "Conversion consultation + parts list"] | [X hours] | [$X] | [$0] | [100%] |

#### Parts Markup

[Standard practice for marking up parts when doing installs for others. Typical is 20-40% on parts you source, 0% on parts the customer sources.]

#### Teaching

| Format | Duration | Suggested Price | Notes |
|--------|----------|----------------|-------|
| [e.g., "Weekend workshop: Build your own conversion"] | [X hours] | [$X per seat] | [e.g., "Minimum 4, maximum 8. Each student needs a vehicle."] |
| [e.g., "Printed field guide"] | N/A | [$X] | [e.g., "Cost to print: $3. This IS the marketing."] |

#### Scaling

[How this goes from "one person doing installs" to "a business." At what volume does it make sense to stock inventory, hire help, lease space, or franchise?]

---

### REGIONAL NOTES

<!-- INSTRUCTIONS: This section is where contributors add location-specific
     information. The original blueprint author writes the first one for their
     region. Others fork and add theirs.
     
     Regional notes cover: climate, local regulations, preferred suppliers,
     local material availability, seasonal timing, and anything else that
     changes by geography. -->

#### [Region: e.g., "North Idaho (Bonner County)"]
*Contributed by: [Name/handle], [Date]*

- [Regional note, e.g., "Propane is widely available — every gas station and hardware store in Sandpoint carries exchange tanks. Bulk delivery from prior to AmeriGas."]
- [Regional note, e.g., "No state emissions testing in Idaho. Dual-fuel conversions are legal for personal vehicles."]
- [Regional note]

---

### CROSS-PILLAR CONNECTIONS

<!-- INSTRUCTIONS: How does this blueprint connect to other pillars?
     What does it need from them? What does it give to them?
     This helps builders see the system, not just the project. -->

| Direction | Pillar | Connection |
|-----------|--------|------------|
| NEEDS | [e.g., "04 - Energy"] | [e.g., "Solar charging for auxiliary battery that powers the lock-off solenoid"] |
| GIVES TO | [e.g., "10 - Trade"] | [e.g., "Propane conversion service is a high-margin offering at the hub"] |

---

### VERSION HISTORY

| Version | Date | Contributor | Changes |
|---------|------|-------------|---------|
| 1.0.0 | [YYYY-MM-DD] | [Name/handle] | Initial blueprint |

---

### APPENDICES

<!-- INSTRUCTIONS: Put reference material here that supports the build but
     would interrupt the flow if inline. Wiring diagrams, conversion charts,
     engine identification guides, regulatory references, etc. -->

#### Appendix A: [Title]
[Content]

#### Appendix B: [Title]
[Content]
```

---END TEMPLATE---

---

## SECTION-BY-SECTION DESIGN RATIONALE

### Why the header is a table, not prose
A person picking up a blueprint needs to know in five seconds: what is this, can I do it, how much does it cost, and how long does it take. A table answers all four questions with one glance. Prose buries the answers.

### Why safety comes before materials
If someone is going to hurt themselves, they need to know before they buy parts and get excited. The safety section is a gate: read it, understand it, or stop here.

### Why the BOM has substitutes
Supply chains break. Products get discontinued. A blueprint that depends on one specific part from one specific vendor is fragile. The substitutes column makes the blueprint resilient.

### Why "Do NOT use" exists in tools
The most dangerous tool is the one that almost works. An adjustable wrench on a flare fitting feels right and causes a gas leak. Calling out the wrong tool at the place where people reach for it prevents the most common class of errors.

### Why one action per step
Compound steps ("remove the bracket and disconnect the hose") create ambiguity about sequence and allow people to skip sub-actions. One action per step means each step is verifiable: either you did it or you didn't.

### Why CHECK gates exist
A check is a point of no return. If the check fails, the builder knows to stop. Without checks, errors compound across steps until the final test fails and the builder has no idea which of 30 steps went wrong.

### Why troubleshooting uses codes
When a builder hits a problem in testing, they need to jump to the fix fast. "See T3" is faster than "See the third item in the troubleshooting section." Codes also let community discussion reference specific problems: "I hit T2 on my build, fixed it by..."

### Why revenue is in every blueprint
The sovereignty-hub exists to build self-sufficient communities. Self-sufficiency requires income. Every skill that can be taught or performed for others is an economic engine. Documenting the economics makes the business visible to people who might not see it on their own.

### Why regional notes are a section, not a separate file
Contributors who fork and add regional information should see the structure they're contributing to. A separate file gets orphaned. An inline section stays connected to the build it modifies.

### Why version history is mandatory
Open-source documents rot when nobody tracks changes. Version history creates accountability, makes it possible to roll back bad edits, and gives credit to contributors.

---

## DIFFICULTY SCALE

The five-wrench scale is the universal difficulty indicator across all blueprints.

| Rating | Label | Description | Example |
|--------|-------|-------------|---------|
| 1 wrench | **Beginner** | No special tools. No prior experience. Could be done by a careful 14-year-old. Risk of injury is near zero. | Assembling a gravity water filter from two buckets |
| 2 wrenches | **Comfortable DIYer** | Basic hand tools (wrenches, screwdrivers, drill). You've assembled furniture or done a minor home repair. Low risk. | Installing a rain barrel and gutter diverter |
| 3 wrenches | **Intermediate** | Power tools required. You should read the entire blueprint before starting. Mistakes cost money (ruined parts) but not safety. | Building a solar battery bank with charge controller |
| 4 wrenches | **Advanced** | Trade-level skill in at least one relevant area (electrical, plumbing, mechanical, welding). Mistakes can be dangerous or expensive. Consider having an experienced person present. | Propane conversion on a gasoline engine |
| 5 wrenches | **Expert / Supervised** | Professional-grade work. Requires certification, licensing, or direct supervision by someone qualified. Errors can cause injury, death, or legal liability. | Residential electrical panel work, structural modification, medical procedures |

---

## NAMING CONVENTION

Blueprint files live inside their pillar directory and follow this naming pattern:

```
pillars/[NN]-[pillar-name]/blueprints/[short-name].md
```

Examples:
```
pillars/01-water/blueprints/gravity-filter-build.md
pillars/01-water/blueprints/rain-barrel-install.md
pillars/04-energy/blueprints/solar-battery-bank.md
pillars/09-transportation/blueprints/propane-conversion.md
pillars/06-communication/blueprints/meshtastic-two-node.md
```

Each pillar's `README.md` remains the audit/overview document. Blueprints are linked from the README but live in the `blueprints/` subdirectory.

---

## THREE EXAMPLE HEADERS

These show how the header block scales across difficulty levels.

### Example 1: Simple (1 wrench)

```markdown
# Gravity Water Filter: Two-Bucket Build
## Turn creek water into drinking water for $30 in hardware store parts

| Field | Value |
|-------|-------|
| **Pillar** | 01 - Water |
| **Layer** | 2 (Production) |
| **Difficulty** | 1 wrench (Beginner) |
| **Total Cost** | $28 - $35 |
| **Time to Complete** | 1 hour |
| **People Required** | 1 |
| **Permits/Legal** | None |
| **Last Verified** | 2026-04-15 |
| **Version** | 1.0.0 |
| **Contributors** | @overkillkulture |
```

### Example 2: Medium (3 wrenches)

```markdown
# Meshtastic Two-Node Mesh Network
## Get two LoRa radios talking to each other with zero internet dependency

| Field | Value |
|-------|-------|
| **Pillar** | 06 - Communication |
| **Layer** | 1 (Preparedness) |
| **Difficulty** | 3 wrenches (Intermediate) |
| **Total Cost** | $60 - $120 (two nodes) |
| **Time to Complete** | 2 - 4 hours (including firmware flash) |
| **People Required** | 1 (but you need someone at the other end to test range) |
| **Permits/Legal** | None for sub-1W LoRa on 915MHz ISM band in the US. No ham license required. |
| **Last Verified** | 2026-04-20 |
| **Version** | 1.0.0 |
| **Contributors** | @overkillkulture |
```

### Example 3: Complex (4 wrenches)

```markdown
# Propane Conversion: Gasoline to Dual-Fuel
## Convert a gasoline engine to run on propane OR gasoline with a manual selector

| Field | Value |
|-------|-------|
| **Pillar** | 09 - Transportation |
| **Layer** | 3 (Production) |
| **Difficulty** | 4 wrenches (Advanced) |
| **Total Cost** | $890 - $2,400 (depends on kit vs. component sourcing) |
| **Time to Complete** | 8 - 16 hours (first-timer with no fuel system experience) |
| **People Required** | 1 (2 recommended for tank mounting in step 22) |
| **Permits/Legal** | No emissions testing in Idaho. Check your state: some require CARB-certified kits. EPA Clean Alternative Fuel Vehicle (CAFV) conversion rules apply to vehicles under 8,500 GVWR. |
| **Last Verified** | 2026-04-25 |
| **Version** | 1.0.0 |
| **Contributors** | @overkillkulture, @c1-mechanic |
```

---

## HOW TO CREATE A NEW BLUEPRINT

1. Copy everything between `---START TEMPLATE---` and `---END TEMPLATE---` into a new file.
2. Place the file at `pillars/[NN]-[pillar]/blueprints/[short-name].md`.
3. Fill in every section. Do not delete sections that seem unnecessary -- mark them "N/A" with a reason if they truly don't apply.
4. Have someone who has NOT done this build attempt to follow your blueprint. Their confusion is your missing steps.
5. Submit a PR with the tag `blueprint` and the relevant pillar tag (e.g., `pillar-09-transportation`).

---

## HOW TO REVIEW A BLUEPRINT

When reviewing a blueprint PR, check:

- [ ] **Header complete?** All fields filled, difficulty rating justified.
- [ ] **Safety section present?** At least one risk identified. PPE listed. Stop-work conditions defined.
- [ ] **Every BOM item has a source?** No "available at most stores" without a specific product name.
- [ ] **Every BOM item has a substitute?** Or an explicit "None" with explanation.
- [ ] **One action per step?** No compound instructions.
- [ ] **CHECK gates at critical points?** At minimum: before applying power, before pressurizing, before first use.
- [ ] **Measurements are specific?** No "tighten firmly." Torque specs, distances, or "snug plus X turns."
- [ ] **Troubleshooting has at least 5 entries?** If fewer, the author hasn't built it enough times.
- [ ] **Maintenance schedule present?** Something wears out. What is it?
- [ ] **Revenue section filled?** Even if the service price is "TBD pending market research."
- [ ] **Regional notes started?** At least the author's region documented.
- [ ] **Version history has initial entry?**
- [ ] **The blind-build test:** Could someone with no context follow this and succeed?

---

## RELATIONSHIP TO EXISTING PILLAR READMES

The pillar README files (e.g., `pillars/01-water/README.md`) are **audits** -- they survey everything possible within a domain. They are the "what exists and what matters" documents.

Blueprints are the "how to do one specific thing" documents.

The README links to blueprints. Blueprints link back to the README for context. They are complementary, not competing.

```
pillars/01-water/
  README.md                              <-- Audit: the full landscape
  blueprints/
    gravity-filter-build.md              <-- Blueprint: one executable project
    rain-barrel-install.md               <-- Blueprint: one executable project
    pvc-hand-pump.md                     <-- Blueprint: one executable project
```

Over time, every actionable item in a README should have a corresponding blueprint. The README becomes the table of contents. The blueprints become the chapters.

---

*This standard is itself versioned and open to contribution. If you find a section that doesn't work in practice, open an issue or PR against this file.*

**Version:** 1.0.0
**Created:** 2026-04-27
**Author:** C2 (The Architect)
**License:** CC BY-SA 4.0 (same as the rest of the repository)
