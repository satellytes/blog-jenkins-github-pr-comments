/** Settings **/
const githubBaseUrl = 'https://api.github.com';

/** Script **/
const { isTrue } = require('./helpers');
const axios = require('axios');

const token =
  process.env.GITHUB_TOKEN ||
  console.error('Error: GITHUB_TOKEN must be provided as environment variable (PAT with repo scope).') ||
  process.exit(1);
const repo =
  process.env.GITHUB_REPO ||
  console.error('Info: GITHUB_REPO not provided as environment variable (eg. organization/repo_name)') ||
  process.exit(1);

let defaultOptions = {
  headers: {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  },
  json: true,
  maxRedirects: 0
};

/**
 * Retrieves a pull request's comments from GitHub.
 * @param {number} issueNumber
 * @returns {object} gh pull request entity https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#get-a-pull-request
 */
const getPullRequestComments = async (issueNumber) => {
  const options = Object.assign({}, defaultOptions, {
    uri: `${githubBaseUrl}/v3/repos/${repo}/issues/${issueNumber}/comments`
  });

  return axios.get(options.uri, options).then((response) => response.data);
};

/**
 * Creates or updates a comment on a GitHub PR or issue.
 * @param {object} options
 * - @param {number} issueNumber pull request number
 * - @param {string} body the content to write to the comment
 * - @param {string} bodyOnAppend if the comment exists, we just add that content instead of replacing it
 * @param {string} existingContent optional text to search for an existing comment, which gets replaced then
 */
const createOrUpdateComment = async (
  { issueNumber, body, bodyOnAppend },
  existingContent = '',
  appendIfExists = false
) => {
  const commentsUrl = `${githubBaseUrl}/v3/repos/${repo}/issues/${issueNumber}/comments`;

  const options = Object.assign({}, defaultOptions, {
    uri: commentsUrl
  });

  const addNewComment = () => {
    console.log('Adding new comment.');
    return axios.post(commentsUrl, { body }, options);
  };

  if (!existingContent) {
    return addNewComment();
  }

  return getPullRequestComments(issueNumber).then((comments) => {
    const existingComment = comments.find((comment) => comment.body.indexOf(existingContent) > -1);
    if (existingComment) {
      let newBody;
      if (appendIfExists && bodyOnAppend && existingComment.body.indexOf(bodyOnAppend) !== -1) {
        // separate body for append is provided, but it exists already, we do nothing.
        return Promise.resolve();
      } else if (appendIfExists && bodyOnAppend) {
        // separate body for append is provided, we append it to the existing body
        newBody = existingComment.body + bodyOnAppend;
      } else if (appendIfExists) {
        // no separate body for append is provided, we append the provided body to the existing body
        newBody = existingComment.body + body;
      } else {
        newBody = body;
      }

      return axios.patch(
        existingComment.url,
        {
          body: newBody
        },
        options
      );
    } else {
      return addNewComment();
    }
  });
};

module.exports = {
  createOrUpdateComment
};