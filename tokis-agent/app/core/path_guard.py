from pathlib import Path

PROTOCOL_REL = Path(".tokis") / "protocol.md"


def normalize_repo_relative(root: Path, file_path: str) -> str:
    """Turn model/agent paths into a path relative to repo root (no duplicate folder names)."""
    raw = str(file_path or "").strip().replace("\\", "/")
    if not raw:
        raise ValueError("empty path")

    root = root.resolve()
    candidate = Path(raw)

    if candidate.is_absolute():
        try:
            rel = candidate.resolve().relative_to(root)
            return str(rel).replace("\\", "/")
        except ValueError as exc:
            raise ValueError("Path escapes repository root") from exc

    rel = raw.lstrip("./").lstrip("/")
    if ".." in Path(rel).parts:
        raise ValueError("Path escapes repository root")

    if (root / rel).is_file():
        return rel

    root_name = root.name
    while root_name and rel.lower().startswith(root_name.lower() + "/"):
        rel = rel[len(root_name) + 1 :]
        if (root / rel).is_file():
            return rel

    parts = rel.split("/")
    while len(parts) > 1:
        shorter = "/".join(parts[1:])
        if (root / shorter).is_file():
            return shorter
        parts = parts[1:]

    return rel


def resolve_under_root(repo_root: str, file_path: str) -> Path:
    root = Path(repo_root).resolve()
    rel = normalize_repo_relative(root, file_path)
    target = (root / rel).resolve()
    root_s = str(root)
    target_s = str(target)
    if not target_s.startswith(root_s):
        raise ValueError("Path escapes repository root")
    return target
