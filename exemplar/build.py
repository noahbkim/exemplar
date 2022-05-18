from exemplar.topic import Topic, TopicError

import sys
import json
import itertools
from pathlib import Path
from typing import Dict, Iterator


def dfs(topics: Dict[str, Topic], start: Topic) -> Iterator[Topic]:
    """Iterate through topics via DFS."""

    stack = [start]
    while stack:
        cursor = stack.pop(-1)
        for requirement in cursor.requires:
            stack.append(topics[requirement])
        yield cursor


def related(topics: Dict[str, Topic], cursor: Topic, test: Topic) -> bool:
    """Check if a node is the cursor's ancestor."""

    for ancestor in dfs(topics, cursor):
        if test == ancestor:
            return True


def handler(options: dict) -> int:
    """Start a curriculum."""

    curriculum_path = Path(options["curriculum"])
    curriculum_name = curriculum_path.parts[-1]
    target_path = Path("site", "curricula", f"{curriculum_name}.js")

    try:
        topics = Topic.load(curriculum_path)
    except TopicError as error:
        print(f"error: {error}", file=sys.stderr)
        return -1

    # Check dependencies and related
    for topic in topics.values():
        for requirement in topic.requires:
            if requirement not in topics:
                print(f"error: {topic.path} requires missing topic {requirement}", file=sys.stderr)
                return -1
        for relative in topic.related:
            if relative not in topics:
                print(f"error: {topic.path} relates to missing topic {relative}", file=sys.stderr)
                return -1

    # Check for redundant dependencies
    for topic in topics.values():
        for short, long in itertools.permutations(topic.requires, 2):
            if related(topics, topics[long], topics[short]):
                print(f"warning: {topic.path} has redundant path {short}", file=sys.stderr)
                break

    serialized = []
    for topic in topics.values():
        serialized.append(topic.serialize())

    target_path.parent.mkdir(parents=True, exist_ok=True)
    with target_path.open("w") as file:
        file.write("if (window.curricula === undefined) window.curricula = {};\nwindow.curricula.cpp = ")
        json.dump(serialized, file, indent=2)
        file.write(";")


def parser(subparsers):
    """Create a corresponding argument parser configuration."""

    subparser = subparsers.add_parser("build", help="build a curriculum")
    subparser.add_argument("curriculum", help="a path to a curriculum directory")
