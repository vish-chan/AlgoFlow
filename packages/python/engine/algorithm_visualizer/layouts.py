from typing import Iterable

from algorithm_visualizer import Commander
from .types import UNDEFINED


class Layout(Commander):
    def __init__(self, children: Iterable[Commander]):
        super().__init__(tuple(c.key for c in children))

    @classmethod
    def setRoot(cls, child: Commander):
        cls._command(None, "setRoot", child.key)

    def add(self, child: Commander, index: int = UNDEFINED):
        self.command("add", child.key, index)

    def remove(self, child: Commander):
        self.command("remove", child.key)

    def removeAll(self):
        self.command("removeAll")


class HorizontalLayout(Layout):
    pass


class VerticalLayout(Layout):
    pass
