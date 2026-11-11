"""Closed-app migration for the standalone cache plugin. Default: plan only."""
import argparse
import copy
import datetime
import json
import os
from pathlib import Path
import shutil

OLD = 'com.len.limits'
NEW = 'com.wlrudxo.usagecache'
MAPPING = {OLD + suffix: NEW + suffix for suffix in ('.progress', '.antigravity', '.codex.progress')}


def running():
    import subprocess
    result = subprocess.run(['tasklist.exe', '/FI', 'IMAGENAME eq StreamDeck.exe', '/FO', 'CSV', '/NH'], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW, check=True)
    # tasklist prints its "no matching task" line in the console code page; compare bytes, the image name is ASCII.
    return b'streamdeck.exe' in result.stdout.lower()


def convert(value):
    result = copy.deepcopy(value)
    count = 0
    def visit(v):
        nonlocal count
        if isinstance(v, dict):
            uuid = v.get('UUID', '')
            if uuid in MAPPING:
                v['UUID'] = MAPPING[uuid]
                count += 1
                if isinstance(v.get('Plugin'), dict):
                    v['Plugin'].update(UUID=NEW, Name='Paseo Usage Cache', Version='1.0.0.0')
            elif uuid == OLD:
                v.update(UUID=NEW, Name='Paseo Usage Cache', Version='1.0.0.0')
            elif isinstance(uuid, str) and uuid.startswith(OLD + '.'):
                raise ValueError('Unsupported old action: ' + uuid)
            for item in v.values(): visit(item)
        elif isinstance(v, list):
            for item in v: visit(item)
    visit(result)
    return result, count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    root = Path(os.environ['APPDATA']) / 'Elgato/StreamDeck'
    repo = Path(__file__).resolve().parents[1]
    package = repo / 'dist' / (NEW + '.streamDeckPlugin')
    if not package.is_file(): raise RuntimeError('Build/package the standalone plugin first')
    planned = []
    for path in (root / 'ProfilesV3').rglob('manifest.json'):
        original = path.read_bytes()
        data, count = convert(json.loads(original.decode('utf-8-sig')))
        if count: planned.append((path, original, data, count))
    print(json.dumps({'files': len(planned), 'buttons': sum(x[3] for x in planned), 'app_running': running(), 'apply': args.apply}))
    if not args.apply: return
    if running(): raise RuntimeError('Exit Stream Deck from the tray first; no files changed')
    backup = repo / 'backups' / ('migration-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
    backup.mkdir(parents=True, exist_ok=False)
    for path, original, data, count in planned:
        target = backup / path.relative_to(root)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(original)
        if target.read_bytes() != original: raise RuntimeError('Backup verification failed')
    # All originals and destinations are preflighted before any profile writes.
    old = root / 'Plugins' / (OLD + '.sdPlugin')
    if old.is_symlink() or old.is_junction(): raise RuntimeError('Unexpected linked old install; leave it for manual review')
    if old.exists() and old.resolve().parent != (root / 'Plugins').resolve(): raise RuntimeError('Old plugin path escaped Plugins')
    if running(): raise RuntimeError('Stream Deck reopened; originals untouched')
    for path, original, data, count in planned:
        if path.read_bytes() != original: raise RuntimeError('Profile changed during preparation; originals untouched')
    changed = []
    try:
        for path, original, data, count in planned:
            temp = path.with_name(path.name + '.usagecache.tmp')
            temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
            temp.replace(path)
            changed.append((path, original))
        if old.exists(): shutil.move(str(old), str(backup / old.name))
    except Exception:
        for path, original in changed: path.write_bytes(original)
        raise
    print('Profiles migrated; old plugin retired. Backup: ' + str(backup))
    print('Open installer, accept installation, then check buttons: ' + str(package))

if __name__ == '__main__':
    try: main()
    except (RuntimeError, ValueError) as error:
        print(str(error))
        raise SystemExit(2)
