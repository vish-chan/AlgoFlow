from __future__ import annotations

from .tracer import Tracer
from algorithm_visualizer.types import Serializable, SerializableSequence, UNDEFINED


class Array2DTracer(Tracer):
    def set(self, array2d: SerializableSequence[SerializableSequence[Serializable]] = UNDEFINED):
        self.command("set", array2d)

    def patch(self, x: int, y: int, v: Serializable = UNDEFINED):
        self.command("patch", x, y, v)

    def depatch(self, x: int, y: int):
        self.command("depatch", x, y)

    def select(self, sx: int, sy: int, ex: int = UNDEFINED, ey: int = UNDEFINED):
        self.command("select", sx, sy, ex, ey)

    def selectRow(self, x: int, sy: int, ey: int):
        self.command("selectRow", x, sy, ey)

    def selectCol(self, y: int, sx: int, ex: int):
        self.command("selectCol", y, sx, ex)

    def deselect(self, sx: int, sy: int, ex: int = UNDEFINED, ey: int = UNDEFINED):
        self.command("deselect", sx, sy, ex, ey)

    def deselectRow(self, x: int, sy: int, ey: int):
        self.command("deselectRow", x, sy, ey)

    def deselectCol(self, y: int, sx: int, ex: int):
        self.command("deselectCol", y, sx, ex)
