#!/usr/bin/env python3
"""
README.md Maintenance Script
Updates task counts, checks for inconsistencies, and calculates version
"""

import re
from pathlib import Path
from collections import defaultdict
import sys

sys.stdout.reconfigure(encoding="utf-8")

# Repository root (two levels up from scripts/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

EMOJI_TYPE_MAP = {
    '🐞': 'B',
    '🏆': 'F',
    '📈': 'M',
    '⚔️': 'E'
}

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
    current_month = None
    
    for line in content.split('\n'):
        if '## Backlog' in line:
            current_section = 'backlog'
        elif '## Done' in line:
            current_section = 'done'
        elif '### Discarded' in line:
            current_section = 'discarded'
        
        # Track the current "### <Month Year>" heading inside Done so tasks can
        # be reordered chronologically later (see calculate_version).
        if current_section == 'done':
            month_match = re.match(r'^###\s+(.+)$', line)
            if month_match:
                current_month = month_match.group(1).strip()
        
        if current_section:
            common = re.search(r'\*\*([A-Z]\d+):\*\*', line)
            linked = re.search(r'\[[🐞🏆📈⚔️❗️]*([A-Z]\d+)\]', line)
            
            match = common or linked
            
            if match:
                task_id = match.group(1)
                task_type = task_id[0]
                task_number = int(task_id[1:])
                tasks[current_section].append({
                    'id': task_id,
                    'type': task_type,
                    'number': task_number,
                    'line': line,
                    'month': current_month if current_section == 'done' else None
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

    backlog_epic_numbers = {t['number'] for t in tasks['backlog'] if t['type'] == 'E'}
    
    for task in tasks['backlog']:
        t = task['type']
        counts[t]['total'] += 1
        counts[t]['pending'] += 1
    
    for task in tasks['done']:
        t = task['type']
        # Skip Epics that also exist in backlog (keep only the backlog occurrence)
        if t == 'E' and task['number'] in backlog_epic_numbers:
            continue
        counts[t]['total'] += 1
        counts[t]['done'] += 1
    
    for task in tasks['discarded']:
        t = task['type']
        counts[t]['total'] += 1
        counts[t]['cancelled'] += 1
    
    return counts


def check_inconsistencies(tasks):
    issues = []

    all_tasks = tasks['backlog'] + tasks['done'] + tasks['discarded']

    by_type = defaultdict(list)

    # Identify Epic numbers that appear in both backlog and done
    backlog_epic_numbers = {t['number'] for t in tasks['backlog'] if t['type'] == 'E'}
    done_epic_numbers = {t['number'] for t in tasks['done'] if t['type'] == 'E'}
    epic_in_both = backlog_epic_numbers & done_epic_numbers

    for task in all_tasks:
        by_type[task['type']].append(task['number'])

        task_id = task['id']
        line = task['line']

        # --- FORMAT VALIDATION (B001, F012, E123) ---
        if not re.search(rf'\b{task["type"]}\d{{3}}\b', task_id):
            issues.append(
                f"{Colors.BOLD}Invalid ID format:{Colors.RESET} "
                f"{task_id} → must be {task['type']}XXX (3 digits)"
            )

        # --- EMOJI ↔ TYPE VALIDATION ---
        for emoji, expected_type in EMOJI_TYPE_MAP.items():
            if emoji in line:
                if expected_type != task["type"]:
                    issues.append(
                        f"{Colors.BOLD}Emoji mismatch:{Colors.RESET} "
                        f"{task_id} uses {emoji} but is type {task['type']}"
                    )

    # --- MISSING & DUPLICATES ---
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
            issues.append(
                f"{emoji}{Colors.BOLD}Missing {name}:{Colors.RESET} "
                f"{', '.join(f'{task_type}{n:03d}' for n in sorted(missing))}"
            )

        duplicates = {n for n in numbers if numbers.count(n) > 1}
        # Ignore Epic duplicates that appear in both backlog and done
        if task_type == 'E':
            duplicates = duplicates - epic_in_both
        if duplicates:
            issues.append(
                f"{emoji}{Colors.BOLD}Duplicate {name}:{Colors.RESET} "
                f"{', '.join(f'{task_type}{n:03d}' for n in sorted(duplicates))}"
            )

    return issues


def calculate_version(tasks):
    """Calculate semantic version based on completed tasks (chronological order).

    Done months are listed newest-first in README.md, so to reconstruct true
    chronological order we walk the month groups bottom-to-top (oldest month
    first) and the tasks top-to-bottom within each month (top is old, bottom
    is new). This makes the version reflect the newest completed task, so
    appending a task to the current month's Done section bumps the patch.
    """
    done_tasks = tasks['done']

    backlog_epic_numbers = {t['number'] for t in tasks['backlog'] if t['type'] == 'E'}

    # Group Done tasks by their "### <Month Year>" heading, keeping the order
    # they appear in the file (newest month first, old→new inside each month).
    month_order = []
    month_groups = {}
    for task in done_tasks:
        key = task.get('month')
        if key not in month_groups:
            month_groups[key] = []
            month_order.append(key)
        month_groups[key].append(task)

    # Rebuild the Done list oldest → newest: reverse the month groups and keep
    # tasks in file order (top is old, bottom is new) inside each month.
    chronological = []
    for key in reversed(month_order):
        chronological.extend(month_groups[key])

    major = 2
    minor = 0
    patch = 0
    
    for task in chronological:
        # Skip Epics that also exist in backlog (they weren't truly completed)
        if task['type'] == 'E' and task['number'] in backlog_epic_numbers:
            continue
        if task['type'] == 'E':
            minor += 1
            patch = 0
        else:
            patch += 1
    
    return f"{major}.{minor}.{patch}"


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
    readme_path = BASE_DIR / 'README.md'
    
    if not readme_path.exists():
        return "2.0.0"
    
    content = readme_path.read_text(encoding="utf-8")
    tasks = parse_readme(content)
    return calculate_version(tasks)


def main():
    """Main script execution."""
    readme_path = BASE_DIR / 'README.md'
    
    if not readme_path.exists():
        print(f"{Colors.RED}Error: README.md not found{Colors.RESET}")
        return
    
    content = readme_path.read_text(encoding="utf-8")
    
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
    readme_path.write_text(updated_content, encoding="utf-8")
    
    print(f"\n{Colors.GREEN}✓ README.md table updated successfully{Colors.RESET}\n")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--version":
        # Print only the calculated version (used by the build script).
        print(get_system_version())
    else:
        main()
