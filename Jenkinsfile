pipeline {
  agent { label 'linux' }

  environment {
    NODE_VERSION    = '20.11.1'
    ARTIFACT_NAME   = 'agbar-fh-kafka2kafka'
    DOCKER_REGISTRY = 'ghcr.io/mytracontrol'
    IMAGE_NAME      = "${DOCKER_REGISTRY}/${ARTIFACT_NAME}"
  }

  tools {
    nodejs 'NodeJS_20'
  }

  stages {

    stage('Checkout & Fetch') {
      steps {
        // Usamos el ID github-credentials guardado en Jenkins
        withCredentials([usernamePassword(
          credentialsId: 'github-credentials',
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          // Clonamos con credenciales
          sh """
            git clone https://${GIT_USER}:${GIT_TOKEN}@github.com/amatamarco/Jenkins.git .
            git fetch --prune --unshallow || true
          """
        }
      }
    }

    stage('Versioning') {
      steps {
        sh 'gitversion /config .config/GitVersion.yml /output json > version.json'
        script {
          def v = readJSON file: 'version.json'
          env.VERSION = v.SemVer
          echo "Versión calculada: ${env.VERSION}"
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'yarn install --frozen-lockfile'
      }
    }

    stage('Dependency Audit') {
      steps {
        sh 'node .config/thirdPartyCheck.js --files'
      }
    }

    stage('Build') {
      steps {
        sh 'yarn build:production'
      }
    }

    stage('Mutation Tests') {
      steps {
        sh 'npx stryker run --config .config/stryker.config.js'
      }
    }

    stage('Generate Docs') {
      steps {
        sh 'npx typedoc --options .config/typedoc.json'
        archiveArtifacts artifacts: 'docs/**', fingerprint: true
      }
    }

    stage('Package Artifacts') {
      steps {
        script {
          def envs = ['linux','windows']
          envs.each { e ->
            sh "mkdir -p artifacts/${e}"
            sh "cp -R node_modules artifacts/${e}/node_modules"
            sh "zip -r ${ARTIFACT_NAME}-${e}.zip artifacts/${e}"
            archiveArtifacts artifacts: "${ARTIFACT_NAME}-${e}.zip", fingerprint: true
          }
        }
      }
    }

    stage('Docker Build & Push') {
      steps {
        // Usamos el ID dockerhub-credentials guardado en Jenkins
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "echo \$DOCKER_PASS | docker login ${DOCKER_REGISTRY} -u \$DOCKER_USER --password-stdin"
          sh 'docker buildx create --use'
          sh """
            docker buildx build \\
              --push \\
              --tag ${IMAGE_NAME}:${env.VERSION} \\
              --tag ${IMAGE_NAME}:latest \\
              --platform linux/amd64,linux/arm/v7,linux/arm64/v8 \\
              artifact
          """
        }
      }
    }

    stage('Release Notes') {
      when { branch 'master' }
      steps {
        sh '''
          echo "## Release ${env.VERSION} - $(date +%Y-%m-%d)" > RELEASE_NOTES.md
          git log --pretty=format:"* %s" origin/master..HEAD >> RELEASE_NOTES.md
        '''
        archiveArtifacts artifacts: 'RELEASE_NOTES.md', fingerprint: true
      }
    }

  }

  post {
    always {
      cleanWs()
    }
  }
}
