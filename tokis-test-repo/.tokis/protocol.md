# Tokis assistant protocol

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

Mask placeholders (when the user masked secrets before inject):
- The prompt may contain MASK1, MASK2, … tokens. Use them verbatim in paths and strings in your edits.
- Do not rename MASK1 to other names, and do not invent literal values for them.

Optional shell command (user approves separately):

```tokis-run
npm test
```
