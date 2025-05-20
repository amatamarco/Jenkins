pipeline {
  agent any   // Usamos cualquier nodo disponible

  tools {
    nodejs '20.11.1'  // Debe coincidir con el nombre en Global Tool Configuration
  }

  environment {
    ARTIFACT_NAME   = 'agbar-fh-kafka2kafka'
    DOCKER_REGISTRY = 'ghcr.io/mytracontrol'
    IMAGE_NAME      = "${DOCKER_REGISTRY}/${ARTIFACT_NAME}"
  }

  stages {

    stage('Checkout') {
      steps {
        // Checkout usando la configuración SCM del job
        checkout scm
      }
    }

    stage('Versioning') {
      steps {
        // Instala GitVersion CLI si no está presente
        sh 'npm install -g gitversion-cli'
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
          ['linux','windows'].each { e ->
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
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "echo \"$DOCKER_PASS\" | docker login $DOCKER_REGISTRY -u $DOCKER_USER --password-stdin"
          sh 'docker buildx create --use'
          sh '''
            docker buildx build \
              --push \
              --tag ${IMAGE_NAME}:${VERSION} \
              --tag ${IMAGE_NAME}:latest \
              --platform linux/amd64,linux/arm/v7,linux/arm64/v8 \
              artifact
          '''
        }
      }
    }

    stage('Release Notes') {
      when { branch 'master' }
      steps {
        sh '''
          echo "## Release ${VERSION} - $(date +%Y-%m-%d)" > RELEASE_NOTES.md
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
