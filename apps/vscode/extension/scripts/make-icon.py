#!/usr/bin/env python3
"""Draws media/icon.png, the Marketplace tile.

Not part of any build — the PNG is committed. Re-run it only to change the artwork:

    python3 scripts/make-icon.py

Colors come from packages/shared/visualizer/src/theme.ts, so the tile matches what the
visualizer actually renders: a small graph mid-traversal, with the frontier node lit.
Everything is drawn at 4x and downsampled, which is the cheapest antialiasing available.
"""

from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 128
SCALE = 4
S = SIZE * SCALE

BG = "#121212"
NODE_IDLE = "#2a2a2a"
NODE_STROKE = "#4a4a4a"
NODE_EXPLORED = "#2E7D32"
NODE_ACTIVE = "#4CAF50"
EDGE_IDLE = "#4a4a4a"
EDGE_VISITED = "#4CAF50"

# (x, y) in 128-space, chosen so the graph's bounding box is centered in the tile.
NODES = {
    "a": (48, 33),
    "b": (97, 28),
    "c": (31, 73),
    "d": (75, 64),
    "e": (52, 100),
}
VISITED_EDGES = [("a", "b"), ("d", "b")]
IDLE_EDGES = [("a", "c"), ("a", "d"), ("c", "e"), ("d", "e")]

RADIUS = 11
CORNER = 26


def at(name):
    x, y = NODES[name]
    return x * SCALE, y * SCALE


def line(draw, edge, color, width):
    draw.line([at(edge[0]), at(edge[1])], fill=color, width=width * SCALE, joint="curve")


def circle(draw, name, fill, stroke=None, radius=RADIUS, width=2):
    x, y = at(name)
    r = radius * SCALE
    draw.ellipse(
        [x - r, y - r, x + r, y + r],
        fill=fill,
        outline=stroke,
        width=width * SCALE if stroke else 0,
    )


def main():
    image = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Rounded background, so the tile reads as a tile on any Marketplace surface.
    draw.rounded_rectangle([0, 0, S - 1, S - 1], radius=CORNER * SCALE, fill=BG)

    # Edges first: nodes sit on top of the joins.
    for edge in IDLE_EDGES:
        line(draw, edge, EDGE_IDLE, 3)
    for edge in VISITED_EDGES:
        line(draw, edge, EDGE_VISITED, 4)

    # A halo marks the frontier node without needing a second color.
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [
            at("b")[0] - 17 * SCALE,
            at("b")[1] - 17 * SCALE,
            at("b")[0] + 17 * SCALE,
            at("b")[1] + 17 * SCALE,
        ],
        fill=(76, 175, 80, 60),
    )
    image = Image.alpha_composite(image, glow)
    draw = ImageDraw.Draw(image)

    for name in ("c", "e", "d"):
        circle(draw, name, NODE_IDLE, NODE_STROKE)
    circle(draw, "a", NODE_EXPLORED, NODE_ACTIVE, width=2)
    circle(draw, "b", NODE_ACTIVE)

    out = Path(__file__).resolve().parent.parent / "media" / "icon.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.resize((SIZE, SIZE), Image.LANCZOS).save(out)
    print(f"wrote {out} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
