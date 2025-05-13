pipeline {
    agent {
        label 'linux'
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }
    
    environment {
        ARTIFACT_NAME = 'agbar-fh-kafka2kafka'
        NODE_VERSION = '20.11.1'
        DOCKER_REGISTRY = 'ghcr.io/mytracontrol'
        // Credentials needed for GitHub and Docker Registry
        GITHUB_CREDENTIALS = credentials('github-credentials')
        DOCKER_CREDENTIALS = credentials('docker-registry-credentials')
    }
    
    stages {
        stage('Setup') {
            steps {
                // Checkout from GitHub with credentials
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main'], [name: '*/master'], [name: '*/develop'], [name: '*/feature/*'], [name: '*/release/*'], [name: '*/hotfix/*']],
                    doGenerateSubmoduleConfigurations: false,
                    extensions: [[$class: 'CloneOption', depth: 0, noTags: false, reference: '', shallow: false]],
                    userRemoteConfigs: [[
                        credentialsId: 'github-credentials',
                        url: "${env.GIT_URL}" // This will use the URL from the Jenkins job configuration
                    ]]
                ])
                
                // Determine branch type and set variables
                script {
                    def branch = env.GIT_BRANCH.replace('origin/', '')
                    
                    env.IS_MASTER = (branch == 'master' || branch == 'main') ? 'true' : 'false'
                    env.IS_DEVELOP = branch == 'develop' ? 'true' : 'false'
                    env.IS_RELEASE = branch.startsWith('release/') ? 'true' : 'false'
                    env.IS_HOTFIX = branch.startsWith('hotfix/') ? 'true' : 'false'
                    env.IS_FEATURE = branch.startsWith('feature/') ? 'true' : 'false'
                    
                    // Set image tag based on branch
                    if (env.IS_FEATURE == 'true') {
                        env.IMAGE_TAG = 'nighty'
                    } else if (env.IS_RELEASE == 'true' || env.IS_HOTFIX == 'true') {
                        env.IMAGE_TAG = 'beta'
                    } else if (env.IS_DEVELOP == 'true') {
                        env.IMAGE_TAG = 'alpha'
                    } else if (env.IS_MASTER == 'true') {
                        env.IMAGE_TAG = 'latest'
                    } else {
                        env.IMAGE_TAG = 'test'
                    }
                    
                    // Determine if branch is buildable
                    env.IS_BUILDABLE = (env.IS_MASTER == 'true' || 
                                      env.IS_DEVELOP == 'true' || 
                                      env.IS_RELEASE == 'true' || 
                                      env.IS_HOTFIX == 'true') ? 'true' : 'false'
                                      
                    // Log important variables
                    echo "Branch: ${branch}"
                    echo "IS_MASTER: ${env.IS_MASTER}"
                    echo "IS_BUILDABLE: ${env.IS_BUILDABLE}"
                    echo "IMAGE_TAG: ${env.IMAGE_TAG}"
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                // Setup Node.js
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    // Install Yarn if needed
                    sh 'npm install -g yarn'
                    
                    // Install dependencies
                    sh 'yarn install'
                }
            }
        }
        
        stage('Build & Test') {
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    // Run compilation and tests
                    sh 'yarn run test'
                    
                    // Publish test reports
                    junit 'test-results.xml'
                    
                    // Publish code coverage
                    publishCoverage adapters: [
                        coberturaAdapter('coverage/cobertura-coverage.xml')
                    ]
                }
            }
        }
        
        stage('Build Artifact') {
            when {
                expression { return env.IS_BUILDABLE == 'true' }
            }
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    // Install dependencies
                    sh 'yarn install'
                    
                    // Update version in JSON files
                    script {
                        def buildNumber = env.BUILD_NUMBER
                        sh """
                            find ./artifacts -type f -name "package.json" -o -name "artifact.dna" -exec sed -i 's/\\(\\d\\+\\.\\d\\+\\.\\d\\+\\)/${buildNumber}/g' {} \\;
                        """
                    }
                    
                    // Build for production
                    sh 'yarn run build:production'
                    
                    // Install production dependencies
                    sh 'yarn install --production'
                    
                    // Prepare artifacts for different environments
                    script {
                        def environments = ['linux', 'windows']
                        
                        environments.each { env ->
                            // Copy node_modules for deployable
                            sh "mkdir -p artifacts/${env}/node_modules"
                            sh "cp -r node_modules/* artifacts/${env}/node_modules/"
                            
                            // Create archive
                            sh "mkdir -p ${ARTIFACT_NAME}"
                            dir(env) {
                                zip zipFile: "../../${ARTIFACT_NAME}/${ARTIFACT_NAME}-${env}.zip", dir: "artifacts/${env}", archive: true
                            }
                        }
                    }
                    
                    // Archive artifacts
                    archiveArtifacts artifacts: "${ARTIFACT_NAME}/*.zip", fingerprint: true
                }
            }
        }
        
        stage('Build Docker Image') {
            when {
                expression { return env.IS_BUILDABLE == 'true' }
            }
            steps {
                // Extract artifact
                sh "mkdir -p artifact"
                sh "unzip -o '${ARTIFACT_NAME}/${ARTIFACT_NAME}-linux.zip' -d artifact"
                
                // Build and push Docker image
                script {
                    withCredentials([string(credentialsId: 'docker-registry-token', variable: 'DOCKER_TOKEN')]) {
                        // Login to Docker registry
                        sh "echo ${DOCKER_TOKEN} | docker login ghcr.io -u ${GITHUB_CREDENTIALS_USR} --password-stdin"
                        
                        // Create buildx instance for multi-platform builds
                        sh 'docker buildx create --use || true'
                        
                        // Build and push multi-platform image
                        sh """
                            docker buildx build --push \
                                --tag ${DOCKER_REGISTRY}/${ARTIFACT_NAME}:${BUILD_NUMBER} \
                                --tag ${DOCKER_REGISTRY}/${ARTIFACT_NAME}:${IMAGE_TAG} \
                                --platform linux/amd64,linux/arm/v7,linux/arm64/v8 \
                                artifact
                        """
                        
                        // Clean up
                        sh 'docker system prune -a --force || true'
                    }
                }
            }
        }
        
        stage('Publish Release Notes') {
            when {
                expression { return env.IS_MASTER == 'true' }
            }
            steps {
                script {
                    // This would typically be done with a plugin that can generate release notes
                    // Since we're simplifying, we'll just create a basic release note file
                    def releaseDate = new Date().format("dd-MM-yyyy")
                    def releaseNotes = """
                    --------------------------------------------
                    
                    ## 🚀 **${BUILD_NUMBER}** - ${releaseDate}
                    
                    ### Release Notes for ${ARTIFACT_NAME}
                    
                    This is an automated release note created by Jenkins pipeline.
                    """
                    
                    writeFile file: 'RELEASE.md', text: releaseNotes
                    
                    // For GitHub integration, you could create a release in GitHub
                    withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                        // Get the repository name from the Git URL
                        def repoUrl = sh(script: 'git config --get remote.origin.url', returnStdout: true).trim()
                        def repoName = repoUrl.tokenize('/')[-1].replace('.git', '')
                        def orgName = repoUrl.tokenize('/')[-2]
                        
                        // Create a tag for this release
                        sh "git tag -a v${BUILD_NUMBER} -m 'Release ${BUILD_NUMBER}'"
                        sh "git push https://${GITHUB_CREDENTIALS_USR}:${GITHUB_TOKEN}@github.com/${orgName}/${repoName}.git v${BUILD_NUMBER}"
                        
                        // Optional: Create a GitHub release using GitHub CLI if installed
                        sh """
                            if command -v gh &> /dev/null; then
                                echo ${GITHUB_TOKEN} | gh auth login --with-token
                                gh release create v${BUILD_NUMBER} \
                                    --title "Release ${BUILD_NUMBER}" \
                                    --notes-file RELEASE.md \
                                    ${ARTIFACT_NAME}/*.zip
                            else
                                echo "GitHub CLI not installed. Skipping GitHub release creation."
                            fi
                        """
                    }
                }
            }
        }
    }
    
    post {
        always {
            // Clean workspace
            cleanWs()
            
            // Send notification about build result
            script {
                def buildStatus = currentBuild.result ?: 'SUCCESS'
                def subject = "${buildStatus}: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'"
                def summary = "${subject} (${env.BUILD_URL})"
                
                // You can uncomment and configure this if you have email notifications configured
                /*
                emailext (
                    subject: subject,
                    body: summary,
                    recipientProviders: [[$class: 'DevelopersRecipientProvider'], [$class: 'RequesterRecipientProvider']]
                )
                */
                
                // Slack notification if you have the plugin configured
                /*
                slackSend(
                    color: buildStatus == 'SUCCESS' ? 'good' : 'danger',
                    message: summary
                )
                */
            }
        }
        success {
            echo 'Build completed successfully!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}