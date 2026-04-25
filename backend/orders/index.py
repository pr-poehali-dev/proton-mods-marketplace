import json
import os
import base64
import boto3
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p77182784_proton_mods_marketpl')
SUPPORT_EMAIL = 'usertophit49@gmail.com'

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )

def handler(event: dict, context) -> dict:
    """Создание заказа, загрузка скриншота оплаты, получение заказов пользователя"""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')
    token = (event.get('headers') or {}).get('X-Auth-Token') or body.get('token')

    conn = get_conn()
    cur = conn.cursor()

    try:
        if action == 'create':
            mod_id = body.get('mod_id')
            payment_method = body.get('payment_method', 'transfer')

            user_id = None
            if token:
                cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s AND expires_at > NOW()", (token,))
                row = cur.fetchone()
                if row:
                    user_id = row[0]

            cur.execute(f"SELECT price, title FROM {SCHEMA}.mods WHERE id=%s", (mod_id,))
            mod = cur.fetchone()
            if not mod:
                return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Мод не найден'})}

            price, title = mod

            if price == 0:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.orders (user_id, mod_id, payment_method, amount, status)
                    VALUES (%s, %s, %s, %s, 'approved') RETURNING id
                """, (user_id, mod_id, 'free', 0))
                order_id = cur.fetchone()[0]
                if user_id:
                    cur.execute(f"UPDATE {SCHEMA}.mods SET downloads = downloads + 1 WHERE id = %s", (mod_id,))
                conn.commit()
                return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                    'order_id': order_id,
                    'status': 'approved',
                    'is_free': True
                })}

            cur.execute(f"""
                INSERT INTO {SCHEMA}.orders (user_id, mod_id, payment_method, amount, status)
                VALUES (%s, %s, %s, %s, 'pending') RETURNING id
            """, (user_id, mod_id, payment_method, price))
            order_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'order_id': order_id,
                'status': 'pending',
                'amount': price,
                'title': title
            })}

        elif action == 'upload_screenshot':
            order_id = body.get('order_id')
            image_data = body.get('image_data')
            image_ext = body.get('image_ext', 'jpg')

            if not order_id or not image_data:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Нет данных'})}

            img_bytes = base64.b64decode(image_data)
            s3 = get_s3()
            key = f"screenshots/order_{order_id}.{image_ext}"
            s3.put_object(Bucket='files', Key=key, Body=img_bytes, ContentType=f'image/{image_ext}')
            access_key = os.environ['AWS_ACCESS_KEY_ID']
            screenshot_url = f"https://cdn.poehali.dev/projects/{access_key}/files/{key}"

            cur.execute(f"UPDATE {SCHEMA}.orders SET screenshot_url=%s WHERE id=%s", (screenshot_url, order_id))
            conn.commit()

            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
                'screenshot_url': screenshot_url,
                'order_id': order_id
            })}

        elif action == 'my_orders':
            if not token:
                return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Нужна авторизация'})}
            cur.execute(f"""
                SELECT o.id, o.mod_id, o.payment_method, o.amount, o.status, o.created_at,
                       m.title, m.file_name, m.file_url
                FROM {SCHEMA}.orders o
                JOIN {SCHEMA}.mods m ON m.id = o.mod_id
                JOIN {SCHEMA}.sessions s ON s.user_id = o.user_id
                WHERE s.token = %s AND s.expires_at > NOW()
                ORDER BY o.created_at DESC
            """, (token,))
            rows = cur.fetchall()
            orders = [{
                'id': r[0], 'mod_id': r[1], 'payment_method': r[2],
                'amount': r[3], 'status': r[4], 'created_at': str(r[5]),
                'mod_title': r[6], 'file_name': r[7], 'file_url': r[8]
            } for r in rows]
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'orders': orders})}

        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Неизвестное действие'})}

    finally:
        cur.close()
        conn.close()
