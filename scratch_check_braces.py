import sys

path = 'c:/Fioner crm/CarQConnect/app/lib/screens/profile/my_vehicles_screen.dart'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

stack = []
pairs = {')': '(', '}': '{', ']': '['}
line_num = 1
col_num = 1
errors = []

in_string = None
in_comment = False
prev_ch = ''

for idx, ch in enumerate(code):
    if ch == '\n':
        line_num += 1
        col_num = 1
        in_comment = False
        prev_ch = ch
        continue
    
    if in_comment:
        prev_ch = ch
        col_num += 1
        continue
        
    if prev_ch == '/' and ch == '/':
        in_comment = True
        prev_ch = ch
        col_num += 1
        continue
        
    if ch in ('"', "'"):
        if in_string == ch and prev_ch != '\\':
            in_string = None
        elif in_string is None:
            in_string = ch
            
    if not in_string:
        if ch in '({[':
            stack.append((ch, line_num, col_num))
        elif ch in ')}]':
            if not stack:
                errors.append(f'Unmatched closing {ch} at line {line_num}:{col_num}')
            else:
                top, l, c = stack.pop()
                if pairs[ch] != top:
                    errors.append(f'Mismatched {ch} at line {line_num}:{col_num}, expected match for {top} at line {l}:{c}')
    
    prev_ch = ch
    col_num += 1

if stack:
    for top, l, c in stack:
        errors.append(f'Unclosed {top} at line {l}:{c}')

print(f'Total errors: {len(errors)}')
for err in errors[:10]:
    print(err)

