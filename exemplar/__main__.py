import argparse
import sys
from pathlib import Path

from exemplar.shell import *
from exemplar.common import files


# "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Tools\MSVC\14.29.30133\bin\Hostx64\x64\cl.exe"


def start(options: dict):
    """Start a curriculum."""

    curriculum_path = Path(options["curriculum"])
    work_path = Path(options["work"])

    if not curriculum_path.is_dir():
        print("invalid curriculum directory!", file=sys.stderr)
        return

    if work_path.exists():
        if input(f"replace work directory {work_path.absolute()}? ").strip().lower().startswith("y"):
            files.delete(work_path)
        else:
            print("cancelling!")
            return

    setup_work_directory(curriculum_path, work_path)


parser = argparse.ArgumentParser()
command_parser = parser.add_subparsers(title="command", required=True, dest="command")

start_parser = command_parser.add_parser("start", help="start a curriculum")
start_parser.add_argument("curriculum", help="a path to a curriculum directory")
start_parser.add_argument("--work", default="work", help="a path to set up in, defaults to ./work")

args = vars(parser.parse_args())
dict(
    start=start,
)[args.pop("command")](args)
