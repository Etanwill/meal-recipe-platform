import pytest
import json
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/..')

# Set test environment variables before importing app
os.environ['SECRET_KEY'] = 'test-secret-key'
os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret'
os.environ['DATABASE_URL'] = 'sqlite:///test_meal_platform.db'
os.environ['FLASK_ENV'] = 'testing'
os.environ['MAIL_USERNAME'] = 'test@test.com'
os.environ['MAIL_PASSWORD'] = 'testpass'

from app import app, db

# ─────────────────────────────────────────────
# FIXTURES
# ─────────────────────────────────────────────

@pytest.fixture
def client():
    """Create a test client with a fresh in-memory database."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def registered_user(client):
    """Register a test user and return their credentials."""
    response = client.post('/api/auth/register', 
        json={
            'name': 'Test User',
            'email': 'testuser@example.com',
            'password': 'Test@1234',
            'role': 'customer'
        }
    )
    return {'email': 'testuser@example.com', 'password': 'Test@1234'}


@pytest.fixture
def auth_token(client, registered_user):
    """Log in and return a valid JWT token."""
    response = client.post('/api/auth/login',
        json={
            'email': registered_user['email'],
            'password': registered_user['password']
        }
    )
    data = json.loads(response.data)
    return data.get('access_token', '')


@pytest.fixture
def vendor_token(client):
    """Register a vendor and return their JWT token."""
    client.post('/api/auth/register',
        json={
            'name': 'Test Vendor',
            'email': 'vendor@example.com',
            'password': 'Vendor@1234',
            'role': 'vendor'
        }
    )
    response = client.post('/api/auth/login',
        json={
            'email': 'vendor@example.com',
            'password': 'Vendor@1234'
        }
    )
    data = json.loads(response.data)
    return data.get('access_token', '')


# ─────────────────────────────────────────────
# SECTION 1: API HEALTH TESTS
# ─────────────────────────────────────────────

class TestAPIHealth:

    def test_api_root_returns_200(self, client):
        """Test that the API root endpoint is reachable."""
        response = client.get('/')
        assert response.status_code == 200

    def test_api_root_returns_json(self, client):
        """Test that the API root returns JSON."""
        response = client.get('/')
        assert response.content_type == 'application/json'

    def test_api_root_has_name_field(self, client):
        """Test that the API response contains a name field."""
        response = client.get('/')
        data = json.loads(response.data)
        assert 'name' in data

    def test_meals_endpoint_exists(self, client):
        """Test that the meals listing endpoint exists."""
        response = client.get('/api/meals')
        assert response.status_code in [200, 401]

    def test_recipes_endpoint_exists(self, client):
        """Test that the recipes listing endpoint exists."""
        response = client.get('/api/recipes')
        assert response.status_code in [200, 401]


# ─────────────────────────────────────────────
# SECTION 2: AUTHENTICATION TESTS
# ─────────────────────────────────────────────

class TestAuthentication:

    def test_register_new_user_success(self, client):
        """Test that a new user can register successfully."""
        response = client.post('/api/auth/register',
            json={
                'name': 'New User',
                'email': 'newuser@example.com',
                'password': 'NewPass@123',
                'role': 'customer'
            }
        )
        assert response.status_code in [200, 201]

    def test_register_returns_token_or_message(self, client):
        """Test that registration returns a token or success message."""
        response = client.post('/api/auth/register',
            json={
                'name': 'Another User',
                'email': 'another@example.com',
                'password': 'Another@123',
                'role': 'customer'
            }
        )
        data = json.loads(response.data)
        assert 'access_token' in data or 'message' in data or 'msg' in data

    def test_register_duplicate_email_fails(self, client, registered_user):
        """Test that registering with an existing email fails."""
        response = client.post('/api/auth/register',
            json={
                'name': 'Duplicate User',
                'email': registered_user['email'],
                'password': 'Duplicate@123',
                'role': 'customer'
            }
        )
        assert response.status_code in [400, 409, 422]

    def test_login_with_valid_credentials(self, client, registered_user):
        """Test that a registered user can log in."""
        response = client.post('/api/auth/login',
            json={
                'email': registered_user['email'],
                'password': registered_user['password']
            }
        )
        assert response.status_code == 200

    def test_login_returns_access_token(self, client, registered_user):
        """Test that login response includes an access token."""
        response = client.post('/api/auth/login',
            json={
                'email': registered_user['email'],
                'password': registered_user['password']
            }
        )
        data = json.loads(response.data)
        assert 'access_token' in data

    def test_login_with_wrong_password_fails(self, client, registered_user):
        """Test that login fails with incorrect password."""
        response = client.post('/api/auth/login',
            json={
                'email': registered_user['email'],
                'password': 'WrongPassword@999'
            }
        )
        assert response.status_code in [400, 401, 422]

    def test_login_with_unknown_email_fails(self, client):
        """Test that login fails for non-existent email."""
        response = client.post('/api/auth/login',
            json={
                'email': 'nobody@nowhere.com',
                'password': 'SomePass@123'
            }
        )
        assert response.status_code in [400, 401, 404, 422]

    def test_get_profile_requires_auth(self, client):
        """Test that accessing profile without token returns 401."""
        response = client.get('/api/auth/me')
        assert response.status_code == 401

    def test_get_profile_with_valid_token(self, client, auth_token):
        """Test that authenticated user can access their profile."""
        response = client.get('/api/auth/me',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200

    def test_register_missing_email_fails(self, client):
        """Test that registration without email fails."""
        response = client.post('/api/auth/register',
            json={
                'name': 'No Email User',
                'password': 'NoEmail@123',
                'role': 'customer'
            }
        )
        assert response.status_code in [400, 422]


# ─────────────────────────────────────────────
# SECTION 3: MEALS TESTS
# ─────────────────────────────────────────────

class TestMeals:

    def test_get_meals_list(self, client, auth_token):
        """Test that authenticated user can get meals list."""
        response = client.get('/api/meals',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200

    def test_get_meals_returns_list(self, client, auth_token):
        """Test that meals endpoint returns a list."""
        response = client.get('/api/meals',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        data = json.loads(response.data)
        assert isinstance(data, list) or 'meals' in data

    def test_get_meal_categories(self, client, auth_token):
        """Test that meal categories endpoint works."""
        response = client.get('/api/meals/categories',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200

    def test_create_meal_requires_auth(self, client):
        """Test that creating a meal without auth returns 401."""
        response = client.post('/api/meals',
            json={
                'name': 'Test Meal',
                'price': 5000,
                'category': 'Main Course'
            }
        )
        assert response.status_code == 401

    def test_get_nonexistent_meal_returns_404(self, client, auth_token):
        """Test that getting a non-existent meal returns 404."""
        response = client.get('/api/meals/99999',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 404


# ─────────────────────────────────────────────
# SECTION 4: ORDERS TESTS
# ─────────────────────────────────────────────

class TestOrders:

    def test_get_orders_requires_auth(self, client):
        """Test that orders endpoint requires authentication."""
        response = client.get('/api/orders')
        assert response.status_code == 401

    def test_get_orders_with_auth(self, client, auth_token):
        """Test that authenticated user can access orders."""
        response = client.get('/api/orders',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200

    def test_create_order_requires_auth(self, client):
        """Test that creating an order requires authentication."""
        response = client.post('/api/orders',
            json={'items': []}
        )
        assert response.status_code == 401


# ─────────────────────────────────────────────
# SECTION 5: RECIPES TESTS
# ─────────────────────────────────────────────

class TestRecipes:

    def test_get_recipes_list(self, client, auth_token):
        """Test that recipes endpoint is accessible."""
        response = client.get('/api/recipes',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200

    def test_get_recipe_categories(self, client, auth_token):
        """Test that recipe categories endpoint works."""
        response = client.get('/api/recipes/categories',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 200

    def test_get_nonexistent_recipe_returns_404(self, client, auth_token):
        """Test that getting a non-existent recipe returns 404."""
        response = client.get('/api/recipes/99999',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert response.status_code == 404

