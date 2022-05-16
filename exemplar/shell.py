from pathlib import Path

from .common import files

__all__ = (
    "setup_work_directory",)


def setup_work_directory(curriculum_path: Path, work_path: Path):
    """Mirror the work files from a curriculum path."""

    if work_path.exists():
        raise ValueError("target path for work directory already exists!")
    work_path.mkdir(parents=True)

    for path in curriculum_path.rglob("**/work.cpp"):
        target_path = work_path.joinpath(path.relative_to(curriculum_path)).parent
        target_path = target_path.parent.joinpath(target_path.parts[-1] + ".cpp")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        files.copy_file(path, target_path)

        with target_path.open("a") as file:
            file.write(f"\n// exemplar: {path.parent.absolute()}\n")
