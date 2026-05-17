from pathlib import Path

PROTOCOL_REL = Path(".tokis") / "protocol.md"


def resolve_under_root(repo_root: str, file_path: str) -> Path:
    root = Path(repo_root).resolve()
    candidate = Path(file_path)
    target = candidate.resolve() if candidate.is_absolute() else (root / file_path).resolve()
    root_s = str(root)
    target_s = str(target)
    if not target_s.startswith(root_s):
        raise ValueError("Path escapes repository root")
    return target
