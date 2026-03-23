from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from models import db, User, OTP
from auth import generate_otp
from utils.email_service import send_otp_email
from utils.validators import validate_email_address, validate_password
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'{field} is required'
                }), 400
        
        # Validate email
        is_valid_email, email_msg = validate_email_address(data['email'])
        if not is_valid_email:
            return jsonify({
                'status': 'error',
                'message': email_msg
            }), 400
        
        # Validate password
        is_valid_password, password_msg = validate_password(data['password'])
        if not is_valid_password:
            return jsonify({
                'status': 'error',
                'message': password_msg
            }), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({
                'status': 'error',
                'message': 'User with this email already exists'
            }), 400
        
        # Validate role
        if data['role'] not in ['customer', 'vendor']:
            return jsonify({
                'status': 'error',
                'message': 'Invalid role. Must be either "customer" or "vendor"'
            }), 400
        
        # Generate OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Store OTP
        otp = OTP(
            email=data['email'],
            otp_code=otp_code,
            purpose='signup',
            expires_at=expires_at
        )
        db.session.add(otp)
        
        # Create user (but not active yet)
        user = User(
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=data['role'],
            is_active=False
        )
        user.set_password(data['password'])
        db.session.add(user)
        
        db.session.commit()
        
        # Send OTP email
        if current_app.config.get('MAIL_USERNAME') and current_app.config.get('MAIL_PASSWORD'):
            send_otp_email(data['email'], otp_code, 'signup')
        else:
            current_app.logger.warning("Email configuration missing. OTP would be: " + otp_code)
        
        return jsonify({
            'status': 'success',
            'message': 'Registration successful. Please verify your email with the OTP sent.',
            'data': {
                'email': data['email'],
                'requires_verification': True,
                'otp': otp_code  # For testing only
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during registration'
        }), 500

# ... rest of the auth_routes.py code remains the same ...
# Continue with the rest of the functions from the original auth_routes.py

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP for email verification."""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('otp'):
            return jsonify({
                'status': 'error',
                'message': 'Email and OTP are required'
            }), 400
        
        # Find OTP
        otp = OTP.query.filter_by(
            email=data['email'],
            otp_code=data['otp'],
            is_used=False,
            purpose='signup'
        ).first()
        
        if not otp:
            return jsonify({
                'status': 'error',
                'message': 'Invalid or expired OTP'
            }), 400
        
        # Check if OTP has expired
        if datetime.utcnow() > otp.expires_at:
            return jsonify({
                'status': 'error',
                'message': 'OTP has expired'
            }), 400
        
        # Activate user
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        user.is_active = True
        otp.is_used = True
        
        db.session.commit()
        
        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'status': 'success',
            'message': 'Email verified successfully',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"OTP verification error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during OTP verification'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user."""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({
                'status': 'error',
                'message': 'Email and password are required'
            }), 400
        
        # Find user
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({
                'status': 'error',
                'message': 'Invalid email or password'
            }), 401
        
        if not user.is_active:
            return jsonify({
                'status': 'error',
                'message': 'Account is not active. Please verify your email.'
            }), 403
        
        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during login'
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token."""
    try:
        current_user = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user)
        
        return jsonify({
            'status': 'success',
            'data': {
                'access_token': new_access_token
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to refresh token'
        }), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset OTP."""
    try:
        data = request.get_json()
        
        if not data.get('email'):
            return jsonify({
                'status': 'error',
                'message': 'Email is required'
            }), 400
        
        # Check if user exists
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        # Generate OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Store OTP
        otp = OTP(
            email=data['email'],
            otp_code=otp_code,
            purpose='reset_password',
            expires_at=expires_at
        )
        db.session.add(otp)
        db.session.commit()
        
        # Send OTP email
        if current_app.config['MAIL_USERNAME'] and current_app.config['MAIL_PASSWORD']:
            send_otp_email(data['email'], otp_code, 'reset_password')
        
        return jsonify({
            'status': 'success',
            'message': 'Password reset OTP sent to your email'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Forgot password error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred'
        }), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with OTP."""
    try:
        data = request.get_json()
        
        required_fields = ['email', 'otp', 'new_password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'{field} is required'
                }), 400
        
        # Validate password
        is_valid_password, password_msg = validate_password(data['new_password'])
        if not is_valid_password:
            return jsonify({
                'status': 'error',
                'message': password_msg
            }), 400
        
        # Find OTP
        otp = OTP.query.filter_by(
            email=data['email'],
            otp_code=data['otp'],
            is_used=False,
            purpose='reset_password'
        ).first()
        
        if not otp:
            return jsonify({
                'status': 'error',
                'message': 'Invalid or expired OTP'
            }), 400
        
        # Check if OTP has expired
        if datetime.utcnow() > otp.expires_at:
            return jsonify({
                'status': 'error',
                'message': 'OTP has expired'
            }), 400
        
        # Update user password
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        user.set_password(data['new_password'])
        otp.is_used = True
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Password reset successful'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Reset password error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred during password reset'
        }), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user profile."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'data': user.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get profile error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get user profile'
        }), 500