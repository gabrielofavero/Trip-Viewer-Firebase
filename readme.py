#!/usr/bin/env python3
"""
README.md Maintenance Script
Updates task counts, checks for inconsistencies, and calculates version
"""

import re
from pathlib import Path
from collections import defaultdict


# ANSI color codes
class Colors:
    BOLD = '\033[1m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RED = '\033[91m'
    RESET = '\033[0m'


def parse_readme(content):
    """Parse README.md and extract all tasks."""
    tasks = {
        'backlog': [],
        'done': [],
        'discarded': []
    }
    
    current_section = None
    
    for line in content.split('\n'):
        if '## Backlog' in line:
            current_section = 'backlog'
        elif '## Done' in line:
            current_section = 'done'
        elif '### Discarded' in line:
            current_section = 'discarded'
        
        if current_section:
            match = re.match(r'- [🐞🏆📈⚔️❗️]+\s*\*\*([A-Z]\d+):\*\*', line)
            if match:
                task_id = match.group(1)
                task_type = task_id[0]
                task_number = int(task_id[1:])
                tasks[current_section].append({
                    'id': task_id,
                    'type': task_type,
                    'number': task_number,
                    'line': line
                })
    
    return tasks


def count_tasks(tasks):
    """Count tasks by type."""
    counts = {
        'B': {'total': 0, 'done': 0, 'cancelled': 0, 'pending': 0},
        'F': {'total': 0, 'done': 0, 'cancelled': 0, 'pending': 0},
        'M': {'total': 0, 'done': 0, 'cancelled': 0, 'pending': 0},
        'E': {'total': 0, 'done': 0, 'cancelled': 0, 'pending': 0}
    }
    
    for task in tasks['backlog']:
        t = task['type']
        counts[t]['total'] += 1
        counts[t]['pending'] += 1
    
    for task in tasks['done']:
        t = task['type']
        counts[t]['total'] += 1
        counts[t]['done'] += 1
    
    for task in tasks['discarded']:
        t = task['type']
        counts[t]['total'] += 1
        counts[t]['cancelled'] += 1
    
    return counts


def check_inconsistencies(tasks):
    """Check for missing IDs and other inconsistencies."""
    issues = []
    
    all_tasks = tasks['backlog'] + tasks['done'] + tasks['discarded']
    
    by_type = defaultdict(list)
    for task in all_tasks:
        by_type[task['type']].append(task['number'])
    
    type_names = {
        'B': ('🐞 ', 'Bugs'),
        'F': ('🏆 ', 'Features'),
        'M': ('📈 ', 'Improvements'),
        'E': ('⚔️ ', 'Epics')
    }
    
    for task_type, numbers in by_type.items():
        numbers.sort()
        
        if not numbers:
            continue
        
        emoji, name = type_names.get(task_type, ('', task_type))
        
        max_num = max(numbers)
        expected = set(range(1, max_num + 1))
        actual = set(numbers)
        missing = expected - actual
        
        if missing:
            missing_list = sorted(missing)
            issues.append(f"{emoji}{Colors.BOLD}Missing {name}:{Colors.RESET} {', '.join(f'{task_type}{n:03d}' for n in missing_list)}")
        
        duplicates = [n for n in numbers if numbers.count(n) > 1]
        if duplicates:
            unique_dups = sorted(set(duplicates))
            issues.append(f"{emoji}{Colors.BOLD}Duplicate {name}:{Colors.RESET} {', '.join(f'{task_type}{n:03d}' for n in unique_dups)}")
    
    return issues


def calculate_version(tasks):
    """Calculate semantic version based on completed tasks (chronological order)."""
    done_tasks = tasks['done']
    
    done_tasks_reversed = list(reversed(done_tasks))
    
    major = 2
    minor = 0
    
    for task in done_tasks_reversed:
        if task['type'] == 'E':
            major += 1
            minor = 0
        else:
            minor += 1
    
    return f"{major}.{minor}.0"


def update_table(content, counts):
    """Update the task count table in README."""
    type_map = {
        'B': ('🐞', 'Bug', 'B000'),
        'F': ('🏆', 'Feature', 'F000'),
        'M': ('📈', 'Improvement', 'M000'),
        'E': ('⚔️', 'Epic', 'E000')
    }
    
    table_start = content.find('| Icon | Title')
    if table_start == -1:
        return content
    
    table_end = content.find('\n\n', table_start)
    
    new_table_lines = [
        '| Icon | Title       | Code | Total | Done | Cancelled | Pending |',
        '| ---- | ----------- | ---- | ----- | ---- | --------- | ------- |'
    ]
    
    for task_type in ['B', 'F', 'M', 'E']:
        icon, title, code = type_map[task_type]
        c = counts[task_type]
        new_table_lines.append(
            f"| {icon}   | {title:<11} | {code} | {c['total']:<5} | {c['done']:<4} | {c['cancelled']:<9} | {c['pending']:<7} |"
        )
    
    new_table = '\n'.join(new_table_lines)
    
    updated_content = content[:table_start] + new_table + content[table_end:]
    
    return updated_content


def get_system_version():
    """Get current system version from README without full analysis."""
    readme_path = Path('README.md')
    
    if not readme_path.exists():
        return "2.0.0"
    
    content = readme_path.read_text()
    tasks = parse_readme(content)
    return calculate_version(tasks)


def main():
    """Main script execution."""
    readme_path = Path('README.md')
    
    if not readme_path.exists():
        print(f"{Colors.RED}Error: README.md not found{Colors.RESET}")
        return
    
    content = readme_path.read_text()
    
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}README.md Analysis{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}")
    
    tasks = parse_readme(content)
    
    print(f"\n{Colors.BOLD}{Colors.BLUE}📊 Task Distribution:{Colors.RESET}")
    print(f"   {Colors.CYAN}Backlog:{Colors.RESET}   {Colors.YELLOW}{len(tasks['backlog'])}{Colors.RESET} tasks")
    print(f"   {Colors.CYAN}Done:{Colors.RESET}      {Colors.GREEN}{len(tasks['done'])}{Colors.RESET} tasks")
    print(f"   {Colors.CYAN}Discarded:{Colors.RESET} {len(tasks['discarded'])} tasks")
    print(f"   {Colors.CYAN}Total:{Colors.RESET}     {Colors.BOLD}{len(tasks['backlog']) + len(tasks['done']) + len(tasks['discarded'])}{Colors.RESET} tasks")
    
    counts = count_tasks(tasks)
    
    print(f"\n{Colors.BOLD}{Colors.BLUE}📈 Task Counts by Type:{Colors.RESET}")
    type_data = {
        'B': ('🐞 ', 'Bugs'),
        'F': ('🏆 ', 'Features'),
        'M': ('📈 ', 'Improvements'),
        'E': ('⚔️ ', 'Epics')
    }
    for task_type in ['B', 'F', 'M', 'E']:
        emoji, name = type_data[task_type]
        c = counts[task_type]
        print(f"   {emoji}{Colors.BOLD}{name:<13}{Colors.RESET} Total: {Colors.BOLD}{c['total']:<3}{Colors.RESET} | "
              f"Done: {Colors.GREEN}{c['done']:<3}{Colors.RESET} | "
              f"Cancelled: {Colors.RED}{c['cancelled']:<3}{Colors.RESET} | "
              f"Pending: {Colors.YELLOW}{c['pending']}{Colors.RESET}")
    
    issues = check_inconsistencies(tasks)
    
    if issues:
        print(f"\n{Colors.YELLOW}⚠️  {Colors.BOLD}Inconsistencies Found:{Colors.RESET}")
        for issue in issues:
            print(f"   {Colors.YELLOW}•{Colors.RESET} {issue}")
    else:
        print(f"\n{Colors.GREEN}✓ No inconsistencies found{Colors.RESET}")
    
    version = calculate_version(tasks)
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}🏷️  Calculated Version: {version}{Colors.RESET}")
    
    updated_content = update_table(content, counts)
    readme_path.write_text(updated_content)
    
    print(f"\n{Colors.GREEN}✓ README.md table updated successfully{Colors.RESET}\n")


if __name__ == "__main__":
    main()
