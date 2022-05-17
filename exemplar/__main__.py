import argparse
import json
from pathlib import Path

from exemplar.topic import *
from exemplar.common import files


def build(options: dict):
    """Start a curriculum."""

    curriculum_path = Path(options["curriculum"])
    curriculum_name = curriculum_path.parts[-1]
    target_path = Path("site", "curricula", f"{curriculum_name}.js")

    topics = []
    for path in curriculum_path.rglob("*.md"):
        topics.append(Topic.parse(path))

    topic_ids = {topic.id for topic in topics}
    for topic in topics:
        for requirement in topic.requires:
            if requirement not in topic_ids:
                print(f"{topic.path} requires missing topic {requirement}")
                return

    serialized = []
    for topic in topics:
        serialized.append(topic.serialize())

    target_path.parent.mkdir(parents=True, exist_ok=True)
    with target_path.open("w") as file:
        file.write("if (window.curricula === undefined) window.curricula = {};\nwindow.curricula.cpp = ")
        json.dump(serialized, file, indent=2)
        file.write(";")


parser = argparse.ArgumentParser()
command_parser = parser.add_subparsers(title="command", required=True, dest="command")

build_parser = command_parser.add_parser("build", help="start a curriculum")
build_parser.add_argument("curriculum", help="a path to a curriculum directory")

args = vars(parser.parse_args())
dict(
    build=build,
)[args.pop("command")](args)
