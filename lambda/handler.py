import datetime
import logging
import json
import time

logger = logging.getLogger(__name__)


def index(event, context):
    logger.warning(
        "=== %s request to 'index' function at %s, %s ===",
        event.get('httpMethod'),
        time.time(),
        datetime.datetime.utcnow(),
    )
    logger.warning('headers: %s', event.get('headers'))
    logger.warning('queryStringParameters: %s', event.get('queryStringParameters'))
    logger.warning('body: %s', event.get('body'))
    logger.warning('event: %s', event)
    logger.warning('context: %s', context)
    context_data = {
        attr_name: getattr(context, attr_name)
        for attr_name in dir(context)
    }
    logger.warning('context_data: %s', context_data)
    identity = context_data.get('identity', None)
    logger.warning('identity: %s', identity)
    identity_data = {
        attr_name: getattr(identity, attr_name)
        for attr_name in dir(identity)
    }
    logger.warning('identity_data: %s', identity_data)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': True,
    }

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'ok': True}),
    }
