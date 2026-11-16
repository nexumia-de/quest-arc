// Keeps one comment on a pull request with the link to its Cloudflare
// preview of the standalone app (docs/pwa-release.md): the deploy in
// ci.yml writes the link, cleanup-preview.yml marks it removed. Run by
// actions/github-script, which passes github, context and core.
const MARKER = '<!-- questarc-preview -->';

/** `url` set: the preview is up there; empty: the preview was removed. */
module.exports = async ({ github, context, core }, url) => {
  const issue = { ...context.repo, issue_number: context.issue.number };
  const body = url
    ? `${MARKER}\n**Preview of the standalone app:** ${url}\n\nBuilt from ${context.payload.pull_request.head.sha.slice(0, 7)}; it is removed when the pull request closes.`
    : `${MARKER}\nThe preview of the standalone app was removed with the pull request.`;
  const comments = await github.paginate(github.rest.issues.listComments, issue);
  const old = comments.find((comment) => comment.body?.startsWith(MARKER));
  if (old) {
    await github.rest.issues.updateComment({ ...context.repo, comment_id: old.id, body });
  } else if (url) {
    await github.rest.issues.createComment({ ...issue, body });
  }
  core.info(`preview comment ${old ? 'updated' : url ? 'written' : 'not needed'}`);
};
