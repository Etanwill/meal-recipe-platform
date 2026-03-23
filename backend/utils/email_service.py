import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

def send_otp_email(email, otp_code, purpose):
    """Send OTP email for verification."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Your OTP Code'
        msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
        msg['To'] = email
        
        if purpose == 'signup':
            subject = 'Verify Your Email - Meal Order Platform'
            html = f"""
            <html>
            <body>
                <h2>Welcome to Meal Order Platform!</h2>
                <p>Please use the following OTP code to verify your email address:</p>
                <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">{otp_code}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </body>
            </html>
            """
        else:  # reset_password
            subject = 'Reset Your Password - Meal Order Platform'
            html = f"""
            <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>You requested to reset your password. Use this OTP code:</p>
                <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">{otp_code}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            </body>
            </html>
            """
        
        msg['Subject'] = subject
        msg.attach(MIMEText(html, 'html'))
        
        # Send email
        with smtplib.SMTP(current_app.config['MAIL_SERVER'], current_app.config['MAIL_PORT']) as server:
            server.starttls()
            server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send email: {str(e)}")
        return False