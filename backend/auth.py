from flask import jsonify
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, get_jwt_identity
from datetime import datetime, timedelta
import random
import string

jwt = JWTManager()

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'status': 'error',
        'message': 'Token has expired',
        'error': 'token_expired'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'status': 'error',
        'message': 'Invalid token',
        'error': 'invalid_token'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'status': 'error',
        'message': 'Missing authorization token',
        'error': 'authorization_required'
    }), 401

def generate_otp(length=6):
    """Generate a random OTP code."""
    return ''.join(random.choices(string.digits, k=length))