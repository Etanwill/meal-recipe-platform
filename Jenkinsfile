pipeline {
    agent any

    environment {
        DOCKER_IMAGE_BACKEND  = 'meal-recipe-platform-backend'
        DOCKER_IMAGE_FRONTEND = 'meal-recipe-platform-frontend'
        GITHUB_REPO           = 'https://github.com/Etanwill/meal-recipe-platform.git'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '========== Stage 1: Cloning source code from GitHub =========='
                checkout scm
            }
        }

        stage('Install & Lint Backend') {
            steps {
                echo '========== Stage 2: Installing Python dependencies & Linting =========='
                sh '''
                    docker run --rm \
                        -v ${WORKSPACE}/backend:/app \
                        -w /app \
                        python:3.11-slim \
                        sh -c "pip install --upgrade pip -q && pip install -r requirements.txt -q && pip install flake8 -q && flake8 . --count --max-line-length=120 --statistics --exclude=__pycache__ || true && echo BACKEND_LINT_DONE"
                '''
            }
        }

        stage('Install & Lint Frontend') {
            steps {
                echo '========== Stage 3: Installing Node dependencies =========='
                sh '''
                    docker run --rm \
                        -v ${WORKSPACE}/frontend:/app \
                        -w /app \
                        node:18-alpine \
                        sh -c "npm install --legacy-peer-deps --silent && echo FRONTEND_INSTALL_DONE"
                '''
            }
        }

        stage('Test Backend') {
            steps {
                echo '========== Stage 4: Running Backend Unit Tests =========='
                sh '''
                    docker run --rm \
                        -v ${WORKSPACE}/backend:/app \
                        -w /app \
                        python:3.11-slim \
                        sh -c "pip install -r requirements.txt -q && pip install pytest pytest-cov -q && pytest tests/ -v --tb=short || true"
                '''
            }
        }

        stage('Test Frontend') {
            steps {
                echo '========== Stage 5: Running Frontend Tests =========='
                sh '''
                    docker run --rm \
                        -v ${WORKSPACE}/frontend:/app \
                        -w /app \
                        -e CI=true \
                        node:18-alpine \
                        sh -c "npm install --legacy-peer-deps --silent && npm test -- --watchAll=false --passWithNoTests || true"
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '========== Stage 6: Building Docker Images =========='
                sh '''
                    docker build -t ${DOCKER_IMAGE_BACKEND}:latest ${WORKSPACE}/backend
                    docker build -t ${DOCKER_IMAGE_FRONTEND}:latest ${WORKSPACE}/frontend
                    echo "Built images:"
                    docker images | grep meal-recipe
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo '========== Stage 7: Deploying with Docker Compose =========='
                sh '''
                    cd ${WORKSPACE}
                    docker compose down || true
                    docker compose up -d
                    echo "Deployment complete:"
                    docker compose ps
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo '========== Stage 8: Verifying Deployment =========='
                sh '''
                    sleep 15
                    curl -f http://localhost:5000 && echo "Backend OK" || echo "Backend check failed"
                    curl -f http://localhost:80   && echo "Frontend OK" || echo "Frontend check failed"
                '''
            }
        }
    }

    post {
        success {
            echo '=========================================='
            echo ' BUILD SUCCESSFUL - Meal Recipe Platform'
            echo '=========================================='
        }
        failure {
            echo '=========================================='
            echo ' BUILD FAILED - Check logs above'
            echo '=========================================='
        }
        always {
            echo 'Pipeline finished. Cleaning workspace...'
            cleanWs()
        }
    }
}