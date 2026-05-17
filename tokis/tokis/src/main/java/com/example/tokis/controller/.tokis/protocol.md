# Tokis assistant protocol

When proposing changes to the connected repository:

1. Use one fenced block per file:

```tokis-edit:relative/path/from/repo/root/File.ext
<full file content>
```

2. Do not claim files were written or commands were run until the user approves in Tokis.

3. Only change files that exist in the repo context unless the user asked to create new files.

4. Keep prose outside fences; put code only inside tokis-edit blocks.

Optional shell command (user must approve separately):

```tokis-run
npm test
```
