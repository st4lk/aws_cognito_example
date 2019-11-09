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

# APP_TOKEN_LIFETIME is develop app specific token, it is not connected to cognito in any way
APP_TOKEN_LIFETIME = 7 * 60 * 60 * 24  # 7 days
# APP_TOKEN_LIFETIME = 60 * 10  # 10 minutes


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


def _generate_app_token(user_id):
    """
    This is just a dummy example of developer's app token. I.e. developer's app may have it's own
    authentication system, that works with some token.
    This authentication system is not connected to AWS cognito.
    But it can be used to verify, that current user is successfully authenticated in developer's
    app and system can issue a token (different one) for AWS cognito.
    """
    return '{0} {1}'.format(user_id, int(time.time()))


def _is_app_token_valid(app_token):
    split_result = app_token.split(' ')
    if len(split_result) < 2:
        return False, 'Wrong app token'
    user_id, issued_time = split_result
    if int(time.time()) - int(issued_time) > APP_TOKEN_LIFETIME:
        return False, 'Develop app token expired'
    if not get_user_by_id(user_id):
        return False, 'Wrong app token'

    valid_for_seconds = APP_TOKEN_LIFETIME - (int(time.time()) - int(issued_time))
    valid_for_days = int(valid_for_seconds / (60 * 60 * 24))
    valid_for_hours = (valid_for_seconds / 3600.0) % 24
    print('app_token will be valid for {0} days and {1:.1f} hours'.format(
        valid_for_days, valid_for_hours,
    ))
    return True, None


def _get_user_id_from_app_token(app_token):
    return app_token.split(' ')[0]


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
        'app_token': _generate_app_token(user_data['id']),
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
    params = [json.loads(p) for p in request.params]
    print(params)
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
    elif 'app_token' in request_params:
        is_valid, error_message = _is_app_token_valid(request_params['app_token'])
        if not is_valid:
            response.status = 401
            return error_message
        user_id = _get_user_id_from_app_token(request_params['app_token'])
        user_data = get_user_by_id(user_id)
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
    params = [json.loads(p) for p in request.params]
    print(params)
    assert len(params) == 1  # Not sure when len(params) could be > 1
    request_params = params[0]

    if 'app_token' in request_params:
        is_valid, error_message = _is_app_token_valid(request_params['app_token'])
        if not is_valid:
            response.status = 401
            return error_message
        user_id = _get_user_id_from_app_token(request_params['app_token'])
        user_data = get_user_by_id(user_id)
    else:
        response.status = 400
        return 'Bad request'

    response_data = _get_response_for_user(user_data)
    print('=== Producing resonse: ===')
    print(json.dumps(response_data, indent=4))
    return json.dumps(response_data)


run(host='localhost', port=8080, debug=True, reloader=True)
