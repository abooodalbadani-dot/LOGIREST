import sys

def check_tags(content):
    stack = []
    i = 0
    while i < len(content):
        if content[i:i+1] == '<' and content[i+1:i+2] != ' ' and content[i+1:i+2] != '!':
            if content[i+1:i+2] == '/':
                end = content.find('>', i)
                tag = content[i+2:end].split()[0]
                if not stack:
                    print(f"Error: Found closing tag </{tag}> but stack is empty at pos {i}")
                    return
                last = stack.pop()
                if last != tag:
                    print(f"Error: Mismatched tag. Found </{tag}> but expected </{last}> at pos {i}")
                    # return
            else:
                end = content.find('>', i)
                if end == -1: break
                if content[end-1:end] == '/': # Self-closing
                    i = end + 1
                    continue
                tag = content[i+1:end].split()[0]
                if tag not in ['input', 'br', 'img', 'hr']: # Common self-closing tags in HTML
                    stack.append(tag)
            i = end + 1
        else:
            i += 1
    if stack:
        print(f"Error: Unclosed tags: {stack}")
    else:
        print("Tags seem balanced (naive check)")

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    check_tags(f.read())
