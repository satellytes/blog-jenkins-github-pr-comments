pipeline {
  stages {
    stage('Build') {
      steps {
        println "Building nothing ... but it is okay"
      }
    }
    stage('Force Error') {
      steps {
        throw new Error('Forced error to test the post failure step')
      }
    }
  }  
  post {
    failure {
      script {
        // Retrieving Jenkins Logs: Option 1
        def build = Thread.currentThread().executable
        writeFile(file: 'jenkins.log', text: build.getLog(65000))

        // Retrieving Jenkins Logs: Option 2
        // shared = load 'ci/shared.groovy'
        // shared.writeJenkinsLog(env.BUILD_URL, 'jenkins.log')


        withCredentials([
          string(credentialsId: 'git-pat-token', variable: 'GIT_AUTH_TOKEN')
        ]) {
          sh """
            echo '{ "name": "project", "dependencies": { "axios": "^1.4.0" }}' > package.json
            npm i
            GITHUB_REPO="org/repo-name" LOGFILE=jenkins.log GITHUB_TOKEN=${GIT_AUTH_TOKEN} node ./scripts/gh-add-or-update-comment.js
          """
        }
      }
    }
    success {
      script {
        withCredentials([
          string(credentialsId: 'git-pat-token', variable: 'GIT_AUTH_TOKEN')
        ]) {
          sh """
             GITHUB_REPO="org/repo-name" GITHUB_TOKEN=${GIT_AUTH_TOKEN} node ./scripts/gh-remove-comment.js
          """
        }
      }
    }
  }
}