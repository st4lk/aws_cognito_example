Amazon Cognito example project
==============================

Setup AWS
---------

### Step 1

1. Create Cognito User Pool

    https://us-west-2.console.aws.amazon.com/cognito/users/?region=us-west-2#/pool/new/create?

    You can use default settings for simplicity, or can setup them manually.

    Example of result params:
    ```
    name: cognito-2-example
    pool_id: us-west-2_abcABC123
    ```

2. Create app client

    - Go to user pool settings
    - then to "App clients" tab
    - create a client (for simplicity, uncheck 'Generate client secret')
    - TODO: find a way how to operate with app with the secret, to avoid error like
        > Unable to verify secret hash for client 123abcdef123456abcdef12345

    Example of result params:
    ```
    app client name: Web App Example
    app client id: 123abcdef123456abcdef12345
    ```

3. Create Cognito Identity Pool

    https://us-west-2.console.aws.amazon.com/cognito/create/

    Add cognito as Authentication provider, use same pool_id and as in step 1 and same client id as in step 2.
    It will be enought for testing.
    Later, we'll add our custom auth.

    After first step, amazon will ask for two roles:
    - role for authenticated users (those, who pass the sign-in process)
    - role for unauthenticated users (those, who didn't, just new visitors)

    For testing purpose, let's try to:
    - allow authenticated users to upload files to public/protected/private paths of bucket (let's assume our bucket has name `cognito-test-backet`). Check 'allow-S3-auth-policy' in appendix
    - allow unauthenticated users to upload files to public path only of bucket. Check 'allow-S3-unauth-policy' in appendix
    Use default params for bucket (not public).
    But we need to allow public access, so:
    - go to bucket->permissions->block public access
    - edit
    - uncheck all blocks

    To allow API request, we need to update CORS:
    - bucket->permissons->CORS configuration
    - insert CORS from appendix->Bucket CORS

    Check this for example of policies: https://aws-amplify.github.io/docs/js/storage#using-amazon-s3


    Example of result params:
    ```
    name: cognito_2_example_identity
    identity_id: us-west-2:10abcde1-a9bc-48ab-a2d3-8asd8sdfsdkl
    congito_id: us-west-2_abcABC123
    congito_app_id: 123abcdef123456abcdef12345
    ```

### Step 2

Before going forward, you may want to check, that cognito auth is working in the app.
Check Run -> Step 1.

Let's try to use our backend for auth, not the cognito.

1. Go to "identity pool dashboard" -> Edit -> "Authentication providers" -> "Custom"
2. Enter `my_test_backend` into "Developer provider name" field. This value should be the same as `backend/config.py -> MY_BACKEND_NAME` variable
3. Save changes

Setup project
-------------

1. Copy `frontend/src/config.js.example` to `frontend/src/config.js` and specify parameters (should be taked from AWS)
2. Copy `backend/config.py.example` to `backend/config.py` and specify parameters
2. Copy `backend/secrets.py.example` to `backend/secrets.py` and specify parameters

Run
---

```bash
cd frontend
make run
```

and run backend

```bash
cd backend
make run
```

Go to http://localhost:8000/

### Step 1

1. Try to sign-up a new user using cognito.
- name: whatever you want
- password: at least 8 chars, at least one char,number,symbol

For example:
- stalk
- abc123DEF!

2. Try to sign-in using credentials you've just specified. 

Probably you will see an error `"User is not confirmed."` (check browser console).
To fix it, got to your user pool in AWS console, find newly created user and confirm him.
I guess there is a better way to do it (like confirm by email/phone/etc). Or confirmation can be even turned of.
For now, let's confirm manually.

Try to re sign-in again, it should work.

3. Try to upload, list files (images).

### Step 2

1. Try to sign in using custom auth now

    Check `backend/server.py -> USERS` list of available user names.
    For example (username password):
    - a@a.aa 123
    - b@b.bb 456

Appendix
--------

#### `allow-S3-auth-policy`

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::cognito-test-backet"
            ],
            "Condition": {
                "StringLike": {
                    "s3:prefix": [
                        "public/*",
                        "protected/${cognito-identity.amazonaws.com:sub}/*",
                        "private/${cognito-identity.amazonaws.com:sub}/*"
                    ]
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::cognito-test-backet/public/",
                "arn:aws:s3:::cognito-test-backet/public/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::cognito-test-backet/protected/",
                "arn:aws:s3:::cognito-test-backet/protected/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::cognito-test-backet/protected/${cognito-identity.amazonaws.com:sub}/",
                "arn:aws:s3:::cognito-test-backet/protected/${cognito-identity.amazonaws.com:sub}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::cognito-test-backet/private/${cognito-identity.amazonaws.com:sub}",
                "arn:aws:s3:::cognito-test-backet/private/${cognito-identity.amazonaws.com:sub}/*"
            ]
        }
    ]
}
```

#### `allow-S3-unauth-policy`

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::cognito-test-backet"
            ],
            "Condition": {
                "StringLike": {
                    "s3:prefix": [
                        "public/*"
                    ]
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::cognito-test-backet/public/",
                "arn:aws:s3:::cognito-test-backet/public/*"
            ]
        }
    ]
}
```

#### Bucket CORS

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
    <ExposeHeader>x-amz-server-side-encryption</ExposeHeader>
    <ExposeHeader>x-amz-request-id</ExposeHeader>
    <ExposeHeader>x-amz-id-2</ExposeHeader>
    <AllowedHeader>*</AllowedHeader>
</CORSRule>
</CORSConfiguration>
```
