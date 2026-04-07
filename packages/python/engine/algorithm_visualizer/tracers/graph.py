from __future__ import annotations

from .log import LogTracer, Tracer
from algorithm_visualizer.types import Number, Serializable, SerializableSequence, UNDEFINED


class GraphTracer(Tracer):
    def set(self, array2d: SerializableSequence[SerializableSequence[Serializable]] = UNDEFINED):
        self.command("set", array2d)

    def directed(self, isDirected: bool = UNDEFINED):
        self.command("directed", isDirected)

    def weighted(self, isWeighted: bool = UNDEFINED) -> "GraphTracer":
        self.command("weighted", isWeighted)
        return self

    def layoutCircle(self) -> "GraphTracer":
        self.command("layoutCircle")
        return self

    def layoutTree(self, root: Serializable = UNDEFINED, sorted: bool = UNDEFINED) -> "GraphTracer":
        self.command("layoutTree", root, sorted)
        return self

    def layoutRandom(self) -> "GraphTracer":
        self.command("layoutRandom")
        return self

    def addNode(
        self,
        id: Serializable,
        weight: Number = UNDEFINED,
        x: int = UNDEFINED,
        y: int = UNDEFINED,
        visitedCount: int = UNDEFINED,
        selectedCount: int = UNDEFINED
    ):
        self.command("addNode", id, weight, x, y, visitedCount, selectedCount)

    def updateNode(
        self,
        id: Serializable,
        weight: Number = UNDEFINED,
        x: int = UNDEFINED,
        y: int = UNDEFINED,
        visitedCount: int = UNDEFINED,
        selectedCount: int = UNDEFINED
    ):
        self.command("updateNode", id, weight, x, y, visitedCount, selectedCount)

    def removeNode(self, id: Serializable):
        self.command("removeNode", id)

    def addEdge(
        self,
        source: Serializable,
        target: Serializable,
        weight: Number = UNDEFINED,
        visitedCount: int = UNDEFINED,
        selectedCount: int = UNDEFINED
    ):
        self.command("addEdge", source, target, weight, visitedCount, selectedCount)

    def updateEdge(
        self,
        source: Serializable,
        target: Serializable,
        weight: Number = UNDEFINED,
        visitedCount: int = UNDEFINED,
        selectedCount: int = UNDEFINED
    ):
        self.command("updateEdge", source, target, weight, visitedCount, selectedCount)

    def removeEdge(self, source: Serializable, target: Serializable):
        self.command("removeEdge", source, target)

    def visit(
        self,
        target: Serializable,
        source: Serializable = UNDEFINED,
        weight: Number = UNDEFINED
    ):
        self.command("visit", target, source, weight)

    def leave(
        self,
        target: Serializable,
        source: Serializable = UNDEFINED,
        weight: Number = UNDEFINED
    ):
        self.command("leave", target, source, weight)

    def select(self, target: Serializable, source: Serializable = UNDEFINED):
        self.command("select", target, source)

    def deselect(self, target: Serializable, source: Serializable = UNDEFINED):
        self.command("deselect", target, source)

    def log(self, log: LogTracer):
        self.command("log", log.key)
