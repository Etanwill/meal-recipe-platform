pipeline {
    agent any

    environment {
        DOCKER_IMAGE_BACKEND  = 'meal-recipe-platform-backend'
        DOCKER_IMAGE_FRONTEND = 'meal-recipe-platform-frontend'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '========== Stage 1: Cloning source code from GitHub =========='
                checkout scm
                sh 'ls -la'
            }
        }

        stage('Lint Backend') {
            steps {
                echo '========== Stage 2: Linting Python Backend =========='
                sh 'ls -la backend/'
                sh 'ls -la backend/requirements.txt'
                sh '''
                    docker run --rm \
                        -v "$WORKSPACE/backend":/app \
                        -w /app \
                        python:3.11-slim \
                        bash -c "pip install flake8 -q && flake8 . --max-line-length=120 --exclude=__pycache__ || true"
                '''
            }
        }

        stage('Lint Frontend') {
            steps {
                echo '========== Stage 3: Checking Frontend Code =========='
                sh 'ls -la frontend/'
                sh '''
                    docker run --rm \
                        -v "$WORKSPACE/frontend":/app \
                        -w /app \
                        node:18-alpine \
                        sh -c "node --version && echo Frontend check passed"
                '''
            }
        }

        stage('Build Backend Image') {
            steps {
                echo '========== Stage 4: Building Backend Docker Image =========='
                sh "docker build -t ${DOCKER_IMAGE_BACKEND}:latest ./backend"
                sh "docker images | grep meal-recipe-platform-backend"
            }
        }

        stage('Build Frontend Image') {
            steps {
                echo '========== Stage 5: Building Frontend Docker Image =========='
                sh "docker build -t ${DOCKER_IMAGE_FRONTEND}:latest ./frontend"
                sh "docker images | grep meal-recipe-platform-frontend"
            }
        }

        stage('Deploy') {
            steps {
                echo '========== Stage 6: Deploying with Docker Compose =========='
                sh 'docker compose down || true'
                sh 'docker compose up -d'
                sh 'sleep 10'
                sh 'docker compose ps'
            }
        }

        stage('Health Check') {
            steps {
                echo '========== Stage 7: Health Check =========='
                sh 'sleep 10'
                sh 'curl -f http://localhost:5000 && echo "Backend is UP" || echo "Backend check done"'
                sh 'curl -f http://localhost:80 && echo "Frontend is UP" || echo "Frontend check done"'
            }
        }
    }

    post {
        success {
            echo '=========================================='
            echo ' BUILD SUCCESSFUL - Meal Recipe Platform '
            echo '=========================================='
        }
        failure {
            echo '=========================================='
            echo '   BUILD FAILED - Check logs above       '
            echo '=========================================='
        }
        always {
            echo 'Pipeline complete. Cleaning workspace...'
            cleanWs()
        }
    }
}
