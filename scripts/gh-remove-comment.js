#!/usr/bin/env node

/**
 * Removes a GitHub comment if it exists.
 *
 * Is being used in a jenkins pipeline. Awaits the following environment variables:
 * - GITHUB_TOKEN: The GitHub token to authenticate with. (Mandatory)
 * - GITHUB_REPO: The GitHub repo to write the comment to. (Mandatory)
 * - BUILD_URL: The Jenkins build number to fetch the logs from. E.g. "https://jenkins.domain/job/pr-multibranch-pipeline/PR-12345/18/" (Mandatory, optionally provided by Jenkins)
 *
 * Usage:
 * BUILD_URL="https://jenkins.domain/job/pr-multibranch-job/PR-12345/18/" GITHUB_REPO="org/repo-name" GITHUB_TOKEN=00000 node ./gh-remove-comment.js
 *
 * Pipeline usage:
   success {
      script {
        withCredentials([
          string(credentialsId: 'git-token-secret-text', variable: 'GIT_AUTH_TOKEN')
        ]) {
          sh """
             GITHUB_REPO="org/repo" GITHUB_TOKEN=${GIT_AUTH_TOKEN} node ./gh-remove-comment.js
          """
        }
      }
    }
 *
 */
    const githubBaseUrl = 'https://api.github.com';
    const contentPrefix = 'Last Jenkins Error Log';
    
    
    
    const axios = require('axios');
    const { isTrue } = require('./helpers');
    
    const buildUrl =
      process.env.BUILD_URL ||
      console.error('Error: BUILD_URL must be provided as environment variable.') ||
      process.exit(1);
    const token =
      process.env.GITHUB_TOKEN ||
      console.error('Error: GITHUB_TOKEN must be provided as environment variable.') ||
      process.exit(1);
    const repo =
      process.env.GITHUB_REPO ||
      console.error('Info: GITHUB_REPO not provided as environment variable') ||
      process.exit(1);
    
    
    // regex extract pr number, eg https://jenkins.domain/job/pr-multibranch-job/PR-12345/18/, result is 12345
    const prNum = buildUrl.match(/PR-(\d+)/)[1];
    
    /**
     * Creates or updates a comment on a GitHub PR.
     * @param {string} token github token
     * @param {string} repo github repository
     * @param {number} prNumber pull request number
     */
    const removePullRequestComment = ({ token, repo, prNum }) => {
      const commentsUrl = `${githubBaseUrl}/repos/${repo}/issues/${prNum}/comments`;
    
      let options = {
        uri: commentsUrl,
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        json: true
      };
    
      return axios.get(commentsUrl, options).then((response) => {
        if (response.data.indexOf('Log in to toolchain') > -1) {
          throw new Error('Unauthorized');
        }
    
        const comments = response.data;
        const existingComment = comments.find(
          (comment) => comment.body.slice(0, 100).indexOf(contentPrefix) > -1
        );
    
        if (existingComment) {
          axios.delete(existingComment.url, options);
        }
      });
    };
    
    const run = async () => {
      try {
        await removePullRequestComment({
          token,
          repo,
          prNum
        });
      } catch (error) {
        console.error('Error while removing GitHub comment:', error.message);
      }
    };
    run();