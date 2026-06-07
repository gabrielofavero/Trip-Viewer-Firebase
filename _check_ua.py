import json
issues = json.load(open('tmp_issues.json'))
ua = [i for i in issues if i['type'] == 'undeclared-assignment']
print(len(ua), 'undeclared assignments:')
for i in ua:
    print(f"  {i['file']}:{i['line']} - {i['symbol']}")
