def search_files(query, files):
    results = []
    keywords = query.lower().split()

    for file_path in files:
        try:
            if not file_path.endswith(('.py', '.java')):
                continue

            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            for i, line in enumerate(lines):
                line_lower = line.lower()

                if any(keyword in line_lower for keyword in keywords):
                    snippet = ''.join(
                        lines[max(0, i-2):min(len(lines), i+3)]
                    )

                    results.append({
                        "file": file_path,
                        "line": i + 1,
                        "snippet": snippet
                    })

                    break

        except Exception:
            continue

    return results