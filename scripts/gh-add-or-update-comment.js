#!/usr/bin/env node

/**
 * Writes logfile content as a comment to a GitHub PR or updates an existing comment.
 *
 * Is being used in a Jenkins pipeline. Awaits the following environment variables:
 * - LOGFILE: The file to read the content from. E.g. "jenkins.log" (Mandatory)
 * - GITHUB_TOKEN: The GitHub token to authenticate with. (Mandatory)
 * - GITHUB_REPO: The GitHub repo to write the comment to. (Mandatory)
 * - BUILD_URL: The Jenkins build number to fetch the logs from. E.g. "https://jenkins.domain/job/pr-multibranch-job/PR-12345/18/" (Mandatory, optionally provided by Jenkins)
 *
 * Usage:
 * BUILD_URL="https://jenkins.domain/job/pr-multibranch-job/PR-12345/18/" GITHUB_REPO="organization/repo-name" GITHUB_TOKEN=00000 LOGFILE=jenkins.log node ./gh-add-or-update-comment.js
 *
 * Pipeline usage:
 *  withCredentials([
 *    string(credentialsId: 'git-token-secret-text', variable: 'GIT_AUTH_TOKEN')
 *  ]) {
 *    sh "BUILD_URL=${params.BUILD_URL} GITHUB_REPO=${params.GITHUB_REPO} LOGFILE=${logFileName} GITHUB_TOKEN=${GIT_AUTH_TOKEN} node ./tools/scripts/gh-add-or-update-comment.js"
 *  }
 *
 */
/** Settings **/
const commentPrefix = 'Last Jenkins Error Log';

// timeStamperStrLength is used to cuts of first N chars or each line. 
// eg. a length "[2023-02-23T12:15:30.709Z] "
// set to 0 if you do not want to truncate the lines or do not use timestamper plugin
const timeStamperStrLength = 27;

/** Script **/
const { readFileSync } = require('fs');
const { createOrUpdateComment } = require('./cli-github-methods');
const buildUrl =
  process.env.BUILD_URL ||
  console.error('Error: BUILD_URL must be provided as environment variable.') ||
  process.exit(1);

const jenkinsLogContent = process.env.LOGFILE
  ? readFileSync(process.env.LOGFILE).toString()
  : console.error('Error: LOGFILE must be provided as environment variable.') || process.exit(1);

// regex extract pr number, eg https://jenkins.domain/job/pr-multibranch-job/PR-12345/18/, result is 12345
const issueNumber = buildUrl.match(/PR-(\d+)/)[1];
// regex extract pr number, eg https://jenkins.domain/job/pr-multibranch-job/PR-12345/18/, result is 18
const buildNumber = buildUrl.match(/(\d+)\/$/)[1];

// replace all content between `Z]`and `[Pipeline]` globally in every line, also remove `[Pipeline]` parts
const cleanupContent = (content) => {
  // remove the time stamper from the beginning of each line
  
  // we see some weird characters coming in, so clean them up as well
  const startStr = '\x1B';
  const endStr = '[Pipeline]';

  // github max comment length is 65536, but we need to leave some space for the comment prefix and html tags
  const maxCommentLength = 65250;
  const cleanedTruncatedContent = content
    // split by line
    .split('\n')
    // remove timestamper prefix (remove, if you do not use timestamper plugin)
    .map((line) => {
      const start = line.indexOf(startStr);
      const end = line.indexOf(endStr);
      return line.slice(timeStamperStrLength, start) + line.slice(end, line.length);
    })
    // back to one string
    .join('\n')
    // truncate from beginning if longer than maxCommentLength
    .slice(-maxCommentLength);

  const truncatedMessage =
    content.length > maxCommentLength
      ? 'First ' + (content.length - maxCommentLength) + ' log characters truncated ... \n\n'
      : '';
  const startTimeStamp = content.slice(0, timeStamperStrLength);

  return {
    startTimeStamp,
    fileContent: `Pipeline started: ${startTimeStamp}\n\n${truncatedMessage}${cleanedTruncatedContent}`
  };
};

const run = async () => {
  const { fileContent, startTimeStamp } = cleanupContent(jenkinsLogContent);
  try {
    const body = `<details><summary>${commentPrefix}, run #${buildNumber}, started ${startTimeStamp}</summary>\n\n <pre>${fileContent}</pre></details>`;

    const result = await createOrUpdateComment(
      {
        issueNumber,
        body
      },
      commentPrefix
    );
    console.info('GitHub PR commented:', result?.data?.html_url || result);
  } catch (error) {
    console.error('Error while creating or updating GitHub comment:', error.message);
  }
};
run();