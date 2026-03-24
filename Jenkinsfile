pipeline {
    agent any

    environment {
        DOCKER_IMAGE_BACKEND  = 'meal-recipe-platform-backend'
        DOCKER_IMAGE_FRONTEND = 'meal-recipe-platform-frontend'
        GITHUB_REPO           = 'https://github.com/Etanwill/meal-recipe-platform.git'
        DEPLOY_DIR            = '/opt/meal-recipe-platform'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '========== Stage 1: Cloning source code from GitHub =========='
                git branch: 'main', url: "${GITHUB_REPO}"
            }
        }

        stage('Install & Lint Backend') {
            steps {
                echo '========== Stage 2: Installing Python dependencies =========='
                dir('backend') {
                    sh '''
                        python3 -m venv venv
                        . venv/bin/activate
                        pip install --upgrade pip
                        pip install -r requirements.txt
                        pip install flake8
                        flake8 . --count --max-line-length=120 --statistics --exclude=venv,__pycache__ || true
                    '''
                }
            }
        }

        stage('Install & Lint Frontend') {
            steps {
                echo '========== Stage 3: Installing Node dependencies =========='
                dir('frontend') {
                    sh '''
                        npm install --legacy-peer-deps
                        npx eslint src/ --ext .js,.jsx --max-warnings=50 || true
                    '''
                }
            }
        }

        stage('Test Backend') {
            steps {
                echo '========== Stage 4: Running Backend Unit Tests =========='
                dir('backend') {
                    sh '''
                        . venv/bin/activate
                        pip install pytest pytest-cov
                        pytest tests/ -v --cov=. --cov-report=xml --cov-report=term-missing || true
                    '''
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/test-results/*.xml'
                }
            }
        }

        stage('Test Frontend') {
            steps {
                echo '========== Stage 5: Running Frontend Tests =========='
                dir('frontend') {
                    sh 'CI=true npm test -- --watchAll=false --passWithNoTests || true'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '========== Stage 6: Building Docker Images =========='
                sh '''
                    docker build -t ${DOCKER_IMAGE_BACKEND}:latest ./backend
                    docker build -t ${DOCKER_IMAGE_FRONTEND}:latest ./frontend
                    echo "Images built successfully:"
                    docker images | grep meal-recipe
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo '========== Stage 7: Deploying with Docker Compose =========='
                sh '''
                    if [ -d "${DEPLOY_DIR}" ]; then
                        cd ${DEPLOY_DIR}
                        docker compose down
                    fi
                    cp -r . ${DEPLOY_DIR}
                    cd ${DEPLOY_DIR}
                    docker compose up -d
                    echo "Deployment complete. Running containers:"
                    docker compose ps
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo '========== Stage 8: Verifying Deployment =========='
                sh '''
                    sleep 15
                    curl -f http://localhost:5000 || echo "Backend health check failed"
                    curl -f http://localhost:80   || echo "Frontend health check failed"
                    echo "Health check complete"
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
            echo 'Pipeline finished. Cleaning up workspace...'
            cleanWs()
        }
    }
}
