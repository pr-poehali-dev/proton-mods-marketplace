import json
import os
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p77182784_proton_mods_marketpl')

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """Получение списка модов и проверка доступа к скачиванию"""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    conn = get_conn()
    cur = conn.cursor()

    try:
        method = event.get('httpMethod', 'GET')

        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            search = params.get('search', '')
            category = params.get('category', '')
            price_filter = params.get('price', '')

            query = f"""
                SELECT id, title, description, game, category, price, rating, downloads,
                       cover_url, file_name, created_at
                FROM {SCHEMA}.mods WHERE is_active = TRUE
            """
            conditions = []
            args = []

            if search:
                conditions.append("(title ILIKE %s OR description ILIKE %s)")
                args += [f'%{search}%', f'%{search}%']
            if category:
                conditions.append("category = %s")
                args.append(category)
            if price_filter == 'free':
                conditions.append("price = 0")
            elif price_filter == 'paid':
                conditions.append("price > 0")

            if conditions:
                query += " AND " + " AND ".join(conditions)
            query += " ORDER BY downloads DESC"

            cur.execute(query, args)
            rows = cur.fetchall()
            cols = ['id', 'title', 'description', 'game', 'category', 'price', 'rating',
                    'downloads', 'cover_url', 'file_name', 'created_at']
            mods = []
            for row in rows:
                m = dict(zip(cols, row))
                m['created_at'] = str(m['created_at'])
                m['rating'] = float(m['rating'])
                mods.append(m)

            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'mods': mods})}

        elif method == 'POST':
            body = json.loads(event.get('body') or '{}')
            action = body.get('action')

            if action == 'check_access':
                token = (event.get('headers') or {}).get('X-Auth-Token') or body.get('token')
                mod_id = body.get('mod_id')

                if not token or not mod_id:
                    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'has_access': False})}

                cur.execute(f"""
                    SELECT o.id FROM {SCHEMA}.orders o
                    JOIN {SCHEMA}.sessions s ON s.user_id = o.user_id
                    WHERE s.token = %s AND o.mod_id = %s AND o.status = 'approved'
                    AND s.expires_at > NOW()
                """, (token, mod_id))

                row = cur.fetchone()
                if row:
                    cur.execute(f"SELECT file_url, file_name FROM {SCHEMA}.mods WHERE id = %s", (mod_id,))
                    mod = cur.fetchone()
                    return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                        'has_access': True,
                        'file_url': mod[0],
                        'file_name': mod[1]
                    })}
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'has_access': False})}

        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}

    finally:
        cur.close()
        conn.close()
