import re
from email_validator import validate_email, EmailNotValidError

def validate_email_address(email):
    """Validate email address format."""
    try:
        valid = validate_email(email)
        return True, valid.email
    except EmailNotValidError as e:
        return False, str(e)

def validate_password(password):
    """Validate password strength."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is valid"

def validate_phone(phone):
    """Validate phone number format."""
    pattern = r'^[\+]?[1-9][\d]{0,15}$'
    if re.match(pattern, phone):
        return True, "Phone number is valid"
    return False, "Invalid phone number format"