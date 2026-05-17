DEFAULT_PROTOCOL = """# Tokis assistant protocol

When proposing file changes, use EXACTLY this format (one block per file):

```tokis-edit:src/Calculator.java
<full file content here>
```

WRONG (Tokis cannot parse): a plain heading "tokis-edit:path" with a separate ```java block.

Rules:
- Opening fence must be ```tokis-edit:relative/path/from/repo/root/File.ext
- Put the complete new file content inside the fence.
- Do not claim files were written or commands were run until the user approves in Tokis.
- Keep explanation outside the fences.

Mask placeholders (when the user masked paths before inject):
- MASK1, MASK2, … may appear in the task or file *content* only.
- In ```tokis-edit:...``` always use the real repo path (e.g. src/Calculator.java). NEVER put MASK1 in the path line.
- You may use MASK1 inside file content strings if needed; Tokis restores values on approve.

Optional shell command (user approves separately):

```tokis-run
npm test
```
"""
