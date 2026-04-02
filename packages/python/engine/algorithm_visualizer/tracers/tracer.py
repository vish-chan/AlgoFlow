from __future__ import annotations

from algorithm_visualizer import Commander
from algorithm_visualizer.types import UNDEFINED


class Tracer(Commander):
    def __init__(self, title: str = UNDEFINED):
        super().__init__(title)

    @classmethod
    def delay(cls, lineNumber: int = UNDEFINED):
        cls._command(None, "delay", lineNumber)

    def set(self):
        self.command("set")

    def reset(self):
        self.command("reset")
