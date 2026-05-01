import os
VALID_EXTENSIONS=[".py", ".js", ".ts", ".cpp", ".java"]

def read_repo(path):
    file_list=[]
    for root,dirs,files in os.walk(path):
        for file in files:
            if any(file.endswith(ext) for ext in VALID_EXTENSIONS):
                full_path=os.path.join(root,file)
                file_list.append(full_path)

    return file_list
