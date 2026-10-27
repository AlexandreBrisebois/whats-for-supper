"""Deterministic canonical OpenSpec inventory. Does not replace openspec validate.

Supports ATX headings outside backtick/tilde fences and indented code. Raw UTF-8
source, preambles, descriptions and scenarios remain unchanged. No index/cache,
semantic overlap detection, benchmark mode or network access is provided.
"""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
HEADING = re.compile(r'^ {0,3}(#{1,6})(?:[ \t]+(.*)|[ \t]*)$')
FENCE = re.compile(r'^ {0,3}(`{3,}|~{3,})(.*)$')


class UsageError(ValueError):
    pass


class ArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise UsageError(message)


def sha256(raw):
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def parse_spec(path, root):
    """Return source records with one-based inclusive line spans."""
    data = path.read_bytes()
    text = data.decode('utf-8')
    lines = text.splitlines(keepends=True)
    headings, diagnostics = [], []
    fence = None

    def diagnose(code, line, *, severity='error', **details):
        diagnostics.append(dict(code=code, line=line, severity=severity, **details))

    for number, raw in enumerate(lines, 1):
        line = raw.rstrip('\r\n')
        match = FENCE.match(line)
        if fence:
            if (match and match[1][0] == fence[0] and len(match[1]) >= fence[1]
                    and not match[2].strip()):
                fence = None
            continue
        if match and not (match[1][0] == '`' and '`' in match[2]):
            fence = (match[1][0], len(match[1]), number)
            continue
        if line.startswith(('    ', '\t')):
            continue
        match = HEADING.match(line)
        if not match:
            if re.match(r'^ {0,3}(?:[-*+]\s+|>\s*)?#+\s*(Requirement|Scenario):', line):
                diagnose('malformed_heading', number)
            continue
        title = re.sub(r'[ \t]+#+[ \t]*$', '', match[2] or '').strip()
        level = len(match[1])
        headings.append(dict(level=level, title=title, line=number, raw=raw))
        for kind, expected in [('Requirement', 3), ('Scenario', 4)]:
            if title.startswith(kind + ':'):
                if level != expected:
                    diagnose('wrong_heading_level', number, expected=expected)
                if not title[len(kind)+1:].strip():
                    diagnose('empty_title', number)
    if fence:
        diagnose('unclosed_fence', fence[2])

    def end_after(heading):
        return next((h['line']-1 for h in headings
                     if h['line'] > heading['line'] and h['level'] <= heading['level']), len(lines))

    def span(start, end):
        raw = ''.join(lines[start-1:end])
        return dict(start_line=start, end_line=end, raw=raw, sha256=sha256(raw))

    for (level, title), count in sorted(Counter((h['level'], h['title']) for h in headings).items()):
        if count > 1:
            occurrences = [h['line'] for h in headings if (h['level'], h['title']) == (level, title)]
            diagnose('duplicate_heading', occurrences[0], severity='warning',
                     title=title, lines=occurrences)
    purpose_heads = [h for h in headings if h['level'] == 2 and h['title'] == 'Purpose']
    if not purpose_heads:
        diagnose('missing_purpose', 1)
    elif len(purpose_heads) > 1:
        diagnose('duplicate_purpose', purpose_heads[1]['line'])
    purpose = span(purpose_heads[0]['line'], end_after(purpose_heads[0])) if purpose_heads else None
    req_heads = [h for h in headings if h['level'] == 3 and h['title'].startswith('Requirement:')]
    scenario_heads = [h for h in headings if h['level'] == 4 and h['title'].startswith('Scenario:')]
    if not req_heads:
        diagnose('missing_requirement', 1)
    requirements, covered, occurrences = [], set(), Counter()
    capability = path.parent.relative_to(root/'openspec/specs').as_posix()
    for h in req_heads:
        end = end_after(h)
        scenarios = [s for s in scenario_heads if h['line'] < s['line'] <= end]
        title = h['title'][len('Requirement:'):].strip()
        record = dict(title=title, **span(h['line'], end))
        occurrences[title] += 1
        record['occurrence'] = occurrences[title]
        record['id'] = f"{capability}:{title}:{occurrences[title]}:{record['sha256']}"
        record['description'] = span(h['line']+1, scenarios[0]['line']-1 if scenarios else end)
        if not record['description']['raw'].strip():
            diagnose('empty_description', h['line'])
        if not scenarios:
            diagnose('missing_scenario', h['line'])
        record['scenarios'] = [dict(title=s['title'][len('Scenario:'):].strip(),
                                    **span(s['line'], min(end, end_after(s)))) for s in scenarios]
        covered.update(s['line'] for s in scenarios)
        requirements.append(record)
    for h in scenario_heads:
        if h['line'] not in covered:
            diagnose('orphan_scenario', h['line'])
    return dict(capability=capability, path=path.relative_to(root).as_posix(),
                bytes=len(data), characters=len(text), lines=len(lines),
                final_newline=text.endswith(('\n', '\r')), sha256=hashlib.sha256(data).hexdigest(),
                raw=text, purpose=purpose, preamble=span(1, req_heads[0]['line']-1 if req_heads else len(lines)),
                headings=headings, requirements=requirements,
                scenario_count=len(scenario_heads), diagnostics=diagnostics)


