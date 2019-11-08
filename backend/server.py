import json
import time

import boto3
import jwt
from bottle import route, request, response, run

import secrets
import config

cognito_client = boto3.client(
    'cognito-identity',
    region_name=config.AWS_COGNITO_REGION,
    aws_access_key_id=secrets.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=secrets.AWS_SECRET_ACCESS_KEY,
)


USERS = [
    {
        'id': '12881',
        'email': 'a@a.aa',
        'password': '123',
    },
    {
        'id': '12882',
        'email': 'b@b.bb',
        'password': '456',
    }
]

# TOKEN_LIFETIME = 7 * 60 * 60 * 24  # 7 days
TOKEN_LIFETIME = 60 * 10  # 10 minutes


def get_user_by_email(email):
    for user_data in USERS:
        if user_data['email'] == email:
            return user_data
    return None


def get_user_by_id(user_id):
    for user_data in USERS:
        if user_data['id'] == user_id:
            return user_data
    return None


def _get_response_for_user(user_data):
    cognito_response = cognito_client.get_open_id_token_for_developer_identity(
        IdentityPoolId=config.AWS_COGNITO_IDENTITY_POOL_ID,
        # IdentityId='string',  # TODO: Not sure what is this yet
        Logins={
            # You can add more than one provider names here
            # Suppose you know the id in facebook for this user
            # You can pass it here as well
            config.MY_BACKEND_NAME: user_data['id'],
        },
        TokenDuration=10,  # in seconds, 15 minutes by default, max 24 hours
    )
    cognito_token = cognito_response['Token']
    congito_token_payload = jwt.decode(cognito_token, verify=False)
    response.content_type = 'application/json'
    return {
        'local_token': '{0} {1}'.format(user_data['id'], int(time.time())),
        'user': {
            'id': user_data['id'],
            'username': user_data['email'],
        },
        'cognito': cognito_response,
        'expires_at': congito_token_payload['exp'],
    }


@route('/auth', method=['POST', 'OPTIONS'])
def auth():
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    if request.method == 'OPTIONS':
        return
    print('=== Request to auth ===')
    print(dict(request.params))
    print(request.body.read())
    print(dict(request.forms))

    params = [json.loads(p) for p in request.params]
    assert len(params) == 1  # Not sure when len(params) could be > 1
    request_params = params[0]
    if 'username' in request_params:
        user_data = get_user_by_email(request_params['username'])
        if user_data['password'] != request_params.get('password'):
            response.status = 400
            return 'Wrong password'
        if user_data:
            user_id = user_data['id']
        else:
            response.status = 401
            return 'Wrong username'
    elif 'token' in request_params:
        auth_token = request_params['token']
        split_result = auth_token.split(' ')
        if len(split_result) < 2:
            response.status = 401
            return 'Wrong token'
        user_id, issued_time = split_result
        if int(time.time()) - int(issued_time) > TOKEN_LIFETIME:
            response.status = 401
            return 'Local token expired'
        user_data = get_user_by_id(user_id)
        if not user_data:
            response.status = 401
            return 'Wrong token'
    else:
        response.status = 400
        return 'Bad request'
    response_data = _get_response_for_user(user_data)
    print('=== Producing resonse: ===')
    print(json.dumps(response_data, indent=4))
    return json.dumps(response_data)


@route('/refresh', method=['POST', 'OPTIONS'])
def refresh():
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    if request.method == 'OPTIONS':
        return
    print('=== Request to refresh ===')
    print(dict(request.params))
    print(request.body.read())
    print(dict(request.forms))

    # TODO: get user from request, it should be cookie/app_token
    user_data = USERS[0]
    response_data = _get_response_for_user(user_data)
    print('=== Producing resonse: ===')
    print(json.dumps(response_data, indent=4))
    return json.dumps(response_data)


run(host='localhost', port=8080, debug=True, reloader=True)
