import os
def search_files(query,files):
    results=[]

    keywords=query.lower().split()

    file_paths=[]
    for file_path in files:
        if os.path.isdir(file_path):
            for root, dirs, files_in_dir in os.walk(file_path):
                for file in files_in_dir:
                    if file.endswith(('.py', '.java')):
                        file_paths.append(os.path.join(root, file))
        elif file_path.endswith(('.py', '.java')):
            file_paths.append(file_path)
    
    for file_path in file_paths:
        with open(file_path,'r',encoding='utf-8') as f:
            lines=f.readlines()
            for i,line in enumerate(lines):
                line_lower=line.lower()
                if any(keyword in line_lower for keyword in keywords):
                    snippet=''.join(lines[max(0,i-2):min(len(lines),i+3)])
                    results.append({"file":file_path,"line":i+1,"snippet":snippet})

    return results;
