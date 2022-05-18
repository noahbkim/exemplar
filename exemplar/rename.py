from exemplar.topic import Topic, TopicError

import sys
import shutil
import re
from pathlib import Path


def handler(options: dict):
    """Start a curriculum."""

    curriculum_path = Path(options["curriculum"])

    try:
        topics = Topic.load(curriculum_path)
    except TopicError as error:
        print(f"error: {error}", file=sys.stderr)
        return -1

    source_name = options["source"]
    destination_name = options["destination"]

    if source_name in topics:
        source = topics[source_name]
        new_path = source.path.parent.joinpath(f"{destination_name}.md")
        shutil.move(str(source.path), str(new_path))
        source.path = new_path
        print(f"info: moved {source.path} to {new_path}")

    for topic in topics.values():
        text = topic.path.read_text()

        try:
            frontmatter_start, frontmatter_end, _ = Topic.index(text)
        except TopicError as error:
            raise TopicError(f"{topic.path} {error}")

        frontmatter = text[frontmatter_start:frontmatter_end]
        replaced_frontmatter = re.sub(rf"(?<=[^\w-]){source_name}(?=[^\w-])", destination_name, frontmatter)
        if frontmatter != replaced_frontmatter:
            replaced_text = text[:frontmatter_start] + replaced_frontmatter + text[frontmatter_end:]
            topic.path.write_text(replaced_text)
            print(f"info: rewrote {topic.path}")


def parser(subparsers):
    """Create a corresponding argument parser configuration."""

    subparser = subparsers.add_parser("rename", help="rename a topic in a curriculum")
    subparser.add_argument("curriculum", help="a path to a curriculum directory")
    subparser.add_argument("source", help="the topic to rename")
    subparser.add_argument("destination", help="the new name of the target")
