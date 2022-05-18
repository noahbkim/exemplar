import markdown2
import yaml

from dataclasses import dataclass
from typing import List, Any, Dict, Tuple
from pathlib import Path

__all__ = (
    "Topic",
    "TopicError")


FRONTMATTER_HEADER = "---\n"
FRONTMATTER_FOOTER = "\n---"
MARKDOWN_EXTRAS = (
    "fenced-code-blocks",
    "numbering",
    "spoiler",
    "strike",
    "tables",)


class TopicError(Exception):
    """Thrown when unable to parse a topic file."""


def validate_list_of_strings(data: Any, name: str, path: Path) -> List[str]:
    """List of strings."""

    if not isinstance(data, list):
        raise TopicError(f"{name} must be a list in {path}")
    for item in data:
        if not isinstance(item, str):
            raise TopicError(f"{name} items must be strings in {path}")
    return data


def validate_string(data: Any, name: str, path: Path) -> str:
    """Single string."""

    if not isinstance(data, str):
        raise TopicError(f"{name} must be a string in {path}")
    return data


@dataclass
class Topic:
    """A topic encapsulated by a markdown file."""

    id: str
    path: Path
    title: str
    requires: List[str]
    related: List[str]
    tags: List[str]
    content: str

    def serialize(self):
        """Serialize to data for d3."""

        return {
            "id": self.id,
            "parentIds": self.requires,
            "title": self.title,
            "related": self.related,
            "tags": self.tags,
            "content": self.content}

    @classmethod
    def index(cls, text: str) -> Tuple[int, int, int]:
        """Locate frontmatter."""

        if not text.startswith(FRONTMATTER_HEADER):
            raise TopicError(f"missing frontmatter")

        try:
            frontmatter_end = text.index(FRONTMATTER_FOOTER, len(FRONTMATTER_HEADER))
        except ValueError:
            raise TopicError(f"missing frontmatter terminator")

        return len(FRONTMATTER_HEADER), frontmatter_end, frontmatter_end + len(FRONTMATTER_FOOTER)

    @classmethod
    def split(cls, path: Path) -> Tuple[str, str]:
        """Find slices for frontmatter."""

        with path.open() as file:
            text = file.read()

        try:
            frontmatter_start, frontmatter_end, content_start = cls.index(text)
        except TopicError as error:
            raise TopicError(f"{path} {error}")

        frontmatter = text[frontmatter_start:frontmatter_end]
        content = text[content_start:]
        return frontmatter, content

    @classmethod
    def parse(cls, path: Path):
        """Parse a markdown file with YAML frontmatter."""

        frontmatter, content = cls.split(path)

        try:
            metadata = yaml.load(frontmatter, yaml.CLoader)
        except yaml.YAMLError:
            raise TopicError(f"invalid frontmatter YAML in {path}")

        return Topic(
            id=path.parts[-1].rsplit(".", maxsplit=1)[0],
            path=path,
            title=validate_string(metadata["title"], "title", path),
            requires=validate_list_of_strings(metadata.get("requires", []), "requires", path),
            related=validate_list_of_strings(metadata.get("related", []), "related", path),
            tags=validate_list_of_strings(metadata.get("tags", []), "tags", path),
            content=markdown2.markdown(content, extras=MARKDOWN_EXTRAS))

    @classmethod
    def load(cls, directory: Path) -> Dict[str, "Topic"]:
        """Load all topics from a path."""

        topics = {}
        for path in directory.rglob("*.md"):
            topic = Topic.parse(path)
            if topic.id in topics:
                raise TopicError(f"{topic.path} collides with {topics[topic.id].path}")
            topics[topic.id] = topic
        return topics
