---
name: obsidian-canvas-flow
description: Build a hierarchical flow/structure diagram as an Obsidian-compatible JSON Canvas (.canvas) file, using a specific left-to-right tree layout the user has approved (root → components → sub-items → further sub-items), with color-coding by category. Use this whenever the user asks to turn something into a "フロー図"/"構成図"/"構成要素の図"/flow diagram/structure diagram/architecture diagram that they can open in Obsidian, or asks for a visual breakdown of a system, process, or set of components as a file (not just a chat explanation). Also trigger when the user references "いつもの形式" or "この前の形式" for a diagram after this skill has been used once in the conversation.
---

# Building an Obsidian Canvas flow diagram

## What this produces

A `.canvas` file — a plain JSON file in the [JSON Canvas](https://jsoncanvas.org/)
open format that Obsidian's built-in Canvas feature renders natively. The user
opens it by placing the file in their Obsidian vault folder; no plugin is
required. This skill exists because the user tried a few diagram styles and
settled on one specific layout (see below) — use that layout every time this
skill triggers, not a free-form mind map.

## The layout convention

Lay the diagram out as a **left-to-right tree**, not a radial mind map and not
a top-to-bottom flowchart:

```
[Root] --- [Component A] --- [Sub-item A1] --- [Further detail]
        |                 |- [Sub-item A2]
        |- [Component B] --- [Sub-item B1]
        |                 |- [Sub-item B2]
        |- [Component C] ...
```

- **Root** (leftmost column): the single thing being broken down (e.g. an app,
  a process, a system). One node.
- **Components** (next column): the main parts it breaks into. This is the
  level the user thinks of as "構成要素."
- **Sub-items** (next column): each component's own breakdown ("細分化").
- **Further detail** (next column, only where it adds real information):
  go one level deeper only for the parts that actually have more to say.
  Not every branch needs 4 columns — a component with nothing more to add
  can stop at 2 or 3. Forcing uniform depth everywhere makes the diagram
  padded rather than informative.

Why this shape: it reads like an outline turned sideways, so each column has
one consistent meaning (same "kind of thing" at every node in that column),
which is what made the earlier radial/mind-map attempts feel less clear to
this user than the tree.

## Color-coding by category

Give each top-level branch (and everything under it) one `color` value, so
the eye can group related nodes at a glance even before reading them. There's
no fixed universal palette — pick colors that fit the subject — but carry one
color consistently down an entire branch (root stays neutral/uncolored or its
own color). The JSON Canvas `color` field takes a string `"1"`–`"6"` (Obsidian's
six preset colors) or a `"#RRGGBB"` hex string; prefer the preset numbers for
simplicity unless the user asks for exact hex colors.

## File format mechanics

Write a `.canvas` file (JSON) with this top-level shape:

```json
{
  "nodes": [
    { "id": "unique-id", "type": "text", "x": 0, "y": 0, "width": 240, "height": 70, "color": "4", "text": "**Label**\nOptional second line" }
  ],
  "edges": [
    { "id": "edge-id", "fromNode": "root", "fromSide": "right", "toNode": "component-a", "toSide": "left" }
  ]
}
```

Practical rules learned from building these for this user:

- **Columns = x coordinates.** Pick one x per column (e.g. root at `x=-1300`,
  components at `x=-950`, sub-items at `x=-580`, further detail at `x=-200`)
  and reuse the same column x for every node at that depth. Leave at least
  ~300–350px between columns so edges don't overlap node bodies.
- **Rows = y coordinates, spaced to avoid overlap.** Give each leaf-level node
  its own y slot (roughly 120–140px apart for ~70px-tall nodes), then center
  each parent node on the vertical midpoint of its own children so the tree
  doesn't visually drift. Compute this by hand (sum of child block heights +
  gaps) rather than guessing — overlapping nodes is the most common failure
  mode here.
- **All edges run horizontally**, `fromSide: "right"` → `toSide: "left"`,
  parent to child. Don't add edges between siblings or across branches.
- **Keep node text short**: a bold label line, optionally one plain line of
  detail underneath (`\n` inside the `text` string). Long paragraphs belong
  in a deeper column as their own node, not crammed into one box.
- **Validate the JSON** before handing it over (e.g. `python3 -I -c "import json; json.load(open('file.canvas'))"`) —
  a syntax error means the user gets a blank/broken Canvas with no useful
  error message from Obsidian.

## Delivering the file

This runs in a cloud session with no access to the user's actual computer, so:

1. Write the `.canvas` file to the scratchpad directory.
2. Validate it's valid JSON.
3. Send it with `SendUserFile`, and tell the user it goes in their Obsidian
   vault folder (same filename overwrites a previous version if they already
   placed one).

Don't try to place it directly in any vault path — this skill produces the
file; getting it into the live vault is the user's manual step (or a separate
local Claude Code session's job, per the workflow this user has already set
up — see this room's conversation history if it's still in context).

## Quick self-check before sending

Look at the x/y plan once before writing the JSON: does every node in a
column share that column's x? Does every sibling have a distinct y with
enough gap? Does the root's y roughly center the whole tree vertically? This
catches the overlap problem up front instead of after the user opens a messy
file.
