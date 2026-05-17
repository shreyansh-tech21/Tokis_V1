import os
import re
from pathlib import Path

from fastapi import APIRouter

from core.path_guard import PROTOCOL_REL, resolve_under_root

MASK_IN_PATH = re.compile(r"MASK\d+", re.IGNORECASE)
from core.protocol_template import DEFAULT_PROTOCOL

router = APIRouter()

MAX_READ_BYTES = 512_000


@router.post("/files/ensure-protocol")
def ensure_protocol(data: dict):
    repo_root = data.get("repoRoot")
    if not repo_root:
        return {"error": "repoRoot required"}

    root = Path(repo_root).resolve()
    protocol_dir = root / ".tokis"
    protocol_path = root / PROTOCOL_REL

    protocol_dir.mkdir(parents=True, exist_ok=True)
    if not protocol_path.is_file():
        protocol_path.write_text(DEFAULT_PROTOCOL, encoding="utf-8")

    return {"path": str(protocol_path), "relativePath": str(PROTOCOL_REL).replace("\\", "/")}


@router.post("/files/read")
def read_file(data: dict):
    repo_root = data.get("repoRoot")
    file_path = data.get("path") or data.get("relativePath")
    if not repo_root or not file_path:
        return {"error": "repoRoot and path required"}

    try:
        target = resolve_under_root(repo_root, file_path)
    except ValueError:
        return {"error": "Invalid path"}

    if not target.is_file():
        return {"error": "File not found"}

    size = target.stat().st_size
    truncated = size > MAX_READ_BYTES
    if truncated:
        content = target.read_bytes()[:MAX_READ_BYTES].decode("utf-8", errors="replace")
        content += f"\n\n... (truncated, {size} bytes total)"
    else:
        content = target.read_text(encoding="utf-8", errors="replace")

    return {
        "path": str(target),
        "content": content,
        "size": size,
        "truncated": truncated,
    }


@router.post("/files/write")
def write_file(data: dict):
    repo_root = data.get("repoRoot")
    file_path = data.get("path") or data.get("relativePath")
    content = data.get("content", "")
    if not repo_root or not file_path:
        return {"error": "repoRoot and path required"}

    try:
        target = resolve_under_root(repo_root, file_path)
    except ValueError:
        return {"error": "Invalid path"}

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return {"path": str(target)}


@router.post("/files/apply")
def apply_files(data: dict):
    repo_root = data.get("repoRoot")
    edits = data.get("edits") or []
    if not repo_root:
        return {"error": "repoRoot required"}

    applied = []
    failed = []

    for edit in edits:
        rel = edit.get("relativePath") or edit.get("path")
        content = edit.get("content", "")
        if not rel:
            failed.append({"path": "", "error": "missing path"})
            continue
        if MASK_IN_PATH.search(str(rel)):
            failed.append({
                "path": rel,
                "error": "path still contains MASK placeholder; Tokis could not resolve the real file path",
            })
            continue
        try:
            target = resolve_under_root(repo_root, rel)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            applied.append(str(target))
        except Exception as exc:
            failed.append({"path": rel, "error": str(exc)})

    return {"applied": applied, "failed": failed}
