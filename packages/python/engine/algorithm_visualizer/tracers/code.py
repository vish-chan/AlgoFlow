from .log import LogTracer


class CodeTracer(LogTracer):
    def __init__(self, title="Line Tracker"):
        super().__init__(title)
        self._last_line = -1

    def highlight_line(self, line_number):
        if line_number == self._last_line:
            return
        self._last_line = line_number
        self.println(line_number)

    def set_line(self, line_number):
        if line_number == self._last_line:
            return
        self._last_line = line_number
        self.println(line_number)
