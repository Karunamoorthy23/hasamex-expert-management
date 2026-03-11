"""
Run PostgreSQL migration files in order.
Usage: python run_migrations.py
"""

import os
import sys
import glob
import psycopg2
from dotenv import load_dotenv

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), 'flask.env'))


def get_connection():
    """Create a PostgreSQL connection from environment variables."""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        dbname=os.getenv('DB_NAME', 'postgres'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', ''),
    )


def run_migrations():
    """Execute all .sql migration files in order."""
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    sql_files = sorted(glob.glob(os.path.join(migrations_dir, '*.sql')))

    if not sql_files:
        print('No migration files found.')
        return

    conn = get_connection()
    conn.autocommit = True
    cursor = conn.cursor()

    print(f'Found {len(sql_files)} migration(s).\n')

    for filepath in sql_files:
        filename = os.path.basename(filepath)
        print(f'  Running: {filename} ... ', end='')
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                sql = f.read()
            cursor.execute(sql)
            print('OK')
        except Exception as e:
            print(f'ERROR: {e}')
            # Continue with other migrations
            continue

    cursor.close()
    conn.close()
    print('\nAll migrations completed.')


if __name__ == '__main__':
    run_migrations()
