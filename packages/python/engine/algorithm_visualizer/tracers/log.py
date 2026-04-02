from __future__ import annotations

from .tracer import Tracer
from algorithm_visualizer.types import Serializable, UNDEFINED


class LogTracer(Tracer):
    def set(self, log: Serializable = UNDEFINED):
        self.command("set", log)

    def print(self, message: Serializable):
        self.command("print", message)

    def println(self, message: Serializable):
        self.command("println", message)

    def printf(self, format: str, *args: Serializable):
        self.command("printf", format, *args)
