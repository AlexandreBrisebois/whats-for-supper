import sqlite3
from pathlib import Path

def submit(reason):
    if reason not in ('content', 'missing'):
        raise ValueError('unsupported reason')
    db = sqlite3.connect(':memory:')
    db.executescript(Path(__file__).with_name('schema.sql').read_text())
    db.execute('insert into reports(reason) values (?)', (reason,))
    stored = db.execute('select reason from reports').fetchone()[0]
    db.close()
    return {'reason': stored, 'retry': True}
