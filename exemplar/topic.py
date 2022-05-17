import markdown2
import yaml

from dataclasses import dataclass
from typing import List, Any
from pathlib import Path

__all__ = (
    "Topic",)


FRONTMATTER_SEPARATOR = "---\n"
MARKDOWN_EXTRAS = (
    "fenced-code-blocks",
    "numbering",
    "spoiler",
    "strike",
    "tables",)


class InvalidFormat(Exception):
    """Thrown when unable to parse a topic file."""


def validate_list_of_strings(data: Any, name: str, path: Path) -> List[str]:
    """List of strings."""

    if not isinstance(data, list):
        raise InvalidFormat(f"{name} must be a list in {path}")
    for item in data:
        if not isinstance(item, str):
            raise InvalidFormat(f"{name} items must be strings in {path}")
    return data


def validate_string(data: Any, name: str, path: Path) -> str:
    """Single string."""

    if not isinstance(data, str):
        raise InvalidFormat(f"{name} must be a string in {path}")
    return data


@dataclass
class Topic:
    """A topic encapsulated by a markdown file."""

    id: str
    path: Path
    title: str
    requires: List[str]
    tags: List[str]
    content: str

    def serialize(self):
        """Serialize to data for d3."""

        return {
            "id": self.id,
            "parentIds": self.requires,
            "title": self.title,
            "tags": self.tags,
            "content": self.content}

    @classmethod
    def parse(cls, path: Path):
        """Parse a markdown file with YAML frontmatter."""

        with path.open() as file:
            text = file.read()
            if not text.startswith(FRONTMATTER_SEPARATOR):
                raise InvalidFormat(f"couldn't find frontmatter in {path}")

            try:
                frontmatter_end_index = text.index(FRONTMATTER_SEPARATOR, len(FRONTMATTER_SEPARATOR))
            except ValueError:
                raise InvalidFormat(f"frontmatter missing terminator in {path}")

            frontmatter_slice = text[len(FRONTMATTER_SEPARATOR):frontmatter_end_index]
            content_slice = text[frontmatter_end_index + len(FRONTMATTER_SEPARATOR):]

            try:
                frontmatter = yaml.load(frontmatter_slice, yaml.CLoader)
            except yaml.YAMLError:
                raise InvalidFormat(f"invalid frontmatter YAML in {path}")

            return Topic(
                id=path.parts[-1].rsplit(".", maxsplit=1)[0],
                path=path,
                title=validate_string(frontmatter["title"], "title", path),
                requires=validate_list_of_strings(frontmatter.get("requires", []), "requires", path),
                tags=validate_list_of_strings(frontmatter.get("tags", []), "tags", path),
                content=markdown2.markdown(content_slice, extras=MARKDOWN_EXTRAS))
