import argparse

from . import build
from . import rename


parser = argparse.ArgumentParser()
command_parser = parser.add_subparsers(title="command", required=True, dest="command")
build.parser(command_parser)
rename.parser(command_parser)

args = vars(parser.parse_args())
status = {
    "build": build.handler,
    "rename": rename.handler,
}[args.pop("command")](args)

exit(status)
