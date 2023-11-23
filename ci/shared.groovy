/**
  * Get the Jenkins log for a given build and write it to file jenkins.log
  * @param buildUrl The URL of the Jenkins build (env.BUILD_URL)
  * @param logFilename The name of the file to write the log to (default: jenkins.log)
  */
def writeJenkinsLog(buildUrl, logFilename = 'jenkins.log') {
  withCredentials([usernamePassword(credentialsId: 'jenkins-technical-user', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
    try {
      def curlCmd = "curl -u ${USERNAME}:${PASSWORD} ${buildUrl}consoleText > ${logFilename}"
      def response = sh(returnStdout: true, script: curlCmd)
    } catch (Exception e) {
      print "Error: Failed to retrieve Jenkins Log:"
      sh "cat jenkins.log"
      print e.message
      // throw error to abort the build
      throw new Error("Failed to retrieve Jenkins Log")
    }
  }
}

return this