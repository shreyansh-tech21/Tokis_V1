def build_prompt(query,snippets):
    prompt=f"Task :{query}\n Relevant Code: \n\n "
    for s in snippets:
        prompt+=f"---{s['file']} (line {s['line']}) ---\n"
        prompt+=s["snippet"]+'\n\n'

    print("the prompt is ",prompt)
    return prompt