def build_inventory(root, capabilities=()):
    root = Path(root).resolve()
    wanted = set(capabilities)
    for name in sorted(wanted):
        p = PurePosixPath(name)
        if (not name or p.is_absolute() or '..' in p.parts or '\\' in name
                or p.as_posix() != name):
            raise UsageError(f'invalid capability: {name}')
    specs = root/'openspec/specs'
    diagnostics, paths = [], []

    def problem(code, path):
        diagnostics.append(dict(code=code, path=path.relative_to(root).as_posix(), severity='error'))

    if (root/'openspec').is_symlink() or specs.is_symlink():
        problem('symlink_source', specs)
    elif not specs.is_dir():
        problem('missing_specs_directory', specs)
    else:
        def walk_error(error):
            diagnostics.append(dict(code='unreadable_directory', severity='error'))
        for directory, dirs, files in os.walk(specs, followlinks=False, onerror=walk_error):
            for name in sorted(dirs):
                path = Path(directory)/name
                if path.is_symlink():
                    problem('symlink_source', path)
            dirs[:] = sorted(name for name in dirs if not (Path(directory)/name).is_symlink())
            if 'spec.md' in files:
                paths.append(Path(directory)/'spec.md')
    available = {p.parent.relative_to(specs).as_posix() for p in paths}
    if wanted - available:
        raise UsageError('unknown capability: ' + ', '.join(sorted(wanted-available)))
    files = []
    for path in sorted(paths, key=lambda p: p.relative_to(root).as_posix()):
        if wanted and path.parent.relative_to(specs).as_posix() not in wanted:
            continue
        if path.is_symlink():
            problem('symlink_source', path)
            continue
        try:
            files.append(parse_spec(path, root))
        except UnicodeDecodeError:
            problem('invalid_utf8', path)
        except OSError:
            problem('unreadable_source', path)
    if not paths and not diagnostics:
        problem('no_canonical_specs', specs)
    all_diagnostics = diagnostics + [d for f in files for d in f['diagnostics']]
    totals = {key: sum(f[key] for f in files) for key in ['bytes', 'characters', 'lines']}
    totals.update(capabilities=len(files), requirements=sum(len(f['requirements']) for f in files),
                  scenarios=sum(f['scenario_count'] for f in files),
                  warnings=sum(d['severity'] == 'warning' for d in all_diagnostics),
                  errors=sum(d['severity'] == 'error' for d in all_diagnostics))
    return dict(schema_version=1, complete=not totals['errors'],
                discovery='sorted filesystem openspec/specs/**/spec.md',
                selected_capabilities=sorted(wanted), totals=totals, files=files, diagnostics=diagnostics)


def render_text(inventory):
    lines = ['OpenSpec canonical inventory (source spans are 1-based inclusive)',
             'Capability | UTF-8 bytes | Characters | Lines | Requirements | Scenarios']
    for f in inventory['files']:
        lines.append(f"{f['capability']} | {f['bytes']} | {f['characters']} | {f['lines']} | "
                     f"{len(f['requirements'])} | {f['scenario_count']}")
        lines.extend(f"  {d['severity']}: {d['code']} at {f['path']}:{d['line']}"
                     for d in f['diagnostics'])
    lines.extend(f"{d['severity']}: {d['code']} {d.get('path', '')}" for d in inventory['diagnostics'])
    lines.append('Totals: ' + ', '.join(f'{key}={value}' for key, value in inventory['totals'].items()))
    lines.append('Complete: ' + str(inventory['complete']).lower())
    return '\n'.join(lines) + '\n'


def write_output(destination, content, root):
    """Publish once, atomically and without overwriting an existing destination."""
    target = Path(destination).expanduser()
    if target.is_symlink() or target.exists():
        raise UsageError('output already exists or is a symlink')
    target = target.resolve()
    if any(target.is_relative_to(root/name) for name in ['openspec', '.git']):
        raise UsageError('output cannot be inside openspec or Git metadata')
    if not target.parent.is_dir():
        raise UsageError('output parent directory must already exist')
    if target.is_relative_to(root) and (root/'.git').exists():
        result = subprocess.run(['git', '-C', str(root), 'ls-files', '--error-unmatch', '--',
                                 target.relative_to(root).as_posix()], capture_output=True)
        if result.returncode == 0:
            raise UsageError('output cannot replace a tracked repository path')
        if result.returncode != 1:
            raise UsageError('cannot establish tracked output path safety')
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix='.openspec-audit-', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(content.encode('utf-8'))
            stream.flush()
            os.fsync(stream.fileno())
        # link is atomic and fails if a competing writer creates the destination.
        os.link(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink()


def main(argv=None, *, root=None):
    root = Path(root).resolve() if root is not None else ROOT
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--format', choices=['text', 'json'], default='text')
    parser.add_argument('--capability', action='append', default=[], metavar='EXACT_ID')
    parser.add_argument('--output', metavar='PATH', help='Explicit new output file; default is stdout')
    try:
        args = parser.parse_args(argv)
        inventory = build_inventory(root, args.capability)
        content = (json.dumps(inventory, ensure_ascii=False, sort_keys=True, indent=2) + '\n'
                   if args.format == 'json' else render_text(inventory))
        if args.output is not None:
            write_output(args.output, content, root)
        else:
            sys.stdout.write(content)
        return 0 if inventory['complete'] else 2
    except (UsageError, OSError) as error:
        print('openspec audit: ' + str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